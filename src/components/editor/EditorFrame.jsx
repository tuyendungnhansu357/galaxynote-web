import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import { useNoteStore } from '../../stores/noteStore'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { uploadImageBlob, dataUrlToBlob } from '../../lib/attachments'

// Same shape as the QSS "dark" theme desktop applies via editorCmd.applyTheme().
const DARK_THEME = {
  bg: '#0d1120',
  fg: '#e8edf8',
  ph: '#4a5068',   // placeholder
  sel: '#4f8ef733', // selection tint
  mid: '#1e2840',  // dividers
  alt: '#131929',  // alt row background
}

const AUTOSAVE_DELAY_MS = 2000 // mirrors utils/constants.py DEFAULT_SETTINGS.autosave_delay_ms
const STORAGE_BUCKET = 'attachments' // same bucket desktop's sync_manager.py pushes to

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function urlToDataUrl(url) {
  return fetch(url).then((r) => r.blob()).then(blobToDataUrl)
}

/**
 * Hosts the unmodified desktop editor (public/editor/editor_template.html)
 * in an iframe, and answers its `bridge.*` calls the way PySide6's
 * `_Bridge` QObject does on desktop — just over postMessage instead of
 * QWebChannel. See public/editor/bridge_shim.js for the iframe side.
 *
 * Toolbar commands (bold, insert table, etc.) don't need the bridge at
 * all — the iframe is same-origin, so `EditorToolbar` calls straight into
 * `iframe.contentWindow.editorCmd.*` via the imperative handle exposed
 * here (`exec` / `execRaw`), exactly like desktop's EditorToolbar calls
 * `self._js("window.editorCmd....")` via QWebEngineView.runJavaScript.
 *
 * Images: `request_image_data`/`request_pdf_data` now download the real
 * file from Supabase Storage (bucket "attachments", same
 * `<user_id>/<relative_path>` layout desktop's sync_manager.py uploads to)
 * and hand back a data: URL — this is what makes images that were added
 * on desktop (and synced down as lean local-path references) actually
 * render on web. Images pasted/inserted directly on web still get saved
 * inline as data: URLs in the note's content JSON rather than uploaded to
 * Storage — that upload direction (web → Storage) is the next piece of
 * attachment work, not done in this pass.
 */
const EditorFrame = forwardRef(function EditorFrame({ note, onReady }, ref) {
  const iframeRef = useRef(null)
  const readyRef = useRef(false)
  const saveTimerRef = useRef(null)
  const pendingSaveRef = useRef(null) // { noteId, json } — not yet flushed to Supabase
  const updateNote = useNoteStore((s) => s.updateNote)

  const postToIframe = useCallback((type, payload) => {
    iframeRef.current?.contentWindow?.postMessage({ source: 'galaxynote-host', type, ...payload }, '*')
  }, [])

  const respond = useCallback((callId, result) => {
    postToIframe('bridge-response', { callId, result })
  }, [postToIframe])

  // Saves immediately and clears the debounce — called both by the normal
  // 2s timer and by the flush-on-hide/unmount paths below, so a refresh or
  // note switch can't silently drop the last couple seconds of typing.
  const flushPendingSave = useCallback(() => {
    if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null }
    const pending = pendingSaveRef.current
    if (pending) {
      pendingSaveRef.current = null
      updateNote(pending.noteId, { content: pending.json })
    }
  }, [updateNote])

  useImperativeHandle(ref, () => ({
    // Calls window.editorCmd.<name>(...args) inside the iframe directly.
    exec(name, ...args) {
      const win = iframeRef.current?.contentWindow
      const fn = win?.editorCmd?.[name]
      if (typeof fn === 'function') fn.apply(win.editorCmd, args)
    },
    // Escape hatch for the one command that isn't an editorCmd method
    // (heading uses document.execCommand, same as desktop's insert_heading).
    execRaw(jsFn) {
      const win = iframeRef.current?.contentWindow
      if (win) jsFn(win)
    },
    isReady: () => readyRef.current,
    flushPendingSave,
  }), [flushPendingSave])

  // Flush before the tab actually disappears — `visibilitychange` fires
  // reliably before unload/refresh in every major browser (unlike
  // `beforeunload`, which can't be counted on to let an async save finish).
  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') flushPendingSave()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', flushPendingSave)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pagehide', flushPendingSave)
    }
  }, [flushPendingSave])

  // Flush when switching away from this note too (component unmounts on
  // note-switch since NoteEditorWidget is keyed by note.id).
  useEffect(() => () => flushPendingSave(), [flushPendingSave])

  useEffect(() => {
    function handleMessage(event) {
      const data = event.data
      if (!data || data.source !== 'galaxynote-editor') return

      if (data.type === 'shim-ready') return // nothing to do — wait for on_ready

      if (data.type === 'bridge-call') {
        const { method, args, callId } = data
        switch (method) {
          case 'on_ready':
            readyRef.current = true
            if (note) postToIframe('set-content', { content: note.content || '' })
            postToIframe('apply-theme', { theme: DARK_THEME })
            onReady?.()
            break

          case 'get_theme':
            respond(callId, DARK_THEME)
            break

          case 'on_change': {
            const json = args[0]
            if (note) pendingSaveRef.current = { noteId: note.id, json }
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
            saveTimerRef.current = setTimeout(flushPendingSave, AUTOSAVE_DELAY_MS)
            break
          }

          case 'log':
            console.log('[editor]', ...args)
            break

          case 'open_url':
            if (args[0]) window.open(args[0], '_blank', 'noopener,noreferrer')
            break

          // Pasted image: JS already has the bytes as a data: URL (or an
          // http(s) URL for images dragged in from another page). We upload
          // to Supabase Storage (same bucket/path convention as desktop's
          // sync_manager.py) and hand back both the data: URL (for instant
          // display) and the relative_path (so the note's saved JSON stays
          // lean — src gets blanked, only `local` persists — exactly like
          // desktop, and so desktop's own _pull_attachments() can discover
          // and download this file too).
          case 'request_save_pasted_image': {
            const [src, tempId] = args
            const win = iframeRef.current?.contentWindow
            if (src && src.startsWith('data:image')) {
              uploadImageBlob(dataUrlToBlob(src), note?.id)
                .then((relativePath) => win?.editorCmd?.updateImageSrc?.(tempId, src, relativePath))
                .catch((err) => {
                  console.warn('[attachments] upload thất bại, giữ tạm dạng inline:', err)
                  win?.editorCmd?.updateImageSrc?.(tempId, src, '')
                })
            } else if (src) {
              // http(s) source — try to fetch it client-side; CORS will
              // block this for most third-party sites (same limitation as
              // Import URL), so failure here is expected, not a bug.
              urlToDataUrl(src)
                .then((dataUrl) =>
                  uploadImageBlob(dataUrlToBlob(dataUrl), note?.id)
                    .then((relativePath) => win?.editorCmd?.updateImageSrc?.(tempId, dataUrl, relativePath))
                    .catch(() => win?.editorCmd?.updateImageSrc?.(tempId, dataUrl, ''))
                )
                .catch(() => win?.editorCmd?.updateImageSrc?.(tempId, '', ''))
            } else {
              win?.editorCmd?.updateImageSrc?.(tempId, '', '')
            }
            break
          }

          case 'download_and_save_image': {
            const [src, tempId] = args
            const win = iframeRef.current?.contentWindow
            urlToDataUrl(src)
              .then((dataUrl) =>
                uploadImageBlob(dataUrlToBlob(dataUrl), note?.id)
                  .then((relativePath) => win?.editorCmd?.updateImageSrc?.(tempId, dataUrl, relativePath))
                  .catch(() => win?.editorCmd?.updateImageSrc?.(tempId, dataUrl, ''))
              )
              .catch(() => win?.editorCmd?.updateImageSrc?.(tempId, '', ''))
            break
          }

          // Images/PDFs that were added on DESKTOP get saved as a lean
          // "local path" reference (src stripped to keep SQLite/Postgres
          // content small) — the real bytes live in Supabase Storage.
          // This downloads them and hands back a data: URL so they render.
          case 'request_image_data':
          case 'request_pdf_data': {
            const [relativePath] = args
            const uid = useAuthStore.getState().user?.id
            if (!uid || !relativePath) { respond(callId, ''); break }
            supabase.storage
              .from(STORAGE_BUCKET)
              .download(`${uid}/${relativePath}`)
              .then(({ data, error }) => {
                if (error || !data) { respond(callId, ''); return }
                return blobToDataUrl(data).then((dataUrl) => respond(callId, dataUrl))
              })
              .catch(() => respond(callId, ''))
            break
          }

          // Desktop's "open containing folder" (📂, only meaningful with a
          // local filesystem) becomes "download image" on web — the button
          // itself is relabeled 💾 by bridge_shim.js, this is where the
          // actual behavior differs. `path` is the image's dataset.local
          // value; we find that exact <img> in the iframe doc and download
          // whatever bytes it currently has (which, now that
          // request_image_data actually fetches from Storage, includes
          // images that were originally added on desktop too).
          case 'open_local_folder': {
            const [path] = args
            const win = iframeRef.current?.contentWindow
            const img = win?.document?.querySelector(`img[data-local="${CSS.escape(path || '')}"]`)
            const src = img?.getAttribute('src') || ''
            if (src.startsWith('data:')) {
              const ext = (src.match(/^data:image\/(\w+);/) || [, 'png'])[1]
              const a = document.createElement('a')
              a.href = src
              a.download = (path?.split('/').pop() || `image.${ext}`)
              document.body.appendChild(a)
              a.click()
              a.remove()
            } else {
              window.alert('Ảnh này chưa tải xong hoặc không tìm thấy trên Supabase Storage.')
            }
            break
          }

          // Not yet implemented on the web side — see note above. Left
          // unanswered so any awaiting callback simply never fires, which
          // the editor already treats as "no data available".
          case 'get_note_list':
          case 'on_task_toggle':
          case 'on_style_change':
          case 'request_delete_image':
          case 'copy_block_to_note':
          case 'request_copy':
          case 'trigger_edit_image_url':
            break

          default:
            break
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [note, postToIframe, respond, flushPendingSave, onReady])

  // When switching notes, push the new content in once the iframe is ready.
  useEffect(() => {
    if (readyRef.current && note) {
      postToIframe('set-content', { content: note.content || '' })
    }
  }, [note?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <iframe
      ref={iframeRef}
      key={note?.id ?? 'empty'}
      src="/editor/editor_template.html"
      title="GalaxyNote Editor"
      className="h-full w-full border-0"
      onLoad={() => { readyRef.current = false }}
    />
  )
})

export default EditorFrame

import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import { useNoteStore } from '../../stores/noteStore'

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
 * NOTE (Sprint 4 skeleton): pasted/inserted images now render immediately
 * (data: URLs are resolved client-side, see `request_save_pasted_image`
 * below) but aren't yet uploaded to Supabase Storage — they're stored
 * inline in the note's content JSON. That's fine for a handful of small
 * images; efficient storage + the `request_image_data` re-hydrate path
 * (for images synced down from desktop as lean local-path references)
 * is the next piece of attachment work, not done in this pass.
 */
const EditorFrame = forwardRef(function EditorFrame({ note, onReady }, ref) {
  const iframeRef = useRef(null)
  const readyRef = useRef(false)
  const saveTimerRef = useRef(null)
  const updateNote = useNoteStore((s) => s.updateNote)

  const postToIframe = useCallback((type, payload) => {
    iframeRef.current?.contentWindow?.postMessage({ source: 'galaxynote-host', type, ...payload }, '*')
  }, [])

  const respond = useCallback((callId, result) => {
    postToIframe('bridge-response', { callId, result })
  }, [postToIframe])

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
  }), [])

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
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
            saveTimerRef.current = setTimeout(() => {
              if (note) updateNote(note.id, { content: json })
            }, AUTOSAVE_DELAY_MS)
            break
          }

          case 'log':
            console.log('[editor]', ...args)
            break

          case 'open_url':
            if (args[0]) window.open(args[0], '_blank', 'noopener,noreferrer')
            break

          // Pasted image: JS already has the bytes as a data: URL (or an
          // http(s) URL for images dragged in from another page) and is
          // waiting for us to resolve the placeholder it created. Desktop
          // does this by saving to disk then calling back into JS via
          // editorCmd.updateImageSrc(tid, dataUrl, localPath). We don't have
          // Storage upload wired up yet, so we skip the "save to a lean
          // local path" step and just hand the data: URL straight back —
          // the image renders immediately, it just isn't deduplicated/
          // stored efficiently in Supabase Storage yet (that's the
          // "attachment upload" work still on the list).
          case 'request_save_pasted_image': {
            const [src, tempId] = args
            const win = iframeRef.current?.contentWindow
            if (src && src.startsWith('data:image')) {
              win?.editorCmd?.updateImageSrc?.(tempId, src, '')
            } else if (src) {
              // http(s) source — try to fetch it client-side; CORS will
              // block this for most third-party sites (same limitation as
              // Import URL), so failure here is expected, not a bug.
              fetch(src)
                .then((r) => r.blob())
                .then((blob) => new Promise((resolve, reject) => {
                  const reader = new FileReader()
                  reader.onload = () => resolve(reader.result)
                  reader.onerror = reject
                  reader.readAsDataURL(blob)
                }))
                .then((dataUrl) => win?.editorCmd?.updateImageSrc?.(tempId, dataUrl, ''))
                .catch(() => win?.editorCmd?.updateImageSrc?.(tempId, '', ''))
            } else {
              win?.editorCmd?.updateImageSrc?.(tempId, '', '')
            }
            break
          }

          case 'download_and_save_image': {
            const [src, tempId] = args
            const win = iframeRef.current?.contentWindow
            fetch(src)
              .then((r) => r.blob())
              .then((blob) => new Promise((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = () => resolve(reader.result)
                reader.onerror = reject
                reader.readAsDataURL(blob)
              }))
              .then((dataUrl) => win?.editorCmd?.updateImageSrc?.(tempId, dataUrl, ''))
              .catch(() => win?.editorCmd?.updateImageSrc?.(tempId, '', ''))
            break
          }

          // Desktop's "open containing folder" (📂, only meaningful with a
          // local filesystem) becomes "download image" on web — the button
          // itself is relabeled 💾 by bridge_shim.js, this is where the
          // actual behavior differs. `path` is the image's dataset.local
          // value; we find that exact <img> in the iframe doc and download
          // whatever bytes it currently has.
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
              // Image was synced down from desktop as a lean local-path
              // reference and never had its bytes fetched into the browser
              // (that needs the Supabase Storage download path, not built
              // yet) — nothing to save client-side yet.
              window.alert(
                'Ảnh này chưa được tải về trình duyệt (cần tính năng tải từ Supabase ' +
                'Storage, đang phát triển). Mở note trên bản desktop để xem/tải ảnh gốc.'
              )
            }
            break
          }

          // Not yet implemented on the web side — see note above. Left
          // unanswered so any awaiting callback simply never fires, which
          // the editor already treats as "no data available".
          case 'request_image_data':
          case 'request_pdf_data':
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
  }, [note, postToIframe, respond, updateNote, onReady])

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

import { useEffect, useRef, useCallback } from 'react'
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
 * NOTE (Sprint 4 skeleton): image/PDF attachment round-tripping
 * (`request_image_data`, `request_pdf_data`, `request_save_pasted_image`)
 * is not wired up yet — pasted images keep working via inline data: URLs,
 * but the Supabase Storage attachment sync from web comes in a follow-up
 * pass, mirroring the desktop attachment sync already in `sync_manager.py`.
 */
export default function EditorFrame({ note }) {
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

          // Not yet implemented on the web side — see note above. Left
          // unanswered so any awaiting callback simply never fires, which
          // the editor already treats as "no data available".
          case 'request_image_data':
          case 'request_pdf_data':
          case 'get_note_list':
          case 'on_task_toggle':
          case 'on_style_change':
          case 'request_save_pasted_image':
          case 'request_delete_image':
          case 'copy_block_to_note':
          case 'request_copy':
          case 'trigger_edit_image_url':
          case 'open_local_folder':
            break

          default:
            break
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [note, postToIframe, respond, updateNote])

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
}

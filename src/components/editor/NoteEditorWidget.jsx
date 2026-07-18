import { useEffect, useState, useRef, useCallback } from 'react'
import { Orbit } from 'lucide-react'
import EditorFrame from './EditorFrame'
import EditorToolbar from './EditorToolbar'
import TagChipsBar from './TagChipsBar'
import { useNoteStore } from '../../stores/noteStore'
import { useActiveEditorStore } from '../../stores/activeEditorStore'

export default function NoteEditorWidget({ note }) {
  const [title, setTitle] = useState(note?.title ?? '')
  const [ready, setReady] = useState(false)
  const updateNote = useNoteStore((s) => s.updateNote)
  const titleTimer = useRef(null)
  const editorRef = useRef(null)

  useEffect(() => { setTitle(note?.title ?? '') }, [note?.id])
  // The iframe fully reloads on note switch (EditorFrame keys it by note.id),
  // so the toolbar must go back to "disabled" until the new document fires
  // its own on_ready.
  useEffect(() => { setReady(false) }, [note?.id])

  const handleReady = useCallback(() => setReady(true), [])

  // Register this note's editor instance globally so TopBar → Edit →
  // Undo/Redo can reach it without prop-drilling through HomePage. Cleared
  // on unmount (component remounts on note switch since it's keyed by
  // note.id) so a stale ref never lingers after the user navigates away.
  useEffect(() => {
    useActiveEditorStore.getState().setEditor(editorRef.current)
    return () => useActiveEditorStore.getState().setEditor(null)
  }, [])
  useEffect(() => {
    useActiveEditorStore.getState().setReady(ready)
  }, [ready])

  function handleTitleChange(e) {
    const value = e.target.value
    setTitle(value)
    if (titleTimer.current) clearTimeout(titleTimer.current)
    titleTimer.current = setTimeout(() => {
      if (note) updateNote(note.id, { title: value || 'Untitled' })
    }, 500)
  }

  if (!note) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center gap-2 text-fg-mute">
        <Orbit size={28} className="text-line-2" />
        <p className="text-sm">Chọn một note ở sidebar, hoặc tạo note mới.</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-1 flex-col">
      <div className="px-8 pb-3 pt-6">
        <input
          value={title}
          onChange={handleTitleChange}
          placeholder="Untitled"
          className="w-full bg-transparent font-display text-2xl font-semibold text-fg outline-none placeholder:text-fg-mute"
        />
        <TagChipsBar noteId={note.id} />
      </div>
      <EditorToolbar editorRef={editorRef} ready={ready} noteId={note.id} />
      <div className="flex-1 overflow-hidden">
        <EditorFrame ref={editorRef} note={note} onReady={handleReady} />
      </div>
    </div>
  )
}

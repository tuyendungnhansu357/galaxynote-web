import { useEffect, useState, useRef, useCallback } from 'react'
import { Orbit } from 'lucide-react'
import EditorFrame from './EditorFrame'
import EditorToolbar from './EditorToolbar'
import FindBar from './FindBar'
import TagChipsBar from './TagChipsBar'
import { useNoteStore } from '../../stores/noteStore'
import { useActiveEditorStore } from '../../stores/activeEditorStore'
import { countWordsAndChars } from '../../lib/wordCount'

export default function NoteEditorWidget({ note }) {
  const [title, setTitle] = useState(note?.title ?? '')
  const [ready, setReady] = useState(false)
  const [findOpen, setFindOpen] = useState(false)
  const [findResult, setFindResult] = useState({ current: 0, total: 0 })
  const [wordCount, setWordCount] = useState({ words: 0, chars: 0 })
  const updateNote = useNoteStore((s) => s.updateNote)
  const titleTimer = useRef(null)
  const editorRef = useRef(null)
  const toolbarRef = useRef(null)

  useEffect(() => { setTitle(note?.title ?? '') }, [note?.id])
  // The iframe fully reloads on note switch (EditorFrame keys it by note.id),
  // so the toolbar must go back to "disabled" until the new document fires
  // its own on_ready.
  useEffect(() => { setReady(false) }, [note?.id])
  // Find bar doesn't carry over to a different note.
  useEffect(() => { setFindOpen(false); setFindResult({ current: 0, total: 0 }) }, [note?.id])
  // Word count from the note's saved content — refreshed live from the
  // editor's own on_change (see handleWordCount below) once the user edits.
  useEffect(() => { setWordCount(countWordsAndChars(note?.content)) }, [note?.id, note?.content])

  // Ctrl+F toggles the find bar — matches desktop's
  // sc_find = QShortcut(QKeySequence("Ctrl+F"), self) in note_editor.py.
  useEffect(() => {
    function onKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        setFindOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

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

  // The "/" slash-menu in editor_template.html calls
  // window.bridge.trigger_insert_image() etc. — same bridge-call mechanism
  // as everything else. Desktop's Python side answers these directly;
  // here EditorFrame relays them up to whichever toolbar method does the
  // same thing the matching toolbar button already does.
  const BRIDGE_TO_TOOLBAR = {
    trigger_insert_image: 'triggerInsertImage',
    trigger_insert_link: 'triggerInsertLink',
    trigger_insert_emoji: 'triggerInsertEmoji',
    trigger_insert_embed: 'triggerInsertEmbed',
    trigger_insert_pdf: 'triggerInsertPdf',
    on_slash_command: 'triggerBlockTemplates',
  }
  function handleBridgeTrigger(method) {
    const toolbarMethod = BRIDGE_TO_TOOLBAR[method]
    toolbarRef.current?.[toolbarMethod]?.()
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
      <EditorToolbar
        ref={toolbarRef}
        editorRef={editorRef}
        ready={ready}
        noteId={note.id}
        onToggleFind={() => setFindOpen((v) => !v)}
        findOpen={findOpen}
      />
      <FindBar
        editorRef={editorRef}
        open={findOpen}
        onClose={() => setFindOpen(false)}
        result={findResult}
      />
      <div className="flex-1 overflow-hidden">
        <EditorFrame
          ref={editorRef}
          note={note}
          onReady={handleReady}
          onFindResult={(current, total) => setFindResult({ current, total })}
          onBridgeTrigger={handleBridgeTrigger}
          onWordCount={setWordCount}
        />
      </div>
      <div className="border-t border-line px-8 py-1 text-right text-[11px] text-fg-mute">
        {wordCount.words.toLocaleString('vi-VN')} từ · {wordCount.chars.toLocaleString('vi-VN')} ký tự
      </div>
    </div>
  )
}

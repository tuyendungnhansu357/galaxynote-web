import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Orbit } from 'lucide-react'
import Sidebar from '../components/sidebar/Sidebar'
import NoteEditorWidget from '../components/editor/NoteEditorWidget'
import { useNotes } from '../hooks/useNotes'
import { useTags } from '../hooks/useTags'

export default function HomePage() {
  const { notes, activeNoteId, setActiveNoteId } = useNotes()
  const { noteTags } = useTags()
  const [activeTagId, setActiveTagId] = useState(null)

  const visibleNotes = useMemo(() => {
    if (!activeTagId) return notes
    const idsWithTag = new Set(
      noteTags.filter((nt) => nt.tag_id === activeTagId).map((nt) => nt.note_id)
    )
    return notes.filter((n) => idsWithTag.has(n.id))
  }, [notes, noteTags, activeTagId])

  const activeNote = notes.find((n) => n.id === activeNoteId) ?? null

  return (
    <div className="flex h-screen w-screen bg-bg">
      <Sidebar
        notes={visibleNotes}
        activeNoteId={activeNoteId}
        onSelectNote={setActiveNoteId}
        activeTagId={activeTagId}
        onFilterTag={setActiveTagId}
      />
      <main className="flex flex-1 flex-col">
        <div className="flex items-center justify-end gap-2 border-b border-line px-4 py-2">
          <Link
            to="/graph"
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-fg-faint hover:bg-panel-2 hover:text-fg"
          >
            <Orbit size={13} /> Galaxy 3D
          </Link>
        </div>
        <NoteEditorWidget note={activeNote} key={activeNote?.id ?? 'none'} />
      </main>
      {activeTagId && visibleNotes.length !== notes.length && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-line bg-panel px-4 py-1.5 text-xs text-fg-faint shadow-lg">
          Đang lọc theo tag — {visibleNotes.length} note
        </div>
      )}
    </div>
  )
}

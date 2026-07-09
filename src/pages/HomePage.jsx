import { useState, useMemo } from 'react'
import Sidebar from '../components/sidebar/Sidebar'
import NoteEditorWidget from '../components/editor/NoteEditorWidget'
import TopBar from '../components/topbar/TopBar'
import { useNotes } from '../hooks/useNotes'
import { useTags } from '../hooks/useTags'

export default function HomePage() {
  const { notes, activeNoteId, setActiveNoteId } = useNotes()
  const { noteTags } = useTags()
  const [activeTagId, setActiveTagId] = useState(null)
  const [sidebarVisible, setSidebarVisible] = useState(true)

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
      {sidebarVisible && (
        <Sidebar
          notes={visibleNotes}
          activeNoteId={activeNoteId}
          onSelectNote={setActiveNoteId}
          activeTagId={activeTagId}
          onFilterTag={setActiveTagId}
        />
      )}
      <main className="flex flex-1 flex-col overflow-hidden">
        <TopBar sidebarVisible={sidebarVisible} onToggleSidebar={() => setSidebarVisible((v) => !v)} />
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

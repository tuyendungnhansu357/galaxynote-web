import { useState, useMemo } from 'react'
import { Plus, Search, LogOut, Settings2, Clock, Pin, CalendarDays, Orbit, Files } from 'lucide-react'
import { useNoteStore } from '../../stores/noteStore'
import { useAuthStore } from '../../stores/authStore'
import { useTagStore } from '../../stores/tagStore'
import { useTasks } from '../../hooks/useTasks'
import { filterNotesByQuery } from '../../lib/searchQuery'
import NoteList from './NoteList'
import TagTree from './TagTree'
import TagManagerModal from './TagManagerModal'
import TaskListPanel from './TaskListPanel'

const RECENT_LIMIT = 30 // matches desktop's note_manager.get_recent_notes() default

const QUICK_FILTERS = [
  { key: 'all', label: 'All Notes', icon: Files },
  { key: 'recent', label: 'Recent', icon: Clock },
  { key: 'pinned', label: 'Pinned', icon: Pin },
  { key: 'daily', label: 'Daily', icon: CalendarDays },
  { key: 'orphans', label: 'Orphans', icon: Orbit },
]

// Web port of core/note_manager.py's get_recent_notes / get_pinned_notes /
// get_orphan_notes (no-tags-assigned) / daily-notes filter.
function applyQuickFilter(notes, key, noteTags) {
  switch (key) {
    case 'recent':
      return [...notes]
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
        .slice(0, RECENT_LIMIT)
    case 'pinned':
      return notes.filter((n) => n.is_pinned)
    case 'daily':
      return notes
        .filter((n) => n.content_mode === 'daily')
        .sort((a, b) => (b.daily_date || '').localeCompare(a.daily_date || ''))
    case 'orphans': {
      const notesWithTags = new Set(noteTags.map((nt) => nt.note_id))
      return notes.filter((n) => !notesWithTags.has(n.id))
    }
    default:
      return notes
  }
}

export default function Sidebar({ notes: notesProp, activeNoteId, onSelectNote, activeTagId, onFilterTag }) {
  const [tab, setTab] = useState('notes') // 'notes' | 'tags' | 'tasks'
  const [quickFilter, setQuickFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [tagManagerOpen, setTagManagerOpen] = useState(false)
  const { notes: allNotes, createNote } = useNoteStore()
  const { user, signOut } = useAuthStore()
  const { tags, noteTags } = useTagStore()
  const { tasks } = useTasks()

  const tagsByName = useMemo(
    () => new Map(tags.map((t) => [t.name.toLowerCase(), t.id])),
    [tags]
  )

  const baseNotes = notesProp ?? allNotes
  const quickFiltered = useMemo(
    () => applyQuickFilter(baseNotes, quickFilter, noteTags),
    [baseNotes, quickFilter, noteTags]
  )
  const filtered = filterNotesByQuery(quickFiltered, query, noteTags, tagsByName, tasks)

  function handleQuickFilter(key) {
    setQuickFilter(key)
    setTab('notes')
  }

  async function handleNewNote() {
    const note = await createNote()
    if (note) onSelectNote(note.id)
  }

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-line bg-panel">
      <div className="flex items-center gap-2 border-b border-line px-3 py-3">
        <div className="relative flex h-6 w-6 items-center justify-center">
          <span className="h-2 w-2 rounded-full bg-star shadow-[0_0_10px_2px_rgba(79,142,247,0.6)]" />
        </div>
        <span className="font-display text-sm font-semibold text-fg">GalaxyNote</span>
      </div>

      <div className="border-b border-line px-3 py-2">
        <div className="flex items-center gap-2 rounded-lg border border-line bg-bg px-2.5 py-1.5">
          <Search size={13} className="text-fg-mute" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm note… (#tag, pinned:yes, done:no)"
            title="Hỗ trợ: từ khoá thường, #tag (nhiều #tag = AND), pinned:yes/no, done:yes/no"
            className="w-full bg-transparent text-sm text-fg outline-none placeholder:text-fg-mute"
          />
        </div>
      </div>

      <div className="border-b border-line px-2 py-2">
        {QUICK_FILTERS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => handleQuickFilter(key)}
            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition ${
              tab === 'notes' && quickFilter === key ? 'bg-panel-2 text-fg' : 'text-fg-dim hover:bg-panel-2/60'
            }`}
          >
            <Icon size={13} className="shrink-0 text-fg-mute" />
            {label}
          </button>
        ))}
      </div>

      <div className="flex border-b border-line px-3 pt-2 text-sm">
        {['notes', 'tags', 'tasks'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`mr-4 border-b-2 pb-2 transition ${
              tab === t ? 'border-star text-fg' : 'border-transparent text-fg-mute hover:text-fg-faint'
            }`}
          >
            {t === 'notes' ? 'Notes' : t === 'tags' ? 'Tags' : 'Tasks'}
          </button>
        ))}
      </div>

      <div className={tab === 'tasks' ? 'flex-1 overflow-hidden' : 'flex-1 overflow-y-auto py-2'}>
        {tab === 'notes' && <NoteList notes={filtered} activeNoteId={activeNoteId} onSelect={onSelectNote} />}
        {tab === 'tags' && <TagTree activeTagId={activeTagId} onFilterTag={onFilterTag} />}
        {tab === 'tasks' && <TaskListPanel onSelectNote={onSelectNote} />}
      </div>

      {tab === 'notes' && (
        <div className="border-t border-line p-2">
          <button
            onClick={handleNewNote}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-star py-2 text-sm font-medium text-white transition hover:brightness-110"
          >
            <Plus size={14} /> Note mới
          </button>
        </div>
      )}

      {tab === 'tags' && (
        <div className="border-t border-line p-2">
          <button
            onClick={() => setTagManagerOpen(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-line-2 py-2 text-sm font-medium text-fg-dim transition hover:bg-panel-2"
          >
            <Settings2 size={14} /> Quản lý Tag
          </button>
        </div>
      )}

      {tagManagerOpen && <TagManagerModal onClose={() => setTagManagerOpen(false)} />}

      <div className="flex items-center justify-between border-t border-line px-3 py-2">
        <span className="truncate font-mono text-[11px] text-fg-mute">{user?.email}</span>
        <button onClick={signOut} title="Đăng xuất" className="rounded p-1 text-fg-mute hover:text-flare">
          <LogOut size={14} />
        </button>
      </div>
    </aside>
  )
}

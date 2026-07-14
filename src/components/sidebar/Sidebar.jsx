import { useState, useMemo } from 'react'
import { Plus, Search, LogOut, Settings2, Info } from 'lucide-react'
import { useNoteStore } from '../../stores/noteStore'
import { useAuthStore } from '../../stores/authStore'
import { useTagStore } from '../../stores/tagStore'
import { parseSearchQuery, filterNotesByQuery } from '../../lib/searchQuery'
import NoteList from './NoteList'
import TagTree from './TagTree'
import TagManagerModal from './TagManagerModal'

export default function Sidebar({ notes: notesProp, activeNoteId, onSelectNote, activeTagId, onFilterTag }) {
  const [tab, setTab] = useState('notes') // 'notes' | 'tags'
  const [query, setQuery] = useState('')
  const [tagManagerOpen, setTagManagerOpen] = useState(false)
  const { notes: allNotes, createNote } = useNoteStore()
  const { user, signOut } = useAuthStore()
  const { tags, noteTags } = useTagStore()

  const tagsByName = useMemo(
    () => new Map(tags.map((t) => [t.name.toLowerCase(), t.id])),
    [tags]
  )

  const baseNotes = notesProp ?? allNotes
  const filtered = filterNotesByQuery(baseNotes, query, noteTags, tagsByName)
  const { hasUnsupportedDoneToken } = parseSearchQuery(query)

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
            placeholder="Tìm note… (#tag, pinned:yes)"
            title="Hỗ trợ: từ khoá thường, #tag (nhiều #tag = AND), pinned:yes/no"
            className="w-full bg-transparent text-sm text-fg outline-none placeholder:text-fg-mute"
          />
        </div>
        {hasUnsupportedDoneToken && (
          <p className="mt-1.5 flex items-center gap-1 text-[11px] text-dwarf">
            <Info size={11} /> "done:" chưa hỗ trợ trên web — bỏ qua điều kiện đó.
          </p>
        )}
      </div>

      <div className="flex border-b border-line px-3 pt-2 text-sm">
        {['notes', 'tags'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`mr-4 border-b-2 pb-2 transition ${
              tab === t ? 'border-star text-fg' : 'border-transparent text-fg-mute hover:text-fg-faint'
            }`}
          >
            {t === 'notes' ? 'Notes' : 'Tags'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {tab === 'notes' ? (
          <NoteList notes={filtered} activeNoteId={activeNoteId} onSelect={onSelectNote} />
        ) : (
          <TagTree activeTagId={activeTagId} onFilterTag={onFilterTag} />
        )}
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

import { Pin, Trash2, FileText } from 'lucide-react'
import { useNoteStore } from '../../stores/noteStore'

export default function NoteList({ notes, activeNoteId, onSelect }) {
  const { togglePin, deleteNote } = useNoteStore()

  if (!notes.length) {
    return (
      <div className="px-4 py-8 text-center text-sm text-fg-mute">
        Chưa có note nào. Bấm <span className="text-fg-faint">"+ Note mới"</span> để bắt đầu.
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-0.5 px-2">
      {notes.map((n) => (
        <li key={n.id}>
          <button
            onClick={() => onSelect(n.id)}
            className={`group flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition
              ${n.id === activeNoteId ? 'bg-panel-2 text-fg' : 'text-fg-dim hover:bg-panel-2/60'}`}
          >
            <FileText size={14} className="shrink-0 text-fg-mute" />
            <span className="flex-1 truncate">{n.title || 'Untitled'}</span>
            {n.is_pinned && <Pin size={12} className="shrink-0 fill-dwarf text-dwarf" />}
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => { e.stopPropagation(); togglePin(n.id, !n.is_pinned) }}
              className="hidden shrink-0 rounded p-1 text-fg-mute hover:text-dwarf group-hover:inline-flex"
              title={n.is_pinned ? 'Bỏ ghim' : 'Ghim note'}
            >
              <Pin size={12} />
            </span>
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => { e.stopPropagation(); if (confirm('Xoá note này?')) deleteNote(n.id) }}
              className="hidden shrink-0 rounded p-1 text-fg-mute hover:text-flare group-hover:inline-flex"
              title="Xoá note"
            >
              <Trash2 size={12} />
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

import { useMemo } from 'react'
import { X, FileText } from 'lucide-react'
import { useNoteStore } from '../../stores/noteStore'
import { useLinkStore } from '../../stores/linkStore'

/**
 * Web port of ui/backlinks_panel.py. Desktop parses `[[wiki links]]` out of
 * note content (core/parser.py) and stores them in the `links` table as it
 * saves — that parser isn't ported to the web editor yet, so links created
 * *on desktop* show up here correctly (the `links` table syncs like
 * everything else), but typing `[[Note Title]]` directly in the web editor
 * won't yet create a new link row. Existing links work either direction.
 */
export default function BacklinksPanel({ noteId, onSelectNote, onClose }) {
  const { notes } = useNoteStore()
  const { links } = useLinkStore()

  const backlinkNotes = useMemo(() => {
    if (!noteId) return []
    const sourceIds = new Set(
      links.filter((l) => l.target_note_id === noteId).map((l) => l.source_note_id)
    )
    return notes
      .filter((n) => sourceIds.has(n.id))
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
  }, [links, notes, noteId])

  return (
    <aside className="flex h-full w-[240px] shrink-0 flex-col border-l border-line bg-panel">
      <div className="flex items-center justify-between px-3.5 py-2.5">
        <span className="font-mono text-[11px] font-semibold tracking-wide text-fg-faint">
          BACKLINKS
        </span>
        <button onClick={onClose} className="rounded p-1 text-fg-mute hover:text-fg" title="Ẩn panel Backlinks">
          <X size={14} />
        </button>
      </div>
      <p className="px-3.5 pb-1.5 text-xs text-fg-mute">
        {backlinkNotes.length} reference{backlinkNotes.length !== 1 ? 's' : ''}
      </p>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {backlinkNotes.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-fg-mute">
            Chưa có note nào [[liên kết]] tới note này.
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {backlinkNotes.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => onSelectNote(n.id)}
                  title={n.title}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-fg-dim transition hover:bg-panel-2"
                >
                  <FileText size={13} className="shrink-0 text-fg-mute" />
                  <span className="truncate">{n.title || 'Untitled'}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}

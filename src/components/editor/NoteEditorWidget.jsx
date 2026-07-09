import { useEffect, useState, useRef } from 'react'
import { Orbit } from 'lucide-react'
import EditorFrame from './EditorFrame'
import { useNoteStore } from '../../stores/noteStore'
import { useTagStore } from '../../stores/tagStore'

export default function NoteEditorWidget({ note }) {
  const [title, setTitle] = useState(note?.title ?? '')
  const updateNote = useNoteStore((s) => s.updateNote)
  const { tags, noteTags } = useTagStore()
  const titleTimer = useRef(null)

  useEffect(() => { setTitle(note?.title ?? '') }, [note?.id])

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

  const noteTagIds = new Set(noteTags.filter((nt) => nt.note_id === note.id).map((nt) => nt.tag_id))
  const chips = tags.filter((t) => noteTagIds.has(t.id))

  return (
    <div className="flex h-full flex-1 flex-col">
      <div className="border-b border-line px-8 pb-3 pt-6">
        <input
          value={title}
          onChange={handleTitleChange}
          placeholder="Untitled"
          className="w-full bg-transparent font-display text-2xl font-semibold text-fg outline-none placeholder:text-fg-mute"
        />
        {chips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {chips.map((t) => (
              <span
                key={t.id}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{ backgroundColor: `${t.color}22`, color: t.color }}
              >
                {t.icon} {t.name}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        <EditorFrame note={note} />
      </div>
    </div>
  )
}

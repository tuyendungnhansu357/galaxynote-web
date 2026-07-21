import { useEffect, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useTagStore } from '../../stores/tagStore'

export default function TagChipsBar({ noteId }) {
  const { tags, noteTags, assignTagToNote, removeTagFromNote, createTag } = useTagStore()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef(null)
  const inputRef = useRef(null)

  const attachedIds = new Set(noteTags.filter((nt) => nt.note_id === noteId).map((nt) => nt.tag_id))
  const chips = tags.filter((t) => attachedIds.has(t.id))
  const candidates = tags.filter(
    (t) => !attachedIds.has(t.id) && t.name.toLowerCase().includes(query.trim().toLowerCase())
  )
  const exactMatch = tags.some((t) => t.name.toLowerCase() === query.trim().toLowerCase())

  useEffect(() => {
    if (!pickerOpen) return
    inputRef.current?.focus()
    function onDocClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) { setPickerOpen(false); setQuery('') }
    }
    function onKey(e) { if (e.key === 'Escape') { setPickerOpen(false); setQuery('') } }
    // Same fix as MenuDropdown: a click inside the note's <iframe> never
    // bubbles to this document, so onDocClick alone can't see it — window
    // fires 'blur' when focus moves into the iframe instead.
    function onWindowBlur() { setPickerOpen(false); setQuery('') }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    window.addEventListener('blur', onWindowBlur)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('blur', onWindowBlur)
    }
  }, [pickerOpen])

  async function handlePick(tagId) {
    await assignTagToNote(noteId, tagId)
    setQuery('')
    inputRef.current?.focus()
  }

  async function handleCreateAndAttach() {
    const name = query.trim()
    if (!name) return
    const tag = await createTag({ name })
    if (tag) await assignTagToNote(noteId, tag.id)
    setQuery('')
    inputRef.current?.focus()
  }

  return (
    <div ref={rootRef} className="relative mt-3 flex flex-wrap items-center gap-1.5">
      {chips.map((t) => (
        <span
          key={t.id}
          className="group inline-flex items-center gap-1 rounded-full py-0.5 pl-2.5 pr-1 text-xs font-medium"
          style={{ backgroundColor: `${t.color}22`, color: t.color }}
        >
          {t.icon} {t.name}
          <button
            onClick={() => removeTagFromNote(noteId, t.id)}
            className="rounded-full p-0.5 opacity-0 transition group-hover:opacity-100 hover:bg-black/20"
            title="Gỡ tag khỏi note"
          >
            <X size={11} />
          </button>
        </span>
      ))}

      <button
        onClick={() => setPickerOpen((v) => !v)}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-line-2 text-fg-mute transition hover:border-star hover:text-star"
        title="Gắn tag"
      >
        <Plus size={12} />
      </button>

      {pickerOpen && (
        <div className="absolute left-0 top-full z-30 mt-1.5 w-64 rounded-lg border border-line bg-panel p-2 shadow-xl">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !exactMatch && query.trim()) handleCreateAndAttach() }}
            placeholder="Tìm hoặc tạo tag…"
            className="mb-1.5 w-full rounded-md border border-line bg-bg px-2 py-1.5 text-xs text-fg outline-none focus:border-star"
          />
          <div className="max-h-48 overflow-y-auto">
            {candidates.map((t) => (
              <button
                key={t.id}
                onClick={() => handlePick(t.id)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-fg-dim hover:bg-panel-2"
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: t.color }} />
                {t.icon} {t.name}
              </button>
            ))}
            {query.trim() && !exactMatch && (
              <button
                onClick={handleCreateAndAttach}
                className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs text-star hover:bg-panel-2"
              >
                <Plus size={12} /> Tạo tag "{query.trim()}"
              </button>
            )}
            {!candidates.length && !query.trim() && (
              <p className="px-2 py-1.5 text-xs text-fg-mute">Gõ để tìm tag có sẵn hoặc tạo mới.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

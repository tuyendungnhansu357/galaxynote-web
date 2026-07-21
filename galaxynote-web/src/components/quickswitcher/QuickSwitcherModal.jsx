import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useQuickSwitcherStore } from '../../stores/quickSwitcherStore'
import { useNoteStore } from '../../stores/noteStore'
import { useTagStore } from '../../stores/tagStore'

const RECENTS_LIMIT = 20 // matches quick_switcher.py's nm.get_recent_notes(20)
const RESULTS_LIMIT = 20 // matches quick_switcher.py's search_mod.search(q, limit=20)

// Web port of ui/quick_switcher.py — same behaviour:
//   - Ctrl+K opens it from anywhere (registered globally here)
//   - empty query → 20 most recently updated notes
//   - "#foo" prefix → tag search instead of notes (tag_selected path)
//   - plain text → title substring match (desktop's FTS5 search.py isn't
//     available client-side, so this mirrors quick_switcher.py's own
//     fallback branch: title substring, not full content search — an
//     honest gap, not a silent one)
//   - ↑/↓ navigate, Enter opens, Esc closes
export default function QuickSwitcherModal() {
  const navigate = useNavigate()
  const isOpen = useQuickSwitcherStore((s) => s.isOpen)
  const close = useQuickSwitcherStore((s) => s.close)

  const notes = useNoteStore((s) => s.notes)
  const setActiveNoteId = useNoteStore((s) => s.setActiveNoteId)
  const tags = useTagStore((s) => s.tags)
  const setActiveTagId = useTagStore((s) => s.setActiveTagId)

  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef(null)

  // Global Ctrl+K — works from Home or Galaxy, matches desktop's
  // act_qs.setShortcut("Ctrl+K") wired at the main-window level.
  useEffect(() => {
    function onKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        useQuickSwitcherStore.getState().toggle()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Reset to a fresh "recents" view every time it's opened, and focus the
  // input — matches quick_switcher.py's showEvent().
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelected(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [isOpen])

  const results = useMemo(() => {
    const q = query.trim()

    if (q.startsWith('#')) {
      const tagQ = q.slice(1).toLowerCase()
      const matches = tags
        .filter((t) => t.name.toLowerCase().includes(tagQ))
        .slice(0, 15)
      return { kind: 'tag', items: matches }
    }

    if (!q) {
      const recents = [...notes]
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
        .slice(0, RECENTS_LIMIT)
      return { kind: 'note', items: recents }
    }

    const ql = q.toLowerCase()
    const matches = notes
      .filter((n) => (n.title || 'untitled').toLowerCase().includes(ql))
      .slice(0, RESULTS_LIMIT)
    return { kind: 'note', items: matches }
  }, [query, notes, tags])

  useEffect(() => setSelected(0), [results])

  function accept(index = selected) {
    const item = results.items[index]
    if (!item) return
    if (results.kind === 'tag') {
      setActiveTagId(item.id)
    } else {
      setActiveNoteId(item.id)
    }
    navigate('/')
    close()
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      close()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected((i) => Math.min(i + 1, results.items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      accept()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-[15vh] backdrop-blur-sm"
      onClick={close}
    >
      <div
        className="w-[580px] max-w-[90vw] overflow-hidden rounded-xl border border-line-2 bg-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3">
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-mute" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Jump to note, tag… (Esc to close)"
              className="h-10 w-full rounded-lg border border-line-2 bg-bg pl-9 pr-3 text-sm text-fg outline-none focus:border-star"
            />
          </div>
        </div>

        <div className="max-h-[420px] overflow-y-auto px-2 pb-2">
          {results.items.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-fg-mute">
              {results.kind === 'tag' ? 'No tags found' : 'No notes found'}
            </p>
          )}

          {results.kind === 'tag'
            ? results.items.map((t, i) => (
                <button
                  key={t.id}
                  onClick={() => accept(i)}
                  onMouseEnter={() => setSelected(i)}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${
                    i === selected ? 'bg-panel-2 text-fg' : 'text-fg-dim'
                  }`}
                >
                  <span
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px]"
                    style={{ backgroundColor: t.color || '#4f8ef7' }}
                  >
                    {t.icon || '🏷'}
                  </span>
                  {t.name}
                </button>
              ))
            : results.items.map((n, i) => (
                <button
                  key={n.id}
                  onClick={() => accept(i)}
                  onMouseEnter={() => setSelected(i)}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${
                    i === selected ? 'bg-panel-2 text-fg' : 'text-fg-dim'
                  }`}
                >
                  <span className="shrink-0">{n.content_mode === 'daily' ? '📅' : '📝'}</span>
                  <span className="truncate">{n.title || 'Untitled'}</span>
                </button>
              ))}
        </div>

        <div className="border-t border-line px-3 py-2 text-center text-[10px] text-fg-mute">
          ↑↓ navigate  ↵ open  Esc close  •  prefix # for tags
        </div>
      </div>
    </div>
  )
}

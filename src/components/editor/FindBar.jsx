import { useEffect, useRef, useState } from 'react'
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react'

// Web port of ui/note_editor.py's FindBar. The actual search/highlight logic
// already lives in editor_template.html (editorCmd.findText/findNext/
// findPrev/clearFind) — shared verbatim with desktop — so this component is
// just the chrome around it: input, match counter, prev/next, case-sensitive
// toggle, close. Counter updates arrive via the editor's on_find_result
// bridge call, relayed through EditorFrame's onFindResult prop.
export default function FindBar({ editorRef, open, onClose, result }) {
  const [query, setQuery] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      })
      if (query.trim()) editorRef.current?.exec('findText', query, caseSensitive)
    } else {
      editorRef.current?.exec('clearFind')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function runSearch(text, cs) {
    if (!text.trim()) {
      editorRef.current?.exec('clearFind')
      return
    }
    editorRef.current?.exec('findText', text, cs)
  }

  function handleChange(e) {
    const value = e.target.value
    setQuery(value)
    runSearch(value, caseSensitive)
  }

  function toggleCase() {
    const next = !caseSensitive
    setCaseSensitive(next)
    runSearch(query, next)
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (e.shiftKey) editorRef.current?.exec('findPrev')
      else editorRef.current?.exec('findNext')
    }
  }

  if (!open) return null

  const counterText = !query.trim() ? '' : result.total === 0 ? 'No match' : `${result.current}/${result.total}`

  return (
    <div className="flex items-center gap-1.5 border-b border-line bg-panel px-3 py-1.5">
      <span className="flex items-center gap-1 text-xs font-semibold text-star">
        <Search size={12} /> Find:
      </span>
      <input
        ref={inputRef}
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Search in note…"
        className="h-7 w-56 rounded-md border border-line-2 bg-bg px-2 text-xs text-fg outline-none focus:border-star"
      />
      <span className={`w-14 text-center text-[11px] ${counterText === 'No match' ? 'text-flare' : 'text-fg-mute'}`}>
        {counterText}
      </span>
      <button
        onClick={() => editorRef.current?.exec('findPrev')}
        title="Previous match (Shift+Enter)"
        className="flex h-7 w-7 items-center justify-center rounded-md text-fg-dim hover:bg-panel-2"
      >
        <ChevronUp size={14} />
      </button>
      <button
        onClick={() => editorRef.current?.exec('findNext')}
        title="Next match (Enter)"
        className="flex h-7 w-7 items-center justify-center rounded-md text-fg-dim hover:bg-panel-2"
      >
        <ChevronDown size={14} />
      </button>
      <button
        onClick={toggleCase}
        title="Case sensitive"
        className={`flex h-7 w-8 items-center justify-center rounded-md text-xs font-semibold ${
          caseSensitive ? 'bg-star/20 text-star' : 'text-fg-dim hover:bg-panel-2'
        }`}
      >
        Aa
      </button>
      <div className="flex-1" />
      <button
        onClick={onClose}
        title="Close (Esc)"
        className="flex h-6 w-6 items-center justify-center rounded-md text-fg-mute hover:bg-panel-2 hover:text-fg"
      >
        <X size={13} />
      </button>
    </div>
  )
}

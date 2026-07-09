import { useEffect, useRef, useState } from 'react'

/**
 * Minimal click-to-open dropdown, closes on outside click or Escape.
 * `items`: [{ label, shortcut?, onClick, disabled? }] — pass `null` for a divider.
 */
export default function MenuDropdown({ label, items }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    function onKey(e) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`rounded px-2 py-1 text-xs transition ${open ? 'bg-panel-2 text-fg' : 'text-fg-faint hover:text-fg'}`}
      >
        {label}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 min-w-[200px] rounded-lg border border-line bg-panel py-1 shadow-xl">
          {items.map((item, i) =>
            item === null ? (
              <div key={i} className="my-1 h-px bg-line" />
            ) : (
              <button
                key={item.label}
                disabled={item.disabled}
                onClick={() => { setOpen(false); item.onClick?.() }}
                className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs text-fg-dim hover:bg-panel-2 hover:text-fg disabled:opacity-40"
              >
                <span>{item.label}</span>
                {item.shortcut && <span className="font-mono text-[10px] text-fg-mute">{item.shortcut}</span>}
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Settings, Save } from 'lucide-react'
import { useTemplateStore, CATEGORY_LABELS, CATEGORY_ORDER } from '../../stores/templateStore'

// Web port of ui/note_editor.py::_open_template_picker() — categorized
// quick-insert list, plus "Manage Templates…" and "Save current as
// Template…" at the bottom. Triggered from the toolbar's 📋 button AND
// from the "/" slash-menu's "Block Templates" entry (both call
// EditorToolbar.triggerBlockTemplates(), which opens this).
//
// Rendered through a portal to document.body with position:fixed, computed
// from `anchorRef`'s on-screen position. It used to render as a plain
// position:absolute child inside the toolbar's button row — that row has
// overflow-x-auto (added so toolbar buttons scroll into view instead of
// getting clipped on narrow windows), and per the CSS overflow spec,
// setting overflow-x to anything but visible makes overflow-y compute to
// auto too. That silently clipped this dropdown at the row's own bottom
// edge, so it was invisible/inert instead of "underneath" the note as
// such — a portal escapes that ancestor's clipping entirely.
export default function TemplatePickerMenu({ anchorRef, onClose, onPick, onManage, onSaveCurrent }) {
  const { templates } = useTemplateStore()
  const menuRef = useRef(null)
  const [pos, setPos] = useState(null)

  useLayoutEffect(() => {
    function place() {
      const r = anchorRef.current?.getBoundingClientRect()
      if (!r) return
      const menuWidth = 288 // w-72
      // Prefer opening below the button; flip above if it would overflow
      // the bottom of the viewport. Clamp horizontally so it never runs
      // off the right edge either.
      const spaceBelow = window.innerHeight - r.bottom
      const openUp = spaceBelow < 320 && r.top > 320
      setPos({
        left: Math.min(r.left, window.innerWidth - menuWidth - 8),
        top: openUp ? undefined : r.bottom + 6,
        bottom: openUp ? window.innerHeight - r.top + 6 : undefined,
      })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [anchorRef])

  useEffect(() => {
    function onClickOutside(e) {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        anchorRef.current && !anchorRef.current.contains(e.target)
      ) onClose()
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [onClose, anchorRef])

  if (!pos) return null

  const byCategory = {}
  for (const t of templates) {
    ;(byCategory[t.category] ??= []).push(t)
  }

  return createPortal(
    <div
      ref={menuRef}
      style={{ position: 'fixed', left: pos.left, top: pos.top, bottom: pos.bottom }}
      className="z-[200] max-h-96 w-72 overflow-y-auto rounded-lg border border-line-2 bg-panel p-1.5 shadow-2xl"
    >
      <p className="px-2 py-1.5 text-xs font-semibold text-star">📋 Chọn Template</p>

      {templates.length === 0 && (
        <p className="px-2 py-3 text-center text-xs text-fg-mute">Chưa có template nào</p>
      )}

      {CATEGORY_ORDER.map((cat) => {
        const items = byCategory[cat]
        if (!items?.length) return null
        return (
          <div key={cat} className="mb-1">
            <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-fg-mute">
              {CATEGORY_LABELS[cat]}
            </p>
            {items.map((t) => (
              <button
                key={t.id}
                onClick={() => { onPick(t.content_json); onClose() }}
                title={t.description || ''}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-fg-dim hover:bg-panel-2"
              >
                <span className="shrink-0">{t.icon || '📋'}</span>
                <span className="truncate">{t.name}</span>
              </button>
            ))}
          </div>
        )
      })}

      <div className="my-1 h-px bg-line" />

      <button
        onClick={() => { onManage(); onClose() }}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-fg-dim hover:bg-panel-2"
      >
        <Settings size={14} /> Quản lý Templates…
      </button>
      <button
        onClick={() => { onSaveCurrent(); onClose() }}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-fg-dim hover:bg-panel-2"
      >
        <Save size={14} /> Lưu nội dung hiện tại làm Template…
      </button>
    </div>,
    document.body
  )
}

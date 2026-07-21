import { useState } from 'react'
import { X } from 'lucide-react'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../../stores/templateStore'
import Button from '../ui/Button'
import Input from '../ui/Input'

// Web port of ui/note_editor.py::_save_as_template() — captures the
// currently-open note's content as a new reusable template.
export default function SaveAsTemplateModal({ onClose, onSave }) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('📋')
  const [category, setCategory] = useState('custom')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    await onSave({ name: name.trim(), icon: icon.trim() || '📋', category, description: description.trim() })
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-[420px] overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-base font-semibold text-fg">💾 Lưu làm Template</h2>
          <button onClick={onClose} className="rounded-md p-1 text-fg-mute hover:bg-panel-2 hover:text-fg">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="flex gap-2">
            <Input
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="📋"
              className="w-14 text-center"
            />
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tên template…"
              className="flex-1"
            />
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-md border border-line-2 bg-panel-2 px-3 py-2 text-sm text-fg-dim outline-none focus:border-star"
          >
            {CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>

          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả ngắn (tuỳ chọn)…"
          />

          <p className="text-[11px] text-fg-mute">
            Toàn bộ nội dung note đang mở sẽ được lưu làm template này.
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
          <Button variant="ghost" onClick={onClose}>Hủy</Button>
          <Button onClick={handleSave} disabled={!name.trim() || saving}>
            {saving ? 'Đang lưu…' : '💾 Lưu Template'}
          </Button>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { X } from 'lucide-react'
import { useHomeSettingsStore } from '../../stores/homeSettingsStore'
import Button from '../ui/Button'
import Input from '../ui/Input'

// Web port of main_window.py::_open_settings() — same 3 fields, same order:
// display name (home greeting), clock style (digital/analog), quote list
// (one per line, one picked at random each time the dashboard loads).
export default function SettingsModal({ onClose }) {
  const { userName, clockStyle, quotes, save } = useHomeSettingsStore()
  const [name, setName] = useState(userName)
  const [style, setStyle] = useState(clockStyle)
  const [quoteText, setQuoteText] = useState(quotes.join('\n'))

  function handleSave() {
    save({
      userName: name,
      clockStyle: style,
      quotes: quoteText.split('\n').map((q) => q.trim()).filter(Boolean),
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-[480px] flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="font-display text-base font-semibold text-fg">⚙️ Cài đặt GalaxyNote</h2>
          <button onClick={onClose} className="rounded-md p-1 text-fg-mute hover:bg-panel-2 hover:text-fg">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold text-fg-faint">
              Tên hiển thị (lời chào trang chủ)
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Tony, Vinh, Bạn ơi…"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold text-fg-faint">
              Kiểu đồng hồ trang chủ
            </label>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="w-full rounded-md border border-line-2 bg-panel-2 px-3 py-2 text-sm text-fg-dim outline-none focus:border-star"
            >
              <option value="digital">🔢 Số (Digital)</option>
              <option value="round">🕐 Kim (Analog)</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold text-fg-faint">
              Danh sách quotes (mỗi dòng một câu, random mỗi lần mở app)
            </label>
            <textarea
              value={quoteText}
              onChange={(e) => setQuoteText(e.target.value)}
              placeholder="Mỗi dòng là một câu quote…"
              className="h-40 w-full resize-none rounded-md border border-line-2 bg-panel-2 px-3 py-2 text-sm text-fg-dim outline-none focus:border-star"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
          <Button variant="ghost" onClick={onClose}>Hủy</Button>
          <Button onClick={handleSave}>💾 Lưu cài đặt</Button>
        </div>
      </div>
    </div>
  )
}

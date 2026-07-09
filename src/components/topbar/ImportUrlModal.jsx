import { useState } from 'react'
import { X, Globe, AlertTriangle } from 'lucide-react'
import { useNoteStore } from '../../stores/noteStore'
import Input from '../ui/Input'

/**
 * Web port of core/url_importer.py. Unlike desktop (which fetches with no
 * browser sandbox), a browser tab can only read a URL's response if that
 * server sends CORS headers allowing it — most sites don't. This is a real
 * platform limitation, not a bug: we attempt the fetch, and fail loudly
 * with a clear explanation rather than pretending it silently worked.
 */
export default function ImportUrlModal({ onClose, onImported }) {
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const createNote = useNoteStore((s) => s.createNote)

  function stripToText(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    doc.querySelectorAll('script,style,noscript').forEach((el) => el.remove())
    const title = doc.querySelector('title')?.textContent?.trim() || url
    const body = doc.body?.textContent?.replace(/\n{3,}/g, '\n\n').trim() || ''
    return { title, body }
  }

  async function handleImport(e) {
    e.preventDefault()
    if (!url.trim()) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(url.trim())
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const html = await res.text()
      const { title, body } = stripToText(html)
      const paragraphs = body.split('\n').filter(Boolean).slice(0, 200)
      const blockHtml = paragraphs.map((p) => `<p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>`).join('')
      const note = await createNote({
        title,
        content: JSON.stringify({ v: 4, blocks: [{ t: 'text', html: blockHtml, bg: '', block_id: crypto.randomUUID() }] }),
      })
      if (note) { onImported?.(note.id); onClose() }
    } catch (err) {
      setError(
        `Không tải được trang này từ trình duyệt (${err.message}). Hầu hết website chặn ` +
        `CORS nên fetch trực tiếp từ web app sẽ lỗi — cần một server proxy để làm việc này ` +
        `đáng tin cậy, chưa có trong bản này.`
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[440px] rounded-2xl border border-line bg-panel p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold text-fg">Import từ URL</h2>
          <button onClick={onClose} className="rounded p-1 text-fg-mute hover:text-fg"><X size={16} /></button>
        </div>

        <form onSubmit={handleImport}>
          <label className="mb-1 block text-xs font-medium text-fg-faint">URL trang web</label>
          <div className="mb-3 flex gap-2">
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
            <button
              type="submit"
              disabled={busy || !url.trim()}
              className="shrink-0 rounded-lg bg-star px-3 text-sm font-medium text-white disabled:opacity-40"
            >
              {busy ? '…' : 'Import'}
            </button>
          </div>

          {error && (
            <div className="flex gap-2 rounded-lg border border-dwarf/30 bg-dwarf/10 px-3 py-2 text-[11px] leading-relaxed text-dwarf">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </form>

        <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-fg-mute">
          <Globe size={12} className="mt-0.5 shrink-0" />
          Chỉ hoạt động với trang cho phép CORS công khai (vd một số blog, docs site).
          Với hầu hết báo/mạng xã hội, thử sẽ báo lỗi ở trên — đó là giới hạn trình duyệt, không phải bug.
        </p>
      </div>
    </div>
  )
}

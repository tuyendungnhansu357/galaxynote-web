import { useRef, useState } from 'react'
import { X, FileCode } from 'lucide-react'
import { useNoteStore } from '../../stores/noteStore'
import { htmlFileToBlockJson, extractTitle } from '../../lib/htmlImporter'

/**
 * New feature — desktop has no HTML import at all (only Markdown/URL), and
 * web didn't either until now. Understands two kinds of .html file:
 *   1. One this app exported (htmlExport.js) — reconstructs the ORIGINAL
 *      blocks exactly via the embedded data-gn-json, so a note round-trips
 *      (export from Desktop or Web → import into the other) with almost no
 *      loss: real bold/italic, toggles, tasks, tables, callouts, images all
 *      survive, not just plain paragraphs.
 *   2. Any other HTML page/file — falls back to a generic conversion
 *      (headings/paragraphs/lists → text, table → table block, img →
 *      image, blockquote → quote, pre → code, details → toggle).
 */
export default function ImportHtmlModal({ onClose, onImported }) {
  const fileRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [fileName, setFileName] = useState(null)
  const createNote = useNoteStore((s) => s.createNote)

  function pickFile() { fileRef.current?.click() }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setFileName(file.name)
    setBusy(true)
    try {
      const text = await file.text()
      const fallbackTitle = file.name.replace(/\.html?$/i, '') || 'Imported note'
      const title = extractTitle(text, fallbackTitle)
      const content = htmlFileToBlockJson(text)
      const note = await createNote({ title, content })
      if (note) { onImported?.(note.id); onClose() }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[420px] rounded-2xl border border-line bg-panel p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold text-fg">Import HTML</h2>
          <button onClick={onClose} className="rounded p-1 text-fg-mute hover:text-fg"><X size={16} /></button>
        </div>

        <input ref={fileRef} type="file" accept=".html,.htm,text/html" hidden onChange={handleFile} />

        <button
          onClick={pickFile}
          disabled={busy}
          className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-line-2 py-8 text-sm text-fg-faint transition hover:border-star hover:text-fg disabled:opacity-50"
        >
          <FileCode size={22} />
          {busy ? `Đang import ${fileName}…` : 'Chọn file .html'}
        </button>

        <p className="mt-3 text-[11px] leading-relaxed text-fg-mute">
          File .html do chính GalaxyNote xuất ra (Desktop hoặc Web) sẽ được khôi phục gần như
          nguyên vẹn — bold/italic thật, toggle, task, bảng, callout, ảnh đều giữ lại. File HTML
          khác (trang web bất kỳ) sẽ được chuyển đổi cơ bản: heading/đoạn văn/list/bảng/ảnh/quote.
        </p>
      </div>
    </div>
  )
}

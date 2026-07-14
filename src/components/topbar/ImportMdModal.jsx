import { useRef, useState } from 'react'
import { X, FileText } from 'lucide-react'
import { useNoteStore } from '../../stores/noteStore'
import { simpleMarkdownToHtml, htmlToBlockJson } from '../../lib/simpleMarkdown'

/**
 * Web port of the desktop's core/md_importer.py — deliberately basic for
 * this pass. Only headings/bold/italic/links/lists/paragraphs convert
 * cleanly; everything else (tables, nested blocks, images referenced by
 * relative path) lands as plain text. Good enough to get content in and
 * keep editing from there.
 */
export default function ImportMdModal({ onClose, onImported }) {
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
    const text = await file.text()
    const html = simpleMarkdownToHtml(text)
    const title = file.name.replace(/\.md$/i, '') || 'Imported note'
    const note = await createNote({ title, content: htmlToBlockJson(html) })
    setBusy(false)
    if (note) { onImported?.(note.id); onClose() }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[420px] rounded-2xl border border-line bg-panel p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold text-fg">Import Markdown</h2>
          <button onClick={onClose} className="rounded p-1 text-fg-mute hover:text-fg"><X size={16} /></button>
        </div>

        <input ref={fileRef} type="file" accept=".md,text/markdown" hidden onChange={handleFile} />

        <button
          onClick={pickFile}
          disabled={busy}
          className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-line-2 py-8 text-sm text-fg-faint transition hover:border-star hover:text-fg disabled:opacity-50"
        >
          <FileText size={22} />
          {busy ? `Đang import ${fileName}…` : 'Chọn file .md'}
        </button>

        <p className="mt-3 text-[11px] leading-relaxed text-fg-mute">
          Bản cơ bản: chuyển heading/in đậm/in nghiêng/link/list/đoạn văn. Bảng, block lồng
          nhau, ảnh tham chiếu theo đường dẫn tương đối sẽ không convert đầy đủ ở bản này.
        </p>
      </div>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { X, FolderDown } from 'lucide-react'
import JSZip from 'jszip'
import { useNoteStore } from '../../stores/noteStore'
import { useTagStore } from '../../stores/tagStore'
import { exportNoteMarkdown } from '../../lib/export'
import Button from '../ui/Button'

// Web port of ui/main_window.py's _export_all() / _export_by_tag(): both
// walk core/export.py::export_note_markdown() over a set of notes and
// write one .md file each. Desktop writes straight to a chosen folder;
// a browser can't do that, so this zips the files (JSZip) and downloads
// one .zip instead — same output files, different delivery mechanism.

function safeFilename(title) {
  return (title || 'Untitled').replace(/[^\w\s-]/g, '').slice(0, 60).trim() || 'Untitled'
}

// Mirrors core/tag_manager.py::get_all_descendants() — notes_by_tag on
// desktop defaults to include_children=True, so exporting "by tag" here
// also walks the tag's descendants via tag_relations, not just direct hits.
function collectDescendantIds(rootId, relations) {
  const ids = new Set([rootId])
  const queue = [rootId]
  while (queue.length) {
    const cur = queue.pop()
    for (const r of relations) {
      if (r.parent_id === cur && !ids.has(r.child_id)) {
        ids.add(r.child_id)
        queue.push(r.child_id)
      }
    }
  }
  return ids
}

export default function ExportAllModal({ onClose }) {
  const { notes } = useNoteStore()
  const { tags, relations, noteTags } = useTagStore()
  const [mode, setMode] = useState('all') // 'all' | 'tag'
  const [tagId, setTagId] = useState(tags[0]?.id ?? '')
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')

  const matchCount = useMemo(() => {
    const base = notes.filter((n) => !n.is_archived && !n.is_deleted)
    if (mode === 'all') return base.length
    if (!tagId) return 0
    const tagIds = collectDescendantIds(tagId, relations)
    const noteIds = new Set(noteTags.filter((nt) => tagIds.has(nt.tag_id)).map((nt) => nt.note_id))
    return base.filter((n) => noteIds.has(n.id)).length
  }, [notes, mode, tagId, relations, noteTags])

  async function handleExport() {
    setError('')
    const base = notes.filter((n) => !n.is_archived && !n.is_deleted)
    let toExport = base
    if (mode === 'tag') {
      if (!tagId) { setError('Chọn một tag trước đã.'); return }
      const tagIds = collectDescendantIds(tagId, relations)
      const noteIds = new Set(noteTags.filter((nt) => tagIds.has(nt.tag_id)).map((nt) => nt.note_id))
      toExport = base.filter((n) => noteIds.has(n.id))
    }
    if (!toExport.length) { setError('Không có note nào để export.'); return }

    setExporting(true)
    try {
      const zip = new JSZip()
      const usedNames = new Map()
      for (const note of toExport) {
        const base = safeFilename(note.title)
        const n = (usedNames.get(base) ?? 0) + 1
        usedNames.set(base, n)
        const filename = n > 1 ? `${base} (${n}).md` : `${base}.md`
        zip.file(filename, exportNoteMarkdown(note))
      }
      const blob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = mode === 'all'
        ? 'GalaxyNote-export-all.zip'
        : `GalaxyNote-export-${safeFilename(tags.find((t) => t.id === tagId)?.name)}.zip`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      onClose()
    } catch (e) {
      setError(e?.message || 'Export thất bại.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[420px] rounded-2xl border border-line bg-panel p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-fg">
            <FolderDown size={16} /> Export Notes
          </h2>
          <button onClick={onClose} className="rounded p-1 text-fg-mute hover:text-fg">
            <X size={16} />
          </button>
        </div>

        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setMode('all')}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm transition ${
              mode === 'all' ? 'border-star bg-panel-2 text-fg' : 'border-line text-fg-dim hover:bg-panel-2/60'
            }`}
          >
            Tất cả notes
          </button>
          <button
            onClick={() => setMode('tag')}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm transition ${
              mode === 'tag' ? 'border-star bg-panel-2 text-fg' : 'border-line text-fg-dim hover:bg-panel-2/60'
            }`}
          >
            Theo Tag
          </button>
        </div>

        {mode === 'tag' && (
          <div className="mb-4">
            {tags.length === 0 ? (
              <p className="text-xs text-fg-mute">Chưa có tag nào.</p>
            ) : (
              <select
                value={tagId}
                onChange={(e) => setTagId(e.target.value)}
                className="w-full rounded-md border border-line bg-bg px-2.5 py-2 text-sm text-fg-dim outline-none"
              >
                {tags.map((t) => (
                  <option key={t.id} value={t.id}>{t.icon ? `${t.icon} ` : ''}{t.name}</option>
                ))}
              </select>
            )}
            <p className="mt-1.5 text-[11px] text-fg-mute">Bao gồm cả tag con của tag được chọn.</p>
          </div>
        )}

        <p className="mb-4 text-xs text-fg-mute">
          {matchCount} note sẽ được xuất thành file <code>.md</code>, đóng gói vào 1 file <code>.zip</code>.
        </p>

        {error && <p className="mb-3 text-xs text-flare">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Huỷ</Button>
          <Button onClick={handleExport} loading={exporting} disabled={exporting || matchCount === 0}>
            Export .zip
          </Button>
        </div>
      </div>
    </div>
  )
}

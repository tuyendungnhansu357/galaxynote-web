import { useEffect, useState } from 'react'
import { X, ImageOff } from 'lucide-react'
import { useNoteStore } from '../../stores/noteStore'
import { findOrphanAttachments, deleteOrphanAttachments } from '../../lib/attachments'
import Button from '../ui/Button'

// Web port of ui/main_window.py::_cleanup_imported_images() +
// core/attachment_cleanup.py. Scope note: desktop only scans its
// attachments/imported/ subfolder (files downloaded during URL import);
// web has no such split (every image is one flat attachments
// table + Storage bucket), so this scans ALL attachment rows for the
// user, not just ones from URL imports. Also doesn't show a file-size
// total like desktop's dialog does — Supabase Storage doesn't expose
// that without a per-object metadata call, not worth the round-trips for
// this dialog.
export default function CleanupImagesModal({ onClose }) {
  const notes = useNoteStore((s) => s.notes)
  const [state, setState] = useState('loading') // loading | scanned | deleting | done
  const [total, setTotal] = useState(0)
  const [orphans, setOrphans] = useState([])
  const [removed, setRemoved] = useState(0)

  useEffect(() => {
    let cancelled = false
    findOrphanAttachments(notes).then(({ orphans, total }) => {
      if (cancelled) return
      setOrphans(orphans)
      setTotal(total)
      setState('scanned')
    })
    return () => { cancelled = true }
  }, [notes])

  async function handleDelete() {
    setState('deleting')
    const count = await deleteOrphanAttachments(orphans)
    setRemoved(count)
    setState('done')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-[420px] rounded-2xl border border-line bg-panel p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-fg">
            <ImageOff size={16} /> Dọn ảnh đã import
          </h2>
          <button onClick={onClose} className="rounded p-1 text-fg-mute hover:text-fg"><X size={16} /></button>
        </div>

        {state === 'loading' && (
          <p className="py-6 text-center text-sm text-fg-mute">Đang quét ảnh…</p>
        )}

        {state === 'scanned' && total === 0 && (
          <p className="py-4 text-sm text-fg-dim">Chưa có ảnh nào được tải lên.</p>
        )}

        {state === 'scanned' && total > 0 && orphans.length === 0 && (
          <p className="py-4 text-sm text-fg-dim">
            Tất cả <b className="text-fg">{total}</b> ảnh đều đang được dùng trong ít nhất 1 note.
            Không có file nào cần xóa.
          </p>
        )}

        {state === 'scanned' && orphans.length > 0 && (
          <>
            <p className="py-2 text-sm leading-relaxed text-fg-dim">
              Hiện có <b className="text-fg">{total}</b> ảnh, trong đó{' '}
              <b className="text-flare">{orphans.length}</b> ảnh không còn được dùng trong bất kỳ
              note nào.
            </p>
            <p className="mb-2 text-sm text-fg-dim">Xóa {orphans.length} ảnh orphan này?</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={onClose}>Hủy</Button>
              <Button variant="danger" onClick={handleDelete}>Xóa {orphans.length} ảnh</Button>
            </div>
          </>
        )}

        {state === 'deleting' && (
          <p className="py-6 text-center text-sm text-fg-mute">Đang xóa…</p>
        )}

        {state === 'done' && (
          <>
            <p className="py-4 text-sm text-fg-dim">
              Đã xóa <b className="text-fg">{removed}</b> ảnh không còn sử dụng.
            </p>
            <div className="flex justify-end">
              <Button onClick={onClose}>Đóng</Button>
            </div>
          </>
        )}

        {(state === 'scanned' && (total === 0 || (total > 0 && orphans.length === 0))) && (
          <div className="mt-2 flex justify-end">
            <Button onClick={onClose}>Đóng</Button>
          </div>
        )}
      </div>
    </div>
  )
}

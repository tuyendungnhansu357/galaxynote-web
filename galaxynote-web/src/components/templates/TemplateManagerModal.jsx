import { useEffect, useRef, useState } from 'react'
import { X, Plus, Trash2, Search } from 'lucide-react'
import { useTemplateStore, CATEGORY_LABELS, CATEGORY_ORDER } from '../../stores/templateStore'
import EditorFrame from '../editor/EditorFrame'
import Button from '../ui/Button'
import Input from '../ui/Input'

const EMPTY_CONTENT = '{"v":4,"blocks":[]}'

// Web port of ui/template_manager_dialog.py — left panel: searchable/
// filterable list + New/Delete. Right panel: icon/name/category/
// description fields, an embedded block editor (the SAME EditorFrame the
// real note editor uses, in "standalone" mode via onContentChange so
// edits are captured locally instead of autosaving to the real `notes`
// table), and Use/Save actions.
export default function TemplateManagerModal({ onClose, onUseTemplate }) {
  const { templates, createTemplate, updateTemplate, deleteTemplate } = useTemplateStore()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState({ name: '', icon: '📋', category: 'custom', description: '' })
  const [draftContent, setDraftContent] = useState(EMPTY_CONTENT)
  const editorRef = useRef(null)

  // Select the first template on open so there's always something to look
  // at, rather than an empty editor with nothing selected.
  useEffect(() => {
    if (!selectedId && templates.length) selectTemplate(templates[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates.length])

  function selectTemplate(t) {
    setSelectedId(t.id)
    setForm({ name: t.name || '', icon: t.icon || '📋', category: t.category || 'custom', description: t.description || '' })
    setDraftContent(t.content_json || EMPTY_CONTENT)
  }

  const filtered = templates.filter((t) => {
    if (categoryFilter && t.category !== categoryFilter) return false
    const q = search.toLowerCase().trim()
    if (q && !t.name.toLowerCase().includes(q) && !(t.description || '').toLowerCase().includes(q)) return false
    return true
  })

  async function handleNew() {
    const t = await createTemplate({})
    if (t) selectTemplate(t)
  }

  async function handleDelete() {
    if (!selectedId) return
    if (!window.confirm('Bạn có chắc muốn xóa template này không?')) return
    await deleteTemplate(selectedId)
    setSelectedId(null)
    setDraftContent(EMPTY_CONTENT)
  }

  async function handleSave() {
    if (!selectedId) return
    await updateTemplate(selectedId, { ...form, content_json: draftContent })
  }

  function handleUse() {
    if (!draftContent) return
    onUseTemplate(draftContent)
    onClose()
  }

  const selected = templates.find((t) => t.id === selectedId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex h-[640px] w-[1020px] max-w-[95vw] overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left panel: list */}
        <div className="flex w-64 shrink-0 flex-col border-r border-line p-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-fg">📋 Block Templates</h2>
            <button onClick={onClose} className="rounded-md p-1 text-fg-mute hover:bg-panel-2 hover:text-fg">
              <X size={16} />
            </button>
          </div>

          <div className="relative mb-2">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-mute" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm template…"
              className="w-full rounded-md border border-line bg-bg py-1.5 pl-7 pr-2 text-xs text-fg outline-none focus:border-star"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="mb-2 w-full rounded-md border border-line-2 bg-panel-2 px-2 py-1.5 text-xs text-fg-dim outline-none focus:border-star"
          >
            <option value="">Tất cả danh mục</option>
            {CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>

          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="px-2 py-6 text-center text-xs text-fg-mute">(Không có template)</p>
            )}
            {filtered.map((t) => (
              <button
                key={t.id}
                onClick={() => selectTemplate(t)}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
                  t.id === selectedId ? 'bg-panel-2 text-fg' : 'text-fg-dim hover:bg-panel-2'
                }`}
              >
                <span className="shrink-0">{t.icon || '📋'}</span>
                <span className="truncate">{t.name}</span>
              </button>
            ))}
          </div>

          <div className="mt-2 flex gap-1.5">
            <Button variant="outline" className="flex-1 !px-2 !py-1.5 text-xs" onClick={handleNew}>
              <Plus size={13} /> Tạo mới
            </Button>
            <Button variant="danger" className="flex-1 !px-2 !py-1.5 text-xs" onClick={handleDelete} disabled={!selectedId}>
              <Trash2 size={13} /> Xóa
            </Button>
          </div>
        </div>

        {/* Right panel: editor */}
        <div className="flex flex-1 flex-col overflow-hidden p-4">
          {selected ? (
            <>
              <div className="mb-2 flex gap-2">
                <Input
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  placeholder="📋"
                  className="w-14 text-center"
                />
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Tên template…"
                  className="flex-1"
                />
              </div>
              <div className="mb-3 flex gap-2">
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-40 rounded-md border border-line-2 bg-panel-2 px-2 py-2 text-sm text-fg-dim outline-none focus:border-star"
                >
                  {CATEGORY_ORDER.map((c) => (
                    <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                  ))}
                </select>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Mô tả ngắn (tuỳ chọn)…"
                  className="flex-1"
                />
              </div>

              <p className="mb-1.5 text-xs font-medium text-fg-faint">
                📝 Nội dung template — soạn như viết note bình thường:
              </p>
              <div className="mb-3 flex-1 overflow-hidden rounded-lg border border-line">
                <EditorFrame
                  key={selectedId}
                  ref={editorRef}
                  note={{ id: selectedId, content: draftContent }}
                  onContentChange={setDraftContent}
                />
              </div>

              <div className="flex justify-between">
                <Button onClick={handleUse}>⚡ Dùng template này</Button>
                <Button variant="outline" onClick={handleSave}>💾 Lưu thay đổi</Button>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-fg-mute">
              Chưa có template nào — bấm "＋ Tạo mới" để bắt đầu.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

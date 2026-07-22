import { useState, useMemo } from 'react'
import { X, Plus, Trash2, Orbit, Combine, Wand2, Search } from 'lucide-react'
import { useTagStore } from '../../stores/tagStore'
import { useTaskStore } from '../../stores/taskStore'
import Button from '../ui/Button'
import Input from '../ui/Input'

// Same 12 swatches as ui/tag_manager_dialog.py::PRESET_COLORS — keep these
// in sync so a tag looks the same shade whether it was colored on desktop
// or on web.
const PRESET_COLORS = [
  '#4f8ef7', '#7c6af7', '#4ec994', '#f0c060',
  '#e05c6a', '#ff8c3c', '#e879b8', '#4eccd4',
  '#a0c840', '#f07060', '#60a8e0', '#c890e0',
]

export default function TagManagerModal({ onClose }) {
  const { tags, relations, noteTags, createTag, updateTag, deleteTag, addRelation, removeRelation, mergeTags, mergeDuplicateTags } = useTagStore()
  const [selectedId, setSelectedId] = useState(tags[0]?.id ?? null)
  const [draft, setDraft] = useState(null) // local edit buffer, null = viewing selected as-is
  const [search, setSearch] = useState('')
  const [addParentId, setAddParentId] = useState('')
  const [addChildId, setAddChildId] = useState('')
  const [mergeTargetId, setMergeTargetId] = useState('')
  const [merging, setMerging] = useState(false)
  const [dedupeRunning, setDedupeRunning] = useState(false)

  // Alphabetical everywhere a tag shows up in this modal (list + all three
  // dropdowns) rather than raw insertion order. This matters more as the
  // tag count grows: it makes the left list scannable, and it's what makes
  // a <select>'s native "type a letter to jump" behavior actually useful
  // once there are dozens/hundreds of tags in a dropdown.
  const sortedTags = useMemo(
    () => [...tags].sort((a, b) => a.name.localeCompare(b.name)),
    [tags]
  )
  const filteredTags = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return sortedTags
    return sortedTags.filter((t) => t.name.toLowerCase().includes(q))
  }, [sortedTags, search])

  const selected = tags.find((t) => t.id === selectedId) ?? null
  const form = draft ?? selected

  const parents = useMemo(
    () => (selectedId ? relations.filter((r) => r.child_id === selectedId).map((r) => tags.find((t) => t.id === r.parent_id)).filter(Boolean) : []),
    [relations, tags, selectedId]
  )
  const children = useMemo(
    () => (selectedId ? relations.filter((r) => r.parent_id === selectedId).map((r) => tags.find((t) => t.id === r.child_id)).filter(Boolean) : []),
    [relations, tags, selectedId]
  )
  const noteCount = useMemo(
    () => (selectedId ? noteTags.filter((nt) => nt.tag_id === selectedId).length : 0),
    [noteTags, selectedId]
  )
  const tasks = useTaskStore((s) => s.tasks)
  const taskCount = useMemo(
    () => (selectedId ? tasks.filter((t) => t.tag_id === selectedId).length : 0),
    [tasks, selectedId]
  )

  function select(id) {
    setSelectedId(id)
    setDraft(null)
  }

  function patchDraft(patch) {
    setDraft({ ...(draft ?? selected), ...patch })
  }

  async function handleNewTag() {
    const tag = await createTag({ name: 'tag-moi' })
    if (tag) select(tag.id)
  }

  async function handleDedupe() {
    setDedupeRunning(true)
    const count = await mergeDuplicateTags()
    setDedupeRunning(false)
    alert(count > 0 ? `Đã gộp ${count} tag trùng tên.` : 'Không tìm thấy tag nào trùng tên.')
  }

  async function handleSave() {
    if (!selected || !draft) return
    await updateTag(selected.id, {
      name: draft.name.trim().toLowerCase().replace(/\s+/g, '-'),
      color: draft.color,
      icon: draft.icon,
      description: draft.description,
      is_space: draft.is_space,
    })
    setDraft(null)
  }

  async function handleDelete() {
    if (!selected) return
    if (!confirm(`Xoá tag "${selected.name}"? Thao tác này sẽ gỡ tag khỏi mọi note.`)) return
    await deleteTag(selected.id)
    setSelectedId(tags.find((t) => t.id !== selected.id)?.id ?? null)
  }

  async function handleMerge() {
    if (!selected || !mergeTargetId) return
    const targetTag = tags.find((t) => t.id === mergeTargetId)
    if (!confirm(`Gộp "${selected.name}" vào "${targetTag?.name}"? Mọi note/task đang gắn "${selected.name}" sẽ chuyển sang "${targetTag?.name}", và "${selected.name}" sẽ bị xoá. Không thể hoàn tác.`)) return
    setMerging(true)
    const ok = await mergeTags(selected.id, mergeTargetId)
    setMerging(false)
    if (ok) {
      setMergeTargetId('')
      setSelectedId(mergeTargetId)
    }
  }

  const availableParents = sortedTags.filter(
    (t) => t.id !== selectedId && !parents.some((p) => p.id === t.id)
  )
  const availableChildren = sortedTags.filter(
    (t) => t.id !== selectedId && !children.some((c) => c.id === t.id)
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="flex h-[85vh] max-h-[780px] w-[900px] max-w-[94vw] overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl">
        {/* Left: tag list */}
        <div className="flex w-[280px] shrink-0 flex-col border-r border-line">
          <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
            <h2 className="font-display text-sm font-semibold text-fg">Quản lý Tag</h2>
            <span className="text-[11px] text-fg-mute">{tags.length} tag</span>
          </div>
          <div className="border-b border-line p-2">
            <div className="relative">
              <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-mute" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm tag…"
                className="w-full rounded-md border border-line bg-bg py-1.5 pl-7 pr-2 text-xs text-fg-dim outline-none focus:border-star"
              />
            </div>
          </div>
          <ul className="flex-1 overflow-y-auto p-1.5">
            {filteredTags.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => select(t.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition ${
                    t.id === selectedId ? 'bg-panel-2 text-fg' : 'text-fg-dim hover:bg-panel-2/60'
                  }`}
                >
                  {t.is_space ? (
                    <Orbit size={13} style={{ color: t.color }} />
                  ) : (
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: t.color }} />
                  )}
                  <span className="truncate">{t.icon ? `${t.icon} ` : ''}{t.name}</span>
                </button>
              </li>
            ))}
            {filteredTags.length === 0 && (
              <li className="px-2.5 py-4 text-center text-xs text-fg-mute">Không tìm thấy tag nào.</li>
            )}
          </ul>
          <div className="border-t border-line p-2 space-y-1.5">
            <Button variant="outline" onClick={handleNewTag} className="w-full">
              <Plus size={14} /> Tag mới
            </Button>
            <Button variant="outline" onClick={handleDedupe} loading={dedupeRunning} className="w-full">
              <Wand2 size={14} /> Dọn tag trùng tên
            </Button>
          </div>
        </div>

        {/* Right: edit form */}
        <div className="flex flex-1 flex-col">
          <div className="flex items-center justify-end border-b border-line px-3 py-2.5">
            <button onClick={onClose} className="rounded p-1 text-fg-mute hover:text-fg">
              <X size={16} />
            </button>
          </div>

          {!form ? (
            <div className="flex flex-1 items-center justify-center text-sm text-fg-mute">
              Chọn hoặc tạo một tag để chỉnh sửa.
            </div>
          ) : (
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-faint">Tên tag</label>
                <Input value={form.name} onChange={(e) => patchDraft({ name: e.target.value })} />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-fg-faint">Màu</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => patchDraft({ color: c })}
                      className={`h-6 w-6 rounded-md transition ${form.color === c ? 'ring-2 ring-offset-2 ring-offset-panel ring-fg' : ''}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => patchDraft({ color: e.target.value })}
                    className="h-6 w-6 cursor-pointer rounded-md border border-line bg-transparent"
                    title="Màu tuỳ chỉnh"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-24">
                  <label className="mb-1 block text-xs font-medium text-fg-faint">Icon</label>
                  <Input value={form.icon ?? ''} onChange={(e) => patchDraft({ icon: e.target.value })} placeholder="🪐" />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-fg-faint">Mô tả</label>
                  <Input value={form.description ?? ''} onChange={(e) => patchDraft({ description: e.target.value })} />
                </div>
              </div>

              <label className="flex items-center gap-2 rounded-lg border border-line bg-bg px-3 py-2 text-sm text-fg-dim">
                <input
                  type="checkbox"
                  checked={!!form.is_space}
                  onChange={(e) => patchDraft({ is_space: e.target.checked })}
                  className="h-4 w-4 accent-star"
                />
                <Orbit size={14} className="text-star" />
                Space tag (hành tinh trung tâm trong Galaxy)
              </label>

              <p className="text-xs text-fg-mute">{noteCount} note, {taskCount} task</p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-fg-faint">Parent (tag cha)</label>
                  <ul className="mb-2 space-y-1">
                    {parents.map((p) => (
                      <li key={p.id} className="flex items-center justify-between rounded-md bg-bg px-2 py-1 text-xs text-fg-dim">
                        <span className="truncate">{p.icon} {p.name}</span>
                        <button onClick={() => removeRelation(p.id, selectedId)} className="text-fg-mute hover:text-flare">
                          <X size={12} />
                        </button>
                      </li>
                    ))}
                    {parents.length === 0 && <li className="text-xs text-fg-mute">Chưa có parent — đây là tag gốc.</li>}
                  </ul>
                  {availableParents.length > 0 && (
                    <div className="flex gap-1.5">
                      <select
                        value={addParentId}
                        onChange={(e) => setAddParentId(e.target.value)}
                        className="w-full rounded-md border border-line bg-bg px-2 py-1 text-xs text-fg-dim outline-none"
                      >
                        <option value="">+ Chọn tag làm parent…</option>
                        {availableParents.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                      <button
                        disabled={!addParentId}
                        onClick={() => { addRelation(addParentId, selectedId); setAddParentId('') }}
                        className="shrink-0 rounded-md bg-panel-2 px-2 text-xs text-fg-dim disabled:opacity-40"
                      >
                        Nối
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-fg-faint">Children (tag con)</label>
                  <ul className="mb-2 space-y-1">
                    {children.map((c) => (
                      <li key={c.id} className="flex items-center justify-between rounded-md bg-bg px-2 py-1 text-xs text-fg-dim">
                        <span className="truncate">{c.icon} {c.name}</span>
                        <button onClick={() => removeRelation(selectedId, c.id)} className="text-fg-mute hover:text-flare">
                          <X size={12} />
                        </button>
                      </li>
                    ))}
                    {children.length === 0 && <li className="text-xs text-fg-mute">Chưa có tag con nào.</li>}
                  </ul>
                  {availableChildren.length > 0 && (
                    <div className="flex gap-1.5">
                      <select
                        value={addChildId}
                        onChange={(e) => setAddChildId(e.target.value)}
                        className="w-full rounded-md border border-line bg-bg px-2 py-1 text-xs text-fg-dim outline-none"
                      >
                        <option value="">+ Chọn tag làm con…</option>
                        {availableChildren.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                      <button
                        disabled={!addChildId}
                        onClick={() => { addRelation(selectedId, addChildId); setAddChildId('') }}
                        className="shrink-0 rounded-md bg-panel-2 px-2 text-xs text-fg-dim disabled:opacity-40"
                      >
                        Nối
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-line-2 bg-bg p-3">
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-fg-faint">
                  <Combine size={13} /> Gộp tag này vào tag khác
                </label>
                <p className="mb-2 text-[11px] leading-relaxed text-fg-mute">
                  Mọi note/task đang gắn <strong className="text-fg-dim">{form.name}</strong> sẽ chuyển sang tag đích,
                  rồi <strong className="text-fg-dim">{form.name}</strong> bị xoá. Không thể hoàn tác.
                </p>
                <div className="flex gap-1.5">
                  <select
                    value={mergeTargetId}
                    onChange={(e) => setMergeTargetId(e.target.value)}
                    className="w-full rounded-md border border-line bg-panel px-2 py-1.5 text-xs text-fg-dim outline-none"
                  >
                    <option value="">+ Gộp vào tag…</option>
                    {sortedTags.filter((t) => t.id !== selectedId).map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  <Button
                    variant="danger"
                    disabled={!mergeTargetId || merging}
                    loading={merging}
                    onClick={handleMerge}
                    className="shrink-0"
                  >
                    Gộp
                  </Button>
                </div>
              </div>
            </div>
          )}

          {form && (
            <div className="flex items-center justify-between border-t border-line px-5 py-3">
              <Button variant="danger" onClick={handleDelete}>
                <Trash2 size={14} /> Xoá tag
              </Button>
              <Button onClick={handleSave} disabled={!draft}>
                Lưu thay đổi
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

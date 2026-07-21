import { useMemo, useState } from 'react'
import { CheckSquare, Square, Calendar } from 'lucide-react'
import { useTaskStore } from '../../stores/taskStore'
import { useNoteStore } from '../../stores/noteStore'
import { useTagStore } from '../../stores/tagStore'

/**
 * Web port of ui/task_panel.py. Toggling a checkbox here updates the
 * `tasks` row directly — same as desktop's TaskPanel — so it doesn't
 * rewrite the note's block content immediately; the two reconcile the
 * next time that specific note is opened and saved (this asymmetry
 * exists on desktop too, not a web-only shortcut).
 */
export default function TaskListPanel({ onSelectNote }) {
  const { tasks, toggleTask } = useTaskStore()
  const { notes } = useNoteStore()
  const { tags, noteTags } = useTagStore()
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'todo' | 'done'
  const [tagFilter, setTagFilter] = useState('')

  const noteById = useMemo(() => new Map(notes.map((n) => [n.id, n])), [notes])

  // Flat render list: task rows interleaved with a single separator marker
  // right where the todo/done groups meet — mirrors desktop's "insert an
  // HLine the first time is_done flips from false to true".
  const items = useMemo(() => {
    let list = tasks
      .map((t) => ({ ...t, note: noteById.get(t.note_id) }))
      .filter((t) => t.note && !t.note.is_archived)

    if (statusFilter === 'todo') list = list.filter((t) => !t.is_done)
    else if (statusFilter === 'done') list = list.filter((t) => t.is_done)

    if (tagFilter) {
      const noteIdsWithTag = new Set(
        noteTags.filter((nt) => nt.tag_id === tagFilter).map((nt) => nt.note_id)
      )
      list = list.filter((t) => noteIdsWithTag.has(t.note_id))
    }

    list = [...list].sort((a, b) => {
      if (a.is_done !== b.is_done) return a.is_done ? 1 : -1
      return new Date(b.note.updated_at) - new Date(a.note.updated_at)
    })

    const out = []
    let sawDone = false
    for (const t of list) {
      if (t.is_done && !sawDone) {
        out.push({ kind: 'separator', key: 'sep' })
        sawDone = true
      }
      out.push({ kind: 'task', key: t.id, task: t })
    }
    return out
  }, [tasks, noteById, statusFilter, tagFilter, noteTags])

  const taskCount = items.filter((i) => i.kind === 'task').length

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line px-3.5 py-2.5">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-[11px] font-semibold tracking-wide text-fg-faint">TASKS</span>
          <span className="text-xs text-fg-mute">{taskCount} task{taskCount !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex gap-1.5">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-line bg-bg px-2 py-1 text-xs text-fg-dim outline-none"
          >
            <option value="all">All</option>
            <option value="todo">Todo</option>
            <option value="done">Done</option>
          </select>
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="w-full rounded-md border border-line bg-bg px-2 py-1 text-xs text-fg-dim outline-none"
          >
            <option value="">All tags</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>{t.icon ? `${t.icon} ` : ''}{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {taskCount === 0 ? (
          <p className="px-2 py-8 text-center text-xs text-fg-mute">Không có task nào.</p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {items.map((item) => {
              if (item.kind === 'separator') {
                return <li key={item.key} className="my-1.5 h-px bg-line" />
              }
              const t = item.task
              return (
                <li key={item.key}>
                  <button
                    onDoubleClick={() => onSelectNote(t.note_id)}
                    title="Bấm đúp để mở note"
                    className="group flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition hover:bg-panel-2"
                  >
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); toggleTask(t.id, !t.is_done) }}
                      className="mt-0.5 shrink-0 text-fg-mute hover:text-star"
                    >
                      {t.is_done ? <CheckSquare size={15} className="text-star" /> : <Square size={15} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm ${t.is_done ? 'text-fg-mute line-through' : 'text-fg-dim'}`}>
                        {t.content || '(không có nội dung)'}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2 text-[10px] text-fg-mute">
                        <span className="truncate">📝 {t.note?.title || 'Untitled'}</span>
                        {t.due_date && (
                          <span className="flex shrink-0 items-center gap-0.5 text-dwarf">
                            <Calendar size={9} /> {new Date(t.due_date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

import { supabase } from './supabase'
import { useAuthStore } from '../stores/authStore'

// Task blocks look like { t: 'task', html: '...', done: false, block_id: 'uuid', bg: '' }
// per the Block Editor JSON v4 schema (SPEC §9.2/9.3) — walking the parsed
// JSON directly is simpler and more reliable than desktop's approach of
// regex-parsing plain text and re-matching against block order, since we
// already have the real structure (and it also finds tasks nested inside
// toggle blocks, which desktop's positional i-th-task-block matching can
// mis-map if a toggle is later added/removed above a task).
function collectTaskBlocks(blocks, out) {
  for (const b of blocks ?? []) {
    if (b.t === 'task' && b.block_id) {
      out.push({ block_id: b.block_id, content: b.html || '', is_done: !!b.done })
    }
    if (Array.isArray(b.children)) collectTaskBlocks(b.children, out)
  }
}

export function extractTasksFromContent(contentJson) {
  if (!contentJson) return []
  let parsed
  try {
    parsed = JSON.parse(contentJson)
  } catch {
    return []
  }
  const out = []
  collectTaskBlocks(parsed.blocks, out)
  return out
}

/**
 * Web port of core/note_manager.py::sync_tasks() — matched by block_id,
 * diff-based (update in place / soft-delete removed / insert new) rather
 * than delete-all-recreate, so a task's `id` (and any due_date/tag_id set
 * on it later) survives unrelated re-saves of the note.
 *
 * Returns true if anything changed, so callers can decide whether to
 * refetch the tasks store.
 */
export async function syncTasksFromContent(noteId, contentJson) {
  const uid = useAuthStore.getState().user?.id
  if (!uid || !noteId) return false

  const incoming = extractTasksFromContent(contentJson)
  const incomingByBlockId = new Map(incoming.map((t, i) => [t.block_id, { ...t, sort_order: i }]))

  const { data: existing, error } = await supabase
    .from('tasks')
    .select('id,block_id,content,is_done,sort_order,is_deleted')
    .eq('user_id', uid)
    .eq('note_id', noteId)
  if (error) { console.error('[tasks] fetch existing failed:', error); return false }

  const existingByBlockId = new Map((existing ?? []).map((t) => [t.block_id, t]))
  const now = new Date().toISOString()
  const ops = []

  for (const [blockId, t] of incomingByBlockId) {
    const ex = existingByBlockId.get(blockId)
    if (ex) {
      const unchanged = !ex.is_deleted && ex.content === t.content && ex.is_done === t.is_done && ex.sort_order === t.sort_order
      if (unchanged) continue
      ops.push(
        supabase.from('tasks').update({
          content: t.content, is_done: t.is_done, sort_order: t.sort_order,
          is_deleted: false, updated_at: now,
        }).eq('id', ex.id)
      )
    } else {
      ops.push(
        supabase.from('tasks').insert({
          id: crypto.randomUUID(), user_id: uid, note_id: noteId, block_id: blockId,
          content: t.content, is_done: t.is_done, sort_order: t.sort_order,
          due_date: null, tag_id: null, is_deleted: false, updated_at: now,
        })
      )
    }
  }
  for (const [blockId, ex] of existingByBlockId) {
    if (!incomingByBlockId.has(blockId) && !ex.is_deleted) {
      ops.push(supabase.from('tasks').update({ is_deleted: true, updated_at: now }).eq('id', ex.id))
    }
  }

  if (!ops.length) return false
  const results = await Promise.all(ops)
  const failed = results.find((r) => r.error)
  if (failed) { console.error('[tasks] sync op failed:', failed.error); return false }
  return true
}

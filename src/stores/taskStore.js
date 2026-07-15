import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './authStore'

function userId() {
  return useAuthStore.getState().user?.id
}

export const useTaskStore = create((set, get) => ({
  tasks: [], // full rows: id, note_id, content, is_done, due_date, tag_id
  loading: false,
  error: null,

  fetchTasks: async () => {
    const uid = userId()
    if (!uid) return
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('tasks')
      .select('id,note_id,content,is_done,due_date,tag_id')
      .eq('user_id', uid)
      .eq('is_deleted', false)
    if (error) { set({ error: error.message, loading: false }); return }
    set({ tasks: data ?? [], loading: false })
  },

  // Matches desktop's TaskPanel._on_task_toggle(): updates Task.is_done
  // directly, independent of the note's content JSON. Desktop has this
  // same asymmetry (the task-panel checkbox doesn't rewrite the note's
  // block content either) — the two stay in sync next time that specific
  // note is opened and re-saved, same as desktop.
  toggleTask: async (taskId, isDone) => {
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('tasks')
      .update({ is_done: isDone, updated_at: now })
      .eq('id', taskId)
      .select()
      .single()
    if (error) { set({ error: error.message }); return false }
    set({ tasks: get().tasks.map((t) => (t.id === taskId ? data : t)) })
    return true
  },
}))

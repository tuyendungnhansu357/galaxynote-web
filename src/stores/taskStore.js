import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './authStore'

function userId() {
  return useAuthStore.getState().user?.id
}

export const useTaskStore = create((set) => ({
  tasks: [], // [{ note_id, is_done }]
  loading: false,
  error: null,

  fetchTasks: async () => {
    const uid = userId()
    if (!uid) return
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('tasks')
      .select('note_id,is_done')
      .eq('user_id', uid)
      .eq('is_deleted', false)
    if (error) { set({ error: error.message, loading: false }); return }
    set({ tasks: data ?? [], loading: false })
  },
}))

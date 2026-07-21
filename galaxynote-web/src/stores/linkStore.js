import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './authStore'

function userId() {
  return useAuthStore.getState().user?.id
}

export const useLinkStore = create((set, get) => ({
  links: [], // [{ source_note_id, target_note_id }]
  loading: false,
  error: null,

  fetchLinks: async () => {
    const uid = userId()
    if (!uid) return
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('links')
      .select('source_note_id,target_note_id')
      .eq('user_id', uid)
      .eq('is_deleted', false)
    if (error) { set({ error: error.message, loading: false }); return }
    set({ links: data ?? [], loading: false })
  },
}))

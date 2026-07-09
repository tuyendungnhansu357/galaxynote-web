import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './authStore'

function userId() {
  return useAuthStore.getState().user?.id
}

export const useNoteStore = create((set, get) => ({
  notes: [],
  activeNoteId: null,
  loading: false,
  error: null,

  fetchNotes: async () => {
    const uid = userId()
    if (!uid) return
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', uid)
      .eq('is_deleted', false)
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false })
    if (error) { set({ error: error.message, loading: false }); return }
    set({ notes: data ?? [], loading: false })
  },

  createNote: async ({ title = 'Untitled', content = '', content_mode = 'block' } = {}) => {
    const uid = userId()
    if (!uid) return null
    const now = new Date().toISOString()
    const row = {
      id: crypto.randomUUID(),
      user_id: uid,
      title,
      content,
      content_mode,
      created_at: now,
      updated_at: now,
      is_pinned: false,
      is_archived: false,
      is_deleted: false,
      daily_date: null,
    }
    const { data, error } = await supabase.from('notes').insert(row).select().single()
    if (error) { set({ error: error.message }); return null }
    set({ notes: [data, ...get().notes], activeNoteId: data.id })
    return data
  },

  // Partial update — merges `patch` into the note and bumps updated_at.
  // Mirrors desktop note_manager.update_note(): title/content/pin/archive.
  updateNote: async (noteId, patch) => {
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('notes')
      .update({ ...patch, updated_at: now })
      .eq('id', noteId)
      .select()
      .single()
    if (error) { set({ error: error.message }); return null }
    set({ notes: get().notes.map((n) => (n.id === noteId ? data : n)) })
    return data
  },

  // Soft-delete, matching desktop's sync-safe delete convention.
  deleteNote: async (noteId) => {
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('notes')
      .update({ is_deleted: true, updated_at: now })
      .eq('id', noteId)
    if (error) { set({ error: error.message }); return false }
    set({
      notes: get().notes.filter((n) => n.id !== noteId),
      activeNoteId: get().activeNoteId === noteId ? null : get().activeNoteId,
    })
    return true
  },

  togglePin: async (noteId, isPinned) => get().updateNote(noteId, { is_pinned: isPinned }),

  setActiveNoteId: (id) => set({ activeNoteId: id }),

  // Called by useSync when a realtime change lands — avoids a full refetch.
  upsertLocal: (row) => {
    if (row.is_deleted) {
      set({ notes: get().notes.filter((n) => n.id !== row.id) })
      return
    }
    const exists = get().notes.some((n) => n.id === row.id)
    set({
      notes: exists
        ? get().notes.map((n) => (n.id === row.id ? row : n))
        : [row, ...get().notes],
    })
  },
}))

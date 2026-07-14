import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './authStore'

function userId() {
  return useAuthStore.getState().user?.id
}

// Same order as the initial fetch's `.order()` chain — pinned first, then
// most-recently-updated. Applied after every local mutation too (pin
// toggle, content save, realtime upsert), not just on the initial load,
// so the list re-sorts itself immediately instead of only looking right
// after a refetch/refresh.
function sortNotes(notes) {
  return [...notes].sort((a, b) => {
    if (!!b.is_pinned !== !!a.is_pinned) return (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0)
    return new Date(b.updated_at) - new Date(a.updated_at)
  })
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
    set({ notes: sortNotes([data, ...get().notes]), activeNoteId: data.id })
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
    set({ notes: sortNotes(get().notes.map((n) => (n.id === noteId ? data : n))) })
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

  // Mirrors desktop note_manager.get_daily_note(): find today's daily note
  // by `daily_date`, or create it if this is the first time today.
  getOrCreateDailyNote: async () => {
    const uid = userId()
    if (!uid) return null
    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

    const existing = get().notes.find((n) => n.daily_date === today)
    if (existing) return existing

    const { data: found, error: findError } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', uid)
      .eq('daily_date', today)
      .eq('is_deleted', false)
      .maybeSingle()
    if (findError) { set({ error: findError.message }) }
    if (found) {
      set({ notes: sortNotes([found, ...get().notes.filter((n) => n.id !== found.id)]) })
      return found
    }

    const now = new Date().toISOString()
    const label = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
    const row = {
      id: crypto.randomUUID(),
      user_id: uid,
      title: label,
      content: '',
      content_mode: 'daily',
      created_at: now,
      updated_at: now,
      is_pinned: false,
      is_archived: false,
      is_deleted: false,
      daily_date: today,
    }
    const { data, error } = await supabase.from('notes').insert(row).select().single()
    if (error) { set({ error: error.message }); return null }
    set({ notes: sortNotes([data, ...get().notes]) })
    return data
  },

  setActiveNoteId: (id) => set({ activeNoteId: id }),

  // Called by useSync when a realtime change lands — avoids a full refetch.
  upsertLocal: (row) => {
    if (row.is_deleted) {
      set({ notes: get().notes.filter((n) => n.id !== row.id) })
      return
    }
    const exists = get().notes.some((n) => n.id === row.id)
    set({
      notes: sortNotes(
        exists
          ? get().notes.map((n) => (n.id === row.id ? row : n))
          : [row, ...get().notes]
      ),
    })
  },
}))

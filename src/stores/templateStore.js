import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './authStore'

function userId() {
  return useAuthStore.getState().user?.id
}

export const CATEGORY_LABELS = {
  daily: '📅 Daily',
  work: '💼 Work',
  learning: '📚 Learning',
  productivity: '⚡ Productivity',
  custom: '✨ Custom',
}
export const CATEGORY_ORDER = ['daily', 'work', 'learning', 'productivity', 'custom']

const EMPTY_CONTENT = '{"v":4,"blocks":[]}'

// Web port of core/template_manager.py — same block_templates table
// (Postgres), same fields, same "category" vocabulary. Desktop's `uid` /
// local-integer-id split doesn't apply here: web talks to Postgres
// directly, so `id` (a UUID) IS the shared key, same as tags/notes.
export const useTemplateStore = create((set, get) => ({
  templates: [],
  loading: false,
  error: null,

  fetchAll: async () => {
    const uid = userId()
    if (!uid) return
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('block_templates')
      .select('*')
      .eq('user_id', uid)
      .eq('is_deleted', false)
      .order('category')
      .order('sort_order')
      .order('name')
    if (error) { set({ error: error.message, loading: false }); return }
    set({ templates: data ?? [], loading: false })
  },

  createTemplate: async ({ name = 'Template mới', content_json = EMPTY_CONTENT, icon = '📋', description = '', category = 'custom' } = {}) => {
    const uid = userId()
    if (!uid) return null
    const now = new Date().toISOString()
    const row = {
      id: crypto.randomUUID(),
      user_id: uid,
      name, icon, description, content_json, category,
      sort_order: get().templates.filter((t) => t.category === category).length,
      created_at: now, updated_at: now, is_deleted: false,
    }
    const { data, error } = await supabase.from('block_templates').insert(row).select().single()
    if (error) { set({ error: error.message }); return null }
    set({ templates: [...get().templates, data] })
    return data
  },

  // patch may include: name, icon, description, content_json, category, sort_order
  updateTemplate: async (id, patch) => {
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('block_templates')
      .update({ ...patch, updated_at: now })
      .eq('id', id)
      .select()
      .single()
    if (error) { set({ error: error.message }); return null }
    set({ templates: get().templates.map((t) => (t.id === id ? data : t)) })
    return data
  },

  deleteTemplate: async (id) => {
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('block_templates')
      .update({ is_deleted: true, updated_at: now })
      .eq('id', id)
    if (error) { set({ error: error.message }); return false }
    set({ templates: get().templates.filter((t) => t.id !== id) })
    return true
  },
}))

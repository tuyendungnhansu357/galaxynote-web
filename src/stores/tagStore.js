import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './authStore'

function userId() {
  return useAuthStore.getState().user?.id
}

export const useTagStore = create((set, get) => ({
  tags: [],
  relations: [],   // [{ parent_id, child_id }] — tag uid pairs
  noteTags: [],    // [{ note_id, tag_id }] — for co-occurrence / chip display
  activeTagId: null,
  loading: false,
  error: null,

  fetchAll: async () => {
    const uid = userId()
    if (!uid) return
    set({ loading: true, error: null })
    const [tagsRes, relRes, ntRes] = await Promise.all([
      supabase.from('tags').select('*').eq('user_id', uid).eq('is_deleted', false).order('sort_order'),
      supabase.from('tag_relations').select('parent_id,child_id').eq('user_id', uid).eq('is_deleted', false),
      supabase.from('note_tags').select('note_id,tag_id').eq('user_id', uid).eq('is_deleted', false),
    ])
    if (tagsRes.error) { set({ error: tagsRes.error.message, loading: false }); return }
    set({
      tags: tagsRes.data ?? [],
      relations: relRes.data ?? [],
      noteTags: ntRes.data ?? [],
      loading: false,
    })
  },

  createTag: async ({ name, color = '#4f8ef7', icon = '', description = '', is_space = false }) => {
    const uid = userId()
    if (!uid) return null
    const now = new Date().toISOString()
    const row = {
      id: crypto.randomUUID(),
      user_id: uid,
      name: name.trim().toLowerCase().replace(/\s+/g, '-'),
      color,
      icon,
      description,
      is_space,
      sort_order: get().tags.length,
      created_at: now,
      updated_at: now,
      is_deleted: false,
    }
    const { data, error } = await supabase.from('tags').insert(row).select().single()
    if (error) { set({ error: error.message }); return null }
    set({ tags: [...get().tags, data] })
    return data
  },

  // patch may include: name, color, icon, description, is_space, sort_order
  updateTag: async (tagId, patch) => {
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('tags')
      .update({ ...patch, updated_at: now })
      .eq('id', tagId)
      .select()
      .single()
    if (error) { set({ error: error.message }); return null }
    set({ tags: get().tags.map((t) => (t.id === tagId ? data : t)) })
    return data
  },

  deleteTag: async (tagId) => {
    const now = new Date().toISOString()
    const uid = userId()
    // Soft-delete the tag itself, plus anything referencing it — mirrors
    // desktop tag_manager.delete_tag()'s manual cascade.
    await Promise.all([
      supabase.from('tags').update({ is_deleted: true, updated_at: now }).eq('id', tagId),
      supabase.from('tag_relations')
        .update({ is_deleted: true, updated_at: now })
        .or(`parent_id.eq.${tagId},child_id.eq.${tagId}`)
        .eq('user_id', uid),
      supabase.from('note_tags')
        .update({ is_deleted: true, updated_at: now })
        .eq('tag_id', tagId)
        .eq('user_id', uid),
    ])
    set({
      tags: get().tags.filter((t) => t.id !== tagId),
      relations: get().relations.filter((r) => r.parent_id !== tagId && r.child_id !== tagId),
      noteTags: get().noteTags.filter((nt) => nt.tag_id !== tagId),
      activeTagId: get().activeTagId === tagId ? null : get().activeTagId,
    })
  },

  addRelation: async (parentId, childId) => {
    const uid = userId()
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('tag_relations')
      .upsert(
        { parent_id: parentId, child_id: childId, user_id: uid, updated_at: now, is_deleted: false },
        { onConflict: 'parent_id,child_id' }
      )
    if (error) { set({ error: error.message }); return false }
    set({ relations: [...get().relations, { parent_id: parentId, child_id: childId }] })
    return true
  },

  removeRelation: async (parentId, childId) => {
    const uid = userId()
    const now = new Date().toISOString()
    await supabase
      .from('tag_relations')
      .update({ is_deleted: true, updated_at: now })
      .eq('parent_id', parentId)
      .eq('child_id', childId)
      .eq('user_id', uid)
    set({
      relations: get().relations.filter(
        (r) => !(r.parent_id === parentId && r.child_id === childId)
      ),
    })
  },

  setActiveTagId: (id) => set({ activeTagId: id }),
}))

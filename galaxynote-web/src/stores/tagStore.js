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

  // Manual "attach this tag to this note" action (TagChipsBar's + picker) —
  // block_id/highlight stay null since this isn't an inline #tag highlight
  // inside the block editor (that parser isn't ported to web yet, so every
  // note_tags row created from web is a plain note-level assignment).
  assignTagToNote: async (noteId, tagId) => {
    const uid = userId()
    const now = new Date().toISOString()
    if (get().noteTags.some((nt) => nt.note_id === noteId && nt.tag_id === tagId)) return true

    // A previously-removed (soft-deleted) row for this exact pair may
    // already exist — revive it instead of inserting a duplicate.
    const { data: existing } = await supabase
      .from('note_tags')
      .select('id')
      .eq('user_id', uid).eq('note_id', noteId).eq('tag_id', tagId).is('block_id', null)
      .maybeSingle()

    const { error } = existing
      ? await supabase.from('note_tags').update({ is_deleted: false, updated_at: now }).eq('id', existing.id)
      : await supabase.from('note_tags').insert({
          id: crypto.randomUUID(), user_id: uid, note_id: noteId, tag_id: tagId,
          block_id: null, highlight_start: null, highlight_end: null,
          updated_at: now, is_deleted: false,
        })

    if (error) { set({ error: error.message }); return false }
    set({ noteTags: [...get().noteTags, { note_id: noteId, tag_id: tagId }] })
    return true
  },

  removeTagFromNote: async (noteId, tagId) => {
    const uid = userId()
    const now = new Date().toISOString()
    await supabase
      .from('note_tags')
      .update({ is_deleted: true, updated_at: now })
      .eq('user_id', uid).eq('note_id', noteId).eq('tag_id', tagId).is('block_id', null)
    set({ noteTags: get().noteTags.filter((nt) => !(nt.note_id === noteId && nt.tag_id === tagId)) })
  },

  // Web port of core/tag_manager.py::merge_tags() — moves every note_tags
  // and tasks reference from sourceId over to targetId, then soft-deletes
  // sourceId (tag + its relations).
  //
  // One thing desktop's raw-SQL bulk UPDATE glosses over: a note that
  // already carries BOTH tags would end up with two note_tags rows sharing
  // the same (note_id, tag_id) after the rename — a real unique-constraint
  // conflict on Postgres. We check for that overlap up front and just
  // soft-delete the source row for those notes instead of renaming it,
  // since the note already has the target tag anyway.
  mergeTags: async (sourceId, targetId) => {
    const uid = userId()
    if (!uid || sourceId === targetId) return false
    const now = new Date().toISOString()

    const [{ data: sourceRows }, { data: targetRows }] = await Promise.all([
      supabase.from('note_tags').select('id,note_id').eq('user_id', uid).eq('tag_id', sourceId).eq('is_deleted', false),
      supabase.from('note_tags').select('note_id').eq('user_id', uid).eq('tag_id', targetId).eq('is_deleted', false),
    ])
    const targetNoteIds = new Set((targetRows ?? []).map((r) => r.note_id))
    const toRename = (sourceRows ?? []).filter((r) => !targetNoteIds.has(r.note_id))
    const toDrop = (sourceRows ?? []).filter((r) => targetNoteIds.has(r.note_id))

    const ops = []
    if (toRename.length) {
      ops.push(
        supabase.from('note_tags')
          .update({ tag_id: targetId, updated_at: now })
          .in('id', toRename.map((r) => r.id))
      )
    }
    if (toDrop.length) {
      ops.push(
        supabase.from('note_tags')
          .update({ is_deleted: true, updated_at: now })
          .in('id', toDrop.map((r) => r.id))
      )
    }
    // Tasks have their own surrogate id, no composite-key conflict possible.
    ops.push(
      supabase.from('tasks')
        .update({ tag_id: targetId, updated_at: now })
        .eq('user_id', uid).eq('tag_id', sourceId)
    )
    ops.push(
      supabase.from('tag_relations')
        .update({ is_deleted: true, updated_at: now })
        .eq('user_id', uid).or(`parent_id.eq.${sourceId},child_id.eq.${sourceId}`)
    )
    ops.push(
      supabase.from('tags')
        .update({ is_deleted: true, updated_at: now })
        .eq('id', sourceId)
    )

    const results = await Promise.all(ops)
    const failed = results.find((r) => r.error)
    if (failed) { set({ error: failed.error.message }); return false }

    set({
      tags: get().tags.filter((t) => t.id !== sourceId),
      relations: get().relations.filter((r) => r.parent_id !== sourceId && r.child_id !== sourceId),
      noteTags: get().noteTags
        .filter((nt) => !(nt.tag_id === sourceId && targetNoteIds.has(nt.note_id))) // dropped
        .map((nt) => (nt.tag_id === sourceId ? { ...nt, tag_id: targetId } : nt)), // renamed
      activeTagId: get().activeTagId === sourceId ? targetId : get().activeTagId,
    })
    return true
  },
}))

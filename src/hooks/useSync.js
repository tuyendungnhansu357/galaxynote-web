import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useNoteStore } from '../stores/noteStore'
import { useTagStore } from '../stores/tagStore'

/**
 * Subscribes to Postgres changes on the tables this user owns.
 * Desktop syncs every 30s by polling; on the web we get push updates
 * for free via Supabase Realtime, so a browser tab and the desktop app
 * (or a second browser tab) stay in sync within ~1s of each other.
 *
 * Mount this once near the root, after the user is signed in.
 */
export function useSync() {
  const user = useAuthStore((s) => s.user)
  const upsertNoteLocal = useNoteStore((s) => s.upsertLocal)
  const fetchTags = useTagStore((s) => s.fetchAll)

  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`galaxynote-sync-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notes', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.new) upsertNoteLocal(payload.new)
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tags', filter: `user_id=eq.${user.id}` },
        () => fetchTags()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tag_relations', filter: `user_id=eq.${user.id}` },
        () => fetchTags()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'note_tags', filter: `user_id=eq.${user.id}` },
        () => fetchTags()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, upsertNoteLocal, fetchTags])
}

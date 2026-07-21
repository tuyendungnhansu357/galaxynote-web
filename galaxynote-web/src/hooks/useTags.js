import { useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useTagStore } from '../stores/tagStore'

/** Fetches tags/relations/note_tags once the user is known. */
export function useTags() {
  const user = useAuthStore((s) => s.user)
  const fetchAll = useTagStore((s) => s.fetchAll)

  useEffect(() => {
    if (user) fetchAll()
  }, [user, fetchAll])

  return useTagStore()
}

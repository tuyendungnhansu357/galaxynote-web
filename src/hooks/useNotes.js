import { useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useNoteStore } from '../stores/noteStore'

/** Fetches notes once the user is known, and exposes the note store. */
export function useNotes() {
  const user = useAuthStore((s) => s.user)
  const fetchNotes = useNoteStore((s) => s.fetchNotes)

  useEffect(() => {
    if (user) fetchNotes()
  }, [user, fetchNotes])

  return useNoteStore()
}

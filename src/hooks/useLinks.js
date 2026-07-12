import { useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useLinkStore } from '../stores/linkStore'

/** Fetches links (wiki-link edges between notes) once the user is known. */
export function useLinks() {
  const user = useAuthStore((s) => s.user)
  const fetchLinks = useLinkStore((s) => s.fetchLinks)

  useEffect(() => {
    if (user) fetchLinks()
  }, [user, fetchLinks])

  return useLinkStore()
}

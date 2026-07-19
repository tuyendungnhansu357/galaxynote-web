import { useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useTemplateStore } from '../stores/templateStore'

/** Fetches block templates once the user is known. */
export function useTemplates() {
  const user = useAuthStore((s) => s.user)
  const fetchAll = useTemplateStore((s) => s.fetchAll)

  useEffect(() => {
    if (user) fetchAll()
  }, [user, fetchAll])

  return useTemplateStore()
}

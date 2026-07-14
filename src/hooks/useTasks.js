import { useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useTaskStore } from '../stores/taskStore'

/** Fetches tasks (note_id, is_done only — for done:yes/no search) once the user is known. */
export function useTasks() {
  const user = useAuthStore((s) => s.user)
  const fetchTasks = useTaskStore((s) => s.fetchTasks)

  useEffect(() => {
    if (user) fetchTasks()
  }, [user, fetchTasks])

  return useTaskStore()
}

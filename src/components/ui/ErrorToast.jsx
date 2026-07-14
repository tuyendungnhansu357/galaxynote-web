import { useEffect, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { useNoteStore } from '../../stores/noteStore'
import { useTagStore } from '../../stores/tagStore'

/**
 * Both stores already capture `error` on any failed Supabase call (see
 * noteStore.js / tagStore.js), but until now nothing displayed it — a
 * failed save (e.g. Supabase rejecting an oversized payload) happened
 * silently. This surfaces it so "did my change actually save?" has a
 * visible answer instead of only showing up after a confusing refresh.
 */
export default function ErrorToast() {
  const noteError = useNoteStore((s) => s.error)
  const tagError = useTagStore((s) => s.error)
  const [dismissed, setDismissed] = useState(null)

  const error = noteError || tagError

  useEffect(() => {
    if (error) setDismissed(null)
  }, [error])

  if (!error || error === dismissed) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex max-w-sm items-start gap-2 rounded-lg border border-flare/40 bg-panel px-4 py-3 text-xs text-flare shadow-2xl">
      <AlertTriangle size={15} className="mt-0.5 shrink-0" />
      <span className="flex-1 leading-relaxed">{error}</span>
      <button onClick={() => setDismissed(error)} className="shrink-0 text-fg-mute hover:text-fg">
        <X size={14} />
      </button>
    </div>
  )
}

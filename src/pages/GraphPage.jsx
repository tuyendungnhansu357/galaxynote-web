import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useNotes } from '../hooks/useNotes'
import { useTags } from '../hooks/useTags'
import { supabase } from '../lib/supabase'
import { buildTagGraph } from '../lib/graphBuilder'
import GalaxyGraph from '../components/graph/GalaxyGraph'
import { useEffect } from 'react'

export default function GraphPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { notes } = useNotes()
  const { tags, relations, noteTags } = useTags()
  const [links, setLinks] = useState([])

  useEffect(() => {
    if (!user) return
    supabase
      .from('links')
      .select('source_note_id,target_note_id')
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .then(({ data }) => setLinks(data ?? []))
  }, [user])

  const graphData = useMemo(
    () => buildTagGraph({ tags, relations, noteTags, notes: notes.slice(0, 200), links }),
    [tags, relations, noteTags, notes, links]
  )

  function handleNodeClick(node) {
    if (node.type === 'note') navigate('/', { state: { openNoteId: node.raw_id } })
  }

  return (
    <div className="relative h-screen w-screen bg-void">
      <button
        onClick={() => navigate('/')}
        className="absolute left-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel/80 px-3 py-1.5 text-xs font-medium text-fg-dim backdrop-blur hover:bg-panel-2"
      >
        <ArrowLeft size={13} /> Quay lại
      </button>
      {tags.length === 0 ? (
        <div className="flex h-full items-center justify-center text-sm text-fg-mute">
          Chưa có tag nào — tạo vài tag để galaxy có gì đó để vẽ.
        </div>
      ) : (
        <GalaxyGraph graphData={graphData} onNodeClick={handleNodeClick} />
      )}
    </div>
  )
}

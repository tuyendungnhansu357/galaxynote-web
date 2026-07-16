import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useNotes } from '../hooks/useNotes'
import { useTags } from '../hooks/useTags'
import { useLinks } from '../hooks/useLinks'
import { buildTagGraph } from '../lib/graphBuilder'
import GalaxyGraph from '../components/graph/GalaxyGraph'
import GraphControls from '../components/graph/GraphControls'

export default function GraphPage() {
  const navigate = useNavigate()
  const { notes } = useNotes()
  const { tags, relations, noteTags } = useTags()
  const { links } = useLinks()

  const [showLabels, setShowLabels] = useState(true)
  const [physicsEnabled, setPhysicsEnabled] = useState(true)
  const [autoRotate, setAutoRotate] = useState(true)
  const [showParticles, setShowParticles] = useState(true)
  const [filterTagId, setFilterTagId] = useState(null)

  const graphData = useMemo(
    () => buildTagGraph({ tags, relations, noteTags, notes: notes.slice(0, 200), links }),
    [tags, relations, noteTags, notes, links]
  )

  // "Filter by tag" (SPEC §10.7): highlight the chosen tag, its directly
  // related tags, and the notes carrying it — fade everything else.
  const highlightNodeIds = useMemo(() => {
    if (!filterTagId) return null
    const ids = new Set([`t_${filterTagId}`])
    for (const r of relations) {
      if (r.parent_id === filterTagId) ids.add(`t_${r.child_id}`)
      if (r.child_id === filterTagId) ids.add(`t_${r.parent_id}`)
    }
    for (const nt of noteTags) {
      if (nt.tag_id === filterTagId) ids.add(`n_${nt.note_id}`)
    }
    return ids
  }, [filterTagId, relations, noteTags])

  function handleNodeClick(node) {
    if (node.type === 'note') navigate('/', { state: { openNoteId: node.raw_id } })
  }

  return (
    <div className="relative h-screen w-screen bg-void">
      {/* HUD — mirrors resources/html/graph_browser.html's top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center gap-3 bg-gradient-to-b from-void/95 to-transparent px-4 py-2.5">
        <button
          onClick={() => navigate('/')}
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel/80 px-3 py-1.5 text-xs font-medium text-fg-dim backdrop-blur hover:bg-panel-2"
        >
          <ArrowLeft size={13} /> Quay lại
        </button>
        <span className="font-display text-sm font-bold tracking-wide text-fg">🌌 GalaxyNote</span>
        <span className="text-xs text-fg-mute">3D Knowledge Graph</span>
        <div className="flex-1" />
        <span className="rounded-full border border-line-2 bg-panel-2 px-2.5 py-1 text-[11px] text-fg-faint">
          {graphData.nodes.length} nodes
        </span>
        <span className="rounded-full border border-line-2 bg-panel-2 px-2.5 py-1 text-[11px] text-fg-faint">
          {graphData.links.length} links
        </span>
      </div>

      {tags.length === 0 ? (
        <div className="flex h-full items-center justify-center text-sm text-fg-mute">
          Chưa có tag nào — tạo vài tag để galaxy có gì đó để vẽ.
        </div>
      ) : (
        <>
          <GalaxyGraph
            graphData={graphData}
            onNodeClick={handleNodeClick}
            showLabels={showLabels}
            physicsEnabled={physicsEnabled}
            autoRotate={autoRotate}
            showParticles={showParticles}
            highlightNodeIds={highlightNodeIds}
          />
          <GraphControls
            tags={tags}
            filterTagId={filterTagId}
            onFilterTagChange={setFilterTagId}
            showLabels={showLabels}
            onToggleLabels={setShowLabels}
            physicsEnabled={physicsEnabled}
            onTogglePhysics={setPhysicsEnabled}
            autoRotate={autoRotate}
            onToggleAutoRotate={setAutoRotate}
            showParticles={showParticles}
            onToggleParticles={setShowParticles}
          />
          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-line-2 bg-panel/90 px-5 py-1.5 text-xs text-fg-faint backdrop-blur">
            Click node để khám phá · Kéo để xoay · Scroll để zoom
          </div>
        </>
      )}
    </div>
  )
}

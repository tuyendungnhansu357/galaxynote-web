import { useMemo, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useNotes } from '../hooks/useNotes'
import { useTags } from '../hooks/useTags'
import { useLinks } from '../hooks/useLinks'
import { buildTagGraph } from '../lib/graphBuilder'
import GalaxyGraph from '../components/graph/GalaxyGraph'
import GraphControls, { DEFAULT_SETTINGS } from '../components/graph/GraphControls'

export default function GraphPage() {
  const navigate = useNavigate()
  const { notes } = useNotes()
  const { tags, relations, noteTags } = useTags()
  const { links } = useLinks()
  const graphRef = useRef(null)

  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [filterTagId, setFilterTagId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const fullGraphData = useMemo(
    () => buildTagGraph({ tags, relations, noteTags, notes: notes.slice(0, 200), links }),
    [tags, relations, noteTags, notes, links]
  )

  // "Bộ lọc" section: show/hide tags or notes wholesale, or narrow down to
  // just orphan notes / just Space-root tags — matches ui/graph_3d_view.py's
  // f-tags / f-notes / f-orphans / f-spaces checkboxes exactly.
  const graphData = useMemo(() => {
    let nodes = fullGraphData.nodes
    if (!settings.showTags) nodes = nodes.filter((n) => n.type !== 'tag')
    if (!settings.showNotes) nodes = nodes.filter((n) => n.type !== 'note')
    if (settings.orphansOnly) nodes = nodes.filter((n) => n.type !== 'note' || n.is_orphan)
    if (settings.spacesOnly) nodes = nodes.filter((n) => n.type !== 'tag' || n.is_space)

    const keepIds = new Set(nodes.map((n) => n.id))
    const links = fullGraphData.links.filter((l) => {
      const s = l.source?.id || l.source, t = l.target?.id || l.target
      return keepIds.has(s) && keepIds.has(t)
    })
    return { nodes, links }
  }, [fullGraphData, settings.showTags, settings.showNotes, settings.orphansOnly, settings.spacesOnly])

  // "Filter by tag" via clicking a node stays available too (SPEC §10.7):
  // highlight the chosen tag, its directly related tags, and its notes.
  const tagHighlight = useMemo(() => {
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

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return []
    return graphData.nodes.filter((n) => (n.name || '').toLowerCase().includes(q)).slice(0, 8)
  }, [searchQuery, graphData])

  const highlightNodeIds = useMemo(() => {
    if (searchResults.length && searchQuery.trim()) return new Set(searchResults.map((n) => n.id))
    return tagHighlight
  }, [searchResults, searchQuery, tagHighlight])

  function handleNodeClick(node) {
    if (node.type === 'note') navigate('/', { state: { openNoteId: node.raw_id } })
    else if (node.type === 'tag') setFilterTagId(node.raw_id === filterTagId ? null : node.raw_id)
  }

  function handleSearchPick(node) {
    graphRef.current?.focusNode(node)
    setSearchQuery('')
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-void">
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
            ref={graphRef}
            graphData={graphData}
            onNodeClick={handleNodeClick}
            settings={settings}
            highlightNodeIds={highlightNodeIds}
          />
          <GraphControls
            settings={settings}
            onChange={setSettings}
            onReheat={() => graphRef.current?.reheat()}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchResults={searchResults}
            onSearchPick={handleSearchPick}
          />
          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-line-2 bg-panel/90 px-5 py-1.5 text-xs text-fg-faint backdrop-blur">
            Click node để khám phá · Kéo để xoay · Scroll để zoom
          </div>
        </>
      )}
    </div>
  )
}

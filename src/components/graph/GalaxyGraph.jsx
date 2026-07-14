import { useEffect, useRef } from 'react'
import ForceGraph3D from '3d-force-graph'

// Mirrors resources/html/graph_template.html's physics config so the desktop
// and web galaxies feel identical.
const PHYSICS = {
  d3AlphaDecay: 0.02,
  d3VelocityDecay: 0.3,
  linkOpacity: 0.4,
}

export default function GalaxyGraph({ graphData, onNodeClick }) {
  const containerRef = useRef(null)
  const graphRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return
    const graph = ForceGraph3D()(containerRef.current)
      .backgroundColor('#05070d')
      .nodeLabel((n) => `${n.name}${n.note_count ? ` · ${n.note_count} notes` : ''}`)
      .nodeVal((n) => n.val)
      .nodeColor((n) => n.color)
      .nodeOpacity(0.95)
      .linkWidth((l) => Math.log((l.value ?? 1) + 1) * 0.6)
      .linkColor(() => 'rgba(255,255,255,0.15)')
      .linkOpacity(PHYSICS.linkOpacity)
      .d3AlphaDecay(PHYSICS.d3AlphaDecay)
      .d3VelocityDecay(PHYSICS.d3VelocityDecay)
      .onNodeClick((n) => onNodeClick?.(n))
      .width(containerRef.current.clientWidth)
      .height(containerRef.current.clientHeight)

    graphRef.current = graph

    const handleResize = () => {
      if (!containerRef.current) return
      graph.width(containerRef.current.clientWidth)
      graph.height(containerRef.current.clientHeight)
    }
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      graph._destructor?.()
      containerRef.current && (containerRef.current.innerHTML = '')
    }
  }, [])

  useEffect(() => {
    if (graphRef.current && graphData) {
      graphRef.current.graphData(graphData)
    }
  }, [graphData])

  return <div ref={containerRef} className="h-full w-full" />
}

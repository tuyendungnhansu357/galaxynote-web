import { useEffect, useRef } from 'react'
import ForceGraph3D from '3d-force-graph'
import * as THREE from 'three'

// Faithful port of resources/html/graph_browser.html's rendering — the
// polished "view in browser" export desktop already has. Canvas-based glow
// sprites (radial gradient halo + core sphere + rim stroke + baked-in
// label) replace 3d-force-graph's default plain spheres, matching desktop
// node-for-node rather than just reusing generic library defaults.

function ca(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${a})`
}
function lighten(hex, pct) {
  let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16)
  r = Math.min(255, r + Math.round((255 - r) * pct / 100))
  g = Math.min(255, g + Math.round((255 - g) * pct / 100))
  b = Math.min(255, b + Math.round((255 - b) * pct / 100))
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')
}
function linkColorFor(l, colorByNodeId, alpha) {
  const s = l.source?.id || l.source, t = l.target?.id || l.target
  const c1 = colorByNodeId[s] || '#4f8ef7', c2 = colorByNodeId[t] || '#4f8ef7'
  const r1 = parseInt(c1.slice(1, 3), 16), g1 = parseInt(c1.slice(3, 5), 16), b1 = parseInt(c1.slice(5, 7), 16)
  const r2 = parseInt(c2.slice(1, 3), 16), g2 = parseInt(c2.slice(3, 5), 16), b2 = parseInt(c2.slice(5, 7), 16)
  return `rgba(${Math.round((r1 + r2) / 2)},${Math.round((g1 + g2) / 2)},${Math.round((b1 + b2) / 2)},${alpha})`
}

/**
 * @param graphData    { nodes, links }
 * @param onNodeClick
 * @param showLabels   toggled from GraphControls
 * @param autoRotate   toggled from GraphControls (desktop calls this "physics"/orbit)
 * @param showParticles
 * @param highlightNodeIds   Set<string> of node ids to keep at full opacity (tag filter) — everything else fades. null/empty = show all normally
 */
export default function GalaxyGraph({ graphData, onNodeClick, showLabels = true, autoRotate = true, showParticles = true, physicsEnabled = true, highlightNodeIds = null }) {
  const containerRef = useRef(null)
  const graphRef = useRef(null)
  const spriteCacheRef = useRef(new Map())

  useEffect(() => {
    if (!containerRef.current) return
    window.THREE = window.THREE || THREE // makeGlowSprite expects a global, same as the desktop file

    const graph = ForceGraph3D()(containerRef.current)
      .backgroundColor('#05080f')
      .showNavInfo(false)
      .nodeId('id')
      .nodeThreeObjectExtend(false)
      .nodeVal((n) => n.val || 3)
      .nodeLabel((n) => {
        if (n.type === 'note') return '📝 ' + (n.name || n.id)
        const cnt = n.note_count ? ` (${n.note_count})` : ''
        return (n.is_space ? '🪐 ' : '🏷 ') + (n.name || n.id) + cnt
      })
      .linkDirectionalArrowRelPos(1)
      .linkDirectionalParticleWidth(2)
      .linkDirectionalParticleSpeed(0.005)
      .onNodeHover((n) => { containerRef.current.style.cursor = n ? 'pointer' : 'default' })
      .onNodeClick((n) => {
        onNodeClick?.(n)
        const d = 1 + 150 / Math.hypot(n.x || 1, n.y || 1, n.z || 1)
        graph.cameraPosition({ x: (n.x || 0) * d, y: (n.y || 0) * d, z: (n.z || 0) * d }, n, 1200)
      })
      .d3AlphaDecay(0.018)
      .d3VelocityDecay(0.35)
      .width(containerRef.current.clientWidth)
      .height(containerRef.current.clientHeight)

    try { graph.d3Force('charge').strength((n) => (n.is_space ? -450 : n.type === 'note' ? -30 : -200)) } catch { /* noop */ }
    try {
      graph.d3Force('link')
        .distance((l) => (l.kind === 'relation' ? 100 : l.kind === 'note' ? 50 : l.kind === 'backlink' ? 130 : 200))
        .strength((l) => (l.kind === 'note' ? 0.3 : l.kind === 'backlink' ? 0.5 : 0.8))
    } catch { /* noop */ }

    if (graph.controls()) {
      graph.controls().autoRotate = autoRotate
      graph.controls().autoRotateSpeed = 0.4
    }

    graphRef.current = graph
    const onResize = () => {
      if (!containerRef.current) return
      graph.width(containerRef.current.clientWidth)
      graph.height(containerRef.current.clientHeight)
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      graph._destructor?.()
      if (containerRef.current) containerRef.current.innerHTML = ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-apply data + node/link styling whenever data or toggles change —
  // sprites are cached per (id,val,showLabels) so toggling labels rebuilds
  // just the sprites, not the whole graph/physics simulation.
  useEffect(() => {
    const graph = graphRef.current
    if (!graph || !graphData) return

    const colorByNodeId = {}
    for (const n of graphData.nodes) colorByNodeId[n.id] = n.color || '#4f8ef7'
    const dim = highlightNodeIds && highlightNodeIds.size > 0 ? highlightNodeIds : null

    function makeGlowSprite(n) {
      const dimmed = dim && !dim.has(n.id)
      const key = `${n.id}_${n.val || 3}_${showLabels}_${dimmed}`
      const cache = spriteCacheRef.current
      if (cache.has(key)) return cache.get(key)

      const isN = n.type === 'note'
      const col = isN ? (n.in_links > 0 ? '#3a9090' : '#1e3a4a') : (n.color || '#4f8ef7')
      const r = Math.max(6, Math.sqrt(Math.max(1, n.val || 3)) * 14)
      const gr = n.is_space ? r * 3.2 : r * 2.2
      const SIZE = Math.ceil(gr * 2 + 4)
      const cx = SIZE / 2, cy = SIZE / 2
      const fade = dimmed ? 0.15 : 1

      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = SIZE
      const ctx = canvas.getContext('2d')
      ctx.globalAlpha = fade

      if (!isN) {
        const g = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, gr)
        g.addColorStop(0, ca(col, n.is_space ? 0.55 : 0.30))
        g.addColorStop(1, ca(col, 0))
        ctx.beginPath(); ctx.arc(cx, cy, gr, 0, Math.PI * 2)
        ctx.fillStyle = g; ctx.fill()
      }

      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2)
      if (isN) {
        ctx.fillStyle = n.is_orphan ? '#0d1a26' : '#1e3a4a'
      } else {
        const fg = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.05, cx, cy, r)
        fg.addColorStop(0, lighten(col, 50))
        fg.addColorStop(1, col)
        ctx.fillStyle = fg
      }
      ctx.fill()

      if (!isN) {
        ctx.strokeStyle = ca(col, 0.8)
        ctx.lineWidth = n.is_space ? 2.5 : 1.8
        ctx.stroke()
      } else if (n.is_orphan) {
        ctx.setLineDash([3, 3])
        ctx.strokeStyle = 'rgba(80,120,160,0.5)'
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.setLineDash([])
      }

      if (showLabels) {
        const lbl = (n.icon ? n.icon + ' ' : '') + (n.name || n.id)
        const fs = n.is_space ? 18 : 13
        ctx.font = (n.is_space ? 'bold ' : '') + fs + 'px "Segoe UI",Arial,sans-serif'
        ctx.textAlign = 'center'; ctx.textBaseline = 'top'
        ctx.shadowColor = '#05080f'; ctx.shadowBlur = 5
        ctx.fillStyle = isN ? '#5577aa' : ca(col, 1)
        ctx.fillText(lbl, cx, cy + r + 3)
        ctx.shadowBlur = 0
      }

      const tex = new THREE.CanvasTexture(canvas)
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })
      const sp = new THREE.Sprite(mat)
      const sc = SIZE * 0.65
      sp.scale.set(sc, sc, 1)
      cache.set(key, sp)
      return sp
    }

    graph
      .nodeThreeObject(makeGlowSprite)
      .linkColor((l) => {
        if (l.kind === 'relation') return linkColorFor(l, colorByNodeId, 0.55)
        if (l.kind === 'cooccurrence') return linkColorFor(l, colorByNodeId, 0.30)
        if (l.kind === 'backlink') return 'rgba(255,165,60,0.75)'
        return 'rgba(128,128,128,0.06)'
      })
      .linkWidth((l) => (l.kind === 'relation' ? 1.5 : l.kind === 'backlink' ? 1.0 : 0.8))
      .linkOpacity(0.6)
      .linkDirectionalParticles((l) => {
        if (!showParticles) return 0
        return l.kind === 'backlink' ? 2 : l.kind === 'relation' ? 3 : 0
      })
      .linkDirectionalParticleColor((l) => (l.kind === 'backlink' ? '#ffb050' : linkColorFor(l, colorByNodeId, 0.9)))
      .graphData(graphData)

    if (graph.controls()) graph.controls().autoRotate = autoRotate
  }, [graphData, showLabels, showParticles, highlightNodeIds, autoRotate])

  useEffect(() => {
    const graph = graphRef.current
    if (!graph) return
    if (physicsEnabled) graph.resumeAnimation?.()
    else graph.pauseAnimation?.()
  }, [physicsEnabled])

  return <div ref={containerRef} className="h-full w-full" />
}

// Faithful port of desktop `core/graph_builder.py::build_tag_graph()`.
// Keep this in sync with the Python version — the whole point of the
// galaxy metaphor is that desktop and web draw the *same* graph.

const PALETTE = [
  '#4f8ef7', '#f75f5f', '#f7a64f', '#4ff79e', '#c84ff7', '#f74fc8',
  '#4fc8f7', '#f7e24f', '#7af74f', '#f7824f', '#5f7ff7', '#f75fa6',
  '#4ff7d6', '#e97af7', '#a6f74f', '#f7c44f', '#4f5ff7', '#f7604f',
]

// Deterministic string hash (djb2) — stand-in for Python's md5-based pick,
// only needs to be stable and evenly distributed, not cryptographic.
function hashString(str) {
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = (h * 33) ^ str.charCodeAt(i)
  }
  return h >>> 0
}

function tagColor(tagId, tagName, storedColor) {
  const DEFAULT = '#4f8ef7'
  const s = (storedColor || '').trim().toLowerCase()
  if (s && s !== DEFAULT && s !== '' && s !== 'none' && s !== '#4a9eff') {
    return storedColor
  }
  return PALETTE[hashString(tagName) % PALETTE.length]
}

function buildCooccurrence(noteTagMap) {
  // Map<"a|b", count> keyed by sorted tag-id pair
  const co = new Map()
  for (const tagIds of noteTagMap.values()) {
    const unique = [...new Set(tagIds)].sort()
    for (let i = 0; i < unique.length; i++) {
      for (let j = i + 1; j < unique.length; j++) {
        const key = `${unique[i]}|${unique[j]}`
        co.set(key, (co.get(key) ?? 0) + 1)
      }
    }
  }
  return co
}

/**
 * @param {Array} tags        rows from `tags` table
 * @param {Array} relations   rows from `tag_relations` [{parent_id, child_id}]
 * @param {Array} noteTags    rows from `note_tags` [{note_id, tag_id}]
 * @param {Array} notes       rows from `notes` (id, title) — capped to ~200 by caller
 * @param {Array} links       rows from `links` [{source_note_id, target_note_id}]
 */
export function buildTagGraph({ tags, relations, noteTags, notes, links }) {
  const tagData = new Map(
    tags.map((t) => [
      t.id,
      {
        id: t.id,
        name: t.name,
        color: tagColor(t.id, t.name, t.color || ''),
        icon: t.icon || '',
        is_space: !!t.is_space,
        description: t.description || '',
      },
    ])
  )

  const childIds = new Set(relations.map((r) => r.child_id))
  const relPairs = relations.map((r) => [r.parent_id, r.child_id])

  // note <-> tag maps
  const noteTagMap = new Map() // note_id -> [tag_id,...]
  const tagNoteCount = new Map() // tag_id -> count
  for (const { note_id, tag_id } of noteTags) {
    if (!noteTagMap.has(note_id)) noteTagMap.set(note_id, [])
    noteTagMap.get(note_id).push(tag_id)
    tagNoteCount.set(tag_id, (tagNoteCount.get(tag_id) ?? 0) + 1)
  }

  const noteOutLinks = new Map()
  const noteInLinks = new Map()
  for (const { source_note_id, target_note_id } of links) {
    noteOutLinks.set(source_note_id, (noteOutLinks.get(source_note_id) ?? 0) + 1)
    noteInLinks.set(target_note_id, (noteInLinks.get(target_note_id) ?? 0) + 1)
  }

  const nodes = []
  const links_ = []

  // ── Tag nodes ──────────────────────────────────────────────────────────
  for (const [tid, td] of tagData) {
    const count = tagNoteCount.get(tid) ?? 0
    const isRoot = !childIds.has(tid)
    const isSpace = td.is_space || isRoot

    const val = isSpace ? Math.max(14, 8 + count * 1.8) : Math.max(4, 3 + count)
    const label = (td.icon ? td.icon + ' ' : '') + td.name

    nodes.push({
      id: `t_${tid}`,
      name: label,
      color: td.color,
      val: Math.round(val * 10) / 10,
      note_count: count,
      is_space: isSpace,
      glow: isSpace,
      type: 'tag',
      raw_id: tid,
      description: td.description,
    })
  }

  // ── Explicit relation edges ─────────────────────────────────────────────
  const relSet = new Set()
  for (const [parentId, childId] of relPairs) {
    if (tagData.has(parentId) && tagData.has(childId)) {
      relSet.add(`${parentId}|${childId}`)
      links_.push({ source: `t_${parentId}`, target: `t_${childId}`, value: 2.5, kind: 'relation' })
    }
  }

  // ── Co-occurrence edges (skip pairs already covered by a relation) ──────
  const co = buildCooccurrence(noteTagMap)
  for (const [key, cnt] of co) {
    const [src, tgt] = key.split('|')
    if (tagData.has(src) && tagData.has(tgt)) {
      if (!relSet.has(`${src}|${tgt}`) && !relSet.has(`${tgt}|${src}`)) {
        links_.push({ source: `t_${src}`, target: `t_${tgt}`, value: Math.min(1 + cnt, 6), kind: 'cooccurrence' })
      }
    }
  }

  // ── Note satellite nodes ─────────────────────────────────────────────────
  for (const note of notes) {
    const tagIds = noteTagMap.get(note.id) ?? []
    const inL = noteInLinks.get(note.id) ?? 0
    const outL = noteOutLinks.get(note.id) ?? 0
    const noteColor = inL || outL ? '#3a9090' : '#556677'
    nodes.push({
      id: `n_${note.id}`,
      name: note.title || 'Untitled',
      color: noteColor,
      val: Math.round(Math.max(1.5, 1.5 + inL * 0.6) * 10) / 10,
      type: 'note',
      raw_id: note.id,
      is_orphan: tagIds.length === 0,
      in_links: inL,
      note_count: 0,
    })
    if (tagIds.length) {
      links_.push({ source: `t_${tagIds[0]}`, target: `n_${note.id}`, value: 0.5, kind: 'note' })
    }
  }

  // ── Note -> Note backlinks ────────────────────────────────────────────────
  const noteSet = new Set(notes.map((n) => n.id))
  for (const { source_note_id, target_note_id } of links) {
    if (noteSet.has(source_note_id) && noteSet.has(target_note_id)) {
      links_.push({ source: `n_${source_note_id}`, target: `n_${target_note_id}`, value: 1.2, kind: 'backlink' })
    }
  }

  return { nodes, links: links_ }
}

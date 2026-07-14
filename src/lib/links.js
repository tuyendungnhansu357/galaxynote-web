import { supabase } from './supabase'
import { useAuthStore } from '../stores/authStore'

// Wiki-links are inserted by editor_template.html as
// `<a href="note://<id>" data-note-id="<id>" class="wiki-link">[[Title]]</a>`
// — this matches against the *unescaped* html of a single block. Running it
// directly against the raw content JSON string doesn't work: that string is
// itself JSON.stringify()'d, so every `"` inside the HTML comes through as
// `\"`, and `data-note-id="` never matches `data-note-id=\"`.
const WIKI_LINK_RE = /data-note-id="([^"]+)"/g

function collectHtmlFields(blocks, out) {
  for (const b of blocks ?? []) {
    if (typeof b.html === 'string') out.push(b.html)
    if (typeof b.title === 'string') out.push(b.title) // toggle title can contain a link too
    if (Array.isArray(b.children)) collectHtmlFields(b.children, out)
    if (Array.isArray(b.rows)) {
      for (const row of b.rows) {
        for (const cell of row ?? []) {
          if (typeof cell?.html === 'string') out.push(cell.html)
        }
      }
    }
  }
}

export function extractWikiLinkTargets(contentJson) {
  const ids = new Set()
  if (!contentJson) return ids

  let parsed
  try {
    parsed = JSON.parse(contentJson)
  } catch {
    return ids // not JSON (e.g. Page mode HTML) — nothing to scan yet
  }

  const htmlChunks = []
  collectHtmlFields(parsed.blocks, htmlChunks)

  for (const html of htmlChunks) {
    WIKI_LINK_RE.lastIndex = 0
    let m
    while ((m = WIKI_LINK_RE.exec(html))) ids.add(m[1])
  }
  return ids
}

/**
 * Diffs the [[wiki-link]] targets found in a note's just-saved content
 * against the `links` table — inserting new ones, soft-deleting ones that
 * were removed from the text. Diff-based (not delete-all-recreate) so a
 * link's `id`/`created_at` survive unrelated re-saves, matching desktop's
 * note_manager.sync_links() approach (see progress notes: the delete-all
 * version was a known bug since it ran on every save).
 *
 * Desktop's own `core/parser.py` still does the equivalent job for notes
 * edited on desktop — this only needs to cover the web editor's own saves,
 * since Postgres `links` rows are the single shared source of truth either
 * way (that's what BacklinksPanel and the Galaxy graph read from).
 *
 * Returns true if anything changed, so callers can decide whether to
 * refetch the links store.
 */
export async function syncLinksFromContent(noteId, contentJson) {
  const uid = useAuthStore.getState().user?.id
  if (!uid || !noteId) {
    console.log('[links] syncLinksFromContent bỏ qua — thiếu uid hoặc noteId', { uid, noteId })
    return false
  }

  const targets = extractWikiLinkTargets(contentJson)
  console.log(`[links] note ${noteId.slice(0, 8)}… — tìm thấy ${targets.size} wiki-link target(s) trong content:`, [...targets])

  const { data: existing, error } = await supabase
    .from('links')
    .select('id,target_note_id')
    .eq('user_id', uid)
    .eq('source_note_id', noteId)
    .eq('link_type', 'wiki')
    .eq('is_deleted', false)
  if (error) { console.error('[links] fetch existing failed:', error); return false }

  const existingTargets = new Set((existing ?? []).map((l) => l.target_note_id))
  const toInsert = [...targets].filter((t) => !existingTargets.has(t))
  const toRemove = (existing ?? []).filter((l) => !targets.has(l.target_note_id))
  console.log(`[links] existing=${existingTargets.size} toInsert=${toInsert.length} toRemove=${toRemove.length}`)
  if (!toInsert.length && !toRemove.length) return false

  const now = new Date().toISOString()

  if (toInsert.length) {
    const { error: insErr } = await supabase.from('links').insert(
      toInsert.map((targetId) => ({
        id: crypto.randomUUID(),
        user_id: uid,
        source_note_id: noteId,
        target_note_id: targetId,
        link_type: 'wiki',
        created_at: now,
        updated_at: now,
        is_deleted: false,
      }))
    )
    if (insErr) console.error('[links] insert failed:', insErr)
    else console.log(`[links] đã insert ${toInsert.length} link row(s) thành công`)
  }

  if (toRemove.length) {
    const { error: delErr } = await supabase
      .from('links')
      .update({ is_deleted: true, updated_at: now })
      .in('id', toRemove.map((l) => l.id))
    if (delErr) console.error('[links] soft-delete failed:', delErr)
  }

  return true
}

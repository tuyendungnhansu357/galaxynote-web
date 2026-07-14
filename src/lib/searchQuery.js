// Web port of the search syntax documented in SPEC §10.6
// (ui/widgets/search_bar.py):
//   "python"          → plain text match (title, here — no FTS5 index on
//                        web yet, so this is a simple substring match
//                        rather than desktop's real FTS5 ranked search)
//   "#tag"            → filter by tag name
//   "#tag1 #tag2"     → filter by multiple tags (AND — note must have all)
//   "pinned:yes"      → only pinned notes
//   "pinned:no"       → only non-pinned notes
//
// "done:no" / "done:yes" (task completion) is intentionally NOT supported
// yet — tasks aren't tracked as their own entity on web at all (no task
// store, no checkbox syncing to the `tasks` table). Rather than silently
// swallowing the token, parseSearchQuery reports it as unsupported so the
// UI can say so instead of pretending to filter.

export function parseSearchQuery(raw) {
  const tokens = (raw ?? '').trim().split(/\s+/).filter(Boolean)
  const tags = []
  const textTerms = []
  let pinned = null
  let hasUnsupportedDoneToken = false

  for (const tok of tokens) {
    const pinnedMatch = tok.match(/^pinned:(yes|no)$/i)
    const doneMatch = tok.match(/^done:(yes|no)$/i)

    if (tok.startsWith('#') && tok.length > 1) {
      tags.push(tok.slice(1).toLowerCase())
    } else if (pinnedMatch) {
      pinned = pinnedMatch[1].toLowerCase() === 'yes'
    } else if (doneMatch) {
      hasUnsupportedDoneToken = true
    } else {
      textTerms.push(tok.toLowerCase())
    }
  }

  return { tags, textTerms, pinned, hasUnsupportedDoneToken }
}

/**
 * @param notes      note rows (needs .id, .title, .is_pinned)
 * @param query      raw search string
 * @param noteTags   [{note_id, tag_id}] — all note↔tag assignments
 * @param tagsByName Map<lowercase tag name, tag id>
 */
export function filterNotesByQuery(notes, query, noteTags, tagsByName) {
  const { tags, textTerms, pinned } = parseSearchQuery(query)
  if (!tags.length && !textTerms.length && pinned === null) return notes

  let result = notes

  if (pinned !== null) {
    result = result.filter((n) => !!n.is_pinned === pinned)
  }

  if (tags.length) {
    const tagIds = tags.map((name) => tagsByName.get(name)).filter(Boolean)
    // If any #tag token doesn't match a real tag name, nothing can satisfy
    // "has all of these tags" — short-circuit to empty rather than ignoring
    // the unmatched token (which would silently over-match).
    if (tagIds.length !== tags.length) return []
    result = result.filter((n) => {
      const thisNoteTagIds = new Set(noteTags.filter((nt) => nt.note_id === n.id).map((nt) => nt.tag_id))
      return tagIds.every((tid) => thisNoteTagIds.has(tid))
    })
  }

  if (textTerms.length) {
    result = result.filter((n) => {
      const title = (n.title || '').toLowerCase()
      return textTerms.every((t) => title.includes(t))
    })
  }

  return result
}

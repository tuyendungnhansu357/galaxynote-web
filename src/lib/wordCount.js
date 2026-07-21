// Port of core/parser.py::extract_plain_text + core/note_manager.py's
// word/char counting (ui/note_editor.py::_update_properties). Same
// block-type coverage as desktop (text/toggle/task/table) — columns,
// callouts, and embeds aren't counted there either, so this stays an
// honest match rather than a "better" one that would make the two
// platforms disagree on the same note's word count.

function stripHtml(html) {
  return (html || '').replace(/<[^>]+>/g, '').trim()
}

function collectText(blocks, parts) {
  for (const b of blocks ?? []) {
    const t = b?.t
    if (t === 'text') {
      parts.push(stripHtml(b.html))
    } else if (t === 'toggle') {
      parts.push(stripHtml(b.title))
      collectText(b.children, parts)
    } else if (t === 'task') {
      const check = b.done ? '[x]' : '[ ]'
      parts.push(`${check} ${stripHtml(b.html)}`)
    } else if (t === 'table') {
      for (const row of b.rows ?? []) {
        for (const cell of row ?? []) {
          parts.push(stripHtml(typeof cell === 'object' ? cell?.html : String(cell ?? '')))
        }
      }
    }
  }
}

export function extractPlainText(contentJson) {
  if (!contentJson || !contentJson.trim()) return ''
  let data
  try {
    data = JSON.parse(contentJson)
  } catch {
    return stripHtml(contentJson)
  }
  if (!data || typeof data !== 'object' || data.v !== 4) return stripHtml(contentJson)
  const parts = []
  collectText(data.blocks, parts)
  return parts.join('\n')
}

export function countWordsAndChars(contentJson) {
  const text = extractPlainText(contentJson)
  const trimmed = text.trim()
  const words = trimmed ? trimmed.split(/\s+/).length : 0
  const chars = text.length
  return { words, chars }
}

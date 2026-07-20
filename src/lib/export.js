// exportNoteMarkdown below still matches core/export.py's Markdown output
// exactly (lossy by design — Markdown can't represent nested toggles,
// checkboxes, callouts, etc., so this stays a "quick text dump", same on
// both platforms). HTML export is DIFFERENT from desktop's core/export.py
// on purpose now — see htmlExport.js for why (that file goes through
// Markdown too, throwing away nearly all formatting before it even reaches
// HTML). downloadNoteAsHtml below uses the new rich exporter instead.
import { exportNoteHtmlRich } from './htmlExport'

function stripHtml(html) {
  return (html || '').replace(/<[^>]+>/g, '')
}

function blockToMd(block, indent = 0) {
  const prefix = '  '.repeat(indent)
  const t = block?.t || ''

  if (t === 'text') {
    return prefix + stripHtml(block.html)
  }
  if (t === 'toggle') {
    const title = stripHtml(block.title)
    const lines = [prefix + `**${title}**`]
    for (const child of block.children ?? []) lines.push(blockToMd(child, indent + 1))
    return lines.join('\n')
  }
  if (t === 'task') {
    const check = block.done ? '[x]' : '[ ]'
    return prefix + `- ${check} ${stripHtml(block.html)}`
  }
  if (t === 'image') {
    const src = block.local || block.src || ''
    return prefix + `![image](${src})`
  }
  if (t === 'embed') {
    return prefix + `[Embed](${block.src || ''})`
  }
  if (t === 'table') {
    const rows = block.rows || []
    if (!rows.length) return ''
    const lines = []
    rows.forEach((row, i) => {
      const cells = (row || []).map((c) => stripHtml(typeof c === 'object' ? c?.html || '' : String(c)))
      lines.push('| ' + cells.join(' | ') + ' |')
      if (i === 0) lines.push('| ' + cells.map(() => '---').join(' | ') + ' |')
    })
    return lines.join('\n')
  }
  return ''
}

export function exportNoteMarkdown(note) {
  const lines = [`# ${note.title || 'Untitled'}`, '']
  try {
    const data = JSON.parse(note.content || '{}')
    if (data.v === 4) {
      for (const block of data.blocks ?? []) {
        const md = blockToMd(block)
        if (md) lines.push(md)
      }
    }
  } catch {
    lines.push(note.content || '')
  }
  const created = note.created_at ? new Date(note.created_at).toISOString().slice(0, 10) : ''
  lines.push('', `*Created: ${created}*`)
  return lines.join('\n')
}

export function downloadTextFile(filename, content, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function safeFilename(title) {
  return (title || 'Untitled').replace(/[^\w\s-]/g, '').slice(0, 60).trim() || 'Untitled'
}

export function downloadNoteAsMarkdown(note) {
  downloadTextFile(`${safeFilename(note.title)}.md`, exportNoteMarkdown(note), 'text/markdown;charset=utf-8')
}

export async function downloadNoteAsHtml(note) {
  const html = await exportNoteHtmlRich(note)
  downloadTextFile(`${safeFilename(note.title)}.html`, html, 'text/html;charset=utf-8')
}

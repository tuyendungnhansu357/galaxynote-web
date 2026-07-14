// Deliberately minimal — this is NOT a full CommonMark parser. It only
// covers the subset needed to get imported .md content readable inside a
// single "text" block of the editor (headings, bold/italic, links, lists,
// paragraphs). Nested structures, tables, code fences beyond a single
// block, etc. are out of scope for this first pass — flagged in the
// ImportMdModal UI copy so it's not a silent gap.
export function simpleMarkdownToHtml(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const html = []
  let inList = null // 'ul' | 'ol' | null

  function closeList() {
    if (inList) { html.push(`</${inList}>`); inList = null }
  }

  function inlineFormat(text) {
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/\*(.+?)\*/g, '<i>$1</i>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    const heading = line.match(/^(#{1,6})\s+(.*)/)
    const bullet = line.match(/^[-*]\s+(.*)/)
    const numbered = line.match(/^\d+\.\s+(.*)/)

    if (heading) {
      closeList()
      const level = Math.min(heading[1].length, 4)
      html.push(`<h${level}>${inlineFormat(heading[2])}</h${level}>`)
    } else if (bullet) {
      if (inList !== 'ul') { closeList(); html.push('<ul>'); inList = 'ul' }
      html.push(`<li>${inlineFormat(bullet[1])}</li>`)
    } else if (numbered) {
      if (inList !== 'ol') { closeList(); html.push('<ol>'); inList = 'ol' }
      html.push(`<li>${inlineFormat(numbered[1])}</li>`)
    } else if (line.trim() === '') {
      closeList()
    } else {
      closeList()
      html.push(`<p>${inlineFormat(line)}</p>`)
    }
  }
  closeList()
  return html.join('')
}

// Wraps HTML into the Block Editor JSON v4 shape as a single text block,
// with a block_id like the desktop parser expects for text blocks.
export function htmlToBlockJson(html) {
  return JSON.stringify({
    v: 4,
    blocks: [{ t: 'text', html, bg: '', block_id: crypto.randomUUID() }],
  })
}

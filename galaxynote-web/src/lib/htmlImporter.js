// Parses an .html file back into Block Editor JSON v4.
//
// Two paths per top-level element:
//   1. Wrapped in <div class="gn-block" data-gn-json="..."> (what
//      htmlExport.js now produces) → JSON.parse the attribute directly.
//      This is what makes round-tripping a GalaxyNote-exported file
//      lossless — the block object is read back verbatim, not re-derived.
//   2. Anything else (a real-world HTML page/file someone else made) →
//      generic fallback: h1-h6/p/ul/ol/div → text block, table → table
//      block, img → image block, blockquote → quote block, pre → code
//      block, details/summary → toggle block.

function genId() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12)
}

function tableElementToBlock(el) {
  const rows = [...el.querySelectorAll('tr')].map((tr) =>
    [...tr.querySelectorAll('td,th')].map((cell) => ({ html: cell.innerHTML, w: null }))
  )
  if (!rows.length) return null
  const hasHeader = !!el.querySelector('tr:first-child th')
  return { t: 'table', rows, bg: '', align: 'left', w: '100%', hasHeader, hasColHdr: false }
}

function detailsElementToBlock(el) {
  const summary = el.querySelector(':scope > summary')
  const title = summary ? summary.innerHTML : ''
  const bodyEl = el.querySelector(':scope > .gn-toggle-body')
  const children = bodyEl
    ? elementsToBlocks([...bodyEl.children])
    : elementsToBlocks([...el.children].filter((c) => c !== summary))
  return { t: 'toggle', title, open: el.hasAttribute('open'), children, bg: '' }
}

function genericElementToBlock(el) {
  const tag = el.tagName.toLowerCase()
  if (tag === 'table') return tableElementToBlock(el)
  if (tag === 'blockquote') return { t: 'quote', html: el.innerHTML, align: 'left', w: '100%', bg: '' }
  if (tag === 'pre') return { t: 'code', code: el.textContent || '', align: 'left', w: '100%', wrap: false, bg: '' }
  if (tag === 'details') return detailsElementToBlock(el)
  if (tag === 'img') {
    const src = el.getAttribute('src') || ''
    return src ? { t: 'image', src, w: 0, align: 'left', local: '', bg: '' } : null
  }
  if (/^h[1-6]$/.test(tag) || tag === 'p' || tag === 'ul' || tag === 'ol' || tag === 'div' || tag === 'section') {
    const html = el.innerHTML.trim()
    if (!html) return null
    return { t: 'text', html, blockType: /^h[1-6]$/.test(tag) ? tag : '', bg: '' }
  }
  return null
}

function elementsToBlocks(elements) {
  const out = []
  for (const el of elements) {
    if (!(el instanceof Element)) continue

    if (el.classList.contains('gn-block')) {
      const raw = el.getAttribute('data-gn-json')
      if (raw) {
        try {
          const block = JSON.parse(raw)
          if (block.t === 'task' && !block.block_id) block.block_id = genId()
          out.push(block)
          continue
        } catch {
          // fall through to generic handling of whatever's inside
        }
      }
      // gn-block wrapper but JSON failed/missing — recurse into its real
      // content tag (details/table/img/etc.) via the generic fallback.
      const inner = el.firstElementChild
      const block = inner ? genericElementToBlock(inner) : null
      if (block) out.push(block)
      continue
    }

    const block = genericElementToBlock(el)
    if (block) out.push(block)
  }
  return out
}

export function extractTitle(htmlString, fallback) {
  const doc = new DOMParser().parseFromString(htmlString, 'text/html')
  const h1 = doc.querySelector('h1')
  const titleTag = doc.querySelector('title')
  return (h1?.textContent || titleTag?.textContent || fallback || 'Imported note').trim()
}

export function htmlFileToBlockJson(htmlString) {
  const doc = new DOMParser().parseFromString(htmlString, 'text/html')
  const children = [...doc.body.children]

  // A bare top-level <h1> with no data-gn-json / gn-block wrapper is the
  // document's own title (that's exactly how htmlExport.js places it) —
  // skip it here since extractTitle() already uses it as the note title,
  // so it isn't duplicated as a content block too.
  const filtered = children.filter((el, i) => !(i === 0 && el.tagName === 'H1' && !el.closest('.gn-block')))

  const blocks = elementsToBlocks(filtered)
  if (!blocks.length) {
    // Nothing recognizable — keep the raw HTML as one text block rather
    // than silently importing an empty note.
    blocks.push({ t: 'text', html: doc.body.innerHTML, bg: '', block_id: genId() })
  }
  return JSON.stringify({ v: 4, blocks })
}

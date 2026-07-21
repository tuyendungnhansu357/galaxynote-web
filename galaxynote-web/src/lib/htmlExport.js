import { supabase } from './supabase'
import { useAuthStore } from '../stores/authStore'

const STORAGE_BUCKET = 'attachments' // same bucket desktop's sync_manager.py uploads to

function escAttr(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function escText(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => resolve('')
    reader.readAsDataURL(blob)
  })
}

async function inlineImage(block) {
  if (block.src && block.src.startsWith('data:')) return block
  if (block.src && /^https?:\/\//.test(block.src)) return block // already a real, working URL
  if (!block.local) return block
  const uid = useAuthStore.getState().user?.id
  if (!uid) return block
  try {
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(`${uid}/${block.local}`)
    if (error || !data) return block
    const dataUrl = await blobToDataUrl(data)
    return dataUrl ? { ...block, src: dataUrl } : block
  } catch {
    return block
  }
}

// Recursively resolves every image block's actual bytes so the exported file
// is fully self-contained — opens correctly on any device/app with no
// shared Supabase Storage access, which is the whole point of exporting.
async function inlineImages(block) {
  if (block.t === 'image') return inlineImage(block)
  if (block.t === 'toggle' || block.t === 'callout') {
    const children = await Promise.all((block.children || []).map(inlineImages))
    return { ...block, children }
  }
  if (block.t === 'columns') {
    const cols = await Promise.all((block.cols || []).map((col) => Promise.all((col || []).map(inlineImages))))
    return { ...block, cols }
  }
  return block
}

function blockToHtml(block) {
  const json = escAttr(JSON.stringify(block))
  let inner
  switch (block?.t) {
    case 'text':
      inner = block.html || ''
      break
    case 'toggle': {
      const children = (block.children || []).map(blockToHtml).join('')
      inner = `<details${block.open !== false ? ' open' : ''}><summary>${block.title || ''}</summary><div class="gn-toggle-body">${children}</div></details>`
      break
    }
    case 'task':
      inner = `<div class="gn-task"><label><input type="checkbox" disabled${block.done ? ' checked' : ''}> <span${block.done ? ' style="text-decoration:line-through;opacity:.6"' : ''}>${block.html || ''}</span></label></div>`
      break
    case 'image':
      inner = block.src
        ? `<img src="${escAttr(block.src)}" style="max-width:100%">`
        : `<p><em>[Ảnh không kèm theo — không đọc được file cục bộ lúc export]</em></p>`
      break
    case 'embed':
      inner = `<p>🔗 <a href="${escAttr(block.src || '')}" target="_blank" rel="noopener">${escText(block.src || '')}</a></p>`
      break
    case 'pdf':
      inner = `<p>📄 ${escText(block.name || 'PDF')}</p>`
      break
    case 'table': {
      const rows = block.rows || []
      const trs = rows.map((row, i) => {
        const tag = i === 0 && block.hasHeader ? 'th' : 'td'
        const cells = (row || []).map((c) => `<${tag}>${(c && c.html) || ''}</${tag}>`).join('')
        return `<tr>${cells}</tr>`
      }).join('')
      inner = `<table border="1" cellspacing="0" cellpadding="6">${trs}</table>`
      break
    }
    case 'quote':
      inner = `<blockquote>${block.html || ''}</blockquote>`
      break
    case 'code':
      inner = `<pre><code>${escText(block.code || '')}</code></pre>`
      break
    case 'callout': {
      const children = (block.children || []).map(blockToHtml).join('')
      inner = `<div class="gn-callout"><span class="gn-callout-icon">${block.icon || '💡'}</span><div class="gn-callout-body">${children}</div></div>`
      break
    }
    case 'columns': {
      const cols = (block.cols || []).map((colBlocks) => `<div class="gn-col">${(colBlocks || []).map(blockToHtml).join('')}</div>`).join('')
      inner = `<div class="gn-columns" style="--gn-cols:${block.count || 2}">${cols}</div>`
      break
    }
    default:
      inner = ''
  }
  // Every real block is wrapped with data-gn-json = the ORIGINAL block
  // object, verbatim. That's what makes re-importing this exact file
  // lossless — the importer reads the object back directly instead of
  // re-deriving it by guessing from the visual HTML.
  return `<div class="gn-block" data-gn-type="${escAttr(block?.t)}" data-gn-json="${json}">${inner}</div>`
}

const STYLE = `
body{font-family:'Segoe UI',Arial,sans-serif;max-width:820px;margin:40px auto;padding:0 20px;color:#1a2040;line-height:1.7;background:#fff}
h1{color:#0d1120}
.gn-block{margin:10px 0}
.gn-task label{display:flex;align-items:flex-start;gap:8px;cursor:default}
details{border:1px solid #dde0ee;border-radius:8px;padding:8px 12px;background:#f5f7ff}
details>summary{cursor:pointer;font-weight:600}
.gn-toggle-body{margin-top:8px;padding-left:12px;border-left:2px solid #dde0ee}
table{width:100%;margin:8px 0;border-collapse:collapse}
th,td{border:1px solid #dde0ee;padding:6px 10px;text-align:left}
blockquote{margin:8px 0;padding:4px 16px;border-left:3px solid #4f8ef7;color:#3a4060;font-style:italic}
pre{background:#131929;color:#e8edf8;padding:12px 14px;border-radius:8px;overflow-x:auto}
.gn-callout{display:flex;gap:10px;padding:10px 14px;border-radius:8px;background:#eef2ff;border-left:3px solid #4f8ef7}
.gn-columns{display:grid;grid-template-columns:repeat(var(--gn-cols,2),1fr);gap:20px}
img{border-radius:6px}
`.trim()

/**
 * Rich, near-lossless HTML export. Replaces the old approach (Markdown
 * first, then a handful of regexes) which lost almost everything: no real
 * bold/italic, images became a bare markdown link, tables/toggles/tasks/
 * callouts all flattened into plain paragraphs.
 *
 * This walks the block JSON directly:
 *   - keeps each block's real HTML/formatting as-is
 *   - toggle→<details>, task→checkbox, table→a real <table>, quote→
 *     <blockquote>, code→<pre>, callout/columns get their own containers
 *   - embeds every block's original JSON in data-gn-json — importing this
 *     exact file back (see htmlImporter.js) reconstructs the ORIGINAL
 *     block objects, not a re-guessed approximation
 *   - inlines every image as a base64 data: URL first (async), so the file
 *     is fully self-contained and portable to a different device/app with
 *     no shared storage — this is the entire point of "export to share".
 */
export async function exportNoteHtmlRich(note) {
  let blocks = []
  try {
    const data = JSON.parse(note.content || '{}')
    if (data.v === 4) blocks = data.blocks || []
  } catch { /* leave blocks empty */ }

  const resolved = await Promise.all(blocks.map(inlineImages))
  const body = resolved.map(blockToHtml).join('\n')
  const title = escText(note.title || 'Untitled')

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<title>${title}</title>
<meta name="generator" content="GalaxyNote">
<style>${STYLE}</style>
</head>
<body>
<h1>${title}</h1>
${body}
</body>
</html>
`
}

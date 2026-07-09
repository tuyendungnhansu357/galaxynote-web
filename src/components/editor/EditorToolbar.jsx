import { useState, useRef } from 'react'
import {
  Undo2, Redo2, Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Eraser, Paintbrush,
  Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare, ChevronRight,
  Table, Image as ImageIcon, Link as LinkIcon, Smile, Code, Quote, Lightbulb,
  Video,
} from 'lucide-react'

const FONT_FAMILIES = [
  'Segoe UI', 'Arial', 'Calibri', 'Georgia', 'Times New Roman', 'Tahoma',
  'Trebuchet MS', 'Verdana', 'Inter', 'Roboto', 'Poppins', 'Merriweather',
  'JetBrains Mono', 'Fira Code',
]
const FONT_SIZES = ['10', '11', '12', '13', '14', '16', '18', '20', '24', '28', '32', '36', '48']

function ToolButton({ icon: Icon, label, tip, onClick, active, disabled, w = 'w-8' }) {
  return (
    <button
      type="button"
      title={tip}
      disabled={disabled}
      onClick={onClick}
      className={`flex ${w} h-8 shrink-0 items-center justify-center rounded-md text-sm transition
        ${active ? 'bg-star/20 text-star' : 'text-fg-dim hover:bg-panel-2'}
        disabled:cursor-not-allowed disabled:opacity-30`}
    >
      {Icon ? <Icon size={15} /> : label}
    </button>
  )
}

function Sep() {
  return <div className="mx-1 h-5 w-px shrink-0 bg-line" />
}

/**
 * Word-style ribbon toolbar for the block editor — web port of
 * ui/note_editor.py::EditorToolbar. Every button calls straight into
 * `editorRef.current.exec(...)`, which forwards to `window.editorCmd.*`
 * inside the (unmodified) desktop editor iframe.
 *
 * Not ported yet (flagged, not silently missing): format painter drag-state,
 * block-template picker, wiki-link autocomplete, PDF embed, in-note find bar.
 * These need either a native file picker round-trip or a dialog UI that's
 * out of scope for the Sprint 4 skeleton pass.
 */
export default function EditorToolbar({ editorRef, ready }) {
  const [painterActive, setPainterActive] = useState(false)
  const fileInputRef = useRef(null)

  function exec(name, ...args) {
    editorRef.current?.exec(name, ...args)
  }

  function heading(level) {
    editorRef.current?.execRaw((win) => win.document.execCommand('formatBlock', false, level))
  }

  function togglePainter() {
    if (painterActive) exec('cancelFormatPainter')
    else exec('copyFormat')
    setPainterActive(!painterActive)
  }

  function insertLink() {
    const url = window.prompt('URL:', 'https://')
    if (!url?.trim()) return
    const text = window.prompt('Display text:', url.trim()) ?? url.trim()
    exec('insertLink', url.trim(), text)
  }

  function insertEmbed() {
    const url = window.prompt('Paste YouTube, Google Docs, or any URL:')
    if (!url?.trim()) return
    let src = url.trim()
    const yt = src.match(/youtube\.com\/watch\?.*v=([\w-]+)/) || src.match(/youtu\.be\/([\w-]+)/)
    if (yt) src = `https://www.youtube.com/embed/${yt[1]}`
    if (src.includes('docs.google.com') && src.includes('/edit')) src = src.replace('/edit', '/preview')
    const html = `<iframe src="${src}" width="100%" height="450" frameborder="0" allowfullscreen></iframe>`
    exec('insertEmbed', html)
  }

  function insertEmoji() {
    const emoji = window.prompt('Emoji (dán trực tiếp, vd 🎉):')
    if (emoji?.trim()) exec('insertEmoji', emoji.trim())
  }

  function handleImagePick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => exec('insertImage', reader.result, '')
    reader.readAsDataURL(file)
  }

  return (
    <div className="border-b border-line bg-panel">
      <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImagePick} />

      {/* Row 1 — text formatting */}
      <div className="flex items-center gap-0.5 overflow-x-auto px-2 py-1.5">
        <ToolButton icon={Undo2} tip="Undo (Ctrl+Z)" onClick={() => exec('undo')} disabled={!ready} />
        <ToolButton icon={Redo2} tip="Redo (Ctrl+Y)" onClick={() => exec('redo')} disabled={!ready} />
        <Sep />

        <select
          disabled={!ready}
          defaultValue="Segoe UI"
          onChange={(e) => exec('_setFontFamily', e.target.value)}
          className="h-8 w-[110px] shrink-0 rounded-md border border-line bg-bg px-1.5 text-xs text-fg-dim outline-none disabled:opacity-40"
        >
          {FONT_FAMILIES.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <select
          disabled={!ready}
          defaultValue="14"
          onChange={(e) => exec('setFontSize', `${e.target.value}pt`)}
          className="h-8 w-12 shrink-0 rounded-md border border-line bg-bg px-1 text-xs text-fg-dim outline-none disabled:opacity-40"
        >
          {FONT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <Sep />

        <ToolButton icon={Bold} tip="Bold (Ctrl+B)" onClick={() => exec('bold')} disabled={!ready} />
        <ToolButton icon={Italic} tip="Italic (Ctrl+I)" onClick={() => exec('italic')} disabled={!ready} />
        <ToolButton icon={Underline} tip="Underline (Ctrl+U)" onClick={() => exec('under')} disabled={!ready} />
        <ToolButton icon={Strikethrough} tip="Strikethrough" onClick={() => exec('strike')} disabled={!ready} />
        <Sep />

        <label className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-dim hover:bg-panel-2" title="Text color">
          <span className="text-xs font-bold">A</span>
          <input type="color" defaultValue="#e8edf8" disabled={!ready} onChange={(e) => exec('color', e.target.value)} className="h-0 w-0 opacity-0" />
        </label>
        <label className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-dim hover:bg-panel-2" title="Highlight color">
          <span className="text-xs">◩</span>
          <input type="color" defaultValue="#f0c060" disabled={!ready} onChange={(e) => exec('highlight', e.target.value)} className="h-0 w-0 opacity-0" />
        </label>
        <Sep />

        <ToolButton icon={AlignLeft} tip="Align Left" onClick={() => exec('alignLeft')} disabled={!ready} />
        <ToolButton icon={AlignCenter} tip="Align Center" onClick={() => exec('alignCenter')} disabled={!ready} />
        <ToolButton icon={AlignRight} tip="Align Right" onClick={() => exec('alignRight')} disabled={!ready} />
        <ToolButton icon={AlignJustify} tip="Justify" onClick={() => exec('justifyFull')} disabled={!ready} />
        <Sep />

        <ToolButton icon={Paintbrush} tip="Copy Formatting" onClick={togglePainter} active={painterActive} disabled={!ready} />
        <ToolButton icon={Eraser} tip="Clear Formatting" onClick={() => exec('clearFmt')} disabled={!ready} />
      </div>

      {/* Row 2 — insert / block types */}
      <div className="flex items-center gap-0.5 overflow-x-auto border-t border-line px-2 py-1.5">
        <ToolButton icon={Heading1} tip="Heading 1" onClick={() => heading('h1')} disabled={!ready} />
        <ToolButton icon={Heading2} tip="Heading 2" onClick={() => heading('h2')} disabled={!ready} />
        <ToolButton icon={Heading3} tip="Heading 3" onClick={() => heading('h3')} disabled={!ready} />
        <Sep />

        <ToolButton icon={List} tip="Bullet List" onClick={() => exec('bulletList')} disabled={!ready} />
        <ToolButton icon={ListOrdered} tip="Numbered List" onClick={() => exec('numList')} disabled={!ready} />
        <ToolButton icon={CheckSquare} tip="Task Checkbox" onClick={() => exec('addTask')} disabled={!ready} />
        <ToolButton icon={ChevronRight} tip="Toggle Block" onClick={() => exec('addToggle')} disabled={!ready} />
        <Sep />

        <ToolButton icon={Table} tip="Insert Table" onClick={() => exec('insertTable')} disabled={!ready} />
        <ToolButton icon={ImageIcon} tip="Insert Image" onClick={() => fileInputRef.current?.click()} disabled={!ready} />
        <ToolButton icon={LinkIcon} tip="Insert Hyperlink" onClick={insertLink} disabled={!ready} />
        <ToolButton icon={Smile} tip="Insert Emoji" onClick={insertEmoji} disabled={!ready} />
        <Sep />

        <ToolButton icon={Video} tip="Embed YouTube / URL" onClick={insertEmbed} disabled={!ready} w="w-auto px-2" />
        <Sep />

        <ToolButton icon={Code} tip="Code Block" onClick={() => exec('insertCodeBlock')} disabled={!ready} />
        <ToolButton icon={Quote} tip="Quote Block" onClick={() => exec('insertQuoteBlock')} disabled={!ready} />
        <ToolButton icon={Lightbulb} tip="Callout Block" onClick={() => exec('insertCallout', '💡', 'blue')} disabled={!ready} />
      </div>
    </div>
  )
}

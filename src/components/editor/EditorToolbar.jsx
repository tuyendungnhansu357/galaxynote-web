import { useState, useRef, forwardRef, useImperativeHandle } from 'react'
import {
  Undo2, Redo2, Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Eraser, Paintbrush,
  Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare, ChevronRight,
  Table, Image as ImageIcon, Link as LinkIcon, Smile, Code, Quote, Lightbulb,
  Video, Search, Columns3, FileText, ClipboardList,
} from 'lucide-react'
import { uploadImageBlob, uploadPdfBlob } from '../../lib/attachments'
import { useTemplateStore } from '../../stores/templateStore'
import TemplatePickerMenu from '../templates/TemplatePickerMenu'
import SaveAsTemplateModal from '../templates/SaveAsTemplateModal'
import TemplateManagerModal from '../templates/TemplateManagerModal'

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
 * The "/" slash-menu inside editor_template.html calls
 * `window.bridge.trigger_insert_image()` etc. for Image/Link/Emoji/
 * Embed/PDF/Block-Templates — same bridge-call mechanism as everything
 * else, forwarded by bridge_shim.js. Desktop's Python `_Bridge` answers
 * those directly; on web there's no Python side, so EditorFrame relays
 * them here via onBridgeTrigger, and this component exposes matching
 * trigger* methods through a ref so the same code path the toolbar
 * buttons already use also runs when triggered from the slash-menu.
 *
 * Not ported yet (flagged, not silently missing): format painter
 * drag-state, wiki-link autocomplete. Block Templates (picker, manager,
 * save-current) IS wired below — see triggerBlockTemplates.
 */
const EditorToolbar = forwardRef(function EditorToolbar(
  { editorRef, ready, noteId, onToggleFind, findOpen },
  ref
) {
  const [painterActive, setPainterActive] = useState(false)
  const fileInputRef = useRef(null)
  const pdfInputRef = useRef(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const templateBtnRef = useRef(null)
  const [manageOpen, setManageOpen] = useState(false)
  const [saveAsOpen, setSaveAsOpen] = useState(false)
  const createTemplate = useTemplateStore((s) => s.createTemplate)

  function exec(name, ...args) {
    editorRef.current?.exec(name, ...args)
  }

  function insertColumns() {
    const raw = window.prompt('Số cột (2-5):', '2')
    if (raw == null) return
    const n = Math.max(2, Math.min(5, parseInt(raw, 10) || 2))
    exec('insertColumns', n)
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
    reader.onload = async () => {
      const dataUrl = reader.result
      try {
        const relativePath = await uploadImageBlob(file, noteId)
        exec('insertImage', dataUrl, relativePath)
      } catch (err) {
        console.warn('[attachments] upload thất bại, chèn tạm dạng inline:', err)
        exec('insertImage', dataUrl, '')
      }
    }
    reader.readAsDataURL(file)
  }

  function handlePdfPick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    ;(async () => {
      try {
        const relativePath = await uploadPdfBlob(file, noteId)
        // insertPdfBlock(absPath, relPath, filename) — absPath is a plain
        // object URL here (view-only for this session); the canonical copy
        // lives in Supabase Storage at relPath, same as desktop's local
        // file path convention, so re-opening the note re-resolves it via
        // request_pdf_data like any PDF added from desktop.
        exec('insertPdfBlock', URL.createObjectURL(file), relativePath, file.name)
      } catch (err) {
        console.warn('[attachments] PDF upload thất bại:', err)
        window.alert('Không thể tải PDF lên — vui lòng thử lại.')
      }
    })()
  }

  // Web port of ui/note_editor.py::NoteEditorArea.insert_template() — appends
  // the template's blocks to the end of current content. Desktop's own
  // version does this via setContent() (full reload + undo-history reset),
  // which is why desktop's Ctrl+Z can't undo a template insert either — on
  // web this uses insertTemplateBlocks() instead, appending directly into
  // the live DOM so undo works and existing content is never at risk from a
  // stale getContent() snapshot.
  function insertTemplateContent(templateContentJson) {
    exec('insertTemplateBlocks', templateContentJson)
  }

  async function handleSaveAsTemplate({ name, icon, category, description }) {
    const contentJson = exec('getContent') || '{"v":4,"blocks":[]}'
    await createTemplate({ name, icon, category, description, content_json: contentJson })
  }

  function triggerBlockTemplates() {
    setPickerOpen((v) => !v)
  }

  useImperativeHandle(ref, () => ({
    triggerInsertImage: () => { exec('pinFocus'); fileInputRef.current?.click() },
    triggerInsertLink: insertLink,
    triggerInsertEmoji: insertEmoji,
    triggerInsertEmbed: insertEmbed,
    triggerInsertPdf: () => { exec('pinFocus'); pdfInputRef.current?.click() },
    triggerBlockTemplates,
  }))

  return (
    <div className="border-b border-line bg-panel">
      <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImagePick} />
      <input ref={pdfInputRef} type="file" accept="application/pdf" hidden onChange={handlePdfPick} />

      {/* Row 1 — text formatting */}
      <div className="flex items-center gap-0.5 overflow-x-auto px-2 py-1.5">
        <ToolButton icon={Undo2} tip="Undo (Ctrl+Z)" onClick={() => exec('undo')} disabled={!ready} />
        <ToolButton icon={Redo2} tip="Redo (Ctrl+Y)" onClick={() => exec('redo')} disabled={!ready} />
        <ToolButton icon={Search} tip="Find in Note (Ctrl+F)" onClick={onToggleFind} active={findOpen} disabled={!ready} />
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
        <ToolButton icon={Columns3} tip="Insert Columns (2-5)" onClick={insertColumns} disabled={!ready} />
        <ToolButton icon={ImageIcon} tip="Insert Image" onClick={() => { exec('pinFocus'); fileInputRef.current?.click() }} disabled={!ready} />
        <ToolButton icon={FileText} tip="Insert PDF" onClick={() => { exec('pinFocus'); pdfInputRef.current?.click() }} disabled={!ready} />
        <ToolButton icon={LinkIcon} tip="Insert Hyperlink" onClick={insertLink} disabled={!ready} />
        <ToolButton icon={Smile} tip="Insert Emoji" onClick={insertEmoji} disabled={!ready} />
        <Sep />

        <ToolButton icon={Video} tip="Embed YouTube / URL" onClick={insertEmbed} disabled={!ready} w="w-auto px-2" />
        <Sep />

        <ToolButton icon={Code} tip="Code Block" onClick={() => exec('insertCodeBlock')} disabled={!ready} />
        <ToolButton icon={Quote} tip="Quote Block" onClick={() => exec('insertQuoteBlock')} disabled={!ready} />
        <ToolButton icon={Lightbulb} tip="Callout Block" onClick={() => exec('insertCallout', '💡', 'blue')} disabled={!ready} />
        <Sep />

        <div className="relative" ref={templateBtnRef}>
          <ToolButton icon={ClipboardList} tip="Block Templates" onClick={triggerBlockTemplates} active={pickerOpen} disabled={!ready} />
          {pickerOpen && (
            <TemplatePickerMenu
              anchorRef={templateBtnRef}
              onClose={() => setPickerOpen(false)}
              onPick={insertTemplateContent}
              onManage={() => setManageOpen(true)}
              onSaveCurrent={() => setSaveAsOpen(true)}
            />
          )}
        </div>
      </div>

      {saveAsOpen && (
        <SaveAsTemplateModal onClose={() => setSaveAsOpen(false)} onSave={handleSaveAsTemplate} />
      )}
      {manageOpen && (
        <TemplateManagerModal onClose={() => setManageOpen(false)} onUseTemplate={insertTemplateContent} />
      )}
    </div>
  )
})

export default EditorToolbar

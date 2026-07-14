import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Home, Plus, CalendarDays, Link2, FileUp, Orbit,
  PanelLeftClose, PanelLeft, BookOpen, Sun,
} from 'lucide-react'
import MenuDropdown from './MenuDropdown'
import ImportUrlModal from './ImportUrlModal'
import ImportMdModal from './ImportMdModal'
import TagManagerModal from '../sidebar/TagManagerModal'
import { useNoteStore } from '../../stores/noteStore'
import { useTagStore } from '../../stores/tagStore'

/**
 * Web port of the desktop menu bar + top toolbar (SPEC §10.1: File / Edit /
 * View / Tags / Help menus, plus Home / New / Today / Import / Galaxy /
 * Sidebar / Backlinks / Theme buttons in main_window.py).
 *
 * Honest gaps, not silent ones:
 * - Edit menu: Undo/Redo/Find aren't wired here — they live on the block
 *   editor's own toolbar (bold/italic/etc.), which already calls
 *   editorCmd.undo()/redo() directly. Duplicating that into a global menu
 *   would need lifting the active editor ref up through HomePage; deferred.
 * - Light theme: toggle present, disabled — only the dark palette exists
 *   so far (src/index.css tokens).
 */
export default function TopBar({ sidebarVisible, onToggleSidebar, backlinksVisible, onToggleBacklinks }) {
  const navigate = useNavigate()
  const { createNote, getOrCreateDailyNote, setActiveNoteId } = useNoteStore()
  const { createTag } = useTagStore()
  const [importUrlOpen, setImportUrlOpen] = useState(false)
  const [importMdOpen, setImportMdOpen] = useState(false)
  const [tagManagerOpen, setTagManagerOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)

  async function handleNewNote() {
    const note = await createNote()
    if (note) setActiveNoteId(note.id)
  }

  async function handleToday() {
    const note = await getOrCreateDailyNote()
    if (note) setActiveNoteId(note.id)
  }

  async function handleNewTag() {
    const tag = await createTag({ name: 'tag-moi' })
    if (tag) setTagManagerOpen(true)
  }

  function handleImported(noteId) {
    setActiveNoteId(noteId)
  }

  return (
    <div className="border-b border-line bg-panel">
      {/* Menu row */}
      <div className="flex items-center gap-1 border-b border-line px-2 py-1">
        <MenuDropdown
          label="File"
          items={[
            { label: 'Note mới', shortcut: 'Ctrl+N', onClick: handleNewNote },
            { label: 'Daily Note hôm nay', shortcut: 'Ctrl+D', onClick: handleToday },
            null,
            { label: 'Import URL…', onClick: () => setImportUrlOpen(true) },
            { label: 'Import Markdown…', onClick: () => setImportMdOpen(true) },
          ]}
        />
        <MenuDropdown
          label="Edit"
          items={[
            { label: 'Undo / Redo — dùng nút trên toolbar soạn thảo', disabled: true },
          ]}
        />
        <MenuDropdown
          label="View"
          items={[
            { label: sidebarVisible ? 'Ẩn Sidebar' : 'Hiện Sidebar', shortcut: 'Ctrl+\\', onClick: onToggleSidebar },
            { label: backlinksVisible ? 'Ẩn Backlinks' : 'Hiện Backlinks', onClick: onToggleBacklinks },
            { label: 'Galaxy 3D', shortcut: 'Ctrl+G', onClick: () => navigate('/graph') },
            { label: 'Giao diện sáng — sắp có', disabled: true },
          ]}
        />
        <MenuDropdown
          label="Tags"
          items={[
            { label: 'Quản lý Tag…', shortcut: 'Ctrl+Shift+T', onClick: () => setTagManagerOpen(true) },
            { label: 'Tag mới', onClick: handleNewTag },
          ]}
        />
        <MenuDropdown
          label="Help"
          items={[{ label: 'Giới thiệu GalaxyNote', onClick: () => setAboutOpen(true) }]}
        />
      </div>

      {/* Action toolbar row */}
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-fg-dim hover:bg-panel-2"
        >
          <Home size={13} /> Home
        </button>
        <button
          onClick={handleNewNote}
          className="flex items-center gap-1.5 rounded-md bg-star px-2.5 py-1.5 text-xs font-medium text-white hover:brightness-110"
        >
          <Plus size={13} /> New
        </button>
        <button
          onClick={handleToday}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-fg-dim hover:bg-panel-2"
        >
          <CalendarDays size={13} /> Today
        </button>

        <div className="mx-1 h-5 w-px bg-line" />

        <button
          onClick={() => setImportUrlOpen(true)}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-fg-dim hover:bg-panel-2"
        >
          <Link2 size={13} /> Import URL
        </button>
        <button
          onClick={() => setImportMdOpen(true)}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-fg-dim hover:bg-panel-2"
        >
          <FileUp size={13} /> Import MD
        </button>

        <div className="mx-1 h-5 w-px bg-line" />

        <button
          onClick={() => navigate('/graph')}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-fg-dim hover:bg-panel-2"
        >
          <Orbit size={13} /> Galaxy
        </button>
        <button
          onClick={onToggleSidebar}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-fg-dim hover:bg-panel-2"
        >
          {sidebarVisible ? <PanelLeftClose size={13} /> : <PanelLeft size={13} />} Sidebar
        </button>
        <button
          onClick={onToggleBacklinks}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
            backlinksVisible ? 'bg-panel-2 text-fg' : 'text-fg-dim hover:bg-panel-2'
          }`}
        >
          <BookOpen size={13} /> Backlinks
        </button>

        <div className="flex-1" />

        <button
          disabled
          title="Giao diện sáng — sắp có"
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-fg-mute opacity-50"
        >
          <Sun size={13} /> Light
        </button>
      </div>

      {importUrlOpen && <ImportUrlModal onClose={() => setImportUrlOpen(false)} onImported={handleImported} />}
      {importMdOpen && <ImportMdModal onClose={() => setImportMdOpen(false)} onImported={handleImported} />}
      {tagManagerOpen && <TagManagerModal onClose={() => setTagManagerOpen(false)} />}
      {aboutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setAboutOpen(false)}>
          <div className="w-[340px] rounded-2xl border border-line bg-panel p-6 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-star/15">
              <span className="h-2.5 w-2.5 rounded-full bg-star shadow-[0_0_12px_3px_rgba(79,142,247,0.6)]" />
            </div>
            <h3 className="font-display text-lg font-semibold text-fg">GalaxyNote</h3>
            <p className="mt-1 text-xs text-fg-faint">Tag là hành tinh. Note là vệ tinh.</p>
            <p className="mt-3 text-[11px] text-fg-mute">Web companion — Sprint 4</p>
          </div>
        </div>
      )}
    </div>
  )
}

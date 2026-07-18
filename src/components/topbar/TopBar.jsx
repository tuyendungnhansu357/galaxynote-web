import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Home, Plus, CalendarDays, Link2, FileUp, Orbit,
  PanelLeftClose, PanelLeft, BookOpen, Sun, Moon, Tags,
} from 'lucide-react'
import MenuDropdown from './MenuDropdown'
import ImportUrlModal from './ImportUrlModal'
import ImportMdModal from './ImportMdModal'
import SettingsModal from './SettingsModal'
import TagManagerModal from '../sidebar/TagManagerModal'
import GuideModal from '../help/GuideModal'
import { useNoteStore } from '../../stores/noteStore'
import { useTagStore } from '../../stores/tagStore'
import { downloadNoteAsMarkdown, downloadNoteAsHtml } from '../../lib/export'
import { useThemeStore } from '../../stores/themeStore'
import { useActiveEditorStore } from '../../stores/activeEditorStore'
import { useQuickSwitcherStore } from '../../stores/quickSwitcherStore'

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
 * - Light theme: fully wired (useThemeStore + index.css [data-theme="light"]
 *   overrides). Galaxy 3D and the Auth starfield intentionally stay dark in
 *   both themes, same as desktop's graph_3d_view.py never calling set_theme.
 */
export default function TopBar({ sidebarVisible, onToggleSidebar, backlinksVisible, onToggleBacklinks, activeNote, onGoHome }) {
  const navigate = useNavigate()
  const { createNote, getOrCreateDailyNote, setActiveNoteId } = useNoteStore()
  const { createTag } = useTagStore()
  const [importUrlOpen, setImportUrlOpen] = useState(false)
  const [importMdOpen, setImportMdOpen] = useState(false)
  const [tagManagerOpen, setTagManagerOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const { isDark, toggleTheme } = useThemeStore()
  const editor = useActiveEditorStore((s) => s.editor)
  const editorReady = useActiveEditorStore((s) => s.ready)
  const openQuickSwitcher = useQuickSwitcherStore((s) => s.open)

  // F1 opens the guide from anywhere — matches desktop's
  // act_guide.setShortcut("F1") in main_window.py.
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'F1') {
        e.preventDefault()
        setGuideOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

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
            null,
            { label: 'Export Markdown (.md)', disabled: !activeNote, onClick: () => downloadNoteAsMarkdown(activeNote) },
            { label: 'Export HTML (.html)', disabled: !activeNote, onClick: () => downloadNoteAsHtml(activeNote) },
          ]}
        />
        <MenuDropdown
          label="Edit"
          items={[
            { label: 'Undo', shortcut: 'Ctrl+Z', disabled: !editorReady, onClick: () => editor?.exec('undo') },
            { label: 'Redo', shortcut: 'Ctrl+Y', disabled: !editorReady, onClick: () => editor?.exec('redo') },
            null,
            { label: '⚙️  Cài đặt…', onClick: () => setSettingsOpen(true) },
          ]}
        />
        <MenuDropdown
          label="View"
          items={[
            { label: sidebarVisible ? 'Ẩn Sidebar' : 'Hiện Sidebar', shortcut: 'Ctrl+\\', onClick: onToggleSidebar },
            { label: backlinksVisible ? 'Ẩn Backlinks' : 'Hiện Backlinks', onClick: onToggleBacklinks },
            { label: 'Galaxy 3D', shortcut: 'Ctrl+G', onClick: () => navigate('/graph') },
            null,
            { label: 'Quick Switcher…', shortcut: 'Ctrl+K', onClick: openQuickSwitcher },
            null,
            { label: isDark ? 'Chuyển giao diện sáng' : 'Chuyển giao diện tối', onClick: toggleTheme },
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
          items={[
            { label: '📖  Hướng dẫn sử dụng', shortcut: 'F1', onClick: () => setGuideOpen(true) },
            null,
            { label: 'ℹ️  Giới thiệu GalaxyNote', onClick: () => setAboutOpen(true) },
          ]}
        />
      </div>

      {/* Action toolbar row — overflow-x-auto + shrink-0 so buttons never get
          silently clipped off-screen on narrower windows (they scroll into
          view instead of disappearing). */}
      <div className="flex items-center gap-1.5 overflow-x-auto px-2 py-1.5 [&>*]:shrink-0">
        <button
          onClick={() => { navigate('/'); onGoHome?.() }}
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

        <button
          onClick={() => setTagManagerOpen(true)}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-fg-dim hover:bg-panel-2"
        >
          <Tags size={13} /> Quản lý Tag
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
          onClick={toggleTheme}
          title={isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-fg-faint transition hover:bg-panel-2 hover:text-fg"
        >
          {isDark ? <Sun size={13} /> : <Moon size={13} />} {isDark ? 'Light' : 'Dark'}
        </button>
      </div>

      {importUrlOpen && <ImportUrlModal onClose={() => setImportUrlOpen(false)} onImported={handleImported} />}
      {importMdOpen && <ImportMdModal onClose={() => setImportMdOpen(false)} onImported={handleImported} />}
      {tagManagerOpen && <TagManagerModal onClose={() => setTagManagerOpen(false)} />}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      {guideOpen && <GuideModal onClose={() => setGuideOpen(false)} />}
      {aboutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setAboutOpen(false)}>
          <div className="w-[400px] rounded-2xl border border-line bg-panel p-7 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-2xl font-bold text-fg">🌌 GalaxyNote</h3>
            <p className="mt-1 text-xs text-fg-mute">Phiên bản 1.0.0 · Web</p>

            <p className="mt-5 text-[13px] leading-relaxed text-fg-faint">
              Hệ thống quản lý kiến thức cá nhân tập trung vào mạng lưới Tag — giúp bạn khám phá và kết nối ý tưởng thông qua mối quan hệ giữa các chủ đề kiến thức.
            </p>

            <div className="my-5 h-px bg-line" />

            <div className="space-y-2 text-left">
              <div className="flex justify-between text-xs">
                <span className="text-fg-mute">👤 Tác giả</span>
                <span className="font-medium text-fg-dim">Phạm Văn Vinh</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-fg-mute">📞 Điện thoại / Zalo</span>
                <span className="font-medium text-fg-dim">0888 035 077</span>
              </div>
            </div>

            <button
              onClick={() => setAboutOpen(false)}
              className="mt-6 rounded-md border border-line-2 bg-panel-2 px-6 py-1.5 text-xs font-medium text-fg-dim hover:bg-line hover:text-fg"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

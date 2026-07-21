import { useState } from 'react'
import { X, ChevronDown } from 'lucide-react'

// Web port of core/database.py::seed_guide_note() — same 8 sections, same
// copy, in the same order. Desktop opens this as a real pinned Note inside
// the block editor (fixed UUID 00000000-…-0001, recreated if deleted).
// Doing that here would mean inserting a note row with a hardcoded id into
// the shared multi-user `notes` table — risky (that id would collide across
// different accounts sharing one Supabase project, unlike desktop's
// per-user local SQLite vault). So this is a plain read-only panel instead:
// same content, no risk of colliding with someone else's data, and it
// doesn't clutter the user's real note list as a permanent pinned system
// note. An explicit design difference, not a silent gap.

function Section({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-line last:border-b-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-fg hover:bg-panel-2"
      >
        {title}
        <ChevronDown size={14} className={`shrink-0 text-fg-mute transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="space-y-2 px-4 pb-4 text-[13px] leading-relaxed text-fg-dim">{children}</div>}
    </div>
  )
}

const SHORTCUTS = [
  ['Ctrl+K', 'Quick Switcher — tìm và mở note nhanh'],
  ['Ctrl+Z / Ctrl+Y', 'Undo / Redo (khi con trỏ đang ở trong note)'],
  ['Ctrl+B / I / U', 'Bold / Italic / Underline (trong note)'],
  ['[[', 'Chèn wiki link đến note khác'],
]

export default function GuideModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-[640px] max-w-[92vw] flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-base font-semibold text-fg">📖 Hướng dẫn sử dụng GalaxyNote</h2>
          <button onClick={onClose} className="rounded-md p-1 text-fg-mute hover:bg-panel-2 hover:text-fg">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="m-4 rounded-lg border-l-2 border-star bg-star/10 px-3.5 py-3 text-[13px] text-fg-dim">
            🌌 <b className="text-fg">Chào mừng đến với GalaxyNote</b> — hệ thống quản lý kiến thức cá nhân của bạn.
          </div>

          <Section title="📌 1. Triết lý hoạt động" defaultOpen>
            <p>GalaxyNote xây dựng trên 3 khái niệm cốt lõi:</p>
            <p><b className="text-fg">Tag = Hành tinh</b> — Mỗi tag là một chủ đề trung tâm. Tag có thể kết nối nhiều-nhiều, tạo thành mạng lưới kiến thức.</p>
            <p><b className="text-fg">Note = Vệ tinh</b> — Mỗi note xoay quanh các tag. Một note có thể thuộc nhiều tag cùng lúc.</p>
            <p><b className="text-fg">Galaxy = Bản đồ</b> — Graph 3D hiển thị toàn bộ mạng lưới kiến thức và mối liên hệ giữa các chủ đề.</p>
          </Section>

          <Section title="✍️ 2. Soạn thảo với Block Editor">
            <p>Mỗi đoạn văn là một <b className="text-fg">block</b> độc lập. Nhấn <code className="rounded bg-panel-2 px-1 text-xs">Enter</code> để tạo block mới, kéo thả để sắp xếp lại.</p>
            <Section title="Các loại block hỗ trợ" defaultOpen={false}>
              <p><b className="text-fg">Text</b> — Bold, Italic, Underline, màu sắc, heading H1/H2/H3</p>
              <p><b className="text-fg">Toggle</b> — Nội dung thu gọn/mở rộng, hỗ trợ lồng nhau</p>
              <p><b className="text-fg">Task</b> — Checkbox việc cần làm, đồng bộ tab Tasks ở sidebar</p>
              <p><b className="text-fg">Image</b> — Dán ảnh từ clipboard, kéo thả file. Kéo góc để resize</p>
              <p><b className="text-fg">Embed</b> — Nhúng YouTube, Google Docs, Figma, PDF hoặc bất kỳ URL nào</p>
              <p><b className="text-fg">Table</b> — Bảng dữ liệu, thêm/xóa hàng và cột linh hoạt</p>
              <p><b className="text-fg">Code</b> — Khối code với nút Copy</p>
              <p><b className="text-fg">Quote</b> — Trích dẫn nổi bật</p>
              <p><b className="text-fg">Callout</b> — Hộp thông tin với icon tùy chỉnh</p>
            </Section>
            <p><b className="text-fg">Phím tắt trong note:</b> <code className="rounded bg-panel-2 px-1 text-xs">Ctrl+B</code> Bold · <code className="rounded bg-panel-2 px-1 text-xs">Ctrl+I</code> Italic · <code className="rounded bg-panel-2 px-1 text-xs">Ctrl+U</code> Underline · <code className="rounded bg-panel-2 px-1 text-xs">Ctrl+Z</code> Undo · <code className="rounded bg-panel-2 px-1 text-xs">Ctrl+Y</code> Redo</p>
            <p>Gõ <code className="rounded bg-panel-2 px-1 text-xs">[[</code> để chèn liên kết đến note khác (wiki link). Click vào link để điều hướng.</p>
          </Section>

          <Section title="🏷️ 3. Hệ thống Tag">
            <p>Mở <b className="text-fg">Quản lý Tag</b> bằng nút trên thanh công cụ (giữa Today và Import URL).</p>
            <p><b className="text-fg">Kết nối tag:</b> dùng "Add Parent" / "Add Child" trong Tag Manager — một tag có thể có nhiều tag cha và nhiều tag con.</p>
            <p><b className="text-fg">Space tag 🪐:</b> bật checkbox <i>Space tag</i> để tag trở thành trung tâm lực hút trong Galaxy Graph. Tag gốc (không có cha) cũng tự động được coi như Space.</p>
            <p><b className="text-fg">Gán tag cho note:</b> nhấn nút <b>+</b> trong thanh tag dưới tiêu đề note.</p>
            <p><b className="text-fg">Tìm kiếm nâng cao:</b><br /><code className="rounded bg-panel-2 px-1 text-xs">#python</code> lọc theo tag · <code className="rounded bg-panel-2 px-1 text-xs">#ai #python</code> nhiều tag (AND)<br /><code className="rounded bg-panel-2 px-1 text-xs">pinned:yes</code> note được ghim · <code className="rounded bg-panel-2 px-1 text-xs">done:no</code> có task chưa xong</p>
          </Section>

          <Section title="🌌 4. Galaxy Graph 3D">
            <p>Nhấn nút <b className="text-fg">Galaxy 3D</b> trên toolbar để mở bản đồ kiến thức 3D.</p>
            <p><b className="text-fg">Điều hướng:</b> cuộn chuột để zoom · kéo để xoay · click node tag để lọc · click node note để mở.</p>
            <p><b className="text-fg">Cạnh (edge):</b> hai tag nối với nhau khi có quan hệ cha/con, hoặc cùng xuất hiện trong ít nhất 1 note.</p>
            <p><b className="text-fg">Bộ điều khiển:</b> tab "⚙ Điều khiển" ở cạnh phải — bộ lọc, hiển thị, và các lực vật lý của graph.</p>
          </Section>

          <Section title="📅 5. Daily Notes">
            <p>Nhấn nút <b className="text-fg">Today</b> trên toolbar để mở/tạo note nhật ký hôm nay.</p>
            <p>Sidebar → tab Notes → filter <b className="text-fg">Daily</b> để xem tất cả daily note theo thời gian.</p>
          </Section>

          <Section title="✅ 6. Quản lý Task">
            <p>Tạo task bằng block <b className="text-fg">Task</b> từ toolbar soạn thảo — tick trực tiếp trong note.</p>
            <p>Mở tab <b className="text-fg">Tasks</b> ở sidebar để xem tổng quan tất cả task theo trạng thái và tag.</p>
          </Section>

          <Section title="💾 7. Export & Sync">
            <p><b className="text-fg">Export note hiện tại:</b> File → Export Markdown (.md) / Export HTML (.html)</p>
            <p><b className="text-fg">Import:</b> File → Import URL… hoặc Import Markdown…</p>
            <p><b className="text-fg">Đồng bộ:</b> Dữ liệu lưu trên Supabase — cùng tài khoản, cùng dữ liệu với bản Desktop, tự đồng bộ hai chiều.</p>
          </Section>

          <Section title="⌨️ 8. Phím tắt & thao tác nhanh">
            <table className="w-full border-collapse text-xs">
              <tbody>
                {SHORTCUTS.map(([key, desc]) => (
                  <tr key={key} className="border-b border-line last:border-b-0">
                    <td className="py-1.5 pr-3 font-mono text-fg-faint">{key}</td>
                    <td className="py-1.5 text-fg-dim">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="pt-2 text-[11px] text-fg-mute">
              Ctrl+N / Ctrl+D / Ctrl+G / Ctrl+Shift+T chưa có phím tắt toàn cục trên bản Web — dùng nút tương ứng trên toolbar (Home · New · Today · Quản lý Tag · Galaxy 3D).
            </p>
          </Section>

          <div className="m-4 rounded-lg border-l-2 border-comet bg-comet/10 px-3.5 py-3 text-[13px] text-fg-dim">
            💡 <b className="text-fg">Mẹo:</b> Dữ liệu đồng bộ qua Supabase — cùng tài khoản thấy cùng dữ liệu trên cả Desktop lẫn Web.
          </div>
        </div>
      </div>
    </div>
  )
}

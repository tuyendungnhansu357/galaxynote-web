import { useEffect, useMemo, useState } from 'react'
import { Shield, ShieldOff, Search, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

// Manages public.profiles directly with the anon key — safe because every
// read/write here is already scoped by the RLS policies in
// supabase/user_management_schema.sql (only a row where is_admin() is true
// for the calling user may select/update/delete *other* users' rows).
//
// What this page can and can't do, and why:
//  - Edit plan / expiry / active / admin flag on any existing profile: yes,
//    plain RLS-scoped update — no elevated key needed.
//  - "Delete" a user: soft-delete only (sets is_active=false). Permanently
//    removing the auth.users row itself requires the Admin API, which
//    needs the service_role key — that key must never reach the browser,
//    so a real hard-delete has to happen in Supabase Dashboard →
//    Authentication → Users, or via a server-side Edge Function you deploy
//    yourself (ask if you'd like that written up).
//  - Create a brand-new account without the person signing up themselves:
//    same limitation — use Dashboard → Authentication → Users → Invite.
export default function AdminPage() {
  const { user, signOut, refreshProfile } = useAuthStore()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [savingId, setSavingId] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setRows(data ?? [])
    setLoading(false)
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => r.email.toLowerCase().includes(q))
  }, [rows, search])

  async function patchRow(id, patch) {
    setSavingId(id)
    setError('')
    const { data, error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    setSavingId(null)
    if (error) { setError(error.message); return }
    setRows((prev) => prev.map((r) => (r.id === id ? data : r)))
    if (id === user?.id) refreshProfile() // in case the admin edited their own row
  }

  function toDateInputValue(iso) {
    if (!iso) return ''
    return new Date(iso).toISOString().slice(0, 10)
  }

  function fromDateInputValue(dateStr) {
    if (!dateStr) return null
    // end-of-day so "expires today" still lets them in for the rest of today
    return new Date(`${dateStr}T23:59:59`).toISOString()
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-bg text-fg">
      <div className="flex items-center justify-between border-b border-line px-6 py-3">
        <div>
          <h1 className="font-display text-base font-semibold">Quản lý người dùng</h1>
          <p className="text-xs text-fg-mute">{rows.length} tài khoản</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/" className="text-xs text-fg-mute hover:text-fg">← Về app</a>
          <Button variant="outline" onClick={signOut}>
            <LogOut size={14} /> Đăng xuất
          </Button>
        </div>
      </div>

      <div className="border-b border-line px-6 py-3">
        <div className="relative max-w-xs">
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-mute" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo email…" className="pl-7" />
        </div>
      </div>

      {error && <p className="border-b border-line bg-flare/10 px-6 py-2 text-xs text-flare">{error}</p>}

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <p className="text-sm text-fg-mute">Đang tải…</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-fg-mute">
                <th className="py-2 pr-3 font-medium">Email</th>
                <th className="py-2 pr-3 font-medium">Gói</th>
                <th className="py-2 pr-3 font-medium">Hạn dùng</th>
                <th className="py-2 pr-3 font-medium">Trạng thái</th>
                <th className="py-2 pr-3 font-medium">Admin</th>
                <th className="py-2 pr-3 font-medium">Tham gia</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const isSelf = r.id === user?.id
                const isSaving = savingId === r.id
                const expired = r.plan_expires_at && new Date(r.plan_expires_at) < new Date()
                return (
                  <tr key={r.id} className="border-b border-line/60">
                    <td className="py-2 pr-3">
                      <span className="text-fg-dim">{r.email}</span>
                      {isSelf && <span className="ml-1.5 text-[10px] text-fg-mute">(bạn)</span>}
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        defaultValue={r.plan}
                        disabled={isSaving}
                        onBlur={(e) => { if (e.target.value !== r.plan) patchRow(r.id, { plan: e.target.value.trim() || 'free' }) }}
                        className="w-24 rounded-md border border-line bg-panel px-2 py-1 text-xs outline-none focus:border-star"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="date"
                        defaultValue={toDateInputValue(r.plan_expires_at)}
                        disabled={isSaving}
                        onChange={(e) => patchRow(r.id, { plan_expires_at: fromDateInputValue(e.target.value) })}
                        className={`rounded-md border bg-panel px-2 py-1 text-xs outline-none focus:border-star ${
                          expired ? 'border-flare/50 text-flare' : 'border-line'
                        }`}
                      />
                      {!r.plan_expires_at && <span className="ml-1.5 text-[10px] text-fg-mute">(không giới hạn)</span>}
                    </td>
                    <td className="py-2 pr-3">
                      <button
                        disabled={isSaving}
                        onClick={() => patchRow(r.id, { is_active: !r.is_active })}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          r.is_active ? 'bg-dwarf/15 text-dwarf' : 'bg-flare/15 text-flare'
                        }`}
                      >
                        {r.is_active ? 'Đang hoạt động' : 'Đã khoá'}
                      </button>
                    </td>
                    <td className="py-2 pr-3">
                      <button
                        disabled={isSaving || (isSelf && r.is_admin)}
                        title={isSelf && r.is_admin ? 'Không thể tự bỏ quyền admin của chính mình' : ''}
                        onClick={() => patchRow(r.id, { is_admin: !r.is_admin })}
                        className="inline-flex items-center gap-1 text-xs text-fg-dim hover:text-fg disabled:opacity-40"
                      >
                        {r.is_admin ? <Shield size={13} className="text-star" /> : <ShieldOff size={13} />}
                        {r.is_admin ? 'Admin' : 'User'}
                      </button>
                    </td>
                    <td className="py-2 pr-3 text-xs text-fg-mute">
                      {new Date(r.created_at).toLocaleDateString('vi-VN')}
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-xs text-fg-mute">Không tìm thấy tài khoản nào.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="border-t border-line px-6 py-2 text-[11px] text-fg-mute">
        "Khoá" chặn truy cập ngay lập tức nhưng không xoá tài khoản đăng nhập. Để xoá vĩnh viễn, dùng
        Supabase Dashboard → Authentication → Users.
      </div>
    </div>
  )
}

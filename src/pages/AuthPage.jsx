import { useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

// Public signup stays enabled — access itself is gated by public.profiles
// (is_active / plan_expires_at), enforced in App.jsx's RequireAuth. A new
// account gets a 7-day trial row auto-created by the on_auth_user_created
// DB trigger (see supabase/user_management_schema.sql); after that, an
// admin decides in /admin whether to extend it, assign a real plan, or
// leave it to expire.
export default function AuthPage() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState(null)
  const { signIn, signUp, error, clearError } = useAuthStore()

  async function handleSubmit(e) {
    e.preventDefault()
    clearError()
    setNotice(null)
    setSubmitting(true)
    const ok = mode === 'signin' ? await signIn(email, password) : await signUp(email, password)
    setSubmitting(false)
    if (ok && mode === 'signup') {
      setNotice('Đã tạo tài khoản — bạn có 7 ngày dùng thử. Nếu cần xác nhận email, hãy kiểm tra hộp thư trước khi đăng nhập.')
    }
  }

  return (
    <div className="galaxy-dark-scope relative flex h-screen w-screen items-center justify-center overflow-hidden bg-void">
      {/* Signature element: a slow-drifting starfield behind the card — the one
          place this page spends its visual budget, everything else stays quiet. */}
      <div className="bg-starfield absolute inset-0 opacity-70 [animation:drift_120s_linear_infinite]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-void/40 to-void" />

      <div className="relative z-10 w-full max-w-sm px-6">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-star/15 ring-1 ring-star/30">
            <span className="h-3 w-3 rounded-full bg-star shadow-[0_0_16px_4px_rgba(79,142,247,0.7)]" />
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-fg">GalaxyNote</h1>
          <p className="mt-1 text-sm text-fg-faint">Tag là hành tinh. Note là vệ tinh.</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-line bg-panel/80 p-6 shadow-2xl shadow-black/40 backdrop-blur"
        >
          <div className="mb-5 flex rounded-lg border border-line bg-bg p-1 text-sm">
            <button
              type="button"
              onClick={() => { setMode('signin'); clearError(); setNotice(null) }}
              className={`flex-1 rounded-md py-1.5 transition ${mode === 'signin' ? 'bg-panel-2 text-fg' : 'text-fg-faint'}`}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); clearError(); setNotice(null) }}
              className={`flex-1 rounded-md py-1.5 transition ${mode === 'signup' ? 'bg-panel-2 text-fg' : 'text-fg-faint'}`}
            >
              Đăng ký
            </button>
          </div>

          <label className="mb-1 block text-xs font-medium text-fg-faint">Email</label>
          <Input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ban@vidu.com"
            className="mb-4"
          />

          <label className="mb-1 block text-xs font-medium text-fg-faint">Mật khẩu</label>
          <Input
            type="password"
            required
            minLength={6}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="mb-5"
          />

          {error && (
            <p className="mb-4 rounded-lg border border-flare/30 bg-flare/10 px-3 py-2 text-xs text-flare">
              {error}
            </p>
          )}
          {notice && (
            <p className="mb-4 rounded-lg border border-comet/30 bg-comet/10 px-3 py-2 text-xs text-comet">
              {notice}
            </p>
          )}

          <Button type="submit" loading={submitting} className="w-full">
            {mode === 'signin' ? 'Đăng nhập' : 'Tạo tài khoản'}
          </Button>
        </form>

        <p className="mt-6 text-center font-mono text-[11px] text-fg-mute">
          Cùng tài khoản Supabase với bản desktop
        </p>
      </div>
    </div>
  )
}

import { useAuthStore } from '../stores/authStore'
import Button from '../components/ui/Button'

export default function RestrictedPage() {
  const { profile, user, signOut } = useAuthStore()

  const expired = profile?.plan_expires_at && new Date(profile.plan_expires_at) < new Date()
  const reason = !profile
    ? 'Tài khoản của bạn chưa được khởi tạo đầy đủ. Vui lòng thử đăng nhập lại sau ít phút.'
    : !profile.is_active
      ? 'Tài khoản của bạn đã bị khoá.'
      : expired
        ? `Gói "${profile.plan}" của bạn đã hết hạn từ ${new Date(profile.plan_expires_at).toLocaleDateString('vi-VN')}.`
        : 'Tài khoản của bạn hiện chưa được cấp quyền truy cập.'

  return (
    <div className="galaxy-dark-scope flex h-screen w-screen items-center justify-center bg-void px-6">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-panel/80 p-6 text-center shadow-2xl backdrop-blur">
        <h1 className="mb-2 font-display text-lg font-semibold text-fg">Không thể truy cập</h1>
        <p className="mb-1 text-sm text-fg-dim">{reason}</p>
        <p className="mb-5 text-xs text-fg-mute">{user?.email}</p>
        <p className="mb-5 text-xs text-fg-mute">
          Liên hệ quản trị viên để gia hạn hoặc kích hoạt lại tài khoản.
        </p>
        <Button variant="outline" onClick={signOut} className="w-full">
          Đăng xuất
        </Button>
      </div>
    </div>
  )
}

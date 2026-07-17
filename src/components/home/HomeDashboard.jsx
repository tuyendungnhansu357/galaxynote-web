import { useEffect, useMemo, useState } from 'react'
import { Orbit } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

// Web port of ui/home_page.py — full-area greeting/clock dashboard shown
// when there is no active note (matches desktop's HomePage exactly:
// greeting, big digital clock, Vietnamese date, random quote, Galaxy button).

const DAYS_VI = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
const MONTHS_VI = [
  '', 'tháng 1', 'tháng 2', 'tháng 3', 'tháng 4', 'tháng 5', 'tháng 6',
  'tháng 7', 'tháng 8', 'tháng 9', 'tháng 10', 'tháng 11', 'tháng 12',
]

const QUOTES = [
  'Ghi lại để nhớ, kết nối để hiểu.',
  'Kiến thức chỉ có giá trị khi được kết nối.',
  'Mỗi note là một vệ tinh, mỗi ý tưởng là một hành tinh.',
  'Đừng chỉ lưu trữ — hãy khám phá.',
]

function greet(hour) {
  if (hour < 12) return 'Chào buổi sáng'
  if (hour < 18) return 'Chào buổi chiều'
  return 'Chào buổi tối'
}

export default function HomeDashboard({ onOpenGalaxy }) {
  const user = useAuthStore((s) => s.user)
  const name = useMemo(() => {
    const raw = user?.email?.split('@')[0] || 'Bạn'
    return raw.charAt(0).toUpperCase() + raw.slice(1)
  }, [user])

  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const quote = useMemo(() => QUOTES[Math.floor(Math.random() * QUOTES.length)], [])

  const dateStr = `${DAYS_VI[now.getDay()]}, ngày ${now.getDate()} ${MONTHS_VI[now.getMonth() + 1]} năm ${now.getFullYear()}`
  const timeStr = now.toLocaleTimeString('vi-VN', { hour12: false })

  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center bg-panel px-20">
      <p className="text-2xl text-fg-faint">
        {greet(now.getHours())}, {name}
      </p>

      <p
        className="mt-4 font-display font-bold text-fg tabular-nums"
        style={{ fontSize: 'clamp(56px, 9vw, 128px)', letterSpacing: '-4px', lineHeight: 1 }}
      >
        {timeStr}
      </p>

      <p className="mt-3 text-xl text-star">{dateStr}</p>

      <p className="mt-11 max-w-lg text-center text-lg italic leading-relaxed text-fg-mute">
        "{quote}"
      </p>

      <button
        onClick={onOpenGalaxy}
        className="mt-11 flex h-14 w-[300px] items-center justify-center gap-2 rounded-full bg-star text-base font-medium text-white shadow-lg transition hover:brightness-110"
      >
        <Orbit size={18} /> Mở Sơ đồ Tri thức
      </button>
    </div>
  )
}

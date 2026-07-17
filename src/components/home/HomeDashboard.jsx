import { useEffect, useState } from 'react'
import { Orbit } from 'lucide-react'
import { useHomeSettingsStore } from '../../stores/homeSettingsStore'
import AnalogClock from './AnalogClock'

// Web port of ui/home_page.py — full-area greeting/clock dashboard shown
// when there is no active note. Name / clock style / quotes are NOT
// hardcoded — they come from useHomeSettingsStore (localStorage), same
// idea as desktop's config.get("home_user_name" / "home_clock_style" /
// "home_quotes"). Edit them via TopBar → Edit → "⚙️ Cài đặt…".

const DAYS_VI = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
const MONTHS_VI = [
  '', 'tháng 1', 'tháng 2', 'tháng 3', 'tháng 4', 'tháng 5', 'tháng 6',
  'tháng 7', 'tháng 8', 'tháng 9', 'tháng 10', 'tháng 11', 'tháng 12',
]

function greet(hour) {
  if (hour < 12) return 'Chào buổi sáng'
  if (hour < 18) return 'Chào buổi chiều'
  return 'Chào buổi tối'
}

export default function HomeDashboard({ onOpenGalaxy }) {
  const { userName, clockStyle, currentQuote, pickQuote } = useHomeSettingsStore()

  // Pick a fresh quote each time the dashboard mounts (matches
  // home_page.py's _pick_quote() being called from __init__).
  useEffect(() => {
    pickQuote()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const dateStr = `${DAYS_VI[now.getDay()]}, ngày ${now.getDate()} ${MONTHS_VI[now.getMonth() + 1]} năm ${now.getFullYear()}`
  const timeStr = now.toLocaleTimeString('vi-VN', { hour12: false })

  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center bg-panel px-20">
      <p className="text-2xl text-fg-faint">
        {greet(now.getHours())}, {userName}
      </p>

      <div className="mt-4">
        {clockStyle === 'round' ? (
          <AnalogClock now={now} />
        ) : (
          <p
            className="font-display font-bold text-fg tabular-nums"
            style={{ fontSize: 'clamp(56px, 9vw, 128px)', letterSpacing: '-4px', lineHeight: 1 }}
          >
            {timeStr}
          </p>
        )}
      </div>

      <p className="mt-3 text-xl text-star">{dateStr}</p>

      {currentQuote && (
        <p className="mt-11 max-w-lg text-center text-lg italic leading-relaxed text-fg-mute">
          "{currentQuote}"
        </p>
      )}

      <button
        onClick={onOpenGalaxy}
        className="mt-11 flex h-14 w-[300px] items-center justify-center gap-2 rounded-full bg-star text-base font-medium text-white shadow-lg transition hover:brightness-110"
      >
        <Orbit size={18} /> Mở Sơ đồ Tri thức
      </button>
    </div>
  )
}

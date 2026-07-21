import { create } from 'zustand'

// Web port of core/config.py's "Home page" settings block. On desktop these
// live in config/settings.json (per-device). There's no per-device config
// file in a browser, so this persists to localStorage under one key —
// same idea, same defaults, same field names (minus the home_ prefix).

const STORAGE_KEY = 'galaxynote:home_settings'

const DEFAULTS = {
  userName: 'Bạn',
  clockStyle: 'digital', // 'digital' | 'round'
  quotes: [
    'Kiến thức là sức mạnh, nhưng chia sẻ kiến thức mới là quyền lực.',
    'Ghi lại để nhớ, kết nối để hiểu, chia sẻ để phát triển.',
    'Một ý tưởng được ghi chép là một ý tưởng không bao giờ mất.',
    'Học không phải để biết, mà để làm được.',
    'Tri thức không có biên giới, chỉ có tâm trí mới tự đặt ra giới hạn.',
  ],
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw)
    return {
      userName: (parsed.userName || DEFAULTS.userName).trim() || DEFAULTS.userName,
      clockStyle: parsed.clockStyle === 'round' ? 'round' : 'digital',
      quotes: Array.isArray(parsed.quotes) && parsed.quotes.length ? parsed.quotes : DEFAULTS.quotes,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

function persist(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // localStorage unavailable (private mode, quota, etc.) — settings just
    // won't persist across reloads; not worth surfacing an error for this.
  }
}

export const useHomeSettingsStore = create((set, get) => ({
  ...load(),

  // Called once each time the dashboard mounts, so a quote is picked fresh
  // "mỗi lần mở app" (matches home_page.py::_pick_quote()).
  currentQuote: null,
  pickQuote: () => {
    const { quotes } = get()
    const q = quotes[Math.floor(Math.random() * quotes.length)] || DEFAULTS.quotes[0]
    set({ currentQuote: q })
  },

  save: ({ userName, clockStyle, quotes }) => {
    const next = {
      userName: (userName || '').trim() || 'Bạn',
      clockStyle: clockStyle === 'round' ? 'round' : 'digital',
      quotes: quotes.length ? quotes : DEFAULTS.quotes,
    }
    set(next)
    persist(next)
    get().pickQuote()
  },
}))

import { create } from 'zustand'

// Web port of main_window.py's _toggle_theme()/_apply_theme(): desktop swaps
// dark.qss/light.qss for the whole window chrome, but leaves the Galaxy 3D
// view untouched (graph_3d_view.py never calls set_theme). Same split here —
// this store only drives the `data-theme` attribute on <html>, which the
// light-theme CSS variable overrides in index.css key off of. GraphPage
// intentionally never reads this — the galaxy always renders on the dark
// space palette, exactly like desktop.

const STORAGE_KEY = 'galaxynote:theme'

function apply(theme) {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // localStorage unavailable — theme just won't persist across reloads
  }
}

function initial() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export const useThemeStore = create((set, get) => ({
  theme: initial(),
  isDark: initial() === 'dark',

  setTheme: (theme) => {
    apply(theme)
    set({ theme, isDark: theme === 'dark' })
  },
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    apply(next)
    set({ theme: next, isDark: next === 'dark' })
  },
}))

// Make sure the attribute set by index.html's anti-flash script matches the
// store's initial value (it always will since both read the same key, but
// this keeps them from ever drifting if that inline script is ever removed).
apply(initial())

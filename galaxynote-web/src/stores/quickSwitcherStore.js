import { create } from 'zustand'

// Open/close state for QuickSwitcherModal — a global Ctrl+K listener inside
// the modal component itself calls toggle(); TopBar's View menu item calls
// open(). Kept as its own tiny store (rather than component state) so both
// can reach it without prop-drilling through HomePage.
export const useQuickSwitcherStore = create((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
}))

import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useAuthStore = create((set, get) => ({
  session: null,
  user: null,
  status: 'loading', // 'loading' | 'signed-out' | 'signed-in'
  error: null,

  // Called once from App.jsx on boot. Restores the persisted session and
  // subscribes to future changes (sign-in, sign-out, token refresh).
  init: async () => {
    const { data } = await supabase.auth.getSession()
    set({
      session: data.session,
      user: data.session?.user ?? null,
      status: data.session ? 'signed-in' : 'signed-out',
    })
    supabase.auth.onAuthStateChange((_event, session) => {
      set({
        session,
        user: session?.user ?? null,
        status: session ? 'signed-in' : 'signed-out',
      })
    })
  },

  signIn: async (email, password) => {
    set({ error: null })
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { set({ error: error.message }); return false }
    set({ session: data.session, user: data.user, status: 'signed-in' })
    return true
  },

  signUp: async (email, password) => {
    set({ error: null })
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) { set({ error: error.message }); return false }
    // If email confirmation is required, data.session will be null here —
    // surface that as a distinct state so the UI can say "check your inbox".
    set({
      session: data.session,
      user: data.user,
      status: data.session ? 'signed-in' : 'signed-out',
    })
    return true
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, user: null, status: 'signed-out' })
  },

  clearError: () => set({ error: null }),
}))

// Fire init immediately so the very first render already has an opinion
// about auth state (avoids a flash of the login page for returning users).
useAuthStore.getState().init()

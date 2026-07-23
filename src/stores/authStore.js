import { create } from 'zustand'
import { supabase } from '../lib/supabase'

// status: 'loading' | 'signed-out' | 'signed-in' | 'restricted'
// 'restricted' = session is valid but public.profiles says access shouldn't
// be granted (is_active=false or plan_expires_at in the past). Session is
// kept (not signed out) so the restricted screen can still show which
// account this is and offer a sign-out button.
async function loadProfile(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) { console.error('[auth] failed to load profile:', error); return null }
  return data
}

function statusForProfile(profile) {
  if (!profile) return 'restricted' // trigger hasn't created the row yet, or it was removed
  if (!profile.is_active) return 'restricted'
  if (profile.plan_expires_at && new Date(profile.plan_expires_at) < new Date()) return 'restricted'
  return 'signed-in'
}

export const useAuthStore = create((set, get) => ({
  session: null,
  user: null,
  profile: null, // public.profiles row: is_admin, is_active, plan, plan_expires_at
  status: 'loading',
  error: null,

  // Called once from App.jsx on boot. Restores the persisted session and
  // subscribes to future changes (sign-in, sign-out, token refresh).
  init: async () => {
    const { data } = await supabase.auth.getSession()
    const user = data.session?.user ?? null
    const profile = user ? await loadProfile(user.id) : null
    set({
      session: data.session,
      user,
      profile,
      status: data.session ? statusForProfile(profile) : 'signed-out',
    })
    supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null
      const p = u ? await loadProfile(u.id) : null
      set({ session, user: u, profile: p, status: session ? statusForProfile(p) : 'signed-out' })
    })
  },

  signIn: async (email, password) => {
    set({ error: null })
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { set({ error: error.message }); return false }
    const profile = await loadProfile(data.user.id)
    set({ session: data.session, user: data.user, profile, status: statusForProfile(profile) })
    return true
  },

  signUp: async (email, password) => {
    set({ error: null })
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) { set({ error: error.message }); return false }
    // If email confirmation is required, data.session will be null here —
    // surface that as a distinct state so the UI can say "check your inbox".
    const profile = data.session ? await loadProfile(data.user.id) : null
    set({
      session: data.session,
      user: data.user,
      profile,
      status: data.session ? statusForProfile(profile) : 'signed-out',
    })
    return true
  },

  // Re-reads this user's own profile row — call after an admin changes
  // someone's plan/expiry/active flag so a currently-open tab picks it up
  // without needing a full sign-out/sign-in.
  refreshProfile: async () => {
    const u = get().user
    if (!u) return
    const profile = await loadProfile(u.id)
    set({ profile, status: statusForProfile(profile) })
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, user: null, profile: null, status: 'signed-out' })
  },

  clearError: () => set({ error: null }),
}))

// Fire init immediately so the very first render already has an opinion
// about auth state (avoids a flash of the login page for returning users).
useAuthStore.getState().init()

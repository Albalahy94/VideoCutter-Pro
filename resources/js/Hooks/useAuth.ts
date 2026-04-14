import { useState, useEffect } from 'react'

// Supabase is optional — the app works fully without it.
// To enable auth, install @supabase/supabase-js and set these env vars in .env:
//   VITE_SUPABASE_URL=https://xxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY=xxxx
//
// Then uncomment the supabase block below.

interface User {
  email: string
  id: string
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Restore session from localStorage (simple stub)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('vcpro_user')
      if (stored) setUser(JSON.parse(stored))
    } catch {}
  }, [])

  const loginWithGoogle = async () => {
    // In a real Supabase setup:
    // await supabase.auth.signInWithOAuth({ provider: 'google' })
    throw new Error('Google login requires Supabase configuration. Please use email login for now.')
  }

  const loginWithEmail = async (email: string, _password: string, isSignUp: boolean) => {
    // Stub: simulate auth for demo purposes
    setIsLoading(true)
    await new Promise(r => setTimeout(r, 800))
    const u: User = { email, id: Math.random().toString(36).slice(2) }
    setUser(u)
    localStorage.setItem('vcpro_user', JSON.stringify(u))
    setIsLoading(false)
    console.log(isSignUp ? 'Sign up (stub)' : 'Sign in (stub)', email)
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('vcpro_user')
  }

  return { user, isLoading, loginWithGoogle, loginWithEmail, logout }
}

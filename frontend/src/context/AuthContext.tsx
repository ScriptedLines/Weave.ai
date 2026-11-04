import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase, type User, type Session } from '../lib/supabase'
import { API_BASE } from '../lib/api'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const warmedToken = useRef<string | null>(null)

  const warmupModal = useCallback((nextSession: Session | null) => {
    const token = nextSession?.access_token
    if (!token || warmedToken.current === token) return

    warmedToken.current = token
    fetch(`${API_BASE}/warmup`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => undefined)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: nextSession } }) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setLoading(false)
      warmupModal(nextSession)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setLoading(false)
      warmupModal(nextSession)
    })

    return () => subscription.unsubscribe()
  }, [warmupModal])

  const signUp = async (email: string, password: string, name: string) => {
    const result = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/verify-waiting`
      },
    })
    return { error: result.error as Error | null }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error) {
      warmupModal(data.session)
    }
    return { error }
  }

  const signOut = async () => {
    warmedToken.current = null
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

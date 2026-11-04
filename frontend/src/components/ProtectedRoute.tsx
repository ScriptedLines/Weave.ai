import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api'

type AccessState = 'checking' | 'approved' | 'pending' | 'error'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const [access, setAccess] = useState<AccessState>('checking')
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    if (!user?.id) {
      setAccess('checking')
      return
    }

    let cancelled = false
    setAccess('checking')

    const checkAccess = async () => {
      try {
        const ensureResponse = await apiFetch('/profile/ensure', { method: 'POST' })
        if (!ensureResponse.ok) throw new Error('Unable to prepare profile.')

        const profileResponse = await apiFetch('/profile')
        if (!profileResponse.ok) throw new Error('Unable to load profile.')

        const data = await profileResponse.json()
        if (!cancelled) {
          setAccess(data?.profile?.is_approved ? 'approved' : 'pending')
        }
      } catch {
        if (!cancelled) setAccess('error')
      }
    }

    checkAccess()
    return () => {
      cancelled = true
    }
  }, [user?.id, retryCount])

  if (loading || (user && access === 'checking')) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-2 border-on-surface/10 border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-on-surface/40">VERIFYING INVITATION...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  if (access === 'pending') {
    return <Navigate to="/pending-approval" replace />
  }

  if (access === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary">ACCESS CHECK FAILED</p>
          <h1 className="font-headline text-3xl text-ink">Unable to verify your invitation.</h1>
          <p className="font-mono text-xs text-on-surface/60">Check your connection and try again.</p>
          <button
            type="button"
            onClick={() => setRetryCount((count) => count + 1)}
            className="bg-primary text-on-primary font-mono text-[10px] uppercase tracking-[0.2em] px-6 py-3 hover:bg-rust transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

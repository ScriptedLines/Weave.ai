import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api'

export default function PendingApproval() {
  const { user, loading, signOut } = useAuth()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth', { replace: true })
    }
  }, [loading, user, navigate])

  const checkApproval = async () => {
    if (!user) return

    setChecking(true)
    setError('')

    try {
      const ensureResponse = await apiFetch('/profile/ensure', { method: 'POST' })
      if (!ensureResponse.ok) throw new Error('Unable to prepare profile.')

      const profileResponse = await apiFetch('/profile')
      if (!profileResponse.ok) throw new Error('Unable to load profile.')

      const data = await profileResponse.json()
      if (data?.profile?.is_approved) {
        void apiFetch('/warmup', { method: 'POST' })
        navigate(data.profile.skin_lab ? '/dashboard' : '/onboarding-dna', { replace: true })
        return
      }
    } catch {
      setError('Could not check your approval status. Try again.')
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    if (user) {
      checkApproval()
    }
  }, [user?.id])

  useEffect(() => {
    if (!user) return
    const interval = window.setInterval(checkApproval, 15000)
    return () => window.clearInterval(interval)
  }, [user?.id])

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth', { replace: true })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-on-surface/10 border-t-primary rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-6 py-16 selection:bg-rust selection:text-white">
        <div className="w-full max-w-xl border border-ink/20 bg-paper-light p-8 md:p-12 relative shadow-xl rounded-sm">
          <div className="absolute top-0 left-0 w-full h-1 bg-rust"></div>

          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-rust font-bold mb-5">
            ACCESS REQUEST // PENDING
          </p>

          <h1 className="font-headline text-4xl md:text-5xl text-ink leading-tight mb-6">
            Your access request is awaiting approval.
          </h1>

          <p className="font-mono text-xs leading-relaxed text-ink/70 max-w-md mb-8">
            Your account is awaiting approval. Once approved, you can continue to your color profile and recommendations.
          </p>

          <div className="border-t border-ink/10 py-5 mb-8 space-y-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/40">Signed in as</p>
            <p className="font-mono text-sm text-ink font-bold">{user?.email || 'Unknown account'}</p>
          </div>

          {error && (
            <p className="font-mono text-[11px] text-rust mb-5">{error}</p>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={checkApproval}
              disabled={checking}
              className="bg-rust text-paper font-mono text-[10px] uppercase tracking-[0.2em] px-6 py-3 hover:bg-ink transition-colors disabled:opacity-50 rounded-sm shadow-sm"
            >
              {checking ? 'CHECKING...' : 'CHECK APPROVAL STATUS'}
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="border border-ink/20 text-ink font-mono text-[10px] uppercase tracking-[0.2em] px-6 py-3 hover:border-rust hover:text-rust transition-colors rounded-sm"
            >
              SIGN OUT
            </button>
          </div>

          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink/40 mt-8">
            This page refreshes automatically every 15 seconds.
          </p>
        </div>
      </div>
    </>
  )
}

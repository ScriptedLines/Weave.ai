import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api'

type AccountProfile = { username: string | null; email: string | null; is_approved: boolean }

export default function AccountPage() {
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<AccountProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setLoading(true)
    setError('')
    apiFetch('/profile')
      .then(async response => {
        if (!response.ok) throw new Error('Unable to load account details.')
        const data = await response.json()
        if (!data.profile) throw new Error('Your account profile could not be found.')
        if (!cancelled) setProfile(data.profile)
      })
      .catch(() => { if (!cancelled) setError('Unable to load your account details. Please try again.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user?.id, retry])

  if (!authLoading && !user) return <Navigate to="/auth" replace />

  return (
    <div className="max-w-4xl mx-auto px-6 sm:px-12 py-12 sm:py-16">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-rust mb-3">Your account</p>
      <h1 className="font-fraunces text-5xl sm:text-6xl font-black tracking-tight text-ink">Profile</h1>
      <p className="font-fraunces text-lg text-ink/60 mt-3">Your account details and access status.</p>
      <section aria-label="Account details" aria-busy={authLoading || loading} className="mt-10 border border-ink/10 bg-paper p-6 sm:p-8">
        {authLoading || loading ? (
          <p role="status" className="font-mono text-xs text-ink/60">Loading your profile…</p>
        ) : error ? (
          <div role="alert" className="space-y-4">
            <p className="font-mono text-xs text-rust">{error}</p>
            <button type="button" onClick={() => setRetry(value => value + 1)} className="font-mono text-xs underline underline-offset-4 hover:text-rust">Try again</button>
          </div>
        ) : profile && (
          <dl className="divide-y divide-ink/10">
            <div className="py-5 first:pt-0 sm:grid sm:grid-cols-3 sm:gap-6"><dt className="font-mono text-[10px] uppercase tracking-widest text-ink/50">Username</dt><dd className="mt-2 sm:mt-0 sm:col-span-2 font-fraunces text-lg break-words">{profile.username || 'Not provided'}</dd></div>
            <div className="py-5 sm:grid sm:grid-cols-3 sm:gap-6"><dt className="font-mono text-[10px] uppercase tracking-widest text-ink/50">Email</dt><dd className="mt-2 sm:mt-0 sm:col-span-2 font-fraunces text-lg break-all">{user?.email || profile.email || 'Not provided'}</dd></div>
            <div className="py-5 last:pb-0 sm:grid sm:grid-cols-3 sm:gap-6"><dt className="font-mono text-[10px] uppercase tracking-widest text-ink/50">Access</dt><dd className="mt-2 sm:mt-0 sm:col-span-2 font-mono text-xs">{profile.is_approved ? 'Approved' : 'Pending approval'}</dd></div>
          </dl>
        )}
      </section>
    </div>
  )
}

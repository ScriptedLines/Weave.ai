import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { icon: 'grid_view', label: 'Home', sublabel: 'Overview', path: '/' },
  { icon: 'menu_book', label: 'Documentation', sublabel: 'How it works', path: '/docs/training' },
  { icon: 'auto_fix_high', label: 'Studio', sublabel: 'Open workspace', path: '/dashboard' },
]
const workspaceItems = [
  { icon: 'shelves', label: 'Discover', sublabel: 'Browse clothing', path: '/dashboard' },
  { icon: 'auto_fix_high', label: 'Virtual Try-On', sublabel: 'Try on garments', path: '/studio' },
  { icon: 'fingerprint', label: 'Color Profile', sublabel: 'Personalize results', path: '/onboarding-dna' },
]
const workspacePaths = new Set([...workspaceItems.map(item => item.path), '/account'])
const FilterContext = createContext<{ filterOpen: boolean; setFilterOpen: (open: boolean) => void }>({ filterOpen: false, setFilterOpen: () => {} })

export function useStudioFilters() {
  return useContext(FilterContext)
}

function Brand() {
  return <span className="inline-flex items-center gap-1.5 font-unbounded font-black text-lg tracking-tighter text-ink"><img src="/weave-mark.png" alt="" aria-hidden="true" className="w-10 h-8 object-contain shrink-0" />WEAVE</span>
}

function pageTitle(path: string) {
  return ({ '/': 'Home', '/studio': 'Virtual Try-On', '/dashboard': 'Discover', '/onboarding-dna': 'Color Profile', '/account': 'Profile', '/auth': 'Sign in', '/verify-waiting': 'Verify email', '/pending-approval': 'Approval', '/docs/archive': 'Overview', '/docs/training': 'Training', '/docs/inference': 'Inference & Benchmarks', '/docs/recommendation': 'Recommendations' } as Record<string, string>)[path] ?? 'Weave'
}

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const isWorkspace = workspacePaths.has(location.pathname)
  const { user, signOut } = useAuth()
  const accountName = typeof user?.user_metadata?.full_name === 'string' ? user.user_metadata.full_name.trim() : ''
  const [expanded, setExpanded] = useState(false)
  const [ready, setReady] = useState(false)
  const [motionReady, setMotionReady] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  const mobileNav = useRef<HTMLElement>(null)
  const accountMenu = useRef<HTMLDivElement>(null)
  const accountButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!accountOpen) return
    const onPointerDown = (event: PointerEvent) => {
      if (!accountMenu.current?.contains(event.target as Node)) setAccountOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAccountOpen(false)
        accountButton.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [accountOpen])

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('weave_nav_expanded')
      setExpanded(saved === null ? window.innerWidth >= 1280 : saved === 'true')
    } catch { /* Storage can be disabled by the browser. */ }
    setReady(true)
    const timer = window.setTimeout(() => setMotionReady(true), 250)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!ready) return
    try { window.localStorage.setItem('weave_nav_expanded', String(expanded)) } catch { /* Optional preference. */ }
  }, [expanded, ready])

  useEffect(() => { setMobileOpen(false); setFilterOpen(false); setAccountOpen(false) }, [location.pathname])

  useEffect(() => {
    if (!mobileOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    mobileNav.current?.querySelector<HTMLElement>('a, button')?.focus()
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMobileOpen(false); return }
      if (event.key !== 'Tab') return
      const items = mobileNav.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')
      if (!items?.length) return
      const first = items[0], last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    const closeOnDesktop = () => { if (window.innerWidth >= 768) setMobileOpen(false) }
    document.addEventListener('keydown', handleKey)
    window.addEventListener('resize', closeOnDesktop)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKey)
      window.removeEventListener('resize', closeOnDesktop)
      menuButton.current?.focus()
    }
  }, [mobileOpen])

  const isActive = (path: string) => path === '/docs/training' ? location.pathname.startsWith('/docs') : location.pathname === path
  const navigation = (showLabels: boolean) => (
    <nav aria-label={isWorkspace ? 'Workspace navigation' : 'Main navigation'} className="space-y-2">
      {isWorkspace && showLabels && <p className="px-3 pb-3 font-mono text-[9px] uppercase tracking-[0.2em] text-ink/45">Studio</p>}
      {(isWorkspace ? workspaceItems : navItems).map(item => (
        <Link key={item.path} to={item.path} aria-current={isActive(item.path) ? 'page' : undefined} title={!showLabels ? item.label : undefined}
          className={`flex items-center rounded-sm min-h-12 transition-colors duration-150 ${showLabels ? 'gap-3 px-3 py-2' : 'justify-center px-2 py-2'} ${isActive(item.path) ? 'bg-rust text-paper' : 'text-ink/70 hover:bg-ink/5 hover:text-rust'}`}>
          <span className="material-symbols-outlined text-2xl shrink-0" aria-hidden="true">{item.icon}</span>
          <span className={showLabels ? 'flex min-w-0 flex-col' : 'sr-only'}>
            <span className="font-unbounded text-[10px] font-black uppercase tracking-wider">{item.label}</span>
            <span className="font-mono text-[8px] uppercase tracking-widest opacity-70">{item.sublabel}</span>
          </span>
        </Link>
      ))}
      {location.pathname === '/dashboard' && (
        <button type="button" onClick={() => { setMobileOpen(false); setFilterOpen(true) }} aria-label="Open catalogue filters" aria-expanded={filterOpen} aria-controls="catalogue-filters" title={!showLabels ? 'Filters' : undefined}
          className={`flex w-full items-center rounded-sm min-h-12 text-ink/70 hover:bg-ink/5 hover:text-rust transition-colors ${showLabels ? 'gap-3 px-3 py-2' : 'justify-center px-2 py-2'}`}>
          <span className="material-symbols-outlined text-2xl shrink-0" aria-hidden="true">tune</span>
          <span className={showLabels ? 'flex min-w-0 flex-col text-left' : 'sr-only'}>
            <span className="font-unbounded text-[10px] font-black uppercase tracking-wider">Filters</span>
            <span className="font-mono text-[8px] uppercase tracking-widest opacity-70">Refine clothing</span>
          </span>
        </button>
      )}
      {isWorkspace && (
        <div className="pt-4 mt-4 border-t border-ink/10">
          <Link to="/" title={!showLabels ? 'Back to website' : undefined} className={`flex items-center rounded-sm min-h-12 text-ink/60 hover:bg-ink/5 hover:text-rust transition-colors ${showLabels ? 'gap-3 px-3' : 'justify-center px-2'}`}>
            <span className="material-symbols-outlined text-2xl" aria-hidden="true">arrow_back</span>
            <span className={showLabels ? 'font-unbounded text-[10px] font-bold uppercase tracking-wider' : 'sr-only'}>Back to website</span>
          </Link>
        </div>
      )}
    </nav>
  )

  return (
    <FilterContext.Provider value={{ filterOpen, setFilterOpen }}>
    <div className="min-h-screen bg-background text-on-background font-fraunces flex flex-col selection:bg-rust selection:text-white">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <header className="fixed top-0 left-0 w-full h-16 bg-paper/95 backdrop-blur-md z-50 border-b border-ink/10 flex items-center">
        <div className={`hidden md:flex items-center justify-between px-4 border-r border-ink/10 h-full shrink-0 ${motionReady ? 'transition-[width] duration-200' : ''} ${expanded ? 'w-64' : 'w-20'}`}>
          {expanded && <Link to="/" aria-label="Weave home"><Brand /></Link>}
          <button type="button" onClick={() => setExpanded(value => !value)} aria-expanded={expanded} aria-controls="desktop-navigation" aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'} title={expanded ? 'Collapse sidebar' : 'Expand sidebar'} className="w-10 h-10 flex items-center justify-center rounded-sm text-ink/70 hover:text-rust hover:bg-ink/5 transition-colors">
            <span className="material-symbols-outlined" aria-hidden="true">{expanded ? 'menu_open' : 'menu'}</span>
          </button>
        </div>
        <div className="flex-1 min-w-0 flex items-center justify-between gap-3 px-4 sm:px-8 lg:px-12">
          <div className="flex items-center gap-2 min-w-0">
            <button ref={menuButton} type="button" onClick={() => setMobileOpen(true)} aria-expanded={mobileOpen} aria-controls="mobile-navigation" aria-label="Open navigation" className="md:hidden w-10 h-10 flex items-center justify-center text-ink/70 hover:text-rust"><span className="material-symbols-outlined" aria-hidden="true">menu</span></button>
            <Link to="/" aria-label="Weave home" className="md:hidden"><Brand /></Link>
            <span className="hidden md:block font-mono text-[10px] uppercase tracking-widest text-ink/60">{location.pathname.startsWith('/docs') ? 'Documentation' : 'Workspace'} <span className="text-rust mx-2">/</span> <span className="text-ink font-bold">{pageTitle(location.pathname)}</span></span>
          </div>
          <div className="flex items-center gap-4 min-w-0">
            {user ? (
              <div ref={accountMenu} className="relative">
                <button ref={accountButton} type="button" onClick={() => setAccountOpen(open => !open)} aria-expanded={accountOpen} aria-controls="account-menu" aria-label="Account menu" className="flex items-center gap-2 rounded-sm border border-ink/15 px-2.5 py-1.5 text-ink hover:border-rust/50 hover:bg-ink/5 transition-colors">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-paper font-unbounded text-xs font-bold" aria-hidden="true">{(accountName[0] || user.email?.[0] || 'U').toUpperCase()}</span>
                  <span className="hidden sm:block max-w-36 truncate font-mono text-[10px]">{accountName || user.email || 'Account'}</span>
                  <span className="material-symbols-outlined text-lg" aria-hidden="true">{accountOpen ? 'expand_less' : 'expand_more'}</span>
                </button>
                {accountOpen && (
                  <div id="account-menu" className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-2rem)] border border-ink/10 bg-paper shadow-xl rounded-sm z-[80]">
                    <div className="px-4 py-4 border-b border-ink/10">
                      <p className="font-mono text-[9px] uppercase tracking-widest text-ink/50">Signed in as</p>
                      {accountName && <p className="mt-1 font-unbounded text-xs font-bold text-ink break-words">{accountName}</p>}
                      <p className="mt-1 font-mono text-xs text-ink break-all">{user.email || 'Account'}</p>
                    </div>
                    <div className="p-2">
                      <Link to="/account" onClick={() => setAccountOpen(false)} className="flex items-center gap-3 px-3 py-3 text-ink/80 hover:bg-ink/5 hover:text-rust transition-colors rounded-sm">
                        <span className="material-symbols-outlined text-xl" aria-hidden="true">account_circle</span>
                        <span className="font-mono text-xs">Profile</span>
                      </Link>
                      <button type="button" onClick={() => { setAccountOpen(false); void signOut() }} className="flex w-full items-center gap-3 px-3 py-3 text-left text-ink/80 hover:bg-ink/5 hover:text-rust transition-colors rounded-sm">
                        <span className="material-symbols-outlined text-xl" aria-hidden="true">logout</span>
                        <span className="font-mono text-xs">Sign out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : <Link to="/auth" className="bg-ink text-paper px-4 sm:px-6 py-2.5 text-[10px] font-unbounded font-black tracking-widest hover:bg-rust transition-colors">SIGN IN</Link>}
          </div>
        </div>
      </header>
      <aside id="desktop-navigation" className={`hidden md:flex fixed left-0 top-16 bottom-0 z-40 bg-paper border-r border-ink/10 flex-col justify-between py-6 ${motionReady ? 'transition-[width] duration-200' : ''} ${expanded ? 'w-64 px-4' : 'w-20 px-2'}`}>
        <div className="overflow-y-auto">{navigation(expanded)}</div>
        <button type="button" onClick={() => setExpanded(value => !value)} aria-expanded={expanded} aria-controls="desktop-navigation" aria-label={expanded ? 'Collapse navigation' : 'Expand navigation'} className="flex items-center justify-center gap-3 min-h-12 border-t border-ink/10 text-ink/60 hover:text-rust transition-colors">
          <span className="material-symbols-outlined" aria-hidden="true">{expanded ? 'first_page' : 'last_page'}</span>{expanded && <span className="font-mono text-[9px] uppercase tracking-widest">Collapse</span>}
        </button>
      </aside>
      {mobileOpen && <div className="fixed inset-0 z-[70] md:hidden">
        <div className="absolute inset-0 bg-ink/40" onClick={() => setMobileOpen(false)} aria-hidden="true" />
        <aside id="mobile-navigation" ref={mobileNav} role="dialog" aria-modal="true" aria-label="Navigation" className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-paper shadow-xl px-4 py-5 overflow-y-auto">
          <div className="flex items-center justify-between mb-6"><Link to="/" aria-label="Weave home"><Brand /></Link><button type="button" onClick={() => setMobileOpen(false)} aria-label="Close navigation" className="w-10 h-10 flex items-center justify-center"><span className="material-symbols-outlined" aria-hidden="true">close</span></button></div>
          {navigation(true)}
        </aside>
      </div>}
      <main id="main-content" tabIndex={-1} className={`pt-16 min-h-screen flex-1 ${motionReady ? 'transition-[padding-left] duration-200' : ''} ${expanded ? 'md:pl-64' : 'md:pl-20'}`}>
        {children}
      </main>
    </div>
    </FilterContext.Provider>
  )
}

import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface LayoutProps {
  children: React.ReactNode
  showSideNav?: boolean
  activePage?: 'home' | 'studio' | 'vault' | 'settings' | 'docs'
}

const TICKER_TEXT = 'AI VIRTUAL TRY-ON ✦ COLOR SCIENCE ✦ RESUNET + AFWM + REAL-ESRGAN ✦ SIGLIP SEMANTIC SEARCH ✦ SCHP SKIN PARSING ✦'

export function Layout({ children, showSideNav = true, activePage = 'home' }: LayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, signOut } = useAuth()

  const navItems = [
    { icon: 'grid_view', label: 'Home', page: 'home', path: '/dashboard' },
    { icon: 'auto_fix_high', label: 'Studio', page: 'studio', path: '/studio' },
    { icon: 'shelves', label: 'Vault', page: 'vault', path: '/dashboard' },
    { icon: 'settings', label: 'Settings', page: 'settings', path: '/auth' },
  ]

  const isActive = (page: string) => activePage === page

  return (
    <div className="min-h-screen bg-background text-on-background font-fraunces">
      {/* Ticker Tape */}
      <div className="fixed top-0 left-0 w-full z-[60] flex items-center overflow-hidden bg-rust h-6">
        <div className="flex whitespace-nowrap animate-marquee items-center h-full">
          <span className="text-paper font-mono text-[10px] uppercase tracking-[0.2em] px-4">{TICKER_TEXT}</span>
          <span className="text-paper font-mono text-[10px] uppercase tracking-[0.2em] px-4">{TICKER_TEXT}</span>
        </div>
        <div className="flex whitespace-nowrap animate-marquee items-center h-full">
          <span className="text-paper font-mono text-[10px] uppercase tracking-[0.2em] px-4">{TICKER_TEXT}</span>
          <span className="text-paper font-mono text-[10px] uppercase tracking-[0.2em] px-4">{TICKER_TEXT}</span>
        </div>
      </div>

      {/* Top Nav Bar */}
      <header className="fixed top-[24px] left-0 w-full flex justify-between items-center px-8 h-16 bg-paper/90 backdrop-blur-md z-50 border-b border-ink/10" style={{ mixBlendMode: 'multiply' }}>
        <button
          onClick={() => navigate('/')}
          className="text-2xl font-black text-ink font-unbounded tracking-tighter hover:text-rust transition-colors"
        >
          WEAVE
        </button>
        <nav className="hidden md:flex space-x-12">
          <button
            onClick={() => navigate('/studio')}
            className={`font-mono text-[10px] uppercase tracking-[0.2em] transition-colors duration-300 ${location.pathname === '/studio' ? 'text-rust font-bold underline decoration-wavy' : 'text-ink opacity-80 hover:text-rust'}`}
          >
            STUDIO
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className={`font-mono text-[10px] uppercase tracking-[0.2em] transition-colors duration-300 ${location.pathname === '/dashboard' ? 'text-rust font-bold underline decoration-wavy' : 'text-ink opacity-80 hover:text-rust'}`}
          >
            CATALOGUE
          </button>
          <button
            onClick={() => navigate('/docs/archive')}
            className={`font-mono text-[10px] uppercase tracking-[0.2em] transition-colors duration-300 ${location.pathname.startsWith('/docs') ? 'text-rust font-bold underline decoration-wavy' : 'text-ink opacity-80 hover:text-rust'}`}
          >
            ARCHIVE
          </button>
        </nav>
        {user ? (
          <button
            onClick={() => signOut()}
            className="bg-ink text-paper px-6 py-2 text-[10px] font-unbounded font-black tracking-widest hover:bg-rust transition-colors active:scale-95"
          >
            SIGN OUT
          </button>
        ) : (
          <button
            onClick={() => navigate('/auth')}
            className="bg-ink text-paper px-6 py-2 text-[10px] font-unbounded font-black tracking-widest hover:bg-rust transition-colors active:scale-95"
          >
            SIGN IN
          </button>
        )}
      </header>

      {/* Side Nav */}
      {showSideNav && (
        <aside className="fixed left-0 top-[88px] h-[calc(100vh-88px)] w-20 hidden lg:flex flex-col items-center py-12 z-40 bg-transparent space-y-8">
          {navItems.map((item) => (
            <button
              key={item.page}
              onClick={() => navigate(item.path)}
              className="group flex flex-col items-center gap-1"
            >
              <div className={`w-12 h-12 flex items-center justify-center transition-all ${isActive(item.page) ? 'bg-rust text-paper -rotate-2 scale-110' : 'text-ink opacity-40 hover:opacity-100 hover:rotate-2'}`}>
                <span className="material-symbols-outlined" style={isActive(item.page) ? { fontVariationSettings: "'FILL' 1" } : {}}>
                  {item.icon}
                </span>
              </div>
              <span className={`font-mono text-[7px] uppercase tracking-widest transition-opacity ${isActive(item.page) ? 'text-rust opacity-100' : 'opacity-0 group-hover:opacity-60'}`}>
                {item.label}
              </span>
            </button>
          ))}
        </aside>
      )}

      {/* Main Content */}
      <main className={`pt-[88px] ${showSideNav ? 'lg:pl-20' : ''}`}>
        {children}
      </main>
    </div>
  )
}

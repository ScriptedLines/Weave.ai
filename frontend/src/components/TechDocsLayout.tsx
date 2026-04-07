import { useNavigate, useLocation } from 'react-router-dom'

interface TechDocsLayoutProps {
  children: React.ReactNode
}

export function TechDocsLayout({ children }: TechDocsLayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  
  const navItems = [
    { icon: 'account_tree', label: 'Pipeline', path: '/docs/training' },
    { icon: 'memory', label: 'Inference', path: '/docs/inference' },
    { icon: 'psychology', label: 'Recommendation', path: '/docs/recommendation' },
    { icon: 'menu_book', label: 'Archive', path: '/docs/archive' }
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="bg-background text-on-background font-body min-h-screen overflow-x-hidden selection:bg-primary-container selection:text-white">
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[100]" style={{backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=\"0 0 200 200\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noiseFilter\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.65\" numOctaves=\"3\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23noiseFilter)\"/%3E%3C/svg%3E')"}}></div>
      
      <div className="fixed top-0 right-0 h-full flex items-center pointer-events-none z-0">
        <span className="text-[20vw] font-unbounded font-black text-on-surface/5 tracking-tighter leading-none select-none" style={{writingMode: 'vertical-rl'}}>DOCS</span>
      </div>

      <aside className="fixed left-0 top-0 h-full flex-col pt-20 pb-8 px-4 bg-paper w-64 border-r border-ink/10 z-40 hidden md:flex">
        <div className="mb-12 px-4">
          <h2 className="font-headline font-black text-2xl text-ink leading-none">Technical Studio</h2>
          <p className="font-headline italic text-sm opacity-60">AI Fashion Architecture</p>
        </div>
        <nav className="flex-1 space-y-2">
          {navItems.map(item => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 transition-transform ${isActive(item.path) ? 'bg-rust text-paper rounded-sm font-bold rotate-1 translate-x-1 shadow-xl' : 'text-ink opacity-70 hover:bg-ink/5 hover:-rotate-1'}`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="font-unbounded text-xs uppercase tracking-wider">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="mt-auto px-4">
          <button onClick={() => navigate('/studio')} className="w-full py-4 bg-rust text-paper font-unbounded text-[10px] font-black uppercase tracking-widest rounded-sm hover:scale-105 active:scale-95 transition-all">
            Open Studio
          </button>
        </div>
      </aside>

      <main className="md:ml-64 relative z-10 p-6 md:p-12 lg:p-20 pt-24">
        <header className="fixed top-0 left-0 right-0 z-50 md:left-64 bg-paper/90 backdrop-blur-md border-b border-ink/10 flex justify-between items-center px-6 py-4">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/')} className="text-2xl font-black uppercase tracking-widest text-ink font-headline italic">WEAVE</button>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden lg:flex gap-8 items-center">
              <span className="font-headline italic text-rust font-bold cursor-pointer hover:underline">Archive</span>
              <span onClick={() => navigate('/dashboard')} className="font-headline italic text-ink/60 cursor-pointer hover:text-rust transition-colors">Catalogue</span>
            </div>
          </div>
        </header>

        {children}

        <footer className="border-t border-ink/5 pt-20 pb-32 grid grid-cols-1 lg:grid-cols-3 gap-12 relative overflow-hidden mt-32">
          <div className="lg:col-span-1">
            <h4 className="font-headline text-2xl font-black italic mb-6 text-ink">WEAVE Archive</h4>
            <p className="font-headline italic opacity-70 mb-8 max-w-xs leading-relaxed text-ink/70">
              Every thread is documented. Every pixel is intentional. This is the ledger of the new aesthetic era.
            </p>
            <div className="flex gap-4">
              <span className="font-mono text-[10px] uppercase border border-ink/20 px-2 py-1 text-ink/60">Est. 2024</span>
              <span className="font-mono text-[10px] uppercase border border-ink/20 px-2 py-1 text-ink/60">Build v0.9.1</span>
            </div>
          </div>
        </footer>
      </main>
      
      <div className="fixed bottom-0 left-0 right-0 bg-rust py-2 overflow-hidden z-50">
        <div className="flex whitespace-nowrap animate-marquee items-center gap-12">
          <span className="font-mono text-[10px] uppercase font-bold text-paper tracking-widest">LIVE INFERENCE STATUS: NOMINAL</span>
          <span className="w-2 h-2 rounded-full bg-paper/50"></span>
          <span className="font-mono text-[10px] uppercase font-bold text-paper tracking-widest">LATENT SPACE SYNCHRONIZED</span>
          <span className="w-2 h-2 rounded-full bg-paper/50"></span>
          <span className="font-mono text-[10px] uppercase font-bold text-paper tracking-widest">ALL MODELS LOADED // VRAM: 85%</span>
        </div>
      </div>
    </div>
  )
}

import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

interface TechDocsLayoutProps {
  children: React.ReactNode
}

export function TechDocsLayout({ children }: TechDocsLayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const navItems = [
    { icon: 'account_tree', label: 'Training', path: '/docs/training' },
    { icon: 'speed', label: 'Inference & Benchmarks', path: '/docs/inference' },
    { icon: 'psychology', label: 'Recommendations', path: '/docs/recommendation' },
    { icon: 'menu_book', label: 'Overview', path: '/docs/archive' }
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <>
      <div className="relative min-h-[calc(100vh-64px)] overflow-x-hidden selection:bg-rust selection:text-white">
        <div
          className="fixed inset-0 pointer-events-none opacity-[0.03] z-0"
          style={{
            backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=\"0 0 200 200\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noiseFilter\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.65\" numOctaves=\"3\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23noiseFilter)\"/%3E%3C/svg%3E')"
          }}
        />

        <div className="px-6 sm:px-12 pt-8 max-w-7xl mx-auto relative z-10">
          <nav aria-label="Technical documentation" className="flex items-center gap-2 overflow-x-auto pb-3 border-b border-ink/10" style={{ scrollbarWidth: 'none' }}>
              {navItems.map((item) => {
                const active = isActive(item.path)
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-sm text-xs font-mono uppercase tracking-wider whitespace-nowrap transition-all ${
                      active
                        ? 'bg-ink text-paper font-bold shadow-sm'
                        : 'text-ink/70 hover:bg-ink/5 hover:text-rust'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                )
              })}
          </nav>
        </div>

        <div className="px-6 sm:px-12 py-8 md:py-12 max-w-7xl mx-auto relative z-10">
          {children}

          <footer className="border-t border-ink/10 pt-16 pb-20 grid grid-cols-1 lg:grid-cols-3 gap-12 mt-24">
            <div className="lg:col-span-1">
              <h4 className="font-unbounded text-xl font-black italic mb-4 text-ink">Weave Documentation</h4>
              <p className="font-fraunces italic opacity-70 mb-6 max-w-xs leading-relaxed text-ink/70 text-sm">
                Learn how virtual try-on, color analysis, and recommendations work.
              </p>
              <div className="flex gap-4">
                <span className="font-mono text-[10px] uppercase border border-ink/20 px-2.5 py-1 text-ink/60">Est. 2024</span>
                <span className="font-mono text-[10px] uppercase border border-ink/20 px-2.5 py-1 text-ink/60">Build v0.9.1</span>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </>
  )
}

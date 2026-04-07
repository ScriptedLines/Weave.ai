import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function RecommendationDocs() {
  const navigate = useNavigate();

  useEffect(() => {
    // Custom Cursor Simulation
    const dot = document.querySelector('.cursor-dot') as HTMLElement;
    if (dot) {
      const moveHandler = (e: MouseEvent) => {
        dot.style.left = e.clientX + 'px';
        dot.style.top = e.clientY + 'px';
      };
      document.addEventListener('mousemove', moveHandler);
      return () => document.removeEventListener('mousemove', moveHandler);
    }
  }, []);

  return (
    <div className="bg-background text-on-surface font-body selection:bg-primary/30 min-h-screen overflow-x-hidden" style={{ cursor: 'none' }}>
      <style>{`
        .risograph-grain {
          background-image: url(https://lh3.googleusercontent.com/aida-public/AB6AXuA4paJuQXAK_UWJl2y7RuFnXbJfI8Run0weMMPaDlWiNS6y5O_TWuyuN0-8wo7TvTgXrn140pIi2ak5eWrvvBqsl_Ksn9_aWF7JkR2ox75Pcie-8hQHGLKTvy7oOrNbEofqZPOmqYW1xM_JTReeKHhk9jLvlqVTmfcQLODYRozpoQlDTwIzu_1QBhB9W59s6dGVJbQBGz8G4FQ0vyWes_lRj7p0JNSZ9L-5pNUhGemaeXuBKo1NSuimZHSN_U6xbedVwJD9zfJOZynW);
          opacity: 0.04;
          pointer-events: none
        }
        .ink-bleed-underline {
          background: linear-gradient(90deg, transparent 0%, #1A1208 50%, transparent 100%);
          height: 1px;
          width: 100%;
          opacity: 0.2
        }
        .stamp-clip {
          clip-path: polygon(0% 5%, 5% 0%, 95% 0%, 100% 5%, 100% 95%, 95% 100%, 5% 100%, 0% 95%, 0% 75%, 2% 70%, 2% 30%, 0% 25%)
        }
        .tape-strip {
          background-color: #d4e899;
          box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.05)
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
        .cursor-dot {
          width: 8px;
          height: 8px;
          background-color: #a63319;
          border-radius: 50%;
          position: fixed;
          pointer-events: none;
          z-index: 9999;
          transform: translate(-50%, -50%);
        }
      `}</style>

      {/* Global Grain Overlay */}
      <div className="fixed inset-0 risograph-grain z-[100]"></div>
      
      {/* SideNavBar */}
      <aside className="fixed left-0 top-0 h-full flex flex-col pt-20 pb-8 px-4 bg-[#F5EFE0] w-64 border-r border-[#1A1208]/10 z-40 transition-all duration-300 hidden md:flex">
        <div className="mb-12 px-4 cursor-pointer" onClick={() => navigate('/')}>
          <h1 className="text-xl font-bold text-[#1A1208] uppercase tracking-tighter">Technical Studio</h1>
          <p className="font-body italic text-sm opacity-60">AI Fashion Architecture</p>
        </div>
        <nav className="flex-1 space-y-2">
          <button onClick={() => navigate('/docs/training')} className="w-full flex items-center gap-3 text-[#1A1208] px-4 py-3 opacity-70 hover:bg-[#1A1208]/5 transition-transform hover:-rotate-1">
            <span className="material-symbols-outlined">account_tree</span>
            <span className="font-label text-xs font-bold uppercase tracking-widest">Pipeline</span>
          </button>
          {/* ACTIVE TAB: Engine */}
          <button onClick={() => navigate('/docs/recommendation')} className="w-full flex items-center gap-3 bg-[#C84B2F] text-[#F5EFE0] rounded-sm px-4 py-3 rotate-1 translate-x-1 duration-200 ease-out-back">
            <span className="material-symbols-outlined">memory</span>
            <span className="font-label text-xs font-bold uppercase tracking-widest">Engine</span>
          </button>
          <button onClick={() => navigate('/docs/inference')} className="w-full flex items-center gap-3 text-[#1A1208] px-4 py-3 opacity-70 hover:bg-[#1A1208]/5 transition-transform hover:-rotate-1">
            <span className="material-symbols-outlined">psychology</span>
            <span className="font-label text-xs font-bold uppercase tracking-widest">Inference</span>
          </button>
          <button onClick={() => navigate('/docs/archive')} className="w-full flex items-center gap-3 text-[#1A1208] px-4 py-3 opacity-70 hover:bg-[#1A1208]/5 transition-transform hover:-rotate-1">
            <span className="material-symbols-outlined">menu_book</span>
            <span className="font-label text-xs font-bold uppercase tracking-widest">Docs</span>
          </button>
        </nav>
        <div className="mt-auto px-4">
          <button onClick={() => navigate('/studio')} className="w-full bg-primary text-on-primary font-label text-[10px] uppercase py-3 tracking-widest hover:scale-105 transition-transform">
            New Experiment
          </button>
        </div>
      </aside>

      {/* TopAppBar */}
      <header className="fixed top-0 right-0 left-0 md:left-64 flex justify-between items-center px-6 py-4 backdrop-blur-md bg-[#F5EFE0]/80 border-b border-[#1A1208]/10 z-50">
        <div className="text-2xl font-black uppercase tracking-widest text-[#1A1208] font-headline cursor-pointer" onClick={() => navigate('/')}>WEAVE</div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-8 font-label text-[10px] tracking-[0.2em] font-bold">
            <span className="text-[#1A1208]/60 hover:text-[#C84B2F] transition-colors cursor-pointer">INFRASTRUCTURE</span>
            <span className="text-[#C84B2F] cursor-pointer">THE ENGINE</span>
            <span className="text-[#1A1208]/60 hover:text-[#C84B2F] transition-colors cursor-pointer">METRICS</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#1A1208] cursor-pointer">settings</span>
            <span onClick={() => navigate('/dashboard')} className="material-symbols-outlined text-[#1A1208] cursor-pointer">account_circle</span>
          </div>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="ml-0 md:ml-64 pt-28 pb-20 px-8 md:px-16 max-w-7xl">
        {/* Hero Section */}
        <section className="mb-24 relative">
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-secondary-container/20 rounded-full blur-3xl"></div>
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-4 block">How It's Built / Module 02</span>
          <h1 className="font-headline font-black text-6xl md:text-8xl text-on-surface tracking-tighter leading-[0.9] mb-6">
            The Recommendation <br/> <span className="italic text-primary">Engine.</span>
          </h1>
          <div className="flex flex-col md:flex-row items-baseline gap-4 border-l-2 border-primary/20 pl-6 py-2">
            <p className="font-body italic text-2xl text-on-surface/80 max-w-lg">
              Three signals. One ranked feed. We decode the DNA of style through color math and semantic vectors.
            </p>
            <div className="font-mono text-[11px] bg-on-surface text-surface px-2 py-1 rotate-1">v4.0.2 STABLE</div>
          </div>
        </section>

        {/* Signal Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
          {/* Signal 1: Color */}
          <div className="group relative bg-primary text-on-primary p-8 min-h-[400px] flex flex-col justify-between -rotate-1 hover:rotate-0 transition-all duration-500 ease-out-back cursor-pointer overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-20">
              <span className="material-symbols-outlined text-7xl">palette</span>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest mb-12 opacity-80">Signal 01</div>
              <h2 className="font-label font-black text-3xl uppercase leading-none mb-4">Color <br/>Geometry</h2>
              <p className="font-body italic text-lg leading-relaxed opacity-90">
                Calculating the Euclidean distance in CIELAB space between your historical palette and new arrivals.
              </p>
            </div>
            <div className="mt-auto">
              <div className="font-mono text-xs border-t border-on-primary/20 pt-4 flex justify-between">
                <span>METRIC: LAB DIST</span>
                <span className="font-bold">LOWEST_DELTA</span>
              </div>
            </div>
            {/* Card Detail Decoration */}
            <div className="absolute bottom-4 right-4 w-12 h-12 border border-on-primary/20 flex items-center justify-center">
              <span className="font-mono text-[10px]">L*a*b</span>
            </div>
          </div>

          {/* Signal 2: Content (Semantic) */}
          <div className="group relative bg-secondary text-on-secondary p-8 min-h-[400px] flex flex-col justify-between rotate-1 hover:rotate-0 transition-all duration-500 ease-out-back cursor-pointer overflow-hidden">
            <div className="tape-strip absolute -top-2 left-1/2 -translate-x-1/2 w-24 h-6 -rotate-2 z-10 opacity-60"></div>
            <div className="absolute top-0 right-0 p-4 opacity-20">
              <span className="material-symbols-outlined text-7xl">psychology</span>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest mb-12 opacity-80">Signal 02</div>
              <h2 className="font-label font-black text-3xl uppercase leading-none mb-4">Semantic <br/>Similarity</h2>
              <p className="font-body italic text-lg leading-relaxed opacity-90">
                SigLIP vision encoders mapping images to 768-dimensional latent space. Stored in pgvector for sub-ms lookup.
              </p>
            </div>
            <div className="mt-auto">
              <div className="font-mono text-xs border-t border-on-secondary/20 pt-4 flex justify-between">
                <span>MODEL: SIGLIP-VIT-L</span>
                <span className="font-bold">0.92_SIM</span>
              </div>
            </div>
          </div>

          {/* Signal 3: Collaborative */}
          <div className="group relative bg-[#87CEEB] text-[#1A1208] p-8 min-h-[400px] flex flex-col justify-between -rotate-2 hover:rotate-0 transition-all duration-500 ease-out-back cursor-pointer overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 p-4 opacity-20">
              <span className="material-symbols-outlined text-7xl">group</span>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest mb-12 opacity-70">Signal 03</div>
              <h2 className="font-label font-black text-3xl uppercase leading-none mb-4">Taste <br/>Clusters</h2>
              <p className="font-body italic text-lg leading-relaxed opacity-80">
                Collaborative filtering identifying "Taste Twins." If they love the drape, you likely will too.
              </p>
            </div>
            <div className="mt-auto">
              <div className="font-mono text-xs border-t border-[#1A1208]/20 pt-4 flex justify-between">
                <span>ALGO: KNN-MF</span>
                <span className="font-bold">PEER_SYNC</span>
              </div>
            </div>
          </div>
        </div>

        {/* Formula Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="relative p-12 bg-surface-container-high border-2 border-outline/5 rotate-1">
            <div className="absolute -top-4 -right-4 bg-tertiary text-on-tertiary px-4 py-1 font-mono text-[10px] tracking-widest uppercase">Equation 04-B</div>
            <h3 className="font-label text-xl mb-8 uppercase font-black text-on-surface">The Final Score</h3>
            <div className="space-y-6">
              <div className="bg-surface-container-highest p-6 font-mono text-xl md:text-2xl text-primary leading-tight overflow-x-auto whitespace-nowrap">
                final_score = <span className="text-on-surface opacity-50">w1</span> * color_norm + <br/>
                <span className="ml-24"><span className="text-on-surface opacity-50">w2</span> * content_norm +</span> <br/>
                <span className="ml-24"><span className="text-on-surface opacity-50">w3</span> * collab_norm +</span> <br/>
                <span className="ml-24 text-tertiary">jitter</span>
              </div>
              <p className="font-body italic text-on-surface-variant">
                Weights (w) are dynamically adjusted based on the current season and user engagement velocity. The "jitter" variable prevents echo chambers by injecting 5% random aesthetic exploration.
              </p>
            </div>
          </div>
          <div className="space-y-8">
            <div className="flex items-start gap-4">
              <span className="font-mono text-primary font-bold">01.</span>
              <div>
                <h4 className="font-label text-sm font-bold uppercase mb-2">Linear Normalization</h4>
                <p className="font-body italic text-sm opacity-70">All raw signals are scaled between 0 and 1 to ensure no single signal overpowers the ensemble.</p>
              </div>
            </div>
            <div className="ink-bleed-underline"></div>
            <div className="flex items-start gap-4">
              <span className="font-mono text-primary font-bold">02.</span>
              <div>
                <h4 className="font-label text-sm font-bold uppercase mb-2">Weight Optimization</h4>
                <p className="font-body italic text-sm opacity-70">A Bayesian optimization loop runs every 24 hours to tune 'w' values against global CTR.</p>
              </div>
            </div>
            <div className="ink-bleed-underline"></div>
            <div className="flex items-start gap-4">
              <span className="font-mono text-primary font-bold">03.</span>
              <div>
                <h4 className="font-label text-sm font-bold uppercase mb-2">Latency Target</h4>
                <p className="font-body italic text-sm opacity-70">The entire inference pipeline completes in &lt;120ms including vector similarity and cold-start logic.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Visual Proof Section */}
        <section className="mt-32">
          <div className="flex justify-between items-end mb-12">
            <h2 className="font-headline text-5xl font-black italic">Ranked Feed Output.</h2>
            <div className="stamp-clip bg-secondary-container px-6 py-2 font-label text-[10px] font-black uppercase tracking-widest rotate-2">
              Live Demo
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Product Card 1 */}
            <div className="group relative aspect-[3/4] overflow-hidden bg-surface-container-highest flex flex-col hover:-translate-y-2 transition-transform duration-500">
              <img className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA96CDrYDourjI_7pnnaxfHSyFEv8JarxlDllUBcS5GzSkhCIZcYZserYhp-gHELb1L5_KuinllvfAo0P3zyKSqfzyAvQNSgFOo6VC9RPFEoPdDMgXl6csX59yfOTmSpnzFhhy434IWUDrmdO2cdKb5ejNQvt0blkiPv1K-J01lRTjYvCsFxIuZULKeWaNOCSEq7O1LBM3vBWqtsIN6R2nrN9tHV8sKe6R54TaKLYUBLrpXO-Bdm6EYrg6YKyUfim5_HBWUEvFta8hx" alt="Rust colored chore coat" />
              <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-background/90 to-transparent">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-[10px] text-primary">SCORE: 0.98</span>
                  <span className="material-symbols-outlined text-xs">favorite</span>
                </div>
              </div>
            </div>
            {/* Product Card 2 */}
            <div className="group relative aspect-[3/4] overflow-hidden bg-surface-container-highest flex flex-col translate-y-8 hover:translate-y-6 transition-transform duration-500">
              <img className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBJ_kO3N8qjN4YlMO6g3Tnt_I7FZCY5a2m1valBtMk-W4TzZKliwptC1HFQ6w1iuO9fr2EfwZbzLxe7GIVXPfbCunDnj0bsg1m8eAhfBy9gdnw-QFU3DuUnctDl7-0aKSvNgLdKniyPW43bqdEOtY_s3W7E_ll0irRCZPR3Dll_mMAphEqr1Lm-X2aTuR1yc-tSpp7kEOZBp1qiFzEVRXztJZnQEMbfZ34bHycu-mIjMKGiuI-GZkkTO0JUCUar81HOnZVVThOfUCGw" alt="Olive silk dress" />
              <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-background/90 to-transparent">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-[10px] text-primary">SCORE: 0.94</span>
                  <span className="material-symbols-outlined text-xs">favorite</span>
                </div>
              </div>
            </div>
            {/* Product Card 3 */}
            <div className="group relative aspect-[3/4] overflow-hidden bg-surface-container-highest flex flex-col hover:-translate-y-2 transition-transform duration-500">
              <img className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB24pMC6Bui5lHBXTCmYvWrS9q_dHBUFrPwHzBzBvmjfVFYpgJsN4iIo7hZ-Uj9vZNva5QsPEuXqvl4svv0D6Gyfign8iNP2l58VqQCYoXJ1tLDoZoguNzj27Sr43y9Rk38gvfcdlS0SHtK8SBBcGvCbkvSC_V0wD-sItncqKne3Ymxt3oveDjahEfnAZ7CJzgT5vVC3HlmgCJXagw6rA2nQCTl3SSIVIadjz-f0sJx8UHrU6hu8GhPF8HPd_n01GXvfAMYBIGlbPFI" alt="Minimalist leather bag" />
              <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-background/90 to-transparent">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-[10px] text-primary">SCORE: 0.89</span>
                  <span className="material-symbols-outlined text-xs">favorite</span>
                </div>
              </div>
            </div>
            {/* Product Card 4 */}
            <div className="group relative aspect-[3/4] overflow-hidden bg-surface-container-highest flex flex-col translate-y-12 hover:translate-y-10 transition-transform duration-500">
              <img className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBvZag0as1LBRB18v35afvtrUAm7IIb0ocn6_tVcl9dqE4eEiWOSpIW72ubIC9lMUTU8la9_TFkVY3NiXfxWpHVf1xNNQecXz6CbC4QQwaKb0uPau0FiCoG9nyYkKoXvI-xFduHk9QG6efzE49vQFdDIze3vr90wJWwY7lv__cs789o9pTmON-I7U5lCgjiGMCRUEoxLTlBoWNmPbDltsMyN4WpM2ikS63CHBtiT2eWIecbbePLKnVBpFkkWoNNIGQOCtXUHv0nghLJ" alt="Off-white linen trousers" />
              <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-background/90 to-transparent">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-[10px] text-primary">SCORE: 0.87</span>
                  <span className="material-symbols-outlined text-xs">favorite</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom Marquee */}
        <footer className="mt-40 overflow-hidden border-t border-b border-primary/20 py-4 -mx-8 md:-mx-16">
          <div className="flex whitespace-nowrap animate-marquee">
            <div className="flex items-center gap-8 px-4 font-mono text-[10px] uppercase tracking-[0.5em] text-on-surface/50">
              <span>Processing Real-Time Preference Clusters</span><span className="text-primary">●</span>
              <span>SigLIP Inference Active</span><span className="text-primary">●</span>
              <span>99.9% Uptime on Vector DB</span><span className="text-primary">●</span>
              <span>Processing Real-Time Preference Clusters</span><span className="text-primary">●</span>
              <span>SigLIP Inference Active</span><span className="text-primary">●</span>
            </div>
          </div>
        </footer>
      </main>
      <div className="cursor-dot hidden md:block"></div>
    </div>
  );
}

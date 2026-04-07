import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function TrainingDiagram() {
  const navigate = useNavigate();

  return (
    <div className="bg-background text-on-background min-h-screen overflow-x-hidden" style={{ backgroundColor: '#F5EFE0', color: '#1A1208', cursor: 'crosshair' }}>
      <style>{`
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .ink-bleed-divider {
            mask-image: url("data:image/svg+xml,%3Csvg width='100%25' height='20' viewBox='0 0 1200 20' preserveAspectRatio='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 20L12.5 15.5L25 18L37.5 12L50 16.5L62.5 10L75 14L87.5 8L100 13L112.5 7L125 11L137.5 5L150 9.5L162.5 3L175 7L187.5 1.5L200 5.5L212.5 0.5L225 4L237.5 0L250 3.5L1200 4.5V20H0Z' fill='black'/%3E%3C/svg%3E");
            -webkit-mask-image: url("data:image/svg+xml,%3Csvg width='100%25' height='20' viewBox='0 0 1200 20' preserveAspectRatio='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 20L12.5 15.5L25 18L37.5 12L50 16.5L62.5 10L75 14L87.5 8L100 13L112.5 7L125 11L137.5 5L150 9.5L162.5 3L175 7L187.5 1.5L200 5.5L212.5 0.5L225 4L237.5 0L250 3.5L1200 4.5V20H0Z' fill='black'/%3E%3C/svg%3E");
        }
        .grain-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9999;
            opacity: 0.03;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
        }
        .sticker-rotate-1 { transform: rotate(1.5deg); }
        .sticker-rotate-2 { transform: rotate(-2.1deg); }
        .sticker-rotate-3 { transform: rotate(0.8deg); }
        .fraunces-display { font-family: 'Fraunces', serif; font-weight: 900; letter-spacing: -0.05em; }
        .fraunces-body { font-family: 'Fraunces', serif; font-weight: 300; font-style: italic; }
        .space-mono { font-family: 'Space Mono', monospace; letter-spacing: 0.2em; text-transform: uppercase; }
        .unbounded-ui { font-family: 'Unbounded', sans-serif; font-weight: 900; text-transform: uppercase; }
        @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
        }
        .animate-marquee {
            animation: marquee 30s linear infinite;
        }
      `}</style>
      <div className="grain-overlay"></div>
      
      {/* TopNavBar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#F5EFE0]/80 backdrop-blur-md flex justify-between items-center w-full px-6 py-4 border-b border-[#1A1208]/10">
        <div className="flex items-center gap-8">
          <span className="text-2xl font-black uppercase tracking-widest text-[#1A1208] cursor-pointer" onClick={() => navigate('/')}>WEAVE</span>
          <nav className="hidden md:flex gap-6">
            <span className="text-[#1A1208]/60 hover:text-[#C84B2F] transition-colors font-['Newsreader'] italic cursor-pointer">Archives</span>
            <span className="text-[#C84B2F] font-bold font-['Newsreader'] italic cursor-pointer">Pipeline</span>
            <span className="text-[#1A1208]/60 hover:text-[#C84B2F] transition-colors font-['Newsreader'] italic cursor-pointer">Runway</span>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center bg-[#1A1208]/5 px-3 py-1 rounded-sm border border-[#1A1208]/10">
            <span className="material-symbols-outlined text-sm opacity-60">search</span>
            <input className="bg-transparent border-none focus:ring-0 text-[10px] space-mono w-32" placeholder="QUERY ARCHIVE" type="text"/>
          </div>
          <span className="material-symbols-outlined text-[#1A1208] cursor-pointer hover:text-[#C84B2F]">settings</span>
          <span onClick={() => navigate('/dashboard')} className="material-symbols-outlined text-[#1A1208] cursor-pointer hover:text-[#C84B2F]">account_circle</span>
        </div>
      </header>

      {/* SideNavBar */}
      <aside className="fixed left-0 top-0 h-full hidden lg:flex flex-col pt-24 pb-8 px-4 bg-[#F5EFE0] w-64 border-r border-[#1A1208]/10 z-40">
        <div className="mb-12 px-4 cursor-pointer" onClick={() => navigate('/')}>
          <h2 className="font-['Newsreader'] font-[900] text-2xl leading-tight">Technical Studio</h2>
          <p className="font-['Newsreader'] italic text-sm opacity-60">AI Fashion Architecture</p>
        </div>
        <nav className="flex-1 space-y-2">
          {/* Active: Pipeline */}
          <button onClick={() => navigate('/docs/training')} className="w-full flex items-center gap-3 bg-[#C84B2F] text-[#F5EFE0] rounded-sm px-4 py-3 rotate-1 translate-x-1 shadow-md">
            <span className="material-symbols-outlined">account_tree</span>
            <span className="font-['Unbounded'] font-[700] text-xs uppercase tracking-tight">Pipeline</span>
          </button>
          <button onClick={() => navigate('/docs/recommendation')} className="w-full flex items-center gap-3 text-[#1A1208] px-4 py-3 opacity-70 hover:bg-[#1A1208]/5 transition-all hover:-rotate-1">
            <span className="material-symbols-outlined">memory</span>
            <span className="font-['Unbounded'] font-[700] text-xs uppercase tracking-tight">Engine</span>
          </button>
          <button onClick={() => navigate('/docs/inference')} className="w-full flex items-center gap-3 text-[#1A1208] px-4 py-3 opacity-70 hover:bg-[#1A1208]/5 transition-all hover:-rotate-1">
            <span className="material-symbols-outlined">psychology</span>
            <span className="font-['Unbounded'] font-[700] text-xs uppercase tracking-tight">Inference</span>
          </button>
          <button onClick={() => navigate('/docs/archive')} className="w-full flex items-center gap-3 text-[#1A1208] px-4 py-3 opacity-70 hover:bg-[#1A1208]/5 transition-all hover:-rotate-1">
            <span className="material-symbols-outlined">menu_book</span>
            <span className="font-['Unbounded'] font-[700] text-xs uppercase tracking-tight">Docs</span>
          </button>
        </nav>
        <button onClick={() => navigate('/studio')} className="mt-auto bg-primary text-on-primary font-['Unbounded'] font-[900] py-4 rounded-sm text-xs hover:scale-105 active:scale-95 transition-transform">
          NEW EXPERIMENT
        </button>
      </aside>

      {/* Main Canvas */}
      <main className="lg:ml-64 pt-24 pb-20 px-8 md:px-16 max-w-7xl mx-auto">
        {/* Header Section */}
        <section className="mb-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="max-w-2xl">
              <span className="space-mono text-primary text-xs mb-4 block">Section 01 // HOW IT'S BUILT</span>
              <h1 className="fraunces-display text-6xl md:text-8xl text-on-background leading-[0.85] mb-6">
                Three-Stage <br/>Knowledge <br/>Distillation.
              </h1>
            </div>
            <div className="md:w-1/3 border-t border-on-background/20 pt-4">
              <p className="fraunces-body text-xl leading-relaxed">
                An intricate ballet of neural weights. We move beyond simple GANs to a curriculum-based distillation that captures the drape, fold, and texture of high fashion with anatomical precision.
              </p>
            </div>
          </div>
        </section>

        {/* The Pipeline Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 relative">
          {/* STAGE 1 */}
          <div className="md:col-span-7 group">
            <div className="relative bg-surface-container-low p-8 sticker-rotate-3 border-b-4 border-primary/20 hover:rotate-0 transition-transform duration-500">
              <div className="absolute -top-4 -left-4 bg-primary text-on-primary px-3 py-1 space-mono text-[10px] z-10">STAGE_01</div>
              <div className="flex justify-between items-start mb-12">
                <h3 className="unbounded-ui text-3xl text-primary">PB-Warp <br/>Training</h3>
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-on-primary">
                  <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>texture</span>
                </div>
              </div>
              <div className="mb-8 overflow-hidden">
                <img className="w-full h-64 object-cover filter grayscale group-hover:grayscale-0 transition-all duration-700" src="/static/1.png" alt="PB-Warp Training Results" />
              </div>
              <div className="space-y-4">
                <p className="fraunces-body text-2xl">
                  PBAFWM (45ch) learns cloth warping with DensePose + Pose markers. 
                </p>
                <div className="pt-6 border-t border-on-background/5">
                  <span className="space-mono text-[10px] opacity-40">PARAMETERS</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="bg-surface-container-highest px-2 py-1 space-mono text-[10px] border border-outline-variant/30">DENSEPOSE_V1</span>
                    <span className="bg-surface-container-highest px-2 py-1 space-mono text-[10px] border border-outline-variant/30">WARP_FLOW_EXTRACT</span>
                    <span className="bg-surface-container-highest px-2 py-1 space-mono text-[10px] border border-outline-variant/30">LR: 1E-4</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* STAGE 2 */}
          <div className="md:col-span-5 self-center">
            <div className="relative bg-surface-container p-8 sticker-rotate-2 hover:rotate-0 transition-transform duration-500 shadow-xl">
              <div className="absolute -top-4 -right-4 bg-secondary text-on-secondary px-3 py-1 space-mono text-[10px] z-10">STAGE_02</div>
              <div className="flex justify-between items-start mb-8">
                <h3 className="unbounded-ui text-2xl text-secondary">PB-E2E <br/>Training</h3>
                <span className="material-symbols-outlined text-secondary text-4xl">dynamic_form</span>
              </div>
              <p className="fraunces-body text-xl mb-6">
                End-to-end training of Warp + ResUnetGenerator with 8-channel input. 
              </p>
              <div className="mb-6 overflow-hidden border border-secondary/20 group">
                <img className="w-full h-auto object-cover filter grayscale group-hover:grayscale-0 transition-all duration-700" src="/static/2.png" alt="PB-E2E Training Results" />
              </div>
              <div className="bg-[#1A1208] text-[#F5EFE0] p-6 font-mono text-[11px] leading-tight overflow-x-auto">
                <div className="flex gap-2 text-secondary-container mb-2">
                  <span className="">// INITIALIZING GENERATOR</span>
                </div>
                <div className="opacity-70">
                  input_channels = 8 <br/>
                  latent_dim = 512 <br/>
                  architecture = "ResUnet" <br/>
                  loss = ["L1", "VGG", "Adversarial"]
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between">
                <span className="space-mono text-[10px] text-secondary">STATUS: OPTIMIZED</span>
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full border-2 border-surface bg-secondary-container"></div>
                  <div className="w-8 h-8 rounded-full border-2 border-surface bg-secondary"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Ink Bleed Separator */}
          <div className="md:col-span-12 py-12">
            <div className="ink-bleed-divider bg-on-background h-[2px] w-full opacity-10"></div>
          </div>

          {/* STAGE 3 (Full Width Featured) */}
          <div className="md:col-span-12">
            <div className="grid md:grid-cols-2 gap-0 bg-[#D7E3F5] text-on-surface border border-on-background/10">
              <div className="p-12 border-r border-on-background/10">
                <div className="bg-blue-600 text-white inline-block px-3 py-1 space-mono text-[10px] mb-8">STAGE_03</div>
                <h3 className="unbounded-ui text-5xl mb-8 leading-none text-blue-900">PF-E2E <br/>Student Training</h3>
                <p className="fraunces-body text-2xl mb-12">
                  StyleAFWM student trained with curriculum loss and pseudo-labels from the teacher. The final refinement stage for mobile-first inference speeds.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/40 border border-white/60">
                    <span className="space-mono text-[10px] block mb-2">LOSS FUNCTION</span>
                    <span className="unbounded-ui text-lg">Curriculum</span>
                  </div>
                  <div className="p-4 bg-white/40 border border-white/60">
                    <span className="space-mono text-[10px] block mb-2">SOURCE</span>
                    <span className="unbounded-ui text-lg">Pseudo-Labels</span>
                  </div>
                </div>
              </div>
              <div className="relative overflow-hidden group flex items-center justify-center bg-[#1A1208]/5 p-8">
                <img className="w-full h-full object-contain grayscale group-hover:grayscale-0 transition-all duration-1000" src="/static/3.png" alt="PF-E2E Student Training Results" />
                <div className="absolute inset-0 bg-blue-900/10 mix-blend-overlay pointer-events-none"></div>
                <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
                  <div className="bg-[#F5EFE0] p-4 text-[#1A1208] sticker-rotate-1 shadow-lg max-w-[200px]">
                    <p className="space-mono text-[8px] leading-tight">FIG. 42: STUDENT NETWORK REFINEMENT OUTPUT AT 400K STEPS.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer / Editorial Note */}
        <footer className="mt-32 pt-12 border-t border-on-background/10 grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <span className="space-mono text-[10px] opacity-40 block mb-4">CONTRIBUTORS</span>
            <p className="fraunces-body text-sm">Design System: The Digital Curator<br/>Architecture: Weave AI Labs<br/>Documentation: Editorial v4.2</p>
          </div>
          <div className="md:col-span-2">
            <span className="space-mono text-[10px] opacity-40 block mb-4">ABSTRACT</span>
            <p className="fraunces-body text-sm leading-relaxed italic">
              Knowledge distillation in the context of fashion synthesis requires a specific focus on structural integrity versus stylistic fluidity. Our pipeline ensures that while the "student" model remains lightweight, it retains the high-frequency topological data of the "teacher," allowing for real-time virtual try-on without the computational overhead of traditional PB-warp generators.
            </p>
          </div>
        </footer>
      </main>

      {/* Scrolling Marquee Component */}
      <div className="fixed bottom-0 left-0 w-full bg-[#1A1208] py-2 overflow-hidden whitespace-nowrap z-50 pointer-events-none">
        <div className="flex animate-marquee space-x-12">
          <span className="space-mono text-[#ffba43] text-xs">PIPELINE ACTIVE</span>
          <span className="space-mono text-[#ffba43] text-xs">DISTILLING KNOWLEDGE</span>
          <span className="space-mono text-[#ffba43] text-xs">PB-WARP READY</span>
          <span className="space-mono text-[#ffba43] text-xs">STYLEAFWM STUDENT_STABLE</span>
          <span className="space-mono text-[#ffba43] text-xs">DENSEPOSE OVERLAY 98.4%</span>
          <span className="space-mono text-[#ffba43] text-xs">PIPELINE ACTIVE</span>
          <span className="space-mono text-[#ffba43] text-xs">DISTILLING KNOWLEDGE</span>
          <span className="space-mono text-[#ffba43] text-xs">PB-WARP READY</span>
          <span className="space-mono text-[#ffba43] text-xs">STYLEAFWM STUDENT_STABLE</span>
          <span className="space-mono text-[#ffba43] text-xs">DENSEPOSE OVERLAY 98.4%</span>
        </div>
      </div>
    </div>
  );
}

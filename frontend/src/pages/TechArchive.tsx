import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function TechArchive() {
  const navigate = useNavigate();

  return (
    <div className="bg-background text-on-background font-body selection:bg-primary-container selection:text-white overflow-x-hidden min-h-screen">
      <style>{`
        .material-symbols-outlined {
          font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24
        }
        .grain {
          background-image: url(https://lh3.googleusercontent.com/aida-public/AB6AXuA8TtrHnrf3SmZ-qWAQvXG1MmqrDmsGJ0_LMpkBsBdBRn4dmfbWdovwKE4s_ErUfkE6db8Ie_wIv_-5zuokar3f9-V4ycWa7wvPCZYgtbDUnicn5qHZOQ1ohIH6Td1VeK9-IzhuvUDSZTOZmwNBCQiuTukyYKPIaE_EDIRcTutG2kmBX2IBs3V476CoI0o2GdAuE7gLqZPE-LtJoWncDo0rMfT6PqMDLOuIFm_YMUYlwdnm9rVDoKF1BwFaaZGZHlnxZtnMNy0XHI3l);
          opacity: 0.03;
          pointer-events: none
        }
        .paper-edge {
          mask-image: linear-gradient(to bottom, black 95%, transparent 100%)
        }
        .hatch {
          background-image: repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(26, 18, 8, 0.05) 5px, rgba(26, 18, 8, 0.05) 6px)
        }
        .vertical-text {
          writing-mode: vertical-rl
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee-text {
          animation: marquee 20s linear infinite;
        }
      `}</style>

      {/* Global Grain Overlay */}
      <div className="fixed inset-0 grain z-[100]"></div>
      
      {/* Ghost Watermark */}
      <div className="fixed top-0 right-0 h-full flex items-center pointer-events-none z-0">
        <span className="text-[20vw] font-brutal font-black text-surface-variant vertical-text tracking-tighter leading-none select-none opacity-50">DOCS</span>
      </div>
      
      {/* Side Navigation */}
      <aside className="fixed left-0 top-0 h-full flex flex-col pt-20 pb-8 px-4 bg-[#F5EFE0] w-64 border-r border-[#1A1208]/10 z-40 hidden md:flex">
        <div className="mb-12 px-4 cursor-pointer" onClick={() => navigate('/')}>
          <h2 className="font-headline font-black text-2xl text-[#1A1208] leading-none">Technical Studio</h2>
          <p className="font-headline italic text-sm opacity-60">AI Fashion Architecture</p>
        </div>
        <nav className="flex-1 space-y-2">
          {/* Pipeline */}
          <button onClick={() => navigate('/docs/training')} className="w-full flex items-center gap-3 text-[#1A1208] px-4 py-3 opacity-70 hover:bg-[#1A1208]/5 transition-transform hover:-rotate-1">
            <span className="material-symbols-outlined">account_tree</span>
            <span className="font-brutal text-xs font-bold uppercase tracking-wider">Pipeline</span>
          </button>
          {/* Engine */}
          <button onClick={() => navigate('/docs/recommendation')} className="w-full flex items-center gap-3 text-[#1A1208] px-4 py-3 opacity-70 hover:bg-[#1A1208]/5 transition-transform hover:-rotate-1">
            <span className="material-symbols-outlined">memory</span>
            <span className="font-brutal text-xs font-bold uppercase tracking-wider">Engine</span>
          </button>
          {/* Inference */}
          <button onClick={() => navigate('/docs/inference')} className="w-full flex items-center gap-3 text-[#1A1208] px-4 py-3 opacity-70 hover:bg-[#1A1208]/5 transition-transform hover:-rotate-1">
            <span className="material-symbols-outlined">psychology</span>
            <span className="font-brutal text-xs font-bold uppercase tracking-wider">Inference</span>
          </button>
          {/* Docs (Active) */}
          <button onClick={() => navigate('/docs/archive')} className="w-full flex items-center gap-3 bg-[#C84B2F] text-[#F5EFE0] rounded-sm px-4 py-3 rotate-1 translate-x-1 duration-200 shadow-xl">
            <span className="material-symbols-outlined">menu_book</span>
            <span className="font-brutal text-xs font-bold uppercase tracking-wider">Docs</span>
          </button>
        </nav>
        <div className="mt-auto px-4">
          <button onClick={() => navigate('/studio')} className="w-full py-4 bg-primary text-on-primary font-brutal text-[10px] font-black uppercase tracking-widest rounded-sm hover:scale-105 active:scale-95 transition-all">
            New Experiment
          </button>
        </div>
      </aside>
      
      {/* Main Content Canvas */}
      <main className="md:ml-64 relative z-10 p-6 md:p-12 lg:p-20">
        {/* Top Header Navigation */}
        <header className="fixed top-0 left-0 right-0 z-50 md:left-64 bg-[#F5EFE0]/90 backdrop-blur-md border-b border-[#1A1208]/10 flex justify-between items-center px-6 py-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <span className="text-2xl font-black uppercase tracking-widest text-[#1A1208] font-headline italic">WEAVE</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden lg:flex gap-8 items-center">
              <span className="font-headline italic text-[#C84B2F] font-bold cursor-pointer">Archive</span>
              <span className="font-headline italic text-[#1A1208]/60 cursor-pointer hover:text-[#C84B2F] transition-colors">Lab Notes</span>
              <span className="font-headline italic text-[#1A1208]/60 cursor-pointer hover:text-[#C84B2F] transition-colors">Schematics</span>
            </div>
            <div className="flex gap-4">
              <span className="material-symbols-outlined text-[#1A1208]/80 cursor-pointer hover:scale-110 transition-transform">settings</span>
              <span onClick={() => navigate('/dashboard')} className="material-symbols-outlined text-[#1A1208]/80 cursor-pointer hover:scale-110 transition-transform">account_circle</span>
            </div>
          </div>
        </header>

        <div className="mt-16">
          {/* Title Section */}
          <section className="max-w-5xl mb-20">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary mb-4">Volume 04 // Technical Documentation</p>
            <h1 className="font-headline text-7xl md:text-9xl font-black leading-tight tracking-tighter mb-8 italic">
              The Full <br/>
              <span className="text-on-surface-variant/40 not-italic">Stack.</span>
            </h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-end">
              <p className="font-body italic text-2xl leading-relaxed text-on-surface-variant">
                A meticulous breakdown of the neural threads and hardware sinews that animate the Weave ecosystem. This architecture bridges high-fashion aesthetic synthesis with brutalist computational efficiency.
              </p>
              <div className="h-px bg-on-surface/10 w-full mb-4"></div>
            </div>
          </section>

          {/* Bento Grid / Archive Section */}
          <section className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6 mb-32">
            {/* Feature Card 01 */}
            <div className="md:col-span-2 lg:col-span-3 bg-surface-container-low p-8 relative overflow-hidden flex flex-col justify-between min-h-[400px]">
              <div className="absolute top-0 right-0 w-32 h-32 hatch opacity-20"></div>
              <div className="bg-secondary-container text-on-secondary-container px-3 py-1 font-mono text-[10px] uppercase w-fit rotate-[-2deg] mb-8">System: Core</div>
              <h3 className="font-headline text-4xl font-bold italic mb-4">Neural Weaver Engine</h3>
              <p className="font-body italic text-lg opacity-80">Our proprietary orchestration layer managing multi-modal diffusion pipelines and semantic token steering.</p>
              <div className="mt-12 flex flex-wrap gap-2">
                <span className="border border-on-surface/10 px-4 py-2 font-mono text-xs uppercase">Latent-Space</span>
                <span className="border border-on-surface/10 px-4 py-2 font-mono text-xs uppercase">Diffusion-V4</span>
              </div>
            </div>
            {/* Technical Chip Grid */}
            <div className="md:col-span-2 lg:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-surface-container border border-on-surface/5 p-4 flex flex-col justify-between hover:border-primary/40 transition-colors group">
                <span className="font-mono text-[10px] text-primary/50">01</span>
                <span className="font-brutal text-xs font-black uppercase mt-4 group-hover:text-primary transition-colors">PyTorch</span>
              </div>
              <div className="bg-surface-container border border-on-surface/5 p-4 flex flex-col justify-between hover:rotate-1 transition-transform">
                <span className="font-mono text-[10px] text-primary/50">02</span>
                <span className="font-brutal text-xs font-black uppercase mt-4">CuPy</span>
              </div>
              <div className="bg-surface-container border border-on-surface/5 p-4 flex flex-col justify-between hover:shadow-xl transition-all">
                <span className="font-mono text-[10px] text-primary/50">03</span>
                <span className="font-brutal text-xs font-black uppercase mt-4">Modal</span>
              </div>
              <div className="bg-surface-container border border-on-surface/5 p-4 flex flex-col justify-between">
                <span className="font-mono text-[10px] text-primary/50">04</span>
                <span className="font-brutal text-xs font-black uppercase mt-4">Supabase</span>
              </div>
              <div className="bg-secondary-container p-4 flex flex-col justify-between rotate-[-1deg]">
                <span className="font-mono text-[10px] text-on-secondary-container/50">05</span>
                <span className="font-brutal text-xs font-black uppercase mt-4">SigLIP</span>
              </div>
              <div className="bg-surface-container border border-on-surface/5 p-4 flex flex-col justify-between">
                <span className="font-mono text-[10px] text-primary/50">06</span>
                <span className="font-brutal text-xs font-black uppercase mt-4">Real-ESRGAN</span>
              </div>
              <div className="bg-surface-container border border-on-surface/5 p-4 flex flex-col justify-between">
                <span className="font-mono text-[10px] text-primary/50">07</span>
                <span className="font-brutal text-xs font-black uppercase mt-4">SCHP</span>
              </div>
              <div className="bg-surface-container border border-on-surface/5 p-4 flex flex-col justify-between">
                <span className="font-mono text-[10px] text-primary/50">08</span>
                <span className="font-brutal text-xs font-black uppercase mt-4">CIHP</span>
              </div>
              <div className="bg-primary-container p-4 flex flex-col justify-between text-white hover:-translate-y-1 transition-transform">
                <span className="font-mono text-[10px] opacity-60">09</span>
                <span className="font-brutal text-xs font-black uppercase mt-4">FastAPI</span>
              </div>
              <div className="col-span-2 bg-surface-container-highest p-4 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="font-mono text-[10px] text-primary/50">10 // COMPUTE</span>
                  <span className="material-symbols-outlined text-sm">memory</span>
                </div>
                <span className="font-brutal text-sm font-black uppercase mt-4">NVIDIA RTX 3050</span>
              </div>
            </div>

            {/* Visual Anchor */}
            <div className="md:col-span-4 lg:col-span-6 mt-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2 h-[500px] relative">
                <img alt="abstract technical visualization" className="w-full h-full object-cover filter grayscale hover:grayscale-0 transition-all duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDihu4ietXh_WD3Ha44p42S__zKWV6NUKfRmWMfw7HqZUbCxSfKEvdE_sWvzcwqQLOydqjaKF2ucxqp_2gmhMGopr8LBT4aMdK98-a-bFePT3obRykkxPzHbJqWgVHXlIk6aEzoTqyXnLOsGV8vfyhw2CTLOG2t_raorxQdjPQd_elTDVFSo1nY-Wgle0vl6jLuYh0gBRdA6mPnpxZZmjHFvq8zsxQQvoNSfBW23b5i0Iy6DTnApEzMmDLLFdL0YaC9TsvR-0McqcCL"/>
                <div className="absolute bottom-6 left-6 bg-surface p-4 border border-on-surface/5 max-w-xs shadow-2xl rotate-1">
                  <p className="font-mono text-[10px] uppercase text-primary mb-2">Fig. A1 — Schema</p>
                  <p className="font-body italic text-sm">The convergence of tensor flow and creative intent captured in real-time inference monitoring.</p>
                </div>
              </div>
              <div className="flex flex-col justify-center space-y-12 px-6">
                <div>
                  <span className="font-mono text-xs uppercase text-primary font-bold">Inference latency</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="font-brutal text-6xl font-black italic">420</span>
                    <span className="font-mono text-sm uppercase">ms</span>
                  </div>
                  <p className="font-body italic opacity-60 mt-2">Average generation cycle per garment segment.</p>
                </div>
                <div>
                  <span className="font-mono text-xs uppercase text-primary font-bold">Training Set</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="font-brutal text-6xl font-black italic">8.2</span>
                    <span className="font-mono text-sm uppercase">M</span>
                  </div>
                  <p className="font-body italic opacity-60 mt-2">Curated high-fashion silhouettes and textile patterns.</p>
                </div>
                <div className="pt-8">
                  <button className="flex items-center gap-4 group">
                    <span className="w-12 h-12 bg-on-background rounded-full flex items-center justify-center text-surface group-hover:bg-primary transition-colors">
                      <span className="material-symbols-outlined">arrow_downward</span>
                    </span>
                    <span className="font-brutal text-xs font-black uppercase tracking-widest border-b-2 border-primary">Download Whitepaper</span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Editorial Footer */}
          <footer className="border-t border-on-surface/5 pt-20 pb-32 grid grid-cols-1 lg:grid-cols-3 gap-12 relative overflow-hidden">
            <div className="lg:col-span-1">
              <h4 className="font-headline text-2xl font-black italic mb-6">WEAVE Archive</h4>
              <p className="font-body italic opacity-70 mb-8 max-w-xs leading-relaxed">
                Every thread is documented. Every pixel is intentional. This is the ledger of the new aesthetic era.
              </p>
              <div className="flex gap-4">
                <span className="font-mono text-[10px] uppercase border border-on-surface/20 px-2 py-1">Est. 2024</span>
                <span className="font-mono text-[10px] uppercase border border-on-surface/20 px-2 py-1">Build v0.9.1</span>
              </div>
            </div>
            <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="space-y-4">
                <p className="font-brutal text-[10px] font-black uppercase">Infrastructure</p>
                <ul className="font-headline italic text-sm space-y-2 opacity-60">
                  <li><button className="hover:text-primary transition-colors">Cloud Orchestration</button></li>
                  <li><button className="hover:text-primary transition-colors">GPU Provisioning</button></li>
                  <li><button className="hover:text-primary transition-colors">Edge Delivery</button></li>
                </ul>
              </div>
              <div className="space-y-4">
                <p className="font-brutal text-[10px] font-black uppercase">Methodology</p>
                <ul className="font-headline italic text-sm space-y-2 opacity-60">
                  <li><button className="hover:text-primary transition-colors">Style Transfer</button></li>
                  <li><button className="hover:text-primary transition-colors">Segmentation</button></li>
                  <li><button className="hover:text-primary transition-colors">Super-Resolution</button></li>
                </ul>
              </div>
              <div className="space-y-4">
                <p className="font-brutal text-[10px] font-black uppercase">Privacy</p>
                <ul className="font-headline italic text-sm space-y-2 opacity-60">
                  <li><button className="hover:text-primary transition-colors">Data Ethics</button></li>
                  <li><button className="hover:text-primary transition-colors">Weights License</button></li>
                  <li><button className="hover:text-primary transition-colors">Terms of Lab</button></li>
                </ul>
              </div>
              <div className="flex flex-col justify-end items-end">
                <div className="bg-primary text-on-primary p-6 rotate-3 shadow-xl">
                  <span className="material-symbols-outlined text-4xl" style={{fontVariationSettings: "'FILL' 1"}}>verified</span>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </main>

      {/* Scrolling Marquee */}
      <div className="fixed bottom-0 left-0 right-0 bg-primary py-2 overflow-hidden z-50 pointer-events-none">
        <div className="flex whitespace-nowrap gap-12 animate-marquee-text">
          <div className="flex gap-12 items-center">
            <span className="font-mono text-[10px] uppercase font-bold text-on-primary tracking-widest">LIVE INFERENCE STATUS: NOMINAL</span>
            <span className="w-2 h-2 rounded-full bg-secondary-container"></span>
            <span className="font-mono text-[10px] uppercase font-bold text-on-primary tracking-widest">LATENT SPACE SYNCHRONIZED</span>
            <span className="w-2 h-2 rounded-full bg-secondary-container"></span>
            <span className="font-mono text-[10px] uppercase font-bold text-on-primary tracking-widest">ALL MODELS LOADED // VRAM: 85%</span>
            <span className="w-2 h-2 rounded-full bg-secondary-container"></span>
          </div>
          {/* Duplicate for infinite scroll */}
          <div className="flex gap-12 items-center">
            <span className="font-mono text-[10px] uppercase font-bold text-on-primary tracking-widest">LIVE INFERENCE STATUS: NOMINAL</span>
            <span className="w-2 h-2 rounded-full bg-secondary-container"></span>
            <span className="font-mono text-[10px] uppercase font-bold text-on-primary tracking-widest">LATENT SPACE SYNCHRONIZED</span>
            <span className="w-2 h-2 rounded-full bg-secondary-container"></span>
            <span className="font-mono text-[10px] uppercase font-bold text-on-primary tracking-widest">ALL MODELS LOADED // VRAM: 85%</span>
            <span className="w-2 h-2 rounded-full bg-secondary-container"></span>
          </div>
        </div>
      </div>
    </div>
  );
}

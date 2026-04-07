import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let mouseX = 0;
    let mouseY = 0;
    let currentX = 0;
    let currentY = 0;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5);
      mouseY = (e.clientY / window.innerHeight - 0.5);
    };

    const animate = () => {
      // Smooth Damping (Spring effect)
      currentX += (mouseX - currentX) * 0.08;
      currentY += (mouseY - currentY) * 0.08;

      const cards = document.querySelectorAll('.tilt-card') as NodeListOf<HTMLElement>;
      cards.forEach((card, index) => {
        const weight = (index + 1) * 35;
        const rotateX = currentY * 25;
        const rotateY = -currentX * 25;
        const moveX = currentX * weight;
        const moveY = currentY * weight;
        
        // Base tilt + Parallax + Breathing effect
        const breath = Math.sin(Date.now() / 2000 + index) * 5;
        
        card.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translate3d(${moveX}px, ${moveY + breath}px, ${index * 20}px)`;
        
        // Dynamic Sheen Effect
        const sheen = card.querySelector('.sheen') as HTMLElement;
        if (sheen) {
          sheen.style.transform = `translateX(${currentX * 100}%) translateY(${currentY * 100}%)`;
        }
      });

      requestAnimationFrame(animate);
    };

    const animationId = requestAnimationFrame(animate);
    window.addEventListener('mousemove', handleGlobalMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <>
      <div className="bg-paper text-ink font-fraunces selection:bg-rust selection:text-white overflow-x-hidden cursor-none min-h-screen relative">
        {/* Top Ticker Tape */}
        <div className="fixed top-0 left-0 w-full z-[60] flex items-center overflow-hidden bg-rust h-6">
          <div className="flex whitespace-nowrap animate-marquee items-center h-full">
            <span className="text-paper font-mono text-[10px] uppercase tracking-[0.2em] px-4">AI VIRTUAL TRY-ON ✦ COLOR SCIENCE ✦ RESUNET + AFWM + REAL-ESRGAN ✦ SIGLIP SEMANTIC SEARCH ✦ SCHP SKIN PARSING ✦</span>
            <span className="text-paper font-mono text-[10px] uppercase tracking-[0.2em] px-4">AI VIRTUAL TRY-ON ✦ COLOR SCIENCE ✦ RESUNET + AFWM + REAL-ESRGAN ✦ SIGLIP SEMANTIC SEARCH ✦ SCHP SKIN PARSING ✦</span>
          </div>
          <div className="flex whitespace-nowrap animate-marquee items-center h-full">
            <span className="text-paper font-mono text-[10px] uppercase tracking-[0.2em] px-4">AI VIRTUAL TRY-ON ✦ COLOR SCIENCE ✦ RESUNET + AFWM + REAL-ESRGAN ✦ SIGLIP SEMANTIC SEARCH ✦ SCHP SKIN PARSING ✦</span>
            <span className="text-paper font-mono text-[10px] uppercase tracking-[0.2em] px-4">AI VIRTUAL TRY-ON ✦ COLOR SCIENCE ✦ RESUNET + AFWM + REAL-ESRGAN ✦ SIGLIP SEMANTIC SEARCH ✦ SCHP SKIN PARSING ✦</span>
          </div>
        </div>

        {/* TopAppBar */}
        <header className="fixed top-[24px] left-0 w-full flex justify-between items-center px-8 h-16 bg-paper/90 dark:bg-ink/90 backdrop-blur-md mix-blend-multiply z-50 border-b border-ink/10">
          <div className="text-2xl font-black text-ink dark:text-paper font-unbounded tracking-tighter cursor-pointer" onClick={() => navigate('/')}>WEAVE</div>
          <nav className="hidden md:flex space-x-12">
            <button onClick={() => navigate('/studio')} className="text-rust font-bold underline decoration-wavy font-mono text-[10px] uppercase tracking-[0.2em]">STUDIO</button>
            <button onClick={() => navigate('/dashboard')} className="text-ink dark:text-paper opacity-80 hover:text-rust transition-colors duration-300 font-mono text-[10px] uppercase tracking-[0.2em]">CATALOGUE</button>
            <button onClick={() => navigate('/docs/training')} className="text-ink dark:text-paper opacity-80 hover:text-rust transition-colors duration-300 font-mono text-[10px] uppercase tracking-[0.2em]">ABOUT</button>
          </nav>
          {!user ? (
            <button onClick={() => navigate('/auth')} className="bg-ink text-paper px-6 py-2 text-[10px] font-unbounded font-black tracking-widest hover:bg-rust transition-colors active:scale-95">SIGN IN</button>
          ) : (
            <div className="relative" ref={dropdownRef}>
              <button onClick={() => setShowDropdown(!showDropdown)} className="flex items-center gap-2 group">
                <span className="material-symbols-outlined text-ink dark:text-paper group-hover:text-rust transition-colors" style={{ fontVariationSettings: "'FILL' 1" }}>account_circle</span>
                <span className="hidden sm:block font-mono text-[10px] uppercase tracking-widest text-ink dark:text-paper group-hover:text-rust transition-colors">Vault</span>
              </button>
              
              {showDropdown && (
                <div className="absolute right-0 mt-4 w-48 bg-paper border border-ink/10 shadow-2xl py-2 z-[100] flex flex-col rounded-sm animate-in fade-in slide-in-from-top-2">
                  <button onClick={() => navigate('/dashboard')} className="px-6 py-3 text-left font-unbounded text-[10px] font-black uppercase tracking-widest text-ink hover:bg-ink hover:text-paper transition-colors flex justify-between group-items items-center">
                    Dashboard <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </button>
                  <button onClick={async () => { await signOut(); setShowDropdown(false); }} className="px-6 py-3 text-left font-unbounded text-[10px] font-black uppercase tracking-widest text-rust hover:bg-rust hover:text-paper transition-colors flex justify-between group-items items-center border-t border-ink/5">
                    Log Out <span className="material-symbols-outlined text-[14px]">logout</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </header>

        {/* SideNavBar (Now with Semantic Hover Headings) */}
        <aside className="fixed left-0 top-16 h-[calc(100vh-64px)] w-20 hidden lg:flex flex-col items-center py-12 z-40 bg-transparent space-y-12">
          <div className="group relative cursor-pointer" onClick={() => navigate('/docs/training')}>
            <span className="material-symbols-outlined text-rust bg-rust/10 p-3 -rotate-2 scale-110">grid_view</span>
            <span className="absolute left-20 bg-ink text-paper px-3 py-1 font-unbounded text-[8px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl z-50">Archives</span>
          </div>
          <div className="group relative cursor-pointer" onClick={() => navigate('/studio')}>
            <span className="material-symbols-outlined text-ink opacity-40 group-hover:opacity-100 hover:rotate-2 transition-all">auto_fix_high</span>
            <span className="absolute left-20 bg-ink text-paper px-3 py-1 font-unbounded text-[8px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl z-50">Virtual Studio</span>
          </div>
          <div className="group relative cursor-pointer" onClick={() => navigate('/dashboard')}>
            <span className="material-symbols-outlined text-ink opacity-40 group-hover:opacity-100 hover:rotate-2 transition-all">shelves</span>
            <span className="absolute left-20 bg-ink text-paper px-3 py-1 font-unbounded text-[8px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl z-50">Vault</span>
          </div>
          <div className="group relative cursor-pointer">
            <span className="material-symbols-outlined text-ink opacity-40 group-hover:opacity-100 hover:rotate-2 transition-all">settings</span>
            <span className="absolute left-20 bg-ink text-paper px-3 py-1 font-unbounded text-[8px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl z-50">Prefs</span>
          </div>
        </aside>

        <main className="pt-24">
          {/* Hero Section */}
          <section className="min-h-screen flex flex-col lg:flex-row items-center px-8 lg:px-24 py-16 gap-12 overflow-hidden">
            <div className="w-full lg:w-1/2 flex flex-col space-y-8 z-10">
              <span className="text-rust font-unbounded text-xs font-black tracking-widest uppercase">The Digital Curator</span>
              <h1 className="text-7xl lg:text-9xl font-fraunces font-black leading-[0.9] tracking-tighter">
                  Wear it <br/>
                  <span className="text-rust italic font-light">before</span> <br/>
                  you buy.
              </h1>
              <p className="text-xl lg:text-2xl font-fraunces italic text-ink/70 max-w-lg">
                  A living mood board where fashion meets physics. Experiment with silhouettes using our proprietary neural rendering engine.
              </p>
              <div className="flex flex-wrap gap-6 pt-4">
                <button onClick={() => navigate('/studio')} className="group relative bg-rust text-paper px-8 py-4 font-unbounded font-black overflow-hidden transition-all duration-500">
                  <span className="relative z-10">ENTER STUDIO →</span>
                  <div className="absolute inset-0 bg-ink translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                </button>
                <button onClick={() => navigate('/docs/training')} className="px-8 py-4 font-mono text-sm border border-ink/10 hover:border-rust hover:text-rust transition-all">
                    SEE HOW IT WORKS
                </button>
              </div>
              
              <div className="grid grid-cols-3 gap-8 pt-12 border-t border-ink/5">
                <div>
                  <div className="font-unbounded font-black text-3xl">98%</div>
                  <div className="font-mono text-[10px] uppercase opacity-60 tracking-widest">Accuracy</div>
                </div>
                <div>
                  <div className="font-unbounded font-black text-3xl">400ms</div>
                  <div className="font-mono text-[10px] uppercase opacity-60 tracking-widest">Inference</div>
                </div>
                <div>
                  <div className="font-unbounded font-black text-3xl">4K</div>
                  <div className="font-mono text-[10px] uppercase opacity-60 tracking-widest">Resolution</div>
                </div>
              </div>
            </div>

            <div className="w-full lg:w-1/2 relative h-[600px] perspective-stage">
              {/* Parallax Background Elements */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-rust/10 rounded-full animate-pulse"></div>

              {/* Floating Visual Cards */}
              <div className="absolute top-1/4 left-1/4 w-64 h-80 shadow-2xl tilt-card z-20 transition-all duration-500 ease-out hover:z-50 group">
                <div className="absolute inset-0 bg-gradient-to-br from-[#E1D5F5] to-[#B8A2D1] p-4 flex flex-col blur-[1px] group-hover:blur-0 transition-all">
                  <div className="h-full bg-white/20 backdrop-blur-sm p-2 relative overflow-hidden">
                    <img src="/static/hero-lavender.jpg" alt="high fashion model in ethereal lilac draped silk dress" className="w-full h-full object-cover grayscale mix-blend-multiply opacity-80" />
                    <div className="sheen absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 pointer-events-none transition-transform duration-300"></div>
                  </div>
                  <div className="mt-2 font-mono text-[8px] flex justify-between opacity-60">
                    <span>#LAVENDER_DRAPE</span>
                    <span>RESUNET-V2</span>
                  </div>
                </div>
              </div>

              <div className="absolute top-1/3 right-1/4 w-72 h-96 shadow-2xl tilt-card z-30 transition-all duration-500 ease-out hover:z-50 group">
                <div className="absolute inset-0 bg-gradient-to-br from-[#D1E1F5] to-[#8EAFC5] p-4 flex flex-col blur-[1px] group-hover:blur-0 transition-all">
                  <div className="h-full bg-white/20 backdrop-blur-sm p-2 relative overflow-hidden">
                    <img src="/static/hero-blue-linen.jpg" alt="close up of textured blue linen fabric" className="w-full h-full object-cover" />
                    <div className="sheen absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 pointer-events-none transition-transform duration-300"></div>
                  </div>
                  <div className="absolute -top-4 -right-4 bg-secondary-container px-3 py-1 rotate-6 shadow-sm">
                    <span className="font-mono text-[10px] font-bold tracking-tighter">NEURAL_SYNC.bin</span>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-1/4 left-1/3 w-64 h-80 shadow-2xl tilt-card z-10 transition-all duration-500 ease-out hover:z-50 group">
                <div className="absolute inset-0 bg-gradient-to-br from-[#F5D5D1] to-[#C58E8E] p-4 flex flex-col blur-[1px] group-hover:blur-0 transition-all">
                  <div className="h-full bg-white/20 backdrop-blur-sm p-2 relative overflow-hidden">
                    <img src="/static/hero-terracotta.jpg" alt="vintage terracotta wool coat" className="w-full h-full object-cover" />
                    <div className="sheen absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 pointer-events-none transition-transform duration-300"></div>
                  </div>
                </div>
              </div>

              {/* Floating Badges */}
              <div className="absolute top-10 right-10 bg-rust text-paper p-6 rounded-full w-24 h-24 flex items-center justify-center text-center animate-spin-slow select-none cursor-pointer">
                <span className="font-unbounded text-[8px] font-black leading-tight uppercase">THE WEAVE <br/> PROTOCOL</span>
              </div>

              <div className="absolute bottom-20 right-0 bg-on-surface text-surface px-4 py-2 flex items-center gap-2 animate-float">
                <span className="material-symbols-outlined text-xs" style={{fontVariationSettings: '"FILL" 1'}}>auto_fix_high</span>
                <span className="font-mono text-[10px] tracking-widest uppercase">WEAVE POWERED</span>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section className="bg-ink text-paper py-32 relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
              <span className="text-[30vw] font-unbounded font-black">WEAVE</span>
            </div>
            
            <div className="container mx-auto px-8 relative z-10">
              <div className="max-w-3xl mb-24">
                <h2 className="text-5xl lg:text-7xl font-fraunces italic font-bold text-surface mb-6">Built on serious science.</h2>
                <p className="text-xl font-fraunces italic text-paper/60">We’ve replaced the guess-work of online shopping with high-fidelity neural networks that respect drape, lighting, and skin-tone accuracy.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                {/* Card 1 */}
                <div className="group flex flex-col space-y-6">
                  <div className="flex items-baseline justify-between border-b border-rust/30 pb-4">
                    <span className="font-mono text-rust text-sm">01</span>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-rust/60">Computer Vision</span>
                  </div>
                  <h3 className="text-2xl font-unbounded font-black tracking-tighter">Photo-Realistic Try-On</h3>
                  <p className="font-fraunces italic text-lg text-paper/70">AFWM optical flow warps garments to your exact body geometry. ResUnet generates the final composite. Real-ESRGAN upscales 4× for pixel-perfect detail.</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="bg-rust/10 text-rust/80 px-2 py-1 font-mono text-[9px] uppercase border border-rust/20">ResUnet</span>
                    <span className="bg-rust/10 text-rust/80 px-2 py-1 font-mono text-[9px] uppercase border border-rust/20">AFWM Flow</span>
                    <span className="bg-rust/10 text-rust/80 px-2 py-1 font-mono text-[9px] uppercase border border-rust/20">Real-ESRGAN</span>
                    <span className="bg-rust/10 text-rust/80 px-2 py-1 font-mono text-[9px] uppercase border border-rust/20">CuPy CUDA</span>
                  </div>
                </div>

                {/* Card 2 */}
                <div className="group flex flex-col space-y-6">
                  <div className="flex items-baseline justify-between border-b border-olive/30 pb-4">
                    <span className="font-mono text-olive text-sm">02</span>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-olive/60">Custom Training Pipeline</span>
                  </div>
                  <h3 className="text-2xl font-unbounded font-black tracking-tighter">3-Stage Distillation</h3>
                  <p className="font-fraunces italic text-lg text-paper/70">Trained a Parser-Based VITON (teacher) first. Then trained DM-VTON (student) using the teacher's warped outputs — dramatically reducing complexity.</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="bg-olive/10 text-olive/80 px-2 py-1 font-mono text-[9px] uppercase border border-olive/20">Parser-Based AFWM</span>
                    <span className="bg-olive/10 text-olive/80 px-2 py-1 font-mono text-[9px] uppercase border border-olive/20">StyleAFWM</span>
                    <span className="bg-olive/10 text-olive/80 px-2 py-1 font-mono text-[9px] uppercase border border-olive/20">ResUnetGenerator</span>
                    <span className="bg-olive/10 text-olive/80 px-2 py-1 font-mono text-[9px] uppercase border border-olive/20">VGG Loss</span>
                  </div>
                </div>

                {/* Card 3 */}
                <div className="group flex flex-col space-y-6">
                  <div className="flex items-baseline justify-between border-b border-sky-blue/30 pb-4">
                    <span className="font-mono text-sky-blue text-sm">03</span>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-sky-blue/60">Color AI</span>
                  </div>
                  <h3 className="text-2xl font-unbounded font-black tracking-tighter">Your Exact Palette</h3>
                  <p className="font-fraunces italic text-lg text-paper/70">SCHP extracts skin and hair masks. Median LAB values become your permanent color profile. Recommendations are built around your actual complexion.</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="bg-sky-blue/10 text-sky-blue/80 px-2 py-1 font-mono text-[9px] uppercase border border-sky-blue/20">SCHP ResNet101</span>
                    <span className="bg-sky-blue/10 text-sky-blue/80 px-2 py-1 font-mono text-[9px] uppercase border border-sky-blue/20">CIHP Dataset</span>
                    <span className="bg-sky-blue/10 text-sky-blue/80 px-2 py-1 font-mono text-[9px] uppercase border border-sky-blue/20">LAB Color Space</span>
                    <span className="bg-sky-blue/10 text-sky-blue/80 px-2 py-1 font-mono text-[9px] uppercase border border-sky-blue/20">Morphological Erosion</span>
                  </div>
                </div>

                {/* Card 4 */}
                <div className="group flex flex-col space-y-6">
                  <div className="flex items-baseline justify-between border-b border-marigold/30 pb-4">
                    <span className="font-mono text-marigold text-sm">04</span>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-marigold/60">Tri-Modal Recommendation</span>
                  </div>
                  <h3 className="text-2xl font-unbounded font-black tracking-tighter">Finds Your Style</h3>
                  <p className="font-fraunces italic text-lg text-paper/70">Three weighted signals: color compatibility (LAB distance), semantic content (SigLIP embeddings), and collaborative filtering. Weights auto-adjust.</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="bg-marigold/10 text-marigold/80 px-2 py-1 font-mono text-[9px] uppercase border border-marigold/20">SigLIP marqo-fashionSigLIP</span>
                    <span className="bg-marigold/10 text-marigold/80 px-2 py-1 font-mono text-[9px] uppercase border border-marigold/20">pgvector</span>
                    <span className="bg-marigold/10 text-marigold/80 px-2 py-1 font-mono text-[9px] uppercase border border-marigold/20">Collaborative Filtering</span>
                    <span className="bg-marigold/10 text-marigold/80 px-2 py-1 font-mono text-[9px] uppercase border border-marigold/20">KMeans LAB</span>
                  </div>
                </div>

              </div>
            </div>
          </section>

          {/* Mid-page Marquee */}
          <div className="bg-marigold py-6 border-y-2 border-ink overflow-hidden">
            <div className="flex whitespace-nowrap animate-marquee-reverse">
              <span className="text-ink font-fraunces text-[22px] font-bold italic px-8">Wear it before you buy ✦ Trained from scratch ✦ 4GB VRAM ✦ Your palette, your rules ✦ Student beats teacher ✦</span>
              <span className="text-ink font-fraunces text-[22px] font-bold italic px-8">Wear it before you buy ✦ Trained from scratch ✦ 4GB VRAM ✦ Your palette, your rules ✦ Student beats teacher ✦</span>
              <span className="text-ink font-fraunces text-[22px] font-bold italic px-8">Wear it before you buy ✦ Trained from scratch ✦ 4GB VRAM ✦ Your palette, your rules ✦ Student beats teacher ✦</span>
            </div>
          </div>

          {/* How It Works Section */}
          <section className="py-32 bg-paper px-8">
            <div className="container mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
                <div className="grid grid-cols-2 gap-4">
                  <div className="aspect-[4/5] bg-surface-container relative overflow-hidden group">
                    <img src="/static/step-1.jpg" alt="minimalist studio photography" className="w-full h-full object-cover grayscale opacity-50 group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-rust/10 mix-blend-multiply"></div>
                    <span className="absolute top-4 left-4 text-8xl font-unbounded font-black opacity-10">1</span>
                  </div>
                  <div className="aspect-[4/5] bg-surface-container relative overflow-hidden group translate-y-12">
                    <img src="/static/step-2.jpg" alt="designer clothes on a rack" className="w-full h-full object-cover grayscale opacity-50 group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-secondary/10 mix-blend-multiply"></div>
                    <span className="absolute top-4 left-4 text-8xl font-unbounded font-black opacity-10">2</span>
                  </div>
                  <div className="aspect-[4/5] bg-surface-container relative overflow-hidden group -translate-y-12">
                    <img src="/static/step-3.jpg" alt="neural network connections" className="w-full h-full object-cover grayscale opacity-50 group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-tertiary/10 mix-blend-multiply"></div>
                    <span className="absolute top-4 left-4 text-8xl font-unbounded font-black opacity-10">3</span>
                  </div>
                  <div className="aspect-[4/5] bg-surface-container relative overflow-hidden group">
                    <img src="/static/step-4.jpg" alt="stylish person walking" className="w-full h-full object-cover grayscale opacity-50 group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-ink/10 mix-blend-multiply"></div>
                    <span className="absolute top-4 left-4 text-8xl font-unbounded font-black opacity-10">4</span>
                  </div>
                </div>

                <div className="flex flex-col space-y-12">
                  <div className="space-y-4">
                    <h2 className="text-6xl font-fraunces font-black tracking-tighter">Simple <br/> <span className="italic text-rust">but effective.</span></h2>
                    <p className="text-xl font-fraunces italic opacity-70">Four steps between you and your new aesthetic.</p>
                  </div>
                  
                  <div className="space-y-8">
                    <div className="flex gap-6 items-start">
                      <span className="font-unbounded font-black text-xl text-rust">01.</span>
                      <div>
                        <h4 className="font-unbounded font-bold text-lg">Upload Your Canvas</h4>
                        <p className="font-fraunces italic text-ink/60">Take a quick snap or upload a photo. Our engine maps your body topography instantly.</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-6 items-start">
                      <span className="font-unbounded font-black text-xl text-rust">02.</span>
                      <div>
                        <h4 className="font-unbounded font-bold text-lg">Browse the Vault</h4>
                        <p className="font-fraunces italic text-ink/60">Choose from thousands of high-resolution digital garments from boutique partners.</p>
                      </div>
                    </div>

                    <div className="flex gap-6 items-start">
                      <span className="font-unbounded font-black text-xl text-rust">03.</span>
                      <div>
                        <h4 className="font-unbounded font-bold text-lg">Neural Render</h4>
                        <p className="font-fraunces italic text-ink/60">Wait 400ms while we calculate gravity, friction, and light bounce on the fabric.</p>
                      </div>
                    </div>

                    <div className="flex gap-6 items-start">
                      <span className="font-unbounded font-black text-xl text-rust">04.</span>
                      <div>
                        <h4 className="font-unbounded font-bold text-lg">Own the Look</h4>
                        <p className="font-fraunces italic text-ink/60">Love the silhouette? Buy with confidence knowing exactly how it falls on you.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Testimonials */}
          <section className="bg-ink py-24 overflow-hidden border-t-8 border-rust">
            <div className="flex space-x-12 px-8 overflow-x-auto pb-8 scrollbar-hide">
              <div className="min-w-[400px] bg-paper p-8 -rotate-2 shadow-xl">
                <p className="font-fraunces italic text-2xl mb-6">"Finally, an online fitting room that doesn't feel like a 2005 video game. The texture mapping is uncanny."</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-rust rounded-sm overflow-hidden">
                    <img src="/static/testimonial-1.jpg" alt="Elena V." className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="font-unbounded font-black text-xs">Elena V.</div>
                    <div className="font-mono text-[8px] uppercase tracking-widest">Creative Director, i-D</div>
                  </div>
                </div>
              </div>
              
              <div className="min-w-[400px] bg-paper p-8 rotate-1 shadow-xl">
                <p className="font-fraunces italic text-2xl mb-6">"WEAVE has reduced our return rate by 42%. It’s the single most important tool in our digital stack."</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-secondary rounded-sm overflow-hidden">
                    <img src="/static/testimonial-2.jpg" alt="CEO Portrait" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="font-unbounded font-black text-xs">Marcus Thorne</div>
                    <div className="font-mono text-[8px] uppercase tracking-widest">Founder, Atelier Modern</div>
                  </div>
                </div>
              </div>

              <div className="min-w-[400px] bg-paper p-8 -rotate-1 shadow-xl">
                <p className="font-fraunces italic text-2xl mb-6">"The color science is where WEAVE truly wins. It understands how silk reflects light differently than wool."</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-tertiary rounded-sm overflow-hidden">
                    <img src="/static/testimonial-3.jpg" alt="Sasha J." className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="font-unbounded font-black text-xs">Sasha J.</div>
                    <div className="font-mono text-[8px] uppercase tracking-widest">Digital Stylist</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section className="bg-rust py-32 px-8 text-center relative overflow-hidden">
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-paper/5 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-paper/5 rounded-full blur-3xl"></div>
            
            <div className="relative z-10 max-w-4xl mx-auto space-y-12">
              <h2 className="text-7xl lg:text-9xl font-fraunces font-black text-paper leading-none tracking-tighter">
                  Stop guessing. <br/>
                  <span className="italic opacity-80">Start wearing.</span>
              </h2>
              <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
                <button onClick={() => navigate('/dashboard')} className="bg-paper text-rust px-12 py-6 font-unbounded font-black text-xl hover:scale-105 hover:shadow-[10px_10px_0px_#1A1208] transition-all">
                    ENTER THE CATALOGUE
                </button>
                <p className="text-paper/80 font-fraunces italic text-xl">Join 50k+ curators exploring the future of style.</p>
              </div>
            </div>
          </section>
        </main>

        <footer className="bg-paper border-t border-ink/10 py-16 px-8 relative z-10">
          <div className="container mx-auto grid grid-cols-2 md:grid-cols-4 gap-12">
            <div className="col-span-2">
              <div className="text-4xl font-unbounded font-black tracking-tighter mb-6">WEAVE</div>
              <p className="font-fraunces italic text-xl max-w-sm opacity-60">A digital playground for physical garments. Powered by the intersection of fashion and neural architecture.</p>
            </div>
            <div className="flex flex-col space-y-4">
              <h5 className="font-mono text-[10px] uppercase font-bold tracking-widest opacity-40">System</h5>
              <button onClick={() => navigate('/studio')} className="font-unbounded text-xs font-black hover:text-rust transition-colors text-left uppercase">STUDIO</button>
              <button onClick={() => navigate('/docs/inference')} className="font-unbounded text-xs font-black hover:text-rust transition-colors text-left uppercase">PIPELINE</button>
              <button onClick={() => navigate('/docs/training')} className="font-unbounded text-xs font-black hover:text-rust transition-colors text-left uppercase">RESEARCH</button>
            </div>
            <div className="flex flex-col space-y-4">
              <h5 className="font-mono text-[10px] uppercase font-bold tracking-widest opacity-40">Network</h5>
              <a href="#" className="font-unbounded text-xs font-black hover:text-rust transition-colors">INSTAGRAM</a>
              <a href="#" className="font-unbounded text-xs font-black hover:text-rust transition-colors">TWITTER (X)</a>
              <a href="#" className="font-unbounded text-xs font-black hover:text-rust transition-colors">DISCORD</a>
            </div>
          </div>
          
          <div className="container mx-auto mt-24 pt-8 border-t border-ink/5 flex justify-between items-center">
            <span className="font-mono text-[10px] opacity-40">© 2024 WEAVE TECHNOLOGY GROUP. ALL RIGHTS RESERVED.</span>
            <span className="font-mono text-[10px] opacity-40">STABLE-FASHION-01-V4.2</span>
          </div>
        </footer>
      </div>
    </>
  );
}

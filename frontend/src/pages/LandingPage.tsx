import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const [showDropdown, setShowDropdown] = useState(false);
  const [activeStep, setActiveStep] = useState<string | null>(null);
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

      currentX += (mouseX - currentX) * 0.08;
      currentY += (mouseY - currentY) * 0.08;

      const cards = document.querySelectorAll('.tilt-card') as NodeListOf<HTMLElement>;
      cards.forEach((card, index) => {
        const weight = (index + 1) * 35;
        const rotateX = currentY * 25;
        const rotateY = -currentX * 25;
        const moveX = currentX * weight;
        const moveY = currentY * weight;

        const breath = Math.sin(Date.now() / 2000 + index) * 5;

        card.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translate3d(${moveX}px, ${moveY + breath}px, ${index * 20}px)`;

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
      <div className="bg-paper text-ink font-fraunces selection:bg-rust selection:text-white overflow-x-hidden min-h-screen relative">
        <section className="min-h-screen flex flex-col lg:flex-row items-center px-8 lg:px-24 py-16 gap-12 overflow-hidden">
            <div className="w-full lg:w-1/2 flex flex-col space-y-8 z-10">
              <span className="text-rust font-unbounded text-xs font-black tracking-widest uppercase">Virtual try-on and personalized style</span>
              <h1 className="text-7xl lg:text-9xl font-fraunces font-black leading-[0.9] tracking-tighter">
                  Wear it <br/>
                  <span className="text-rust italic font-light">before</span> <br/>
                  you buy.
              </h1>
              <p className="text-xl lg:text-2xl font-fraunces italic text-ink/70 max-w-lg">
                  Discover clothing recommendations and see how garments look on you with virtual try-on.
              </p>
              <div className="flex flex-wrap gap-6 pt-4">
                <button onClick={() => navigate('/studio')} className="group relative bg-rust text-paper px-8 py-4 font-unbounded font-black overflow-hidden transition-all duration-500">
                  <span className="relative z-10">TRY IT ON →</span>
                  <div className="absolute inset-0 bg-ink translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                </button>
                <button onClick={() => navigate('/docs/training')} className="px-8 py-4 font-mono text-sm border border-ink/10 hover:border-rust hover:text-rust transition-all">
                    SEE HOW IT WORKS
                </button>
              </div>

            </div>

            <div className="w-full lg:w-1/2 relative h-[600px] perspective-stage">

              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-rust/10 rounded-full animate-pulse"></div>

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

              <div className="absolute top-10 right-10 bg-rust text-paper p-6 rounded-full w-24 h-24 flex items-center justify-center text-center animate-spin-slow select-none cursor-pointer">
                <span className="font-unbounded text-[8px] font-black leading-tight uppercase">THE WEAVE <br/> PROTOCOL</span>
              </div>

              <div className="absolute bottom-20 right-0 bg-on-surface text-surface px-4 py-2 flex items-center gap-2 animate-float">
                <span className="material-symbols-outlined text-xs" style={{fontVariationSettings: '"FILL" 1'}}>auto_fix_high</span>
                <span className="font-mono text-[10px] tracking-widest uppercase">WEAVE POWERED</span>
              </div>
            </div>
          </section>

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

          <div className="bg-marigold py-6 border-y-2 border-ink overflow-hidden">
            <div className="flex whitespace-nowrap animate-marquee-reverse">
              <span className="text-ink font-fraunces text-[22px] font-bold italic px-8">Wear it before you buy ✦ Trained from scratch ✦ 4GB VRAM ✦ Your palette, your rules ✦ Student beats teacher ✦</span>
              <span className="text-ink font-fraunces text-[22px] font-bold italic px-8">Wear it before you buy ✦ Trained from scratch ✦ 4GB VRAM ✦ Your palette, your rules ✦ Student beats teacher ✦</span>
              <span className="text-ink font-fraunces text-[22px] font-bold italic px-8">Wear it before you buy ✦ Trained from scratch ✦ 4GB VRAM ✦ Your palette, your rules ✦ Student beats teacher ✦</span>
            </div>
          </div>

          <section className="py-32 bg-paper px-8">
            <div className="container mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
                <div className="grid grid-cols-2 gap-3 sm:gap-4" aria-label="The virtual try-on process">
                  {[
                    { number: '01', label: 'Your photo', description: 'A person standing for a full-length photo', position: 'left top' },
                    { number: '02', label: 'Your garment', description: 'Garments arranged on a clothing rail', position: 'right top' },
                    { number: '03', label: 'Your try-on', description: 'A person wearing a selected garment', position: 'left bottom' },
                    { number: '04', label: 'Your result', description: 'A virtual try-on result displayed on a phone', position: 'right bottom' },
                  ].map(step => (
                    <div key={step.number} data-active={activeStep === step.number} onPointerEnter={event => { if (event.pointerType === 'mouse') setActiveStep(step.number); }} onPointerLeave={() => setActiveStep(null)} className="tryon-step-card relative aspect-[4/5] overflow-hidden rounded-sm bg-surface-container border border-ink/10">
                      <div className="tryon-step-image absolute inset-0" role="img" aria-label={step.description} style={{ backgroundImage: "url('/static/tryon-steps-v2.png')", backgroundPosition: step.position }} />
                      <div className="tryon-step-accent absolute inset-0 pointer-events-none" aria-hidden="true" />
                      <div className="tryon-step-caption absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 via-ink/30 to-transparent pt-16 pb-4 px-4 sm:px-5">
                        <span className="block font-mono text-[9px] tracking-[0.2em] text-paper/75 mb-1">{step.number}</span>
                        <span className="font-unbounded text-[10px] sm:text-xs font-bold text-paper uppercase tracking-wider">{step.label}</span>
                      </div>
                    </div>
                  ))}
                  <p className="col-span-2 font-mono text-[9px] uppercase tracking-widest text-ink/50">Illustrative examples</p>
                </div>

                <div className="flex flex-col space-y-12">
                  <div className="space-y-4">
                    <h2 className="text-5xl sm:text-6xl font-fraunces font-black tracking-tighter">Your next look, <br/> <span className="italic text-rust">in four steps.</span></h2>
                    <p className="text-xl font-fraunces italic opacity-70">From your photo to a virtual try-on.</p>
                  </div>

                  <div className="space-y-8">
                    <div data-active={activeStep === '01'} onPointerEnter={event => { if (event.pointerType === 'mouse') setActiveStep('01'); }} onPointerLeave={() => setActiveStep(null)} className="tryon-step-detail flex gap-6 items-start">
                      <span className="font-unbounded font-black text-xl text-rust">01.</span>
                      <div>
                        <h4 className="font-unbounded font-bold text-lg">Upload your photo</h4>
                        <p className="font-fraunces italic text-ink/60">Choose a clear photo to use for your virtual try-on.</p>
                      </div>
                    </div>

                    <div data-active={activeStep === '02'} onPointerEnter={event => { if (event.pointerType === 'mouse') setActiveStep('02'); }} onPointerLeave={() => setActiveStep(null)} className="tryon-step-detail flex gap-6 items-start">
                      <span className="font-unbounded font-black text-xl text-rust">02.</span>
                      <div>
                        <h4 className="font-unbounded font-bold text-lg">Browse clothing</h4>
                        <p className="font-fraunces italic text-ink/60">Explore the catalogue and select a garment.</p>
                      </div>
                    </div>

                    <div data-active={activeStep === '03'} onPointerEnter={event => { if (event.pointerType === 'mouse') setActiveStep('03'); }} onPointerLeave={() => setActiveStep(null)} className="tryon-step-detail flex gap-6 items-start">
                      <span className="font-unbounded font-black text-xl text-rust">03.</span>
                      <div>
                        <h4 className="font-unbounded font-bold text-lg">Generate your try-on</h4>
                        <p className="font-fraunces italic text-ink/60">Generate an image of your selected garment on your photo.</p>
                      </div>
                    </div>

                    <div data-active={activeStep === '04'} onPointerEnter={event => { if (event.pointerType === 'mouse') setActiveStep('04'); }} onPointerLeave={() => setActiveStep(null)} className="tryon-step-detail flex gap-6 items-start">
                      <span className="font-unbounded font-black text-xl text-rust">04.</span>
                      <div>
                        <h4 className="font-unbounded font-bold text-lg">Save your result</h4>
                        <p className="font-fraunces italic text-ink/60">Download your try-on image to revisit it later.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

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
                    DISCOVER CLOTHING
                </button>
                <p className="text-paper/80 font-fraunces italic text-xl">Explore clothing recommendations tailored to you.</p>
              </div>
            </div>
          </section>

        <footer className="bg-paper border-t border-ink/10 py-16 px-8 relative z-10">
          <div className="container mx-auto grid grid-cols-2 md:grid-cols-4 gap-12">
            <div className="col-span-2">
              <div className="text-4xl font-unbounded font-black tracking-tighter mb-6">WEAVE</div>
              <p className="font-fraunces italic text-xl max-w-sm opacity-60">Discover clothing and explore virtual try-on with Weave.</p>
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

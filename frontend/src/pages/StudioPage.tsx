import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export default function StudioPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const clothId = searchParams.get('cloth_id');

  const [personImage, setPersonImage] = useState<File | null>(null);
  const [personImagePreview, setPersonImagePreview] = useState<string | null>(null);
  
  const [clothImage, setClothImage] = useState<File | null>(null);
  const [clothImageUrl, setClothImageUrl] = useState<string | null>(null);
  const [clothName, setClothName] = useState<string>("Vintage Oversized Blazer in 'Ecru'");

  const [loading, setLoading] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  
  const personInputRef = useRef<HTMLInputElement>(null);
  const clothInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Custom cursor
    const cursor = document.querySelector('.custom-cursor') as HTMLElement;
    if (cursor) {
      const moveHandler = (e: MouseEvent) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
      };
      document.addEventListener('mousemove', moveHandler);

      const enterHandler = () => {
        cursor.style.transform = 'translate(-50%, -50%) scale(2.5)';
        cursor.style.mixBlendMode = 'difference';
        cursor.style.backgroundColor = '#d4e899';
      };
      const leaveHandler = () => {
        cursor.style.transform = 'translate(-50%, -50%) scale(1)';
        cursor.style.mixBlendMode = 'normal';
        cursor.style.backgroundColor = '#a63319';
      };

      const bindHover = () => {
        document.querySelectorAll('a, button, [role="button"]').forEach(el => {
          el.addEventListener('mouseenter', enterHandler);
          el.addEventListener('mouseleave', leaveHandler);
        });
      };
      
      bindHover();
      // Observer to bind hover to dynamically added elements
      const observer = new MutationObserver(bindHover);
      observer.observe(document.body, { childList: true, subtree: true });

      return () => {
        document.removeEventListener('mousemove', moveHandler);
        observer.disconnect();
      };
    }
  }, []);

  // Protect Route based on DNA profile
  useEffect(() => {
    if (user?.id) {
      const verifyDNA = async () => {
        const { data, error } = await supabase.from('profiles').select('skin_lab, hair_lab').eq('user_id', user.id).single();
        if (error || !data || !data.skin_lab || !data.hair_lab) {
          navigate('/onboarding-dna');
        }
      };
      verifyDNA();
    }
  }, [user?.id, navigate]);

  // Fetch garment if cloth_id is passed
  useEffect(() => {
    if (clothId) {
      supabase.from('fashion_items').select('*').eq('id', clothId).single().then(({ data }) => {
        if (data) {
          setClothImageUrl(data.image_url);
          setClothName(data.name || 'Selected Garment');
        }
      });
    } else {
      setClothImageUrl("https://lh3.googleusercontent.com/aida-public/AB6AXuClGNMsNbVqgb8cTb1kCavaYa1bpRdPFrPPuIqqrhnZbFWRvd-E-obsie2DnqzrVtxUqZ01iDWS4YQ72-8Dl-hR4ImWmzHl0u6Jez7YA5FuCa4pbBZIWfpE_mP01batEcfjGWZEiBeGLoLWFYdG_liJurnoZMDrpWMvhUrTj9DG_mJjv3F8OvWFW-OgBMvTmR3NN0yIBoBulUXzig7Vz_VP3GxrIB01MumYESJQJYsVotlQtQ_1e2a-KJWFe-tb_nrV6XbBaU_yN4Rx");
    }
  }, [clothId]);

  const handlePersonDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handlePersonFile(e.dataTransfer.files[0]);
  };
  
  const handlePersonFile = (file?: File) => {
    if (file) {
      setPersonImage(file);
      setPersonImagePreview(URL.createObjectURL(file));
    }
  };

  const handleClothFile = (file?: File) => {
    if (file) {
      setClothImage(file);
      setClothImageUrl(URL.createObjectURL(file));
      setClothName(file.name);
    }
  };

  // Auto-generate when both references are ready
  // If `clothImageUrl` is a URL (from Supabase/hardcoded), we technically need a File for the backend.
  // We'll provide a 'generate' button if auto-generation is tricky, but let's just make the "Drop your image" double as the trigger.
  const triggerTryOn = async () => {
    if (!personImage) return alert('Please upload your photo first.');
    setLoading(true);
    setResultImage(null);
    try {
      const formData = new FormData();
      // Match backend names exactly
      formData.append('img', personImage);
      
      // If we have a clothId from the URL, use it directly
      if (clothId) {
        formData.append('cloth_id', clothId);
      } else if (clothImage) {
         formData.append('cloth_id', clothName); 
      } else {
        formData.append('cloth_id', 'default_garment');
      }

      // 0. Inject User ID for automated Skin/Hair Profile update
      if (user?.id) {
        formData.append('user_id', user.id);
      }

      const res = await fetch(`${API_BASE}/tryon`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Failed to generate try-on');
      const blob = await res.blob();
      setResultImage(URL.createObjectURL(blob));
    } catch (err) {
      console.error(err);
      alert('Generation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background text-on-surface selection:bg-primary selection:text-white cursor-none min-h-screen">
      <div className="grain-overlay" style={{pointerEvents: 'none', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 100, opacity: 0.04, backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")'}}></div>
      <div className="custom-cursor hidden md:block" style={{width: '12px', height: '12px', background: '#a63319', borderRadius: '50%', position: 'fixed', pointerEvents: 'none', zIndex: 9999, transform: 'translate(-50%, -50%)', transition: 'all 0.15s ease-out'}}></div>
      
      <header className="fixed top-0 left-0 w-full z-[60] flex items-center overflow-hidden bg-[#C84B2F] h-6">
        <div className="flex whitespace-nowrap" style={{animation: 'marquee 30s linear infinite'}}>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#F5EFE0] px-4">AI VIRTUAL TRY-ON ✦ COLOR SCIENCE ✦ RESUNET + AFWM + REAL-ESRGAN ✦ SIGLIP SEMANTIC SEARCH ✦ SCHP SKIN PARSING ✦</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#F5EFE0] px-4">AI VIRTUAL TRY-ON ✦ COLOR SCIENCE ✦ RESUNET + AFWM + REAL-ESRGAN ✦ SIGLIP SEMANTIC SEARCH ✦ SCHP SKIN PARSING ✦</span>
        </div>
      </header>

      <nav className="fixed top-[24px] left-0 w-full flex justify-between items-center px-8 h-16 bg-[#F5EFE0]/90 backdrop-blur-md mix-blend-multiply border-b border-[#1A1208]/10 z-50">
        <div className="text-2xl font-black text-[#1A1208] font-unbounded tracking-tighter cursor-pointer" onClick={() => navigate('/')}>WEAVE</div>
        <div className="flex gap-12">
          <button className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#C84B2F] font-bold underline decoration-wavy transition-colors duration-300">STUDIO</button>
          <button onClick={() => navigate('/dashboard')} className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#1A1208] opacity-80 hover:text-[#C84B2F] transition-colors duration-300">CATALOGUE</button>
          <button onClick={() => navigate('/docs/archive')} className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#1A1208] opacity-80 hover:text-[#C84B2F] transition-colors duration-300">ABOUT</button>
        </div>
        <button className="bg-[#a63319] text-[#ffffff] px-6 py-2 font-unbounded text-[10px] tracking-widest rounded-sm active:scale-95 transition-transform">SIGN IN</button>
      </nav>

      <aside className="fixed left-0 top-16 h-[calc(100vh-64px)] w-20 flex flex-col items-center py-8 z-40 bg-transparent shadow-[20px_0_30px_rgba(26,18,8,0.06)] hidden md:flex">
        <div className="flex flex-col gap-10 items-center w-full">
          <div className="flex flex-col items-center gap-2 cursor-pointer group scale-105 -rotate-2 bg-[#C84B2F] p-3 text-[#F5EFE0]">
            <span className="material-symbols-outlined text-2xl">auto_fix_high</span>
            <span className="font-mono text-[8px] uppercase tracking-tighter">Studio</span>
          </div>
          <div onClick={() => navigate('/')} className="flex flex-col items-center gap-2 cursor-pointer group text-[#1A1208] hover:rotate-1 hover:bg-[#F5EFE0] p-3 transition-all">
            <span className="material-symbols-outlined text-2xl">grid_view</span>
            <span className="font-mono text-[8px] uppercase tracking-tighter">Home</span>
          </div>
          <div onClick={() => navigate('/dashboard')} className="flex flex-col items-center gap-2 cursor-pointer group text-[#1A1208] hover:rotate-1 hover:bg-[#F5EFE0] p-3 transition-all">
            <span className="material-symbols-outlined text-2xl">shelves</span>
            <span className="font-mono text-[8px] uppercase tracking-tighter">Vault</span>
          </div>
          <div className="flex flex-col items-center gap-2 cursor-pointer group text-[#1A1208] hover:rotate-1 hover:bg-[#F5EFE0] p-3 transition-all">
            <span className="material-symbols-outlined text-2xl">settings</span>
            <span className="font-mono text-[8px] uppercase tracking-tighter">Settings</span>
          </div>
        </div>
      </aside>

      <main className="pt-32 pb-20 px-8 md:pl-32 max-w-7xl mx-auto">
        <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <h1 className="font-fraunces text-6xl md:text-8xl font-black tracking-tighter text-[#1A1208]">
                Try-On <span className="text-primary italic font-light">Studio</span>
            </h1>
            <p className="font-fraunces italic text-lg text-on-surface-variant mt-4 max-w-md">
                Synthesizing textiles and silhouette through generative color science. 
            </p>
          </div>
          <div className="flex gap-2 bg-surface-container-high p-1 rounded-sm border border-outline-variant/20">
            <button className="px-6 py-2 font-unbounded text-[10px] bg-primary text-white rounded-sm">PHOTO MODE</button>
            <div className="relative">
              <button className="px-6 py-2 font-unbounded text-[10px] text-on-surface-variant opacity-50 cursor-not-allowed">REAL-TIME</button>
              <span className="absolute -top-3 -right-2 bg-tertiary-fixed text-on-tertiary-fixed font-mono text-[8px] px-2 py-0.5 rotate-6 shadow-sm border border-tertiary/20">COMING SOON</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-unbounded font-black text-xs tracking-widest text-[#1A1208] uppercase">01 / Your Photo</h2>
              <span className="font-mono text-[10px] opacity-40">INPUT_BUFFER_RAW</span>
            </div>
            
            <div 
              onDragOver={e => e.preventDefault()} 
              onDrop={handlePersonDrop}
              onClick={() => personInputRef.current?.click()}
              className="relative aspect-[3/4] bg-surface-container-low flex flex-col items-center justify-center p-8 border-2 border-dashed border-outline-variant hover:border-primary transition-colors cursor-pointer group"
            >
              <div className="absolute inset-0 opacity-5 pointer-events-none" style={{backgroundImage: "url('https://www.transparenttextures.com/patterns/pinstriped-suit.png')"}}></div>
              
              {personImagePreview ? (
                <img src={personImagePreview} alt="Person" className="absolute inset-0 w-full h-full object-cover p-2" />
              ) : (
                <div className="text-center space-y-4 relative z-10">
                  <div className="w-32 h-32 mx-auto mb-6 flex items-center justify-center opacity-20 group-hover:opacity-40 transition-opacity">
                    <svg className="w-full h-full fill-current text-on-surface" viewBox="0 0 100 100">
                      <path d="M50 10c-11 0-20 9-20 20s9 20 20 20 20-9 20-20-9-20-20-20zm0 45c-16.6 0-30 13.4-30 30v5h60v-5c0-16.6-13.4-30-30-30z"></path>
                    </svg>
                  </div>
                  <h3 className="font-fraunces font-bold text-2xl italic">Drop your image here</h3>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant max-w-[200px] mx-auto leading-relaxed">
                      JPEG, PNG or RAW. High resolution portrait works best.
                  </p>
                  <div className="pt-4">
                    <span className="bg-primary text-white font-unbounded text-[10px] px-8 py-3 rounded-sm group-hover:scale-105 transition-transform inline-block">UPLOAD FILE</span>
                  </div>
                </div>
              )}
              <div className="absolute top-4 left-4 font-mono text-[8px] text-primary opacity-60 z-20">GUIDE_LAYER_V02</div>
              <input type="file" ref={personInputRef} className="hidden" accept="image/*" onChange={e => handlePersonFile(e.target.files?.[0])} />
            </div>
            
            <div className="bg-surface-container-highest p-6 relative -rotate-1 shadow-sm">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-24 h-8 bg-secondary-container/60 -rotate-2 mix-blend-multiply flex items-center justify-center font-mono text-[8px] tracking-[0.2em] text-on-secondary-container">TAPE_SECURE</div>
              <div className="flex gap-4 items-center">
                <div className="w-16 h-16 bg-surface-variant overflow-hidden rounded-sm flex-shrink-0 grayscale">
                  <img alt="Garment Preview" className="w-full h-full object-cover" src={clothImageUrl || ''} />
                </div>
                <div className="flex-grow">
                  <div className="text-[10px] font-unbounded font-black">SELECTED GARMENT</div>
                  <div className="font-fraunces italic text-lg leading-tight">{clothName}</div>
                </div>
                <button onClick={() => clothInputRef.current?.click()} className="font-mono text-[10px] border-b border-on-surface/20 hover:text-primary transition-colors">CHANGE</button>
                <input type="file" ref={clothInputRef} className="hidden" accept="image/*" onChange={e => handleClothFile(e.target.files?.[0])} />
              </div>
            </div>

            <button onClick={triggerTryOn} className="w-full bg-on-background text-surface py-4 font-unbounded font-black text-xs tracking-widest hover:bg-primary transition-colors">
              GENERATE NEURAL RENDER
            </button>
          </section>

          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-unbounded font-black text-xs tracking-widest text-[#1A1208] uppercase">02 / Try-On Result</h2>
              <span className="font-mono text-[10px] opacity-40">RENDER_OUTPUT_FINAL</span>
            </div>
            
            <div className="relative aspect-[3/4] bg-surface-container-low overflow-hidden flex flex-col items-center justify-center p-4 border border-outline-variant/50">
              {loading ? (
                <>
                  <div className="absolute inset-0 opacity-20" style={{background: 'linear-gradient(90deg, #f3edde 25%, #e8e2d3 50%, #f3edde 75%)', backgroundSize: '200% 100%', animation: 'shimmer 2s infinite linear'}}></div>
                  <div className="relative z-10 text-center space-y-6">
                    <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                      <div className="absolute inset-0 border-2 border-primary border-dotted rounded-full animate-[spin_10s_linear_infinite]"></div>
                      <span className="material-symbols-outlined text-primary text-4xl animate-pulse">model_training</span>
                    </div>
                    <div className="space-y-2">
                      <p className="font-fraunces italic text-xl">Generating your look...</p>
                      <p className="font-mono text-[10px] text-on-surface-variant max-w-[200px] mx-auto opacity-60">
                          Processing textures and light mapping via ResUnet...
                      </p>
                    </div>
                    <div className="w-48 h-1 bg-surface-variant mx-auto overflow-hidden">
                      <div className="h-full bg-primary w-2/3"></div>
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                    <div className="font-mono text-[8px] leading-tight text-on-surface-variant">
                        EST_TIME: 1.2s<br/>
                        DEVICE: GPU_ACCELERATED
                    </div>
                  </div>
                </>
              ) : resultImage ? (
                <img src={resultImage} alt="Tryon Result" className="w-full h-full object-cover" />
              ) : (
                <div className="text-on-surface-variant opacity-40 font-mono text-[10px] uppercase tracking-widest">
                  AWAITING RENDERING ENGINE
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <button disabled={!resultImage} className="flex-1 border border-outline-variant py-4 font-unbounded text-[10px] tracking-widest hover:bg-surface-variant transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                <span className="material-symbols-outlined text-sm">download</span> DOWNLOAD
              </button>
              <button disabled={!resultImage} className="flex-1 border border-outline-variant py-4 font-unbounded text-[10px] tracking-widest hover:bg-surface-variant transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                <span className="material-symbols-outlined text-sm">share</span> SHARE
              </button>
            </div>
          </section>
        </div>

        <section className="mt-32 border-t border-outline-variant/30 pt-12">
          <h3 className="font-unbounded font-black text-lg mb-8">Recent Generations</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="space-y-3 group cursor-pointer rotate-1">
              <div className="aspect-[4/5] bg-surface-container overflow-hidden rounded-sm grayscale group-hover:grayscale-0 transition-all duration-500">
                <img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBmkaERvbCqvrNQJnVwZn7-HugTkniG8SnGqshvsI8xFFBWXNN8SvoJBMJAwhNLtRWfvbFYagKnNBZPeztl0LRmCR6MwEA-5a6dnLJdxKmnYJYc8fAllevWjLhzuuhfMSkT8XRRQ3_DXOoNAiIxFrnfdu-Y41DyRwBn82qterpDKr73b3oFAymzAioaWKMoyn1r_2PPXghDxErXDbwRzwXjZAiEbSY9ZZiDm9jtXGBKDvpNx6F8WHSwFILLgaaLSdD2zt9Av7SPZn2Y" alt="Editorial fashion photography of a woman in a vibrant yellow dress" />
              </div>
              <div className="font-mono text-[8px] opacity-40 uppercase">01 APR / SILK_DRESS</div>
            </div>
            <div className="space-y-3 group cursor-pointer -rotate-2">
              <div className="aspect-[4/5] bg-surface-container overflow-hidden rounded-sm grayscale group-hover:grayscale-0 transition-all duration-500">
                <img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBXBov5AGXAcQYlwNlm7hmSQ5N3m-U9MNA3Wl9nqMAxZTTws4AISDn3QKTlc604Wi3SfDeCofbiaK-DfDhJVE4kPf-W4UNT1VPetSdEcl1ERGu1s5iaFRKl9585Dd0XEO70E627OT-ZiBp5CKjsWg6x1J7QoEVYNJOO6LUOjUVn5AqmtmjaiTo3ugTyxmOD2GGT84e5BZvBNce5AVjcFS4ovDAktLOAP3g6YhBNy972chVfaXsG7Go_re1GGe0HidFWS-y3fen7SBeh" alt="High-fashion model posing in an oversized denim jacket" />
              </div>
              <div className="font-mono text-[8px] opacity-40 uppercase">28 MAR / DENIM_JACKET</div>
            </div>
            <div className="space-y-3 group cursor-pointer rotate-2">
              <div className="aspect-[4/5] bg-surface-container overflow-hidden rounded-sm grayscale group-hover:grayscale-0 transition-all duration-500">
                <img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBV9KiMI3aiCQjgd58jJC2YJeE4Jd9goPi3BpQFpZ1r0Fw7N3sSvfw8py4KN5X8p0ejAuXEBbVUw63iEWEkmlmDFscNoDZTBO6ZfnFuSoTDzfOIGS_pVTYG-72w-Faq3j4cRxHoVrJWAyQ4Py6KcfqxNTISNk2l6rgnHFr8poj59VYCjLY6zBrKbKw14PGcRKEoAy8ug20SgrjLHX9voaAEI5T-6zyhkvR6NB7fwymVLHI3SYZPA1ZrTZ_30q0xUvOPVFkefLYUScRt" alt="Portrait of a young person in a luxury knit sweater" />
              </div>
              <div className="font-mono text-[8px] opacity-40 uppercase">24 MAR / KNIT_WEAR</div>
            </div>
            <div className="space-y-3 group cursor-pointer -rotate-1">
              <div className="aspect-[4/5] bg-surface-container overflow-hidden rounded-sm grayscale group-hover:grayscale-0 transition-all duration-500">
                <img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCdQlLeyOTvLVlugmDYMczXQ73QfRiEyWoxtp4G_RY_dEJmc7Kig2b1541UdH4xNQHHJzAY8tgoVc8yri6bM-L5_J7ilzwDZLtUmThWvvLg0I6v-H4imhxBDqJA_4nON6uHWU_UpBVJSVtIPV9AKHZksyWBCR0_ERSkxpkoN7LJ37Pss285cA9sIcn0L3nhSd2gG08FycOza8BgFEC8_szYVzTV2W-kE9pMWE1pIR_Hd66bZWiuwhiuD-THssnD4MjvQkUiPvY81dkM" alt="Close-up of a man in a structured minimalist coat" />
              </div>
              <div className="font-mono text-[8px] opacity-40 uppercase">19 MAR / COAT_STRUCT</div>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-20 py-12 px-8 border-t border-outline-variant/20 md:ml-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="font-unbounded font-black text-xl">WEAVE</div>
          <div className="font-mono text-[10px] tracking-widest flex gap-8">
            <button className="hover:text-primary transition-colors">PRIVACY</button>
            <button className="hover:text-primary transition-colors">TERMS</button>
            <button className="hover:text-primary transition-colors">API_DOCS</button>
            <button className="hover:text-primary transition-colors">CONTACT</button>
          </div>
          <div className="font-fraunces italic text-sm opacity-60">
              © 2024 Weave Virtual Studio. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

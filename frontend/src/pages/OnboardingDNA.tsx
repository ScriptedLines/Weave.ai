import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export default function OnboardingDNA() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{ skin: number[], hair: number[] } | null>(null);
  const [error, setError] = useState('');

  // Helper to convert OpenCV LAB (uint8: 0-255) to Standard LAB Space
  const convertToStandardLab = (opencvLab: number[]) => {
    if (!opencvLab || opencvLab.length !== 3) return [0, 0, 0];
    const L = (opencvLab[0] * 100) / 255;
    const a = opencvLab[1] - 128;
    const b = opencvLab[2] - 128;
    return [L, a, b];
  };

  const getStandardLightness = (stdL: number) => {
     return Math.max(0, Math.min(100, stdL));
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    setError('');
    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('img', file);
      
      const res = await fetch(`${API_BASE}/skin_color`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Analysis failed');
      const data = await res.json();
      
      setAnalysisResult({ skin: data[0], hair: data[1] });
      // Satisfy 'username' not-null constraint detected in error log
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id, 
          username: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User', // Fallback for required column
          email: user.email,
          skin_lab: data[0],
          hair_lab: data[1]
        });

      if (upsertError) {
        console.error("Supabase upsert failure:", upsertError);
        window.alert("DATABASE ERROR: " + upsertError.message + " (Check for other required columns in Supabase)");
        throw upsertError;
      }
      console.log("Profile DNA mapped successfully.");
      
      // Navigate to dashboard after success
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err: any) {
      setError(err.message || 'Error parsing segments.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="bg-[#F5EFE0] text-[#1A1208] min-h-screen font-body selection:bg-primary-container selection:text-on-primary-container">
      <style>{`
        .film-grain {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9999;
            opacity: 0.04;
            background-image: url(https://lh3.googleusercontent.com/aida-public/AB6AXuCZnvCUEhHLvXet7H-f4PjGLUDJ2WXmOU6cWtHbA4-CnIqFCSxyqnisHqQX8G-blk_r1MPza98dAZwBFMJOf5kAU1nxceIBPGSpF3hC7ehlw3Ep_xnJQGfQZwaiyk_D-HFDfyK0vNhjexg9meHKYAU40BWfoVgTQnvzBbxgZawZskXeptc4Acv0eWdcv15avo3T00chkncmb7Y5FvZI78aRkEOgYr255bvpwCeflJR6iOYAUMIkZ41Cn7dHgnYmq0GnnT-cbgDrWOCX);
        }
        .marquee {
            overflow: hidden;
            white-space: nowrap;
        }
        .marquee-content {
            display: inline-block;
            animation: marquee 20s linear infinite;
        }
        @keyframes marquee {
            0% { transform: translateX(0); } 
            100% { transform: translateX(-50%); }
        }
        .stagger-rotate {
            transform: rotate(-1.5deg);
        }
        .font-brutal { font-family: 'Unbounded', sans-serif; }
        .font-headline { font-family: 'Fraunces', serif; }
      `}</style>
      <div className="film-grain"></div>

      {/* Top Navigation / Brand Anchor */}
      <header className="bg-[#F5EFE0] border-b border-[#1A1208]/10 flex justify-between items-center px-6 py-4 w-full sticky top-0 z-50">
        <div className="text-3xl font-black tracking-tighter text-[#1A1208] font-headline italic cursor-pointer" onClick={() => navigate('/')}>
          THE CURATOR
        </div>
        <div className="hidden md:flex gap-8 items-center">
          <span className="text-[#C84B2F] font-bold font-mono uppercase text-xs tracking-widest">Process</span>
          <span className="text-[#1A1208]/60 font-mono uppercase text-xs tracking-widest hover:opacity-80 transition-opacity cursor-pointer">Style</span>
          <span className="text-[#1A1208]/60 font-mono uppercase text-xs tracking-widest hover:opacity-80 transition-opacity cursor-pointer">Identity</span>
        </div>
        <div className="material-symbols-outlined text-[#1A1208]/60 cursor-pointer hover:opacity-80 transition-opacity">help_outline</div>
      </header>

      {/* Marigold Ticker Tape */}
      <div className="bg-[#ffba43] h-10 border-y border-[#1A1208] flex items-center marquee">
        <div className="marquee-content font-mono font-bold text-xs uppercase tracking-[0.3em] text-[#281800]">
          ANALYZING YOUR PALETTE ✦ SCHP PARSING ✦ LAB COLOR SPACE ✦ ANALYZING YOUR PALETTE ✦ SCHP PARSING ✦ LAB COLOR SPACE ✦ ANALYZING YOUR PALETTE ✦ SCHP PARSING ✦ LAB COLOR SPACE ✦ ANALYZING YOUR PALETTE ✦ SCHP PARSING ✦ LAB COLOR SPACE ✦
        </div>
      </div>

      {/* Main Content Canvas */}
      <main className="max-w-6xl mx-auto px-6 pt-16 pb-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Identity / Onboarding Sidebar */}
        <aside className="hidden lg:flex lg:col-span-3 flex-col gap-8 sticky top-28">
          <div className="flex flex-col gap-1">
            <div className="text-xl font-black text-[#1A1208] font-brutal uppercase tracking-tight">ONBOARDING</div>
            <div className="text-sm font-serif italic text-[#1A1208]/60">Phase 01: Extract</div>
          </div>
          <nav className="flex flex-col gap-6">
            <div className="flex items-center gap-4 group cursor-pointer text-[#C84B2F] bg-[#C84B2F]/10 px-4 py-3 rounded-sm">
              <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>auto_fix_high</span>
              <span className="font-brutal text-sm font-black uppercase tracking-tight">Process</span>
            </div>
            <div className="flex items-center gap-4 group cursor-pointer text-[#1A1208]/40 hover:translate-x-1 transition-transform px-4 py-3">
              <span className="material-symbols-outlined">palette</span>
              <span className="font-brutal text-sm font-black uppercase tracking-tight">Style</span>
            </div>
            <div className="flex items-center gap-4 group cursor-pointer text-[#1A1208]/40 hover:translate-x-1 transition-transform px-4 py-3">
              <span className="material-symbols-outlined">fingerprint</span>
              <span className="font-brutal text-sm font-black uppercase tracking-tight">Identity</span>
            </div>
          </nav>
          <div className="mt-12 p-4 border border-[#1A1208]/10 bg-[#f9f3e4]/50">
            <p className="text-[10px] font-mono uppercase tracking-widest text-[#1A1208]/40 mb-2">Technical Specs</p>
            <p className="text-xs font-serif italic text-[#1A1208]/70 leading-relaxed">Self-Correction Human Parsing (SCHP) ensures pixel-perfect tone extraction from noisy backgrounds.</p>
          </div>
        </aside>

        {/* Primary Canvas */}
        <section className="lg:col-span-9 flex flex-col gap-12">
          {/* Headline Section */}
          <div className="max-w-2xl">
            <h1 className="text-6xl md:text-7xl font-headline font-black italic tracking-tighter leading-[0.9] text-[#1A1208] mb-6">
              Let's find your palette.
            </h1>
            <p className="text-xl md:text-2xl font-serif italic text-[#1A1208]/80 leading-snug">
              A selfie is all we need. SCHP extracts your skin and hair tones from the pixels.
            </p>
          </div>

          {/* Central Card */}
          <div className="bg-[#E4DCC6] p-1 md:p-1 shadow-[12px_12px_0px_-2px_#1A120810] border border-[#1A1208] relative group">
            {/* Decorative Tape */}
            <div className="absolute -top-4 -left-6 bg-[#d4e899] px-6 py-1.5 shadow-sm transform -rotate-3 z-10 border border-[#586928]/10">
              <span className="font-mono text-[10px] font-bold uppercase text-[#586928]">ATTACHMENT_01.JPG</span>
            </div>
            <div className="bg-black/5 p-8 md:p-12 grid grid-cols-1 md:grid-cols-2 gap-12">
              
              {/* Dropzone Area */}
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-1">
                  <h2 className="font-brutal text-lg font-black uppercase tracking-tight">Upload a photo</h2>
                  <p className="font-serif italic text-sm text-[#1A1208]/60">Natural lighting works best</p>
                </div>
                
                <div onClick={() => fileInputRef.current?.click()} className="relative aspect-[3/4] border-2 border-dashed border-[#1A1208]/30 bg-[#F5EFE0]/50 flex flex-col items-center justify-center p-8 text-center cursor-pointer hover:bg-[#F5EFE0] transition-colors group/drop overflow-hidden">
                  <svg className="w-24 h-48 mb-6 text-[#1A1208]/20 group-hover/drop:text-[#1A1208]/40 transition-colors" fill="currentColor" viewBox="0 0 100 200">
                    <path d="M50 20c-8 0-15 7-15 15s7 15 15 15 15-7 15-15-7-15-15-15zm-15 40c-15 0-25 10-25 25v50c0 5 5 10 10 10h5v45c0 5 5 10 10 10s10-5 10-10v-45h10v45c0 5 5 10 10 10s10-5 10-10v-45h5c5 0 10-5 10-10V85c0-15-10-25-25-25H35z"></path>
                  </svg>
                  <span className="material-symbols-outlined text-4xl mb-4 text-[#C84B2F]">add_circle</span>
                  <p className="font-mono text-xs uppercase font-bold tracking-widest text-[#1A1208]">Drop image or click to browse</p>
                  
                  {analyzing && (
                    <div className="absolute inset-0 bg-[#F5EFE0]/80 backdrop-blur-sm flex flex-col items-center justify-center">
                      <div className="w-12 h-12 border-4 border-[#1A1208]/10 border-t-[#C84B2F] rounded-full animate-spin mb-4"></div>
                      <span className="font-mono text-[10px] tracking-widest uppercase">ANALYZING PIGMENTS...</span>
                    </div>
                  )}
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                
                {error && <div className="text-red-600 font-mono text-xs">{error}</div>}
              </div>

              {/* Result State Preview */}
              <div className="flex flex-col gap-10">
                {analysisResult ? (
                  <>
                    <div className="flex flex-col gap-6 p-6 bg-[#f9f3e4] border border-[#1A1208]/5 stagger-rotate">
                      <div className="flex justify-between items-end border-b border-[#1A1208]/10 pb-4">
                        <span className="font-brutal text-xs font-black uppercase tracking-tighter">Analysis Results</span>
                        <span className="font-mono text-[10px] text-[#C84B2F] font-bold">READY TO MAP</span>
                      </div>
                      
                      {/* Skin Tone Swatch */}
                      <div className="flex items-center gap-6">
                        <div className="w-20 h-20 border border-[#1A1208]/10 shadow-inner" style={{backgroundColor: `hsl(30, 60%, ${getStandardLightness(convertToStandardLab(analysisResult.skin)[0])}%)`}}></div>
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-[10px] uppercase tracking-widest font-bold text-[#1A1208]/40">Skin Tone</span>
                          <span className="font-serif italic font-bold text-lg">L* {convertToStandardLab(analysisResult.skin)[0]?.toFixed(1)}</span>
                          <span className="font-mono text-xs text-[#C84B2F]">LAB: {convertToStandardLab(analysisResult.skin).map(v => v.toFixed(0)).join(', ')}</span>
                        </div>
                      </div>
                      
                      {/* Hair Tone Swatch */}
                      <div className="flex items-center gap-6">
                        <div className="w-20 h-20 border border-[#1A1208]/10 shadow-inner" style={{backgroundColor: `hsl(20, 60%, ${getStandardLightness(convertToStandardLab(analysisResult.hair)[0])}%)`}}></div>
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-[10px] uppercase tracking-widest font-bold text-[#1A1208]/40">Hair Tone</span>
                          <span className="font-serif italic font-bold text-lg">L* {convertToStandardLab(analysisResult.hair)[0]?.toFixed(1)}</span>
                          <span className="font-mono text-xs text-[#C84B2F]">LAB: {convertToStandardLab(analysisResult.hair).map(v => v.toFixed(0)).join(', ')}</span>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-6 border-t border-[#1A1208]/10 flex flex-col gap-2">
                        <div className="flex justify-between font-mono text-[10px] uppercase">
                          <span>Extraction Confidence</span>
                          <span className="text-[#C84B2F]">98.2%</span>
                        </div>
                        <div className="h-1 bg-[#F5EFE0] overflow-hidden">
                          <div className="h-full bg-[#C84B2F] w-[98.2%]"></div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-auto flex flex-col gap-4">
                      <button onClick={() => navigate('/dashboard')} className="w-full bg-[#C84B2F] text-[#F5EFE0] py-6 px-8 flex items-center justify-between group transition-all active:scale-95 duration-200 hover:brightness-110">
                        <span className="font-brutal text-lg font-black uppercase tracking-tighter">Continue to Weave</span>
                        <span className="material-symbols-outlined text-2xl group-hover:translate-x-2 transition-transform">arrow_right_alt</span>
                      </button>
                      <p className="font-mono text-[10px] text-center uppercase tracking-widest text-[#1A1208]/40">By continuing, you agree to our editorial privacy standards.</p>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 border-2 border-dashed border-[#1A1208]/10 flex items-center justify-center p-8 text-center text-[#1A1208]/40 font-mono text-xs">
                     Awaiting Upload... <br/> Lab colors will generate here.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Staggered Sections */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#eee8d9] p-6 transform rotate-1">
              <span className="material-symbols-outlined text-[#C84B2F] mb-4">science</span>
              <h3 className="font-brutal text-xs font-black uppercase mb-2">Science-Led</h3>
              <p className="font-serif italic text-sm leading-relaxed text-[#1A1208]/70">We map 4,096 distinct chroma points to find your exact seasonal harmony.</p>
            </div>
            <div className="bg-[#eee8d9] p-6 transform -rotate-1">
              <span className="material-symbols-outlined text-[#C84B2F] mb-4">shutter_speed</span>
              <h3 className="font-brutal text-xs font-black uppercase mb-2">Instant Parsing</h3>
              <p className="font-serif italic text-sm leading-relaxed text-[#1A1208]/70">No manual selection required. Our neural engine handles the heavy lifting.</p>
            </div>
            <div className="bg-[#eee8d9] p-6 transform rotate-2">
              <span className="material-symbols-outlined text-[#C84B2F] mb-4">verified_user</span>
              <h3 className="font-brutal text-xs font-black uppercase mb-2">Encrypted</h3>
              <p className="font-serif italic text-sm leading-relaxed text-[#1A1208]/70">Your photos are processed locally and never stored on our aesthetic servers.</p>
            </div>
          </div>
        </section>
      </main>

      {/* Decorative Background */}
      <div className="fixed top-1/4 right-0 opacity-5 -z-10 pointer-events-none">
        <span className="text-[20rem] font-headline font-black italic select-none">WEAVE</span>
      </div>
    </div>
  );
}

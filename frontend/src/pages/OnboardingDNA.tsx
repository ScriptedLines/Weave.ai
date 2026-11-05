import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';

export default function OnboardingDNA() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{ skin: number[], hair: number[] } | null>(null);
  const [error, setError] = useState('');

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

      const res = await apiFetch('/skin_color', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Analysis failed');
      const data = await res.json();

      setAnalysisResult({ skin: data.skin_lab, hair: data.hair_lab });
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err: any) {
      setError(err.message || 'Error parsing segments.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <>
      <div className="bg-[#F5EFE0] text-[#1A1208] min-h-[calc(100vh-64px)] font-body selection:bg-rust selection:text-white">
        <style>{`
          .stagger-rotate {
              transform: rotate(-1.5deg);
          }
          .font-brutal { font-family: 'Unbounded', sans-serif; }
          .font-headline { font-family: 'Fraunces', serif; }
        `}</style>

      <main className="max-w-6xl mx-auto px-6 pt-16 pb-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

        <aside className="hidden lg:flex lg:col-span-3 flex-col gap-8 sticky top-28">
          <div className="flex flex-col gap-1">
            <div className="text-xl font-black text-[#1A1208] font-brutal uppercase tracking-tight">ONBOARDING</div>
            <div className="text-sm font-serif italic text-[#1A1208]/60">Personalize recommendations</div>
          </div>
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4 text-[#C84B2F] bg-[#C84B2F]/10 px-4 py-3 rounded-sm">
              <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>auto_fix_high</span>
              <span className="font-brutal text-sm font-black uppercase tracking-tight">Photo analysis</span>
            </div>
          </div>
          <div className="mt-12 p-4 border border-[#1A1208]/10 bg-[#f9f3e4]/50">
            <p className="text-[10px] font-mono uppercase tracking-widest text-[#1A1208]/40 mb-2">How it works</p>
            <p className="text-xs font-serif italic text-[#1A1208]/70 leading-relaxed">We analyze your photo to estimate your skin and hair tones.</p>
          </div>
        </aside>

        <section className="lg:col-span-9 flex flex-col gap-12">

          <div className="max-w-2xl">
            <h1 className="text-6xl md:text-7xl font-headline font-black italic tracking-tighter leading-[0.9] text-[#1A1208] mb-6">
              Let's find your palette.
            </h1>
            <p className="text-xl md:text-2xl font-serif italic text-[#1A1208]/80 leading-snug">
              Upload a photo to help personalize your clothing recommendations.
            </p>
          </div>

          <div className="bg-[#E4DCC6] p-1 md:p-1 shadow-[12px_12px_0px_-2px_#1A120810] border border-[#1A1208] relative group">

            <div className="absolute -top-4 -left-6 bg-[#d4e899] px-6 py-1.5 shadow-sm transform -rotate-3 z-10 border border-[#586928]/10">
              <span className="font-mono text-[10px] font-bold uppercase text-[#586928]">COLOR PROFILE</span>
            </div>
            <div className="bg-black/5 p-8 md:p-12 grid grid-cols-1 md:grid-cols-2 gap-12">

              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-1">
                  <h2 className="font-brutal text-lg font-black uppercase tracking-tight">Upload a photo</h2>
                  <p className="font-serif italic text-sm text-[#1A1208]/60">Natural lighting works best</p>
                </div>

                <div role="button" tabIndex={0} aria-label="Choose a photo for analysis" onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }} onClick={() => fileInputRef.current?.click()} className="relative aspect-[3/4] border-2 border-dashed border-[#1A1208]/30 bg-[#F5EFE0]/50 flex flex-col items-center justify-center p-8 text-center cursor-pointer hover:bg-[#F5EFE0] transition-colors group/drop overflow-hidden">
                  <svg className="w-24 h-48 mb-6 text-[#1A1208]/20 group-hover/drop:text-[#1A1208]/40 transition-colors" fill="currentColor" viewBox="0 0 100 200">
                    <path d="M50 20c-8 0-15 7-15 15s7 15 15 15 15-7 15-15-7-15-15-15zm-15 40c-15 0-25 10-25 25v50c0 5 5 10 10 10h5v45c0 5 5 10 10 10s10-5 10-10v-45h10v45c0 5 5 10 10 10s10-5 10-10v-45h5c5 0 10-5 10-10V85c0-15-10-25-25-25H35z"></path>
                  </svg>
                  <span className="material-symbols-outlined text-4xl mb-4 text-[#C84B2F]">add_circle</span>
                  <p className="font-mono text-xs uppercase font-bold tracking-widest text-[#1A1208]">Choose an image</p>

                  {analyzing && (
                    <div className="absolute inset-0 bg-[#F5EFE0]/80 backdrop-blur-sm flex flex-col items-center justify-center">
                      <div className="w-12 h-12 border-4 border-[#1A1208]/10 border-t-[#C84B2F] rounded-full animate-spin mb-4"></div>
                      <span className="font-mono text-[10px] tracking-widest uppercase">ANALYZING PHOTO...</span>
                    </div>
                  )}
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />

                {error && <div role="alert" className="text-red-600 font-mono text-xs">{error}</div>}
              </div>

              <div className="flex flex-col gap-10">
                {analysisResult ? (
                  <>
                    <div className="flex flex-col gap-6 p-6 bg-[#f9f3e4] border border-[#1A1208]/5 stagger-rotate">
                      <div className="flex justify-between items-end border-b border-[#1A1208]/10 pb-4">
                        <span className="font-brutal text-xs font-black uppercase tracking-tighter">Analysis Results</span>
                        <span className="font-mono text-[10px] text-[#C84B2F] font-bold">READY TO MAP</span>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="w-20 h-20 border border-[#1A1208]/10 shadow-inner" style={{backgroundColor: `hsl(30, 60%, ${getStandardLightness(convertToStandardLab(analysisResult.skin)[0])}%)`}}></div>
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-[10px] uppercase tracking-widest font-bold text-[#1A1208]/40">Skin Tone</span>
                          <span className="font-serif italic font-bold text-lg">L* {convertToStandardLab(analysisResult.skin)[0]?.toFixed(1)}</span>
                          <span className="font-mono text-xs text-[#C84B2F]">LAB: {convertToStandardLab(analysisResult.skin).map(v => v.toFixed(0)).join(', ')}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="w-20 h-20 border border-[#1A1208]/10 shadow-inner" style={{backgroundColor: `hsl(20, 60%, ${getStandardLightness(convertToStandardLab(analysisResult.hair)[0])}%)`}}></div>
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-[10px] uppercase tracking-widest font-bold text-[#1A1208]/40">Hair Tone</span>
                          <span className="font-serif italic font-bold text-lg">L* {convertToStandardLab(analysisResult.hair)[0]?.toFixed(1)}</span>
                          <span className="font-mono text-xs text-[#C84B2F]">LAB: {convertToStandardLab(analysisResult.hair).map(v => v.toFixed(0)).join(', ')}</span>
                        </div>
                      </div>

                    </div>

                    <div className="mt-auto flex flex-col gap-4">
                      <button onClick={() => navigate('/dashboard')} className="w-full bg-[#C84B2F] text-[#F5EFE0] py-6 px-8 flex items-center justify-between group transition-all active:scale-95 duration-200 hover:brightness-110">
                        <span className="font-brutal text-lg font-black uppercase tracking-tighter">Continue to Weave</span>
                        <span className="material-symbols-outlined text-2xl group-hover:translate-x-2 transition-transform">arrow_right_alt</span>
                      </button>
                      <p className="font-mono text-[10px] text-center uppercase tracking-widest text-[#1A1208]/40">Your color profile helps personalize your recommendations.</p>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 border-2 border-dashed border-[#1A1208]/10 flex items-center justify-center p-8 text-center text-[#1A1208]/40 font-mono text-xs">
                     Upload a photo to see your color profile.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#eee8d9] p-6 transform rotate-1">
              <span className="material-symbols-outlined text-[#C84B2F] mb-4">science</span>
              <h3 className="font-brutal text-xs font-black uppercase mb-2">Color analysis</h3>
              <p className="font-serif italic text-sm leading-relaxed text-[#1A1208]/70">Your estimated skin and hair tones help inform color recommendations.</p>
            </div>
            <div className="bg-[#eee8d9] p-6 transform -rotate-1">
              <span className="material-symbols-outlined text-[#C84B2F] mb-4">shutter_speed</span>
              <h3 className="font-brutal text-xs font-black uppercase mb-2">Automatic analysis</h3>
              <p className="font-serif italic text-sm leading-relaxed text-[#1A1208]/70">Your photo is analyzed automatically; no manual color selection is needed.</p>
            </div>
            <div className="bg-[#eee8d9] p-6 transform rotate-2">
              <span className="material-symbols-outlined text-[#C84B2F] mb-4">verified_user</span>
              <h3 className="font-brutal text-xs font-black uppercase mb-2">Photo processing</h3>
              <p className="font-serif italic text-sm leading-relaxed text-[#1A1208]/70">Your photo is sent to the service for analysis.</p>
            </div>
          </div>
        </section>
      </main>

        <div className="fixed top-1/4 right-0 opacity-5 -z-10 pointer-events-none">
          <span className="text-[20rem] font-headline font-black italic select-none">WEAVE</span>
        </div>
      </div>
    </>
  );
}

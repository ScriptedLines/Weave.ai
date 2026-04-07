import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export default function AuthPage() {
  const navigate = useNavigate();
  const { signIn, signUp, user } = useAuth();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Custom cursor logic from HTML
    const cursor = document.querySelector('.custom-cursor') as HTMLElement;
    if (!cursor) return;

    const moveHandler = (e: MouseEvent) => {
      if (cursor) {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
      }
    };
    const mdHandler = () => { if (cursor) cursor.style.transform = 'translate(-50%, -50%) scale(0.8)'; };
    const muHandler = () => { if (cursor) cursor.style.transform = 'translate(-50%, -50%) scale(1)'; };
    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mousedown', mdHandler);
    document.addEventListener('mouseup', muHandler);

    return () => {
      document.removeEventListener('mousemove', moveHandler);
      document.removeEventListener('mousedown', mdHandler);
      document.removeEventListener('mouseup', muHandler);
    };
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailError('');
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
        navigate('/dashboard');
      } else {
        const { error } = await signUp(email, password, name);
        if (error) {
           if (error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('exists')) {
              setEmailError('This email is already registered to a Curator account.');
              throw new Error('Please use a different email or log in.');
           }
           throw error;
        }
        // Store email for resend functionality and display
        localStorage.setItem('weave_signup_email', email);
        navigate('/verify-waiting');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // If user is already authenticated but somehow on auth page, redirect happens by router normally,
  // but if we are here wait for them to navigate via App flow.
  useEffect(() => {
     if (user) {
         const checkProfile = async () => {
             const { data, error } = await supabase.from('profiles').select('skin_lab').eq('user_id', user.id).single();
             if (error || !data || !data.skin_lab) {
                 navigate('/onboarding-dna');
             } else {
                 navigate('/dashboard');
             }
         };
         checkProfile();
     }
  }, [user, navigate]);

  return (
    <div className="bg-background text-on-background selection:bg-primary/30 min-h-screen overflow-x-hidden font-fraunces cursor-none">
      <div className="grain-overlay" style={{position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9999, opacity: 0.04, backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")'}}></div>
      <div className="custom-cursor hidden md:block" style={{width: '12px', height: '12px', background: '#a63319', borderRadius: '50%', position: 'fixed', pointerEvents: 'none', zIndex: 10000, transform: 'translate(-50%, -50%)'}}></div>
      
      {/* Ticker Tape */}
      <div className="fixed top-0 left-0 w-full z-[60] flex items-center overflow-hidden bg-[#C84B2F] h-6">
        <div className="animate-marquee font-mono text-[10px] uppercase tracking-[0.2em] text-[#F5EFE0] flex gap-8 py-1" style={{display: 'inline-block', whiteSpace: 'nowrap', animation: 'marquee 20s linear infinite'}}>
          <span>AI VIRTUAL TRY-ON ✦ COLOR SCIENCE ✦ RESUNET + AFWM + REAL-ESRGAN ✦ SIGLIP SEMANTIC SEARCH ✦ SCHP SKIN PARSING ✦</span>
          <span>AI VIRTUAL TRY-ON ✦ COLOR SCIENCE ✦ RESUNET + AFWM + REAL-ESRGAN ✦ SIGLIP SEMANTIC SEARCH ✦ SCHP SKIN PARSING ✦</span>
        </div>
      </div>

      <main className="pt-12 px-6 pb-24 max-w-7xl mx-auto flex flex-col gap-32 items-center">
        
        {/* Screen 1: Auth Card Section */}
        <section className="min-h-screen flex items-center justify-center w-full relative">
          <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
            <div className="w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px]"></div>
          </div>
          <div className="relative z-10 w-full max-w-md">
            <div className="bg-[#E4DCC6] border border-on-surface/10 rounded-[20px] shadow-[0_30px_60px_-15px_rgba(26,18,8,0.25)] p-10 flex flex-col gap-8 relative overflow-hidden">
              <div className="absolute -top-1 -right-4 transform rotate-12">
                <div className="bg-primary text-white font-unbounded text-[10px] px-6 py-2 tracking-widest uppercase" style={{clipPath: 'polygon(2% 0%, 98% 2%, 100% 98%, 0% 95%)'}}>
                    WEAVE STUDIO
                </div>
              </div>

              <div className="flex gap-8 items-end border-b border-on-surface/5 pb-2">
                <button onClick={() => setIsLogin(false)} className={`font-unbounded text-sm font-bold pb-1 transition-colors ${!isLogin ? 'text-primary' : 'text-on-surface/40 hover:text-on-surface'}`} style={!isLogin ? {position: 'relative'} : {}}>
                  SIGN UP
                  {!isLogin && <div style={{position: 'absolute', bottom: '-4px', left: 0, width: '100%', height: '2px', background: '#C84B2F', maskImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'2\' viewBox=\'0 0 100 2\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 1C20 0.5 40 1.5 60 1C80 0.5 100 1\' stroke=\'black\' fill=\'none\'/%3E%3C/svg%3E")'}}></div>}
                </button>
                <button onClick={() => setIsLogin(true)} className={`font-unbounded text-sm font-bold pb-1 transition-colors ${isLogin ? 'text-primary' : 'text-on-surface/40 hover:text-on-surface'}`} style={isLogin ? {position: 'relative'} : {}}>
                  LOG IN
                  {isLogin && <div style={{position: 'absolute', bottom: '-4px', left: 0, width: '100%', height: '2px', background: '#C84B2F', maskImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'2\' viewBox=\'0 0 100 2\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 1C20 0.5 40 1.5 60 1C80 0.5 100 1\' stroke=\'black\' fill=\'none\'/%3E%3C/svg%3E")'}}></div>}
                </button>
              </div>

              <form className="flex flex-col gap-6" onSubmit={handleAuth}>
                {!isLogin && (
                  <div className="flex flex-col gap-1.5">
                    <label className="font-unbounded text-[9px] font-black text-on-surface/60 tracking-wider">FULL NAME</label>
                    <input value={name} onChange={e => setName(e.target.value)} className="bg-surface/50 border-b-[1.5px] border-on-surface outline-none py-3 px-1 italic font-fraunces text-lg placeholder:text-on-surface/20 focus:border-primary transition-all" placeholder="ALEXANDRA VOGUE" type="text" required/>
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <label className="font-unbounded text-[9px] font-black text-on-surface/60 tracking-wider">EMAIL ADDRESS</label>
                  <input value={email} onChange={e => { setEmail(e.target.value); setEmailError(''); }} className={`bg-surface/50 border-b-[1.5px] ${emailError ? 'border-primary' : 'border-on-surface'} outline-none py-3 px-1 italic font-fraunces text-lg placeholder:text-on-surface/20 focus:border-primary transition-all`} placeholder="CURATOR@WEAVE.STUDIO" type="email" required/>
                  {emailError && (
                    <div className="text-primary text-[10px] uppercase font-mono font-bold tracking-widest mt-1">
                      {emailError}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-unbounded text-[9px] font-black text-on-surface/60 tracking-wider">PASSWORD</label>
                  <input value={password} onChange={e => setPassword(e.target.value)} className="bg-surface/50 border-b-[1.5px] border-on-surface outline-none py-3 px-1 italic font-fraunces text-lg placeholder:text-on-surface/20 focus:border-primary transition-all" placeholder="••••••••" type="password" required/>
                </div>

                {error && <div className="text-error font-mono text-xs">{error}</div>}

                <button disabled={loading} type="submit" className="mt-4 bg-primary text-on-primary font-unbounded text-xs py-5 font-black tracking-widest relative group overflow-hidden transition-all active:scale-95 disabled:opacity-50">
                  <span className="relative z-10">{loading ? 'PROCESSING...' : (isLogin ? 'ENTER ARCHIVE' : 'CREATE ARCHIVE')}</span>
                  <div className="absolute inset-0 bg-on-background transform translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
                </button>

                <div className="flex items-center gap-4 py-2">
                  <div className="h-[1px] flex-1 bg-on-surface/10"></div>
                  <span className="font-mono text-[9px] text-on-surface/40">OR CURATE WITH</span>
                  <div className="h-[1px] flex-1 bg-on-surface/10"></div>
                </div>

                <div className="flex gap-4">
                  <button type="button" className="flex-1 py-4 border border-on-surface flex items-center justify-center hover:bg-on-surface hover:text-surface transition-colors">
                    <span className="material-symbols-outlined text-xl">brand_family</span>
                  </button>
                  <button type="button" className="flex-1 py-4 border border-on-surface flex items-center justify-center hover:bg-on-surface hover:text-surface transition-colors">
                    <span className="material-symbols-outlined text-xl">all_inclusive</span>
                  </button>
                </div>
              </form>
            </div>

            <div className="absolute -bottom-16 left-0 right-0 text-center">
              <p className="font-fraunces italic text-on-surface/40 text-sm">By joining, you agree to our Editorial Guidelines.</p>
            </div>
          </div>
        </section>

        {/* Aesthetic Filler / Mosaic Footer */}
        <section className="w-full py-24 grid grid-cols-2 md:grid-cols-4 gap-4 opacity-40 grayscale">
          <div className="aspect-square bg-surface-container-high overflow-hidden">
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBY9sONIa-E5VVeg6J4MG-II9TY6H9KAWxpPpyjb7h2vimb-mE16spVaxaE6J0hZVIuUdvm9vLVws5eQ3bGQOk6kXFYwvfYc_WDu8aPBcQ6FyPwkrgtNyC--NlUVe4KX-kHBOlWYrxvxpjA-tHAJbGAzYDhhCCtQz8kzDh0mP-cto4TKHoBWyetRBKhOHUj9CHFjnLqWKlpWHksMp-4So0aPh-ARjZypvOi--VU8BILn_cFawatrukTbaECd8BsLm4KEdpZAUN_Pr-t" alt="minimalist fashion portrait with warm lighting and paper texture overlay editorial style" className="w-full h-full object-cover" />
          </div>
          <div className="aspect-square bg-surface-container-high overflow-hidden transform translate-y-8">
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBgjniqZLk5SCbg2_vAiWBDX3QW_5UOECPAWNeyk8TEa05FHWl8y4cn4w2Y4Zv5zq-DGmp18OjbjyodmaZDBADKfHzByoAXSaPMG4Ssh1LdHGjcQSPYMjjgRZCttKCv3mJ2VAY0X92eyyoU2uMnNGf0EfOJfYpl5QudtyTW6zaW1VIfU5kUnmcR1lB6VqNE8qS6DgxqA-zmTyGGxyDOKUNshdpYhEvZGtovV-CZMQ4UpVCgU5s88R2QTLjexkQ4E3Nm66oHMk-mm09E" alt="close up of beige fabric texture with soft shadows and editorial grain aesthetic" className="w-full h-full object-cover" />
          </div>
          <div className="aspect-square bg-surface-container-high overflow-hidden">
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuAY5nrWS_LhH3sdz4BhHn7XCn-YRjwEuExXoMtvSxyt84ZDCuFH_ukRYK9vp1hq_4g-txHoczzcDpmjB_0-rAbw3n0AZClWtUbghb7fFlwIlQ8AD9DjcIF6SJgnmUiXLb4SoBTqfczUEvH9S3yaC5wUTYh796rucVJIlG2c_Z2XzFWDYCUmccACTozjZ_AmhiSnfRnnmfpbUNYKej_yd4MwXP117AgSuCI6_8ewoiNVrzfOW_Jlzj3Kz6qXgLdCRb-ZQmx9FxknJ8n8" alt="abstract editorial fashion photography with neutral tones and artistic composition" className="w-full h-full object-cover" />
          </div>
          <div className="aspect-square bg-surface-container-high overflow-hidden transform -translate-y-4">
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCtDxW2iHsgnhLfzrUpBLfMst1bj7cl6r4d1ibAqqzrEWS2xV3GIom3teAus_iCZ9lo-F20Auzo2niA9OR2Hx0gp0YyoC8LELZp-aKBJe5vVAk1clodNW40grb06wl5ZBVUppbr7DmpJYYm-98FYghHfV_s4j_LiZRsxYIryKXgb1VstgGj4QHOEYBsdvWbBWjjKzheU8FtpLXEZx0EieqC5EZYIbxdmZ3PIM5v_YIaRTagY-Co99ZO9Ea1Ju0NsGsWjI0d8YYMFrm9" alt="vogue style editorial portrait of a model in neutral linen clothing soft paper tones" className="w-full h-full object-cover" />
          </div>
        </section>
      </main>

      {/* Side Navigation Shell */}
      <div className="fixed left-0 top-16 h-[calc(100vh-64px)] w-20 flex flex-col items-center py-8 z-40 bg-transparent shadow-[20px_0_30px_rgba(26,18,8,0.06)]">
        <div className="flex flex-col gap-10">
          <button onClick={() => navigate('/dashboard')} className="flex flex-col items-center gap-1 group">
            <div className="w-12 h-12 flex items-center justify-center rounded-none text-on-surface hover:rotate-1 transition-transform">
              <span className="material-symbols-outlined text-2xl">grid_view</span>
            </div>
          </button>
          <button onClick={() => navigate('/studio')} className="flex flex-col items-center gap-1 group">
            <div className="w-12 h-12 flex items-center justify-center rounded-none bg-primary text-surface -rotate-2 scale-105 transition-transform">
              <span className="material-symbols-outlined text-2xl" style={{fontVariationSettings: "'FILL' 1"}}>auto_fix_high</span>
            </div>
          </button>
          <button onClick={() => navigate('/docs/archive')} className="flex flex-col items-center gap-1 group">
            <div className="w-12 h-12 flex items-center justify-center rounded-none text-on-surface hover:rotate-1 transition-transform">
              <span className="material-symbols-outlined text-2xl">shelves</span>
            </div>
          </button>
          <button className="flex flex-col items-center gap-1 group">
            <div className="w-12 h-12 flex items-center justify-center rounded-none text-on-surface hover:rotate-1 transition-transform">
              <span className="material-symbols-outlined text-2xl">settings</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

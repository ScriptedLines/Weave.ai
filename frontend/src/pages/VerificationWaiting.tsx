import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

import { useAuth } from '../context/AuthContext';

export default function VerificationWaiting() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<{text: string, type: 'success' | 'error'} | null>(null);

  React.useEffect(() => {
    const saved = localStorage.getItem('weave_signup_email');
    if (saved) setEmail(saved);
  }, []);

  // Redirect automatically when session is detected (after clicking email link)
  React.useEffect(() => {
    if (user) {
      console.log("Verification successful! Moving to onboarding...");
      navigate('/onboarding-dna');
    }
  }, [user, navigate]);

  const handleResend = async () => {
    if (!email || loading) return;
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-waiting`
        }
      });
      if (error) throw error;
      setMessage({text: 'A new key has been dispatched to your inbox.', type: 'success'});
    } catch (err: any) {
      setMessage({text: err.message || 'Dispatch failed.', type: 'error'});
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#fff9ea] text-[#1d1c13] font-['Fraunces'] selection:bg-[#c84b2f] selection:text-white min-h-screen flex flex-col overflow-x-hidden">
      <style>{`
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .film-grain {
            position: fixed;
            inset: 0;
            pointer-events: none;
            z-index: 9999;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
            opacity: 0.03;
        }
        .risograph-hatch {
            background-image: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(140, 113, 107, 0.1) 10px, rgba(140, 113, 107, 0.1) 11px);
        }
        @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
        }
        .animate-marquee {
            display: flex;
            width: max-content;
            animation: marquee 30s linear infinite;
        }
      `}</style>
      <div className="film-grain"></div>

      {/* Top Navigation Anchor */}
      <header className="bg-[#F5EFE0] border-b-2 border-dashed border-[#1A1208]/10 flex justify-between items-center w-full px-6 py-4 fixed top-0 z-50">
        <span className="text-2xl font-black tracking-tighter text-[#1A1208] uppercase cursor-pointer" onClick={() => navigate('/')}>WEAVE</span>
        <button className="hover:skew-x-2 transition-transform duration-200">
          <span className="material-symbols-outlined text-[#1A1208]">menu</span>
        </button>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-grow flex items-center justify-center px-4 pt-24 pb-32">
        <div className="relative group">
          {/* Asymmetric Shadow/Layering */}
          <div className="absolute inset-0 bg-[#e8e2d3] translate-x-3 translate-y-3 -z-10 rotate-[0.5deg]"></div>
          
          {/* Central Scrapbook Card */}
          <div className="max-w-md w-full bg-[#f3edde] p-8 md:p-12 relative overflow-hidden risograph-hatch transition-transform duration-500 hover:rotate-[-0.5deg]">
            {/* Tape Strip Decorative Element */}
            <div className="absolute -top-4 -right-8 w-32 h-10 bg-[#d4e899]/60 rotate-[15deg] flex items-center justify-center px-4 z-10">
              <span className="font-mono text-[10px] tracking-widest text-[#586928] uppercase opacity-70">SCRAPBOOK_04</span>
            </div>
            
            <div className="flex flex-col items-center text-center space-y-8">
              {/* Stylized Visual */}
              <div className="relative w-32 h-32 flex items-center justify-center bg-[#f9f3e4] rounded-xl shadow-sm rotate-[-2deg]">
                <span className="material-symbols-outlined text-6xl text-[#8c716b] opacity-40">mail</span>
                <div className="absolute inset-0 flex items-center justify-center">
                  {/* Hand-drawn style envelope placeholder */}
                  <div className="w-20 h-14 border-2 border-[#1d1c13] relative flex items-center justify-center rotate-[3deg]">
                    <div className="absolute top-0 left-0 w-full h-1/2 border-b-2 border-[#1d1c13] rotate-[2deg]"></div>
                    {/* Bobbing Wax Seal */}
                    <div className="w-6 h-6 bg-[#c84b2f] rounded-full flex items-center justify-center shadow-lg transform translate-y-2 translate-x-1 animate-bounce">
                      <span className="material-symbols-outlined text-white text-[14px]" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Typography Hierarchy */}
              <div className="space-y-4">
                <h1 className="text-5xl md:text-6xl font-[900] tracking-tighter text-[#1d1c13] leading-none italic">
                  Check your post.
                </h1>
                <p className="text-xl md:text-2xl font-[300] italic text-[#58413c] leading-tight max-w-sm mx-auto">
                  We've sent a digital key to <span className="font-bold text-[#1d1c13]">{email || 'your inbox'}</span>. Give it a moment to arrive in the studio.
                </p>
                {message && (
                  <p className={`font-mono text-[10px] uppercase tracking-wider ${message.type === 'success' ? 'text-secondary' : 'text-primary'}`}>
                    {message.text}
                  </p>
                )}
              </div>
              
              {/* Action Layer */}
              <div className="w-full space-y-6 pt-4">
                {/* CTA with hover wipe effect */}
                <button 
                  onClick={handleResend}
                  disabled={loading}
                  className="relative w-full group overflow-hidden bg-[#1d1c13] text-[#fff9ea] py-5 rounded-sm transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-lg disabled:opacity-50"
                >
                  <span className="relative z-10 font-['Unbounded'] font-[900] tracking-wider text-sm">
                    {loading ? 'DISPATCHING...' : 'RESEND EMAIL'}
                  </span>
                  <div className="absolute inset-0 bg-[#a63319] translate-x-[-101%] group-hover:translate-x-0 transition-transform duration-500 ease-out"></div>
                </button>
                
                {/* Secondary Link */}
                <div className="flex flex-col items-center gap-2">
                  <a className="font-mono text-[10px] uppercase tracking-widest text-[#58413c] hover:text-[#a63319] transition-colors underline decoration-1 underline-offset-4" href="/auth">
                    Back to login entrance
                  </a>
                </div>
              </div>
            </div>
            
            {/* Subtle Decorative Ink Mark */}
            <div className="absolute bottom-2 right-4 opacity-10 pointer-events-none select-none">
              <span className="material-symbols-outlined text-4xl">fingerprint</span>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Marquee (Marigold Tape Strip) */}
      <footer className="fixed bottom-0 left-0 w-full z-50 bg-[#FFB800] py-3 overflow-hidden shadow-[0_-10px_30px_rgba(0,0,0,0.05)] border-t border-[#1d1c13]/5">
        <div className="animate-marquee whitespace-nowrap flex items-center gap-8">
          <span className="font-mono font-bold text-xs tracking-[0.3em] text-[#1A1208] flex items-center">
            WAITING FOR CONNECTION <span className="material-symbols-outlined mx-4 text-sm" style={{fontVariationSettings: "'FILL' 1"}}>auto_awesome</span>
            CHECKING INBOX <span className="material-symbols-outlined mx-4 text-sm" style={{fontVariationSettings: "'FILL' 1"}}>auto_awesome</span>
            STUDIO ENTRY PENDING <span className="material-symbols-outlined mx-4 text-sm" style={{fontVariationSettings: "'FILL' 1"}}>auto_awesome</span>
          </span>
          <span className="font-mono font-bold text-xs tracking-[0.3em] text-[#1A1208] flex items-center">
            WAITING FOR CONNECTION <span className="material-symbols-outlined mx-4 text-sm" style={{fontVariationSettings: "'FILL' 1"}}>auto_awesome</span>
            CHECKING INBOX <span className="material-symbols-outlined mx-4 text-sm" style={{fontVariationSettings: "'FILL' 1"}}>auto_awesome</span>
            STUDIO ENTRY PENDING <span className="material-symbols-outlined mx-4 text-sm" style={{fontVariationSettings: "'FILL' 1"}}>auto_awesome</span>
          </span>
          <span className="font-mono font-bold text-xs tracking-[0.3em] text-[#1A1208] flex items-center">
            WAITING FOR CONNECTION <span className="material-symbols-outlined mx-4 text-sm" style={{fontVariationSettings: "'FILL' 1"}}>auto_awesome</span>
            CHECKING INBOX <span className="material-symbols-outlined mx-4 text-sm" style={{fontVariationSettings: "'FILL' 1"}}>auto_awesome</span>
            STUDIO ENTRY PENDING <span className="material-symbols-outlined mx-4 text-sm" style={{fontVariationSettings: "'FILL' 1"}}>auto_awesome</span>
          </span>
        </div>
      </footer>

      {/* Image for Context */}
      <div className="fixed top-32 -left-12 w-48 h-64 bg-[#f9f3e4] -rotate-[12deg] shadow-xl border-8 border-white hidden lg:block overflow-hidden">
        <img alt="editorial fashion portrait" className="w-full h-full object-cover grayscale opacity-80 mix-blend-multiply" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCdyDHn5HG9drx9UxRvzCqNUSV-gwi4Ihj7caDfs-7YQ9KGd_aAGAV8zCbuGDF1YdBLysub2hcG1f5XC4F0gRfHBy1EwShDItanJhDPABViTKQaZCsf4TTEa3Zu5jebAeXs_CsaMnRtOm0N9ibXq5JzWqWTCYokuB3xjqLA5mWSZ5hYqlFo8CwC1GFqLb7vdlncQ7bmv2XHiDGAcbaGbzXQMJFCkHP6OwQOAHQl8-EdrJcTLZUjiD3DcjWPb3GFBI3ewcWnynx09vpJ"/>
        <div className="absolute bottom-4 left-4 bg-[#d4e899] px-2 py-1 rotate-[3deg]">
          <span className="font-mono text-[8px] uppercase tracking-tighter text-[#586928]">FIG. 01_VERIFICATION</span>
        </div>
      </div>

      {/* Decorative Stamp */}
      <div className="fixed top-1/2 -right-16 w-32 h-32 border-4 border-dashed border-[#a63319]/20 rounded-full flex items-center justify-center rotate-12 -translate-y-1/2 opacity-20 pointer-events-none hidden xl:flex">
        <div className="border-2 border-[#a63319]/20 rounded-full w-24 h-24 flex items-center justify-center">
          <span className="font-['Unbounded'] text-[8px] font-black text-[#a63319] uppercase text-center leading-none">Official<br/>Studio<br/>Seal</span>
        </div>
      </div>
    </div>
  );
}

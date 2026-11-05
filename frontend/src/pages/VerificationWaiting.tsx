import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/api';
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

  React.useEffect(() => {
    if (user) {
      apiFetch('/profile/ensure', { method: 'POST' }).then(async () => {
        const res = await apiFetch('/profile')
        const data = res.ok ? await res.json() : null
        if (data?.profile?.is_approved) {
          navigate(data.profile.skin_lab ? '/dashboard' : '/onboarding-dna', { replace: true })
        } else {
          navigate('/pending-approval', { replace: true })
        }
      }).catch(() => {
        navigate('/pending-approval', { replace: true })
      })
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
    <>
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-16 selection:bg-rust selection:text-white">
        <div className="relative group max-w-md w-full">
          <div className="absolute inset-0 bg-[#e8e2d3] translate-x-3 translate-y-3 -z-10 rotate-[0.5deg]"></div>

          <div className="w-full bg-[#f3edde] p-8 md:p-12 relative overflow-hidden border border-ink/10 rounded-sm shadow-xl">
            <div className="absolute -top-4 -right-8 w-32 h-10 bg-[#d4e899]/60 rotate-[15deg] flex items-center justify-center px-4 z-10">
              <span className="font-mono text-[10px] tracking-widest text-[#586928] uppercase opacity-70">EMAIL VERIFICATION</span>
            </div>

            <div className="flex flex-col items-center text-center space-y-8">
              <div className="relative w-32 h-32 flex items-center justify-center bg-[#f9f3e4] rounded-xl shadow-sm rotate-[-2deg]">
                <span className="material-symbols-outlined text-6xl text-[#8c716b] opacity-40">mail</span>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-14 border-2 border-[#1d1c13] relative flex items-center justify-center rotate-[3deg]">
                    <div className="absolute top-0 left-0 w-full h-1/2 border-b-2 border-[#1d1c13] rotate-[2deg]"></div>
                    <div className="w-6 h-6 bg-[#c84b2f] rounded-full flex items-center justify-center shadow-lg transform translate-y-2 translate-x-1 animate-bounce">
                      <span className="material-symbols-outlined text-white text-[14px]" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h1 className="text-5xl md:text-6xl font-[900] tracking-tighter text-[#1d1c13] leading-none italic font-headline">
                  Check your email.
                </h1>
                <p className="text-xl md:text-2xl font-[300] italic text-[#58413c] leading-tight max-w-sm mx-auto">
                  We sent a verification email to <span className="font-bold text-[#1d1c13]">{email || 'your inbox'}</span>. Follow the link in the email to verify your account.
                </p>
                {message && (
                  <p className={`font-mono text-[10px] uppercase tracking-wider ${message.type === 'success' ? 'text-secondary' : 'text-primary'}`}>
                    {message.text}
                  </p>
                )}
              </div>

              <div className="w-full space-y-6 pt-4">
                <button
                  onClick={handleResend}
                  disabled={loading}
                  className="relative w-full group overflow-hidden bg-[#1d1c13] text-[#fff9ea] py-4 rounded-sm transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-lg disabled:opacity-50"
                >
                  <span className="relative z-10 font-unbounded font-black tracking-wider text-xs">
                    {loading ? 'SENDING...' : 'RESEND EMAIL'}
                  </span>
                  <div className="absolute inset-0 bg-rust translate-x-[-101%] group-hover:translate-x-0 transition-transform duration-500 ease-out"></div>
                </button>

                <div className="flex flex-col items-center gap-2">
                  <a className="font-mono text-[10px] uppercase tracking-widest text-[#58413c] hover:text-rust transition-colors underline decoration-1 underline-offset-4" href="/auth">
                    Back to sign in
                  </a>
                </div>
              </div>
            </div>

            <div className="absolute bottom-2 right-4 opacity-10 pointer-events-none select-none">
              <span className="material-symbols-outlined text-4xl">fingerprint</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

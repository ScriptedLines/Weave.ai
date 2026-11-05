import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';

export default function AuthPage() {
  const navigate = useNavigate();
  const { signIn, signUp, user } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [nameError, setNameError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailError('');
    setNameError('');
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
      } else {
        const availabilityResponse = await apiFetch(
          `/username_available?username=${encodeURIComponent(name)}`
        );
        const availability = availabilityResponse.ok
          ? await availabilityResponse.json()
          : { available: true };

        if (!availability.available) {
          setNameError('This name is already in use. Try another.');
          throw new Error('Name collision detected.');
        }

        const { error } = await signUp(email, password, name);
        if (error) {
          const errMsg = error.message.toLowerCase();

          if (errMsg.includes('already registered') ||
              errMsg.includes('exists') ||
              (error as any).code === 'user_already_exists' ||
              (error as any).status === 422) {
            setEmailError('This email is already registered.');
            throw new Error('This email is already taken. Please log in or use another.');
          }
          throw error;
        }

        localStorage.setItem('weave_signup_email', email);
        navigate('/verify-waiting');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      const checkProfile = async () => {
        await apiFetch('/profile/ensure', { method: 'POST' });
        const response = await apiFetch('/profile');
        const data = response.ok ? await response.json() : null;
        if (!data?.profile?.is_approved) {
          navigate('/pending-approval');
        } else if (!data.profile.skin_lab) {
          navigate('/onboarding-dna');
        } else {
          navigate('/dashboard');
        }
      };
      checkProfile();
    }
  }, [user, navigate]);

  return (
    <>
      <div className="min-h-[calc(100vh-64px)] flex flex-col justify-between px-6 py-12 max-w-7xl mx-auto relative z-10 selection:bg-rust selection:text-white">
        <section className="flex-1 flex items-center justify-center w-full relative py-8">
          <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
            <div className="w-[500px] h-[500px] bg-rust/10 rounded-full blur-[120px]"></div>
          </div>

          <div className="relative z-10 w-full max-w-md">
            <div className="bg-[#E4DCC6] border border-ink/10 rounded-[20px] shadow-[0_30px_60px_-15px_rgba(26,18,8,0.25)] p-8 sm:p-10 flex flex-col gap-8 relative overflow-hidden">
              <div className="absolute -top-1 -right-4 transform rotate-12">
                <div className="bg-rust text-white font-unbounded text-[10px] px-6 py-2 tracking-widest uppercase" style={{clipPath: 'polygon(2% 0%, 98% 2%, 100% 98%, 0% 95%)'}}>
                  WEAVE STUDIO
                </div>
              </div>

              <div className="flex gap-8 items-end border-b border-ink/10 pb-2">
                <button
                  type="button"
                  onClick={() => setIsLogin(false)}
                  className={`font-unbounded text-sm font-bold pb-1 transition-colors ${!isLogin ? 'text-rust' : 'text-ink/40 hover:text-ink'}`}
                  style={!isLogin ? {position: 'relative'} : {}}
                >
                  REQUEST ACCESS
                  {!isLogin && <div className="absolute -bottom-[9px] left-0 w-full h-[2px] bg-rust"></div>}
                </button>
                <button
                  type="button"
                  onClick={() => setIsLogin(true)}
                  className={`font-unbounded text-sm font-bold pb-1 transition-colors ${isLogin ? 'text-rust' : 'text-ink/40 hover:text-ink'}`}
                  style={isLogin ? {position: 'relative'} : {}}
                >
                  SIGN IN
                  {isLogin && <div className="absolute -bottom-[9px] left-0 w-full h-[2px] bg-rust"></div>}
                </button>
              </div>

              {!isLogin && (
                <div className="bg-[#f0e8d4] border border-rust/20 p-3.5 rounded-sm">
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-rust font-bold">
                    Account approval required
                  </p>
                  <p className="font-mono text-[10px] text-ink/75 leading-relaxed mt-1">
                    Create an account to request access. You can sign in once your account has been approved.
                  </p>
                </div>
              )}

              <form className="flex flex-col gap-6" onSubmit={handleAuth}>
                {!isLogin && (
                  <div className="flex flex-col gap-1.5">
                    <label className="font-unbounded text-[9px] font-black text-ink/60 tracking-wider">FULL NAME</label>
                    <input
                      value={name}
                      onChange={e => { setName(e.target.value); setNameError(''); }}
                      className={`bg-paper/50 border-b-[1.5px] ${nameError ? 'border-rust' : 'border-ink/30'} outline-none py-3 px-1 italic font-fraunces text-lg placeholder:text-ink/20 focus:border-rust transition-all`}
                      placeholder="Your name"
                      type="text"
                      required
                    />
                    {nameError && (
                      <div className="text-rust text-[10px] uppercase font-mono font-bold tracking-widest mt-1">
                        {nameError}
                      </div>
                    )}
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <label className="font-unbounded text-[9px] font-black text-ink/60 tracking-wider">EMAIL ADDRESS</label>
                  <input
                    value={email}
                    onChange={e => { setEmail(e.target.value); setEmailError(''); }}
                    className={`bg-paper/50 border-b-[1.5px] ${emailError ? 'border-rust' : 'border-ink/30'} outline-none py-3 px-1 italic font-fraunces text-lg placeholder:text-ink/20 focus:border-rust transition-all`}
                    placeholder="you@example.com"
                    type="email"
                    required
                  />
                  {emailError && (
                    <div className="text-rust text-[10px] uppercase font-mono font-bold tracking-widest mt-1">
                      {emailError}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-unbounded text-[9px] font-black text-ink/60 tracking-wider">PASSWORD</label>
                  <input
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="bg-paper/50 border-b-[1.5px] border-ink/30 outline-none py-3 px-1 italic font-fraunces text-lg placeholder:text-ink/20 focus:border-rust transition-all"
                    placeholder="••••••••"
                    type="password"
                    required
                  />
                </div>

                {error && <div className="text-rust font-mono text-xs">{error}</div>}

                <button
                  disabled={loading}
                  type="submit"
                  className="mt-4 bg-rust text-paper font-unbounded text-xs py-4 font-black tracking-widest relative group overflow-hidden transition-all active:scale-95 disabled:opacity-50 shadow-md rounded-sm"
                >
                  <span className="relative z-10">{loading ? 'PROCESSING...' : (isLogin ? 'SIGN IN' : 'REQUEST ACCESS')}</span>
                  <div className="absolute inset-0 bg-ink transform translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
                </button>

              </form>
            </div>
          </div>
        </section>

        <section className="w-full pt-12 pb-6 grid grid-cols-2 md:grid-cols-4 gap-4 opacity-40 grayscale">
          <div className="aspect-square bg-paper/60 overflow-hidden border border-ink/5">
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBY9sONIa-E5VVeg6J4MG-II9TY6H9KAWxpPpyjb7h2vimb-mE16spVaxaE6J0hZVIuUdvm9vLVws5eQ3bGQOk6kXFYwvfYc_WDu8aPBcQ6FyPwkrgtNyC--NlUVe4KX-kHBOlWYrxvxpjA-tHAJbGAzYDhhCCtQz8kzDh0mP-cto4TKHoBWyetRBKhOHUj9CHFjnLqWKlpWHksMp-4So0aPh-ARjZypvOi--VU8BILn_cFawatrukTbaECd8BsLm4KEdpZAUN_Pr-t" alt="minimalist fashion portrait" className="w-full h-full object-cover" />
          </div>
          <div className="aspect-square bg-paper/60 overflow-hidden transform translate-y-4 border border-ink/5">
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBgjniqZLk5SCbg2_vAiWBDX3QW_5UOECPAWNeyk8TEa05FHWl8y4cn4w2Y4Zv5zq-DGmp18OjbjyodmaZDBADKfHzByoAXSaPMG4Ssh1LdHGjcQSPYMjjgRZCttKCv3mJ2VAY0X92eyyoU2uMnNGf0EfOJfYpl5QudtyTW6zaW1VIfU5kUnmcR1lB6VqNE8qS6DgxqA-zmTyGGxyDOKUNshdpYhEvZGtovV-CZMQ4UpVCgU5s88R2QTLjexkQ4E3Nm66oHMk-mm09E" alt="close up fabric texture" className="w-full h-full object-cover" />
          </div>
          <div className="aspect-square bg-paper/60 overflow-hidden border border-ink/5">
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuAY5nrWS_LhH3sdz4BhHn7XCn-YRjwEuExXoMtvSxyt84ZDCuFH_ukRYK9vp1hq_4g-txHoczzcDpmjB_0-rAbw3n0AZClWtUbghb7fFlwIlQ8AD9DjcIF6SJgnmUiXLb4SoBTqfczUEvH9S3yaC5wUTYh796rucVJIlG2c_Z2XzFWDYCUmccACTozjZ_AmhiSnfRnnmfpbUNYKej_yd4MwXP117AgSuCI6_8ewoiNVrzfOW_Jlzj3Kz6qXgLdCRb-ZQmx9FxknJ8n8" alt="abstract editorial fashion" className="w-full h-full object-cover" />
          </div>
          <div className="aspect-square bg-paper/60 overflow-hidden transform -translate-y-2 border border-ink/5">
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCtDxW2iHsgnhLfzrUpBLfMst1bj7cl6r4d1ibAqqzrEWS2xV3GIom3teAus_iCZ9lo-F20Auzo2niA9OR2Hx0gp0YyoC8LELZp-aKBJe5vVAk1clodNW40grb06wl5ZBVUppbr7DmpJYYm-98FYghHfV_s4j_LiZRsxYIryKXgb1VstgGj4QHOEYBsdvWbBWjjKzheU8FtpLXEZx0EieqC5EZYIbxdmZ3PIM5v_YIaRTagY-Co99ZO9Ea1Ju0NsGsWjI0d8YYMFrm9" alt="vogue style editorial portrait" className="w-full h-full object-cover" />
          </div>
        </section>
      </div>
    </>
  );
}

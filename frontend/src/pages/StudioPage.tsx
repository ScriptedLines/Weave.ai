import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';

export default function StudioPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const clothId = searchParams.get('cloth_id');

  const [personImage, setPersonImage] = useState<File | null>(null);
  const [personImagePreview, setPersonImagePreview] = useState<string | null>(null);

  const [clothImageUrl, setClothImageUrl] = useState<string | null>(null);
  const [clothName, setClothName] = useState<string>("No garment selected");

  const [loading, setLoading] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState('');

  const personInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (personImagePreview) URL.revokeObjectURL(personImagePreview); }, [personImagePreview]);
  useEffect(() => () => { if (resultImage) URL.revokeObjectURL(resultImage); }, [resultImage]);

  useEffect(() => {
    if (user?.id) {
      const verifyDNA = async () => {
        const response = await apiFetch('/profile');
        const data = response.ok ? await response.json() : null;
        if (!data?.profile?.skin_lab || !data?.profile?.hair_lab) {
          navigate('/onboarding-dna');
        }
      };
      verifyDNA();
    }
  }, [user?.id, navigate]);

  useEffect(() => {
    setResultImage(null);
    if (clothId) {
      apiFetch(`/items/${encodeURIComponent(clothId)}`)
        .then(async (response) => {
          if (!response.ok) return null;
          return response.json();
        })
        .then((data) => {
          if (data) {
            setClothImageUrl(data.image_url);
            setClothName(data.cloth_name || 'Selected Garment');
          }
        }).catch(() => { setClothImageUrl(null); setClothName('Unable to load garment'); });
    } else {
      setClothImageUrl(null);
      setClothName("No garment selected");
    }
  }, [clothId]);

  const handlePersonDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handlePersonFile(e.dataTransfer.files[0]);
  };

  const handlePersonFile = (file?: File) => {
    if (file) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setError('Choose a JPEG, PNG or WebP image.');
        return;
      }
      setError('');
      setPersonImage(file);
      setPersonImagePreview(URL.createObjectURL(file));
      setResultImage(null);
    }
  };

  const triggerTryOn = async () => {
    if (!personImage || !clothId || loading) return;
    setError('');
    setLoading(true);
    setResultImage(null);
    try {
      const formData = new FormData();

      formData.append('img', personImage);

      formData.append('cloth_id', clothId);

      const res = await apiFetch('/tryon', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Failed to generate try-on');
      const blob = await res.blob();
      setResultImage(URL.createObjectURL(blob));
    } catch (err) {
      console.error(err);
      setError('Could not generate your try-on. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="grain-overlay pointer-events-none fixed inset-0 z-0 opacity-[0.03]" style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")'}}></div>

      <div className="py-10 px-6 sm:px-12 max-w-7xl mx-auto relative z-10">
        <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <h1 className="font-fraunces text-6xl md:text-8xl font-black tracking-tighter text-[#1A1208]">
                Virtual <span className="text-primary italic font-light">Try-On</span>
            </h1>
            <p className="font-fraunces italic text-lg text-on-surface-variant mt-4 max-w-md">
                Synthesizing textiles and silhouette through generative color science.
            </p>
          </div>
          <div className="flex gap-2 bg-surface-container-high p-1 rounded-sm border border-outline-variant/20">
            <button className="px-6 py-2 font-unbounded text-[10px] bg-primary text-white rounded-sm">PHOTO MODE</button>
            <div className="relative">
              <button disabled className="px-6 py-2 font-unbounded text-[10px] text-on-surface-variant opacity-50 cursor-not-allowed">REAL-TIME</button>
              <span className="absolute -top-3 -right-2 bg-tertiary-fixed text-on-tertiary-fixed font-mono text-[8px] px-2 py-0.5 rotate-6 shadow-sm border border-tertiary/20">COMING SOON</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-unbounded font-black text-xs tracking-widest text-[#1A1208] uppercase">01 / Your Photo</h2>
              <span className="font-mono text-[10px] opacity-40">YOUR PHOTO</span>
            </div>

            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handlePersonDrop}
              onClick={() => personInputRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label="Upload your photo"
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); personInputRef.current?.click(); } }}
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
                      JPEG, PNG or WebP. A clear portrait works best.
                  </p>
                  <div className="pt-4">
                    <span className="bg-primary text-white font-unbounded text-[10px] px-8 py-3 rounded-sm group-hover:scale-105 transition-transform inline-block">UPLOAD FILE</span>
                  </div>
                </div>
              )}
              <div className="absolute top-4 left-4 font-mono text-[8px] text-primary opacity-60 z-20">YOUR PHOTO</div>
              <input type="file" ref={personInputRef} className="hidden" accept="image/jpeg,image/png,image/webp" onChange={e => handlePersonFile(e.target.files?.[0])} />
            </div>

            <div className="bg-surface-container-highest p-6 relative -rotate-1 shadow-sm">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-24 h-8 bg-secondary-container/60 -rotate-2 mix-blend-multiply flex items-center justify-center font-mono text-[8px] tracking-[0.2em] text-on-secondary-container">GARMENT</div>
              <div className="flex gap-4 items-center">
                <div className="w-16 h-16 bg-surface-variant overflow-hidden rounded-sm flex-shrink-0 grayscale flex items-center justify-center">
                  {clothImageUrl ? (
                    <img alt="Garment Preview" className="w-full h-full object-cover" src={clothImageUrl} />
                  ) : (
                    <span className="font-mono text-[8px] text-on-surface-variant text-center px-1">NO IMAGE</span>
                  )}
                </div>
                <div className="flex-grow">
                  <div className="text-[10px] font-unbounded font-black">SELECTED GARMENT</div>
                  <div className="font-fraunces italic text-lg leading-tight">{clothName}</div>
                </div>
                <button onClick={() => navigate('/dashboard')} className="font-mono text-[10px] border-b border-on-surface/20 hover:text-primary transition-colors">CHANGE</button>
              </div>
            </div>

            <button
              onClick={triggerTryOn}
              disabled={!clothId || !personImage || loading}
              className="w-full bg-on-background text-surface py-4 font-unbounded font-black text-xs tracking-widest transition-colors hover:bg-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'GENERATING...' : 'GENERATE TRY-ON'}
            </button>
            {error && <p role="alert" className="font-mono text-xs text-rust">{error}</p>}
          </section>

          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-unbounded font-black text-xs tracking-widest text-[#1A1208] uppercase">02 / Try-On Result</h2>
              <span className="font-mono text-[10px] opacity-40">RESULT</span>
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
                          This may take a moment.
                      </p>
                    </div>
                    <div className="w-48 h-1 bg-surface-variant mx-auto overflow-hidden">
                      <div className="h-full bg-primary w-2/3"></div>
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                    <div className="font-mono text-[8px] leading-tight text-on-surface-variant">
                        GENERATING YOUR LOOK
                    </div>
                  </div>
                </>
              ) : resultImage ? (
                <img src={resultImage} alt="Tryon Result" className="w-full h-full object-cover" />
              ) : (
                <div className="text-on-surface-variant opacity-40 font-mono text-[10px] uppercase tracking-widest">
                  Your try-on will appear here
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <a href={resultImage || undefined} download="weave-try-on.jpg" aria-disabled={!resultImage} className={`flex-1 border border-outline-variant py-4 font-unbounded text-[10px] tracking-widest hover:bg-surface-variant transition-colors flex items-center justify-center gap-2 ${!resultImage ? 'opacity-50 pointer-events-none' : ''}`}>
                <span className="material-symbols-outlined text-sm">download</span> DOWNLOAD
              </a>
            </div>
          </section>
        </div>


      </div>

      <footer className="mt-16 py-12 px-6 sm:px-12 border-t border-ink/10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 max-w-7xl mx-auto">
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
    </>
  );
}

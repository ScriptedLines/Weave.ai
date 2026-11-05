import React from 'react';
import { TechDocsLayout } from '../components/TechDocsLayout';

export default function TechArchive() {
  return (
    <TechDocsLayout>
      <section className="max-w-5xl mb-16">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary mb-4">Technical documentation</p>
        <h1 className="font-headline text-6xl md:text-8xl font-black leading-tight tracking-tighter mb-8 italic text-ink">
          The Full <br/>
          <span className="text-on-surface-variant/40 not-italic">Stack.</span>
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-end">
          <p className="font-body italic text-xl md:text-2xl leading-relaxed text-ink/80">
            An overview of the technologies behind virtual try-on, color analysis, and recommendations.
          </p>
          <div className="h-px bg-on-surface/10 w-full mb-4"></div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6 mb-20">
        <div className="md:col-span-2 lg:col-span-3 bg-surface-container-low p-8 relative overflow-hidden flex flex-col justify-between min-h-[400px] border border-ink/5 rounded-sm">
          <div className="bg-secondary-container text-on-secondary-container px-3 py-1 font-mono text-[10px] uppercase w-fit rotate-[-2deg] mb-8">System: Core</div>
          <h3 className="font-headline text-4xl font-bold italic mb-4 text-ink">Virtual try-on pipeline</h3>
          <p className="font-body italic text-lg opacity-80 text-ink/80">The pipeline combines garment warping, image generation, and upscaling to create try-on results.</p>
          <div className="mt-12 flex flex-wrap gap-2">
            <span className="border border-on-surface/10 px-4 py-2 font-mono text-xs uppercase text-ink/70">Garment warping</span>
            <span className="border border-on-surface/10 px-4 py-2 font-mono text-xs uppercase text-ink/70">Image generation</span>
          </div>
        </div>

        <div className="md:col-span-2 lg:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-surface-container border border-on-surface/5 p-4 flex flex-col justify-between hover:border-primary/40 transition-colors group">
            <span className="font-mono text-[10px] text-primary/50">01</span>
            <span className="font-unbounded text-xs font-black uppercase mt-4 group-hover:text-primary transition-colors text-ink">PyTorch</span>
          </div>
          <div className="bg-surface-container border border-on-surface/5 p-4 flex flex-col justify-between hover:rotate-1 transition-transform">
            <span className="font-mono text-[10px] text-primary/50">02</span>
            <span className="font-unbounded text-xs font-black uppercase mt-4 text-ink">CuPy</span>
          </div>
          <div className="bg-surface-container border border-on-surface/5 p-4 flex flex-col justify-between hover:shadow-xl transition-all">
            <span className="font-mono text-[10px] text-primary/50">03</span>
            <span className="font-unbounded text-xs font-black uppercase mt-4 text-ink">Modal</span>
          </div>
          <div className="bg-surface-container border border-on-surface/5 p-4 flex flex-col justify-between">
            <span className="font-mono text-[10px] text-primary/50">04</span>
            <span className="font-unbounded text-xs font-black uppercase mt-4 text-ink">Supabase</span>
          </div>
          <div className="bg-secondary-container p-4 flex flex-col justify-between rotate-[-1deg]">
            <span className="font-mono text-[10px] text-on-secondary-container/50">05</span>
            <span className="font-unbounded text-xs font-black uppercase mt-4 text-ink">SigLIP</span>
          </div>
          <div className="bg-surface-container border border-on-surface/5 p-4 flex flex-col justify-between">
            <span className="font-mono text-[10px] text-primary/50">06</span>
            <span className="font-unbounded text-xs font-black uppercase mt-4 text-ink">Real-ESRGAN</span>
          </div>
          <div className="bg-surface-container border border-on-surface/5 p-4 flex flex-col justify-between">
            <span className="font-mono text-[10px] text-primary/50">07</span>
            <span className="font-unbounded text-xs font-black uppercase mt-4 text-ink">SCHP</span>
          </div>
          <div className="bg-surface-container border border-on-surface/5 p-4 flex flex-col justify-between">
            <span className="font-mono text-[10px] text-primary/50">08</span>
            <span className="font-unbounded text-xs font-black uppercase mt-4 text-ink">CIHP</span>
          </div>
          <div className="bg-primary-container p-4 flex flex-col justify-between text-white hover:-translate-y-1 transition-transform">
            <span className="font-mono text-[10px] opacity-60">09</span>
            <span className="font-unbounded text-xs font-black uppercase mt-4">FastAPI</span>
          </div>
          <div className="col-span-2 bg-surface-container-highest p-4 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="font-mono text-[10px] text-primary/50">10 // COMPUTE</span>
              <span className="material-symbols-outlined text-sm">memory</span>
            </div>
            <span className="font-unbounded text-sm font-black uppercase mt-4 text-ink">GPU inference</span>
          </div>
        </div>

        <div className="md:col-span-4 lg:col-span-6 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 h-[450px] relative rounded-sm overflow-hidden border border-ink/10">
            <img alt="Illustration of a garment being adapted to a person's photo" className="w-full h-full object-cover" src="/static/tryon-pipeline-illustration.png" loading="lazy" />
            <div className="absolute bottom-5 left-5 right-5 sm:right-auto bg-surface/95 p-4 border border-on-surface/10 max-w-xs shadow-lg">
              <p className="font-mono text-[10px] uppercase text-primary mb-2">Virtual try-on · illustration</p>
              <p className="font-body italic text-sm text-ink/80">A garment is adapted to the person's image before the final result is generated.</p>
            </div>
          </div>
          <div className="flex flex-col justify-center space-y-8 px-2">
            <div>
              <span className="font-mono text-xs uppercase text-primary font-bold">Garment warping</span>
              <h3 className="font-headline text-3xl font-bold italic text-ink mt-2">Shape and fit</h3>
              <p className="font-body italic opacity-70 mt-2 text-ink/70">The selected garment is aligned with the person in the input photo.</p>
            </div>
            <div>
              <span className="font-mono text-xs uppercase text-primary font-bold">Image generation</span>
              <h3 className="font-headline text-3xl font-bold italic text-ink mt-2">The final result</h3>
              <p className="font-body italic opacity-70 mt-2 text-ink/70">The warped garment and person image are combined into a try-on result.</p>
            </div>
          </div>
        </div>
      </section>
    </TechDocsLayout>
  );
}

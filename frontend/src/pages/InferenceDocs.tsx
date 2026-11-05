import React from 'react';
import { TechDocsLayout } from '../components/TechDocsLayout';

export default function InferenceDocs() {
  return (
    <TechDocsLayout>
      <header className="flex justify-between items-center w-full mb-16">
          <div className="space-y-1">
            <span className="font-mono text-xs tracking-[0.3em] uppercase text-primary font-bold">How It's Built // Section 03</span>
            <h2 className="text-6xl font-headline font-black italic tracking-tighter leading-none text-[#1A1208]">Inference</h2>
          </div>
        </header>

        <section className="max-w-4xl mb-24 relative">
          <div className="absolute -top-10 -left-10 w-24 h-24 diagonal-hatch opacity-20 -z-10"></div>
          <p className="text-3xl lg:text-5xl font-headline italic font-light leading-tight text-on-surface">
            We designed for the edge. High-fidelity VTON usually demands server-grade GPUs. Our pipeline delivers <span className="text-primary font-black not-italic underline decoration-primary/20 decoration-8 underline-offset-4">photorealism</span> in <span className="bg-secondary-container px-2 -rotate-1 inline-block">2–3 seconds</span> using only <span className="font-bold">4 gigabytes</span> of VRAM.
          </p>
        </section>

        <div className="w-full overflow-hidden bg-primary text-on-primary py-3 mb-24 -rotate-1 shadow-xl">
          <div className="flex whitespace-nowrap gap-12 font-mono text-sm font-black uppercase tracking-widest animate-marquee">
            <span>4GB VRAM REQUIRED</span><span className="opacity-30">•</span>
            <span>2-3s INFERENCE TIME</span><span className="opacity-30">•</span>
            <span>LOW LATENCY ARCHITECTURE</span><span className="opacity-30">•</span>
            <span>PHOTOREALISTIC TEXTURE MAPPING</span><span className="opacity-30">•</span>
            <span>4GB VRAM REQUIRED</span><span className="opacity-30">•</span>
            <span>2-3s INFERENCE TIME</span><span className="opacity-30">•</span>
            <span>LOW LATENCY ARCHITECTURE</span>
          </div>
        </div>

        <section className="mb-32">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">

            <div className="group relative bg-surface-container-low p-6 transition-all hover:bg-surface-container hover:-translate-y-2 hover:rotate-1">
              <div className="absolute -top-3 -right-3 bg-secondary-container text-on-secondary-container font-unbounded text-[10px] px-2 py-1 rotate-3 z-10 font-bold shadow-sm">STEP 01</div>
              <div className="aspect-[3/4] bg-surface-dim mb-4 overflow-hidden grayscale contrast-125 group-hover:grayscale-0 transition-all">
                <img className="w-full h-full object-cover" src="/static/00089_00_seg.jpg" alt="Segmentation" />
              </div>
              <h3 className="font-unbounded text-xs font-black uppercase mb-2">Segmentation</h3>
              <p className="font-headline italic text-sm opacity-70">MediaPipe processes full-body photo for human parsing.</p>
            </div>

            <div className="group relative bg-surface-container-low p-6 transition-all hover:bg-surface-container hover:-translate-y-2 hover:-rotate-1 mt-8 md:mt-12">
              <div className="absolute -top-3 -right-3 bg-secondary-container text-on-secondary-container font-unbounded text-[10px] px-2 py-1 -rotate-2 z-10 font-bold shadow-sm">STEP 02</div>
              <div className="aspect-[3/4] bg-surface-dim mb-4 border border-outline-variant/20 flex flex-col items-center justify-center p-4">
                <div className="w-24 h-32 border-2 border-dashed border-primary/40 flex items-center justify-center">
                  <span className="font-mono text-[10px] text-primary">192x256</span>
                </div>
              </div>
              <h3 className="font-unbounded text-xs font-black uppercase mb-2">Resize &amp; Pad</h3>
              <p className="font-headline italic text-sm opacity-70">Standardizing input dimensions for neural optimization.</p>
            </div>

            <div className="group relative bg-surface-container-low p-6 transition-all hover:bg-surface-container hover:-translate-y-2 hover:rotate-2">
              <div className="absolute -top-3 -right-3 bg-secondary-container text-on-secondary-container font-unbounded text-[10px] px-2 py-1 rotate-1 z-10 font-bold shadow-sm">STEP 03</div>
              <div className="aspect-[3/4] bg-surface-dim mb-4 overflow-hidden">
                <img className="w-full h-full object-cover" src="/static/00089_00_out_warp.jpg" alt="Warp Module" />
              </div>
              <h3 className="font-unbounded text-xs font-black uppercase mb-2">AFWM Warp</h3>
              <p className="font-headline italic text-sm opacity-70">Appearance Flow Warping Module calculates optical flow.</p>
            </div>

            <div className="group relative bg-surface-container-low p-6 transition-all hover:bg-surface-container hover:-translate-y-2 hover:-rotate-1 mt-8 md:mt-12">
              <div className="absolute -top-3 -right-3 bg-secondary-container text-on-secondary-container font-unbounded text-[10px] px-2 py-1 -rotate-3 z-10 font-bold shadow-sm">STEP 04</div>
              <div className="aspect-[3/4] bg-surface-dim mb-4 flex items-center justify-center gap-1 p-2 overflow-hidden border border-outline-variant/20">
                <img className="w-full h-full object-contain filter grayscale group-hover:grayscale-0 transition-all duration-700" src="/static/00089_00_out.jpg" alt="ResUnet" />
              </div>
              <h3 className="font-unbounded text-xs font-black uppercase mb-2">ResUnet</h3>
              <p className="font-headline italic text-sm opacity-70">Composite blending using deep 8-channel input layers.</p>
            </div>

            <div className="group relative bg-surface-container-low p-6 transition-all hover:bg-surface-container hover:-translate-y-2 hover:rotate-1">
              <div className="absolute -top-3 -right-3 bg-secondary-container text-on-secondary-container font-unbounded text-[10px] px-2 py-1 rotate-2 z-10 font-bold shadow-sm">STEP 05</div>
              <div className="aspect-[3/4] bg-surface-dim mb-4 overflow-hidden group-hover:scale-105 transition-transform border border-outline-variant/20 shadow-inner">
                <img className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 transition-all duration-700" src="/static/00089_00_out.jpg" alt="Real-ESRGAN Result" />
              </div>
              <h3 className="font-unbounded text-xs font-black uppercase mb-2">Real-ESRGAN</h3>
              <p className="font-headline italic text-sm opacity-70">4x AI Upscaling for commercial-grade photorealism.</p>
            </div>
          </div>

          <div className="hidden md:block w-full h-1 mt-12 overflow-hidden opacity-20">
            <svg className="w-full h-full stroke-on-surface" preserveAspectRatio="none" viewBox="0 0 1000 10">
              <path d="M0 5 Q 50 0, 100 5 T 200 5 T 300 5 T 400 5 T 500 5 T 600 5 T 700 5 T 800 5 T 900 5 T 1000 5" fill="none" strokeDasharray="8 4" strokeWidth="2"></path>
            </svg>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="p-10 bg-surface-container-highest relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <span className="material-symbols-outlined text-9xl">memory</span>
            </div>
            <div className="relative z-10">
              <h4 className="font-unbounded text-xl font-black uppercase mb-6 flex items-center gap-3">
                <span className="w-8 h-[2px] bg-primary"></span> Memory Efficiency
              </h4>
              <p className="font-headline italic text-lg leading-relaxed mb-8 opacity-80">
                Traditional Virtual Try-On models require 12GB+ VRAM for stable inference. Through aggressive weight pruning and mixed-precision (FP16) execution, we've compressed the entire stack into 4GB—enabling high-end fashion AI on consumer-grade hardware.
              </p>
              <div className="flex gap-4">
                <div className="bg-surface px-4 py-2 border border-outline-variant/30">
                  <p className="font-mono text-[10px] uppercase opacity-50">Pruning Rate</p>
                  <p className="font-unbounded text-sm font-bold">34.2%</p>
                </div>
                <div className="bg-surface px-4 py-2 border border-outline-variant/30">
                  <p className="font-mono text-[10px] uppercase opacity-50">Precision</p>
                  <p className="font-unbounded text-sm font-bold">INT8/FP16</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-10 bg-surface-container relative overflow-hidden group">
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-secondary/5 rounded-full blur-3xl"></div>
            <div className="relative z-10">
              <h4 className="font-unbounded text-xl font-black uppercase mb-6 flex items-center gap-3">
                <span className="w-8 h-[2px] bg-secondary"></span> Latency Benchmarks
              </h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-on-surface/5 pb-2">
                  <span className="font-headline italic">AFWM Warp Phase</span>
                  <span className="font-mono text-sm font-bold text-primary">420ms</span>
                </div>
                <div className="flex justify-between items-center border-b border-on-surface/5 pb-2">
                  <span className="font-headline italic">Composition Latency</span>
                  <span className="font-mono text-sm font-bold text-primary">890ms</span>
                </div>
                <div className="flex justify-between items-center border-b border-on-surface/5 pb-2">
                  <span className="font-headline italic">Real-ESRGAN 4x Pass</span>
                  <span className="font-mono text-sm font-bold text-primary">1120ms</span>
                </div>
                <div className="pt-4">
                  <p className="font-mono text-[10px] uppercase opacity-40 mb-2">Total Average Inference</p>
                  <p className="text-4xl font-unbounded font-black italic text-secondary">2.43 SEC</p>
                </div>
              </div>
            </div>
          </div>
        </section>

      <footer className="mt-20 pt-16 border-t border-outline-variant/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div className="max-w-xs">
          <p className="font-unbounded text-[10px] font-black uppercase mb-2">Next Chapter</p>
          <p className="font-headline italic text-2xl leading-tight opacity-60 hover:opacity-100 transition-opacity cursor-pointer">
            Model Weights &amp; Distillation Strategies
          </p>
        </div>
      </footer>
    </TechDocsLayout>
  );
}

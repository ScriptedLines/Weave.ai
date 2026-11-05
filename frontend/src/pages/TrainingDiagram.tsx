import React from 'react';
import { TechDocsLayout } from '../components/TechDocsLayout';

export default function TrainingDiagram() {
  return (
    <TechDocsLayout>
      <section className="mb-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="max-w-2xl">
              <span className="space-mono text-primary text-xs mb-4 block">Section 01 // HOW IT'S BUILT</span>
              <h1 className="fraunces-display text-6xl md:text-8xl text-on-background leading-[0.85] mb-6">
                Three-Stage <br/>Knowledge <br/>Distillation.
              </h1>
            </div>
            <div className="md:w-1/3 border-t border-on-background/20 pt-4">
              <p className="fraunces-body text-xl leading-relaxed">
                An intricate ballet of neural weights. We move beyond simple GANs to a curriculum-based distillation that captures the drape, fold, and texture of high fashion with anatomical precision.
              </p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 relative">

          <div className="md:col-span-7 group">
            <div className="relative bg-surface-container-low p-8 sticker-rotate-3 border-b-4 border-primary/20 hover:rotate-0 transition-transform duration-500">
              <div className="absolute -top-4 -left-4 bg-primary text-on-primary px-3 py-1 space-mono text-[10px] z-10">STAGE_01</div>
              <div className="flex justify-between items-start mb-12">
                <h3 className="unbounded-ui text-3xl text-primary">PB-Warp <br/>Training</h3>
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-on-primary">
                  <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>texture</span>
                </div>
              </div>
              <div className="mb-8 overflow-hidden">
                <img className="w-full h-64 object-cover filter grayscale group-hover:grayscale-0 transition-all duration-700" src="/static/1.png" alt="PB-Warp Training Results" />
              </div>
              <div className="space-y-4">
                <p className="fraunces-body text-2xl">
                  PBAFWM (45ch) learns cloth warping with DensePose + Pose markers.
                </p>
                <div className="pt-6 border-t border-on-background/5">
                  <span className="space-mono text-[10px] opacity-40">PARAMETERS</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="bg-surface-container-highest px-2 py-1 space-mono text-[10px] border border-outline-variant/30">DENSEPOSE_V1</span>
                    <span className="bg-surface-container-highest px-2 py-1 space-mono text-[10px] border border-outline-variant/30">WARP_FLOW_EXTRACT</span>
                    <span className="bg-surface-container-highest px-2 py-1 space-mono text-[10px] border border-outline-variant/30">LR: 1E-4</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-5 self-center">
            <div className="relative bg-surface-container p-8 sticker-rotate-2 hover:rotate-0 transition-transform duration-500 shadow-xl">
              <div className="absolute -top-4 -right-4 bg-secondary text-on-secondary px-3 py-1 space-mono text-[10px] z-10">STAGE_02</div>
              <div className="flex justify-between items-start mb-8">
                <h3 className="unbounded-ui text-2xl text-secondary">PB-E2E <br/>Training</h3>
                <span className="material-symbols-outlined text-secondary text-4xl">dynamic_form</span>
              </div>
              <p className="fraunces-body text-xl mb-6">
                End-to-end training of Warp + ResUnetGenerator with 8-channel input.
              </p>
              <div className="mb-6 overflow-hidden border border-secondary/20 group">
                <img className="w-full h-auto object-cover filter grayscale group-hover:grayscale-0 transition-all duration-700" src="/static/2.png" alt="PB-E2E Training Results" />
              </div>
              <div className="bg-[#1A1208] text-[#F5EFE0] p-6 font-mono text-[11px] leading-tight overflow-x-auto">
                <div className="flex gap-2 text-secondary-container mb-2">
                  <span className="">// INITIALIZING GENERATOR</span>
                </div>
                <div className="opacity-70">
                  input_channels = 8 <br/>
                  latent_dim = 512 <br/>
                  architecture = "ResUnet" <br/>
                  loss = ["L1", "VGG", "Adversarial"]
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between">
                <span className="space-mono text-[10px] text-secondary">STATUS: OPTIMIZED</span>
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full border-2 border-surface bg-secondary-container"></div>
                  <div className="w-8 h-8 rounded-full border-2 border-surface bg-secondary"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-12 py-12">
            <div className="ink-bleed-divider bg-on-background h-[2px] w-full opacity-10"></div>
          </div>

          <div className="md:col-span-12">
            <div className="grid md:grid-cols-2 gap-0 bg-[#D7E3F5] text-on-surface border border-on-background/10">
              <div className="p-12 border-r border-on-background/10">
                <div className="bg-blue-600 text-white inline-block px-3 py-1 space-mono text-[10px] mb-8">STAGE_03</div>
                <h3 className="unbounded-ui text-5xl mb-8 leading-none text-blue-900">PF-E2E <br/>Student Training</h3>
                <p className="fraunces-body text-2xl mb-12">
                  StyleAFWM student trained with curriculum loss and pseudo-labels from the teacher. The final refinement stage for mobile-first inference speeds.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/40 border border-white/60">
                    <span className="space-mono text-[10px] block mb-2">LOSS FUNCTION</span>
                    <span className="unbounded-ui text-lg">Curriculum</span>
                  </div>
                  <div className="p-4 bg-white/40 border border-white/60">
                    <span className="space-mono text-[10px] block mb-2">SOURCE</span>
                    <span className="unbounded-ui text-lg">Pseudo-Labels</span>
                  </div>
                </div>
              </div>
              <div className="relative overflow-hidden group flex items-center justify-center bg-[#1A1208]/5 p-8">
                <img className="w-full h-full object-contain grayscale group-hover:grayscale-0 transition-all duration-1000" src="/static/3.png" alt="PF-E2E Student Training Results" />
                <div className="absolute inset-0 bg-blue-900/10 mix-blend-overlay pointer-events-none"></div>
                <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
                  <div className="bg-[#F5EFE0] p-4 text-[#1A1208] sticker-rotate-1 shadow-lg max-w-[200px]">
                    <p className="space-mono text-[8px] leading-tight">FIG. 42: STUDENT NETWORK REFINEMENT OUTPUT AT 400K STEPS.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="mt-32 pt-12 border-t border-on-background/10 grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <span className="space-mono text-[10px] opacity-40 block mb-4">CONTRIBUTORS</span>
            <p className="fraunces-body text-sm">Design System: The Digital Curator<br/>Architecture: Weave AI Labs<br/>Documentation: Editorial v4.2</p>
          </div>
          <div className="md:col-span-2">
            <span className="space-mono text-[10px] opacity-40 block mb-4">ABSTRACT</span>
            <p className="fraunces-body text-sm leading-relaxed italic">
              Knowledge distillation in the context of fashion synthesis requires a specific focus on structural integrity versus stylistic fluidity. Our pipeline ensures that while the "student" model remains lightweight, it retains the high-frequency topological data of the "teacher," allowing for real-time virtual try-on without the computational overhead of traditional PB-warp generators.
            </p>
          </div>
      </footer>
    </TechDocsLayout>
  );
}

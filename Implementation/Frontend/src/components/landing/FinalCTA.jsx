import React from 'react';
import { ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

export default function FinalCTA({ onNavigate }) {
  return (
    <section className="relative pt-20 pb-8 px-4 sm:px-6 lg:px-8 bg-[#020B1F] overflow-hidden border-t border-white/10">
      {/* Volumetric background core light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-brand-electric/15 rounded-full blur-[180px] pointer-events-none" />



      <div className="max-w-4xl mx-auto text-center relative z-10 space-y-8">
        {/* Floating Brand Watermark */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-3xl bg-brand-royal/50 border border-cyan-400/30 backdrop-blur-2xl p-4 flex items-center justify-center shadow-glow animate-pulse">
            <img src="/brand-logo.png" alt="StrawCRM" className="w-full h-full object-contain" />
          </div>
        </div>

        {/* Large Typography */}
        <div className="space-y-3">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight">
            Datastraw Internal Support Desk
          </h2>
          <p className="text-base sm:text-lg text-slate-300 max-w-xl mx-auto leading-relaxed">
            Centralized ticket handling, real-time collaboration, and AI assistance for Datastraw staff.
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('/dashboard')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-brand-electric to-[#0952D0] hover:from-[#0952D0] hover:to-[#0742AB] text-white text-sm font-bold shadow-blue-glow hover:shadow-cyan transition-all transform hover:-translate-y-0.5 cursor-pointer group"
          >
            <span>Access Staff Console</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate && onNavigate('/tickets')}
            className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-4 rounded-2xl border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] text-white text-sm font-semibold backdrop-blur-md transition-all cursor-pointer"
          >
            View Live Ticket Queue
          </button>
        </div>

        {/* Micro-assurances */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 pt-4">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-brand-cyan" />
            Internal Datastraw deployment
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-brand-cyan" />
            Sub-second real-time sync
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-brand-cyan" />
            Integrated AI Engine
          </span>
        </div>
      </div>

      {/* Footer System */}
      <footer className="max-w-7xl mx-auto pt-10 mt-10 border-t border-white/[0.08] flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-lg bg-white/10 p-1 flex items-center justify-center">
            <img src="/brand-logo.png" alt="StrawCRM Logo" className="w-full h-full object-contain" />
          </div>
          <span className="font-bold text-white tracking-tight text-sm">
            Straw<span className="text-brand-cyan">CRM</span>
          </span>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Datastraw.in Internal Service Desk
          </span>
        </div>

        <div className="flex items-center gap-6">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#tickets" className="hover:text-white transition-colors">Tickets</a>
          <a href="#ai" className="hover:text-white transition-colors">AI Copilot</a>
          <a href="#workflow" className="hover:text-white transition-colors">Workflow</a>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('/login')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Staff Sign In
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            All systems operational
          </span>
          <span className="text-[11px] text-slate-500">© 2026 Datastraw Technologies (datastraw.in)</span>
        </div>
      </footer>
    </section>
  );
}

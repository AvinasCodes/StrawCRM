import React from 'react';
import { Monitor, Smartphone, AlertCircle, Laptop } from 'lucide-react';

/**
 * MobileNotice
 * Displayed exclusively on mobile devices and narrow viewports (< md).
 * Informs the user that StrawCRM is built for desktop displays and workflows.
 */
export default function MobileNotice() {
  return (
    <div
      id="mobile-desktop-notice"
      className="md:hidden fixed inset-0 z-[999999] bg-[#E8EEF5] text-slate-800 flex flex-col items-center justify-center p-6 select-none overflow-y-auto"
      style={{ minHeight: '100dvh' }}
    >
      {/* Background Decorative Soft Blur Spheres */}
      <div className="absolute top-12 -left-12 w-56 h-56 rounded-full bg-blue-400/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-12 -right-12 w-56 h-56 rounded-full bg-sky-400/15 blur-3xl pointer-events-none" />

      {/* Main Alert Card */}
      <div className="relative w-full max-w-sm rounded-3xl bg-[#E8EEF5] shadow-neu-card border border-white/80 p-7 flex flex-col items-center text-center">
        {/* Brand Header */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E2E9F2] shadow-neu-inset border border-white/70 mb-6">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
          <span className="text-xs font-black tracking-wide text-slate-800">
            Straw <span className="text-sky-600">CRM</span>
          </span>
        </div>

        {/* Visual Device Icon */}
        <div className="relative mb-5 flex items-center justify-center">
          <div className="w-20 h-20 rounded-3xl bg-[#E8EEF5] shadow-neu-card border border-white/80 flex items-center justify-center text-blue-600">
            <Monitor className="w-10 h-10 stroke-[1.8]" />
          </div>
          {/* Smartphone Alert Badge Overlaid */}
          <div className="absolute -bottom-2 -right-2 w-9 h-9 rounded-2xl bg-[#E2E9F2] shadow-neu-btn border border-white/90 flex items-center justify-center text-rose-500">
            <Smartphone className="w-4 h-4 stroke-[2.2]" />
          </div>
        </div>

        {/* Headline */}
        <h1 className="text-xl font-black text-slate-900 tracking-tight mb-2.5">
          Desktop Only Experience
        </h1>

        {/* Core Message */}
        <p className="text-xs sm:text-sm font-bold text-slate-700 leading-relaxed mb-4">
          This platform is not designed for mobile devices. Please use a desktop or laptop computer for the best experience.
        </p>

        {/* Description / Rationale */}
        <div className="w-full p-3.5 rounded-2xl bg-[#E2E9F2] shadow-neu-inset border border-slate-300/40 text-left mb-6">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] font-medium text-slate-600 leading-normal">
              StrawCRM's multi-column ticket queues, live customer dossiers, and AI copilot require a full-width desktop workspace to operate properly.
            </p>
          </div>
        </div>

        {/* Status Pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#E8EEF5] shadow-neu-btn border border-white/80 text-[11px] font-extrabold text-slate-600">
          <Laptop className="w-3.5 h-3.5 text-sky-600" />
          <span>Switch to Desktop Screen</span>
        </div>
      </div>

      {/* Footer copyright */}
      <p className="mt-8 text-[11px] font-bold text-slate-400 tracking-wider uppercase">
        StrawCRM · Internal Desk
      </p>
    </div>
  );
}

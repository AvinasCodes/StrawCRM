import React from 'react';
import { Zap, Users, BarChart2, Sparkles, MessageSquare, Check } from 'lucide-react';

export default function NeumorphicBrandPanel() {
  return (
    <div className="relative w-full h-full p-5 sm:p-6 lg:p-7 xl:p-10 flex flex-col justify-between select-none overflow-hidden">
      {/* Soft Ambient Background Blur Orbs */}
      <div className="absolute top-1/4 right-8 w-64 h-64 rounded-full bg-blue-200/40 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/3 w-72 h-72 rounded-full bg-indigo-100/50 blur-3xl pointer-events-none" />
      <div className="absolute top-10 left-10 w-48 h-48 rounded-full bg-white/70 blur-2xl pointer-events-none" />

      {/* Top Header: Logo & Tagline */}
      <div className="relative z-10 shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Official Brand Logo */}
          <div className="w-9 h-9 sm:w-10 sm:h-10 relative flex items-center justify-center shrink-0">
            <img
              src="/brand-logo.png"
              alt="StrawCRM Brand Logo"
              className="w-full h-full object-contain drop-shadow-[0_4px_12px_rgba(37,99,235,0.35)]"
            />
          </div>

          <div>
            <div className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 font-sans leading-none flex items-center">
              Straw<span className="text-[#1d4ed8]">CRM</span>
            </div>
            <p className="text-[8.5px] sm:text-[9px] font-extrabold tracking-[0.25em] text-slate-400 uppercase mt-1">
              SIMPLE TICKETS. SMARTER SUPPORT.
            </p>
          </div>
        </div>
      </div>

      {/* Center Row: Headline + Features on the left, 3D Neumorphic Illustration on the right */}
      <div className="relative z-10 my-auto py-2 xl:py-4 grid grid-cols-1 xl:grid-cols-12 gap-6 xl:gap-8 items-center">
        {/* Left Sub-column: Headline, Subtitle, Feature Pills */}
        <div className="xl:col-span-6 flex flex-col justify-center">
          <h1 className="text-2xl sm:text-3xl lg:text-[30px] xl:text-[36px] font-black tracking-tight text-slate-900 leading-[1.1]">
            Better <br />
            <span className="text-[#1d64f2]">Support <br />Together</span>
          </h1>

          <p className="mt-2.5 sm:mt-3 text-xs sm:text-[13px] text-slate-500 font-medium leading-relaxed max-w-xs sm:max-w-sm">
            Manage tickets, get AI-powered insights, and deliver exceptional customer experiences.
          </p>

          {/* Feature List */}
          <div className="mt-4 sm:mt-5 space-y-2.5 sm:space-y-3">
            {/* Feature 1 */}
            <div className="flex items-center gap-3 group">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl neu-icon-circle flex items-center justify-center shrink-0 text-[#2563eb] transition-transform duration-300 group-hover:scale-105">
                <Zap className="w-4 h-4 sm:w-4.5 sm:h-4.5 fill-[#2563eb]/15" />
              </div>
              <div>
                <h2 className="text-xs sm:text-[13px] font-bold text-slate-800 leading-snug">
                  AI-Powered Responses
                </h2>
                <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
                  Save time, respond faster
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex items-center gap-3 group">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl neu-icon-circle flex items-center justify-center shrink-0 text-[#2563eb] transition-transform duration-300 group-hover:scale-105">
                <Users className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </div>
              <div>
                <h2 className="text-xs sm:text-[13px] font-bold text-slate-800 leading-snug">
                  Organize Your Team
                </h2>
                <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
                  Stay aligned and productive
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex items-center gap-3 group">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl neu-icon-circle flex items-center justify-center shrink-0 text-[#2563eb] transition-transform duration-300 group-hover:scale-105">
                <BarChart2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </div>
              <div>
                <h2 className="text-xs sm:text-[13px] font-bold text-slate-800 leading-snug">
                  Happier Customers
                </h2>
                <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
                  Turn conversations into loyalty
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sub-column: 3D Neumorphic Graphic Matching the Image */}
        <div className="xl:col-span-6 relative flex items-center justify-center min-h-[220px] sm:min-h-[240px] xl:min-h-[270px]">
          {/* Layered Neumorphic Glow Spheres Behind Graphic */}
          <div className="absolute -top-10 -right-6 w-48 h-48 rounded-full bg-blue-200/50 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-6 w-48 h-48 rounded-full bg-indigo-100/60 blur-2xl pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-white/60 blur-xl pointer-events-none" />

          {/* Main 3D Tilted Tickets Card */}
          <div className="relative z-10 w-full max-w-[210px] sm:max-w-[230px] xl:max-w-[250px] neu-ticket-floating rounded-[22px] p-4 transform -rotate-6 transition-transform duration-500 hover:rotate-[-2deg] hover:scale-[1.02]">
            {/* Card Header: Mini Logo + "Tickets" */}
            <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100/80">
              <div className="w-5 h-5 relative flex items-center justify-center shrink-0">
                <img
                  src="/brand-logo.png"
                  alt="StrawCRM"
                  className="w-5 h-5 object-contain"
                />
              </div>
              <span className="text-xs font-black text-slate-800 tracking-tight">Tickets</span>
            </div>

            {/* Split layout: 3 vertical avatars on the left, 4 ticket rows on the right */}
            <div className="flex gap-3 items-center">
              {/* Vertical Avatars Column (matching the 3 profile circles in image) */}
              <div className="flex flex-col gap-2.5 py-1 pr-2 border-r border-slate-100">
                <div className="w-6 h-6 rounded-full bg-blue-100/80 border border-white shadow-xs flex items-center justify-center text-[9px] font-bold text-blue-600">
                  <Users className="w-3 h-3 text-blue-600" />
                </div>
                <div className="w-6 h-6 rounded-full bg-indigo-100/80 border border-white shadow-xs flex items-center justify-center text-[9px] font-bold text-indigo-600">
                  <Users className="w-3 h-3 text-indigo-600" />
                </div>
                <div className="w-6 h-6 rounded-full bg-teal-100/80 border border-white shadow-xs flex items-center justify-center text-[9px] font-bold text-teal-600">
                  <Users className="w-3 h-3 text-teal-600" />
                </div>
              </div>

              {/* 4 Ticket Rows with Colored Status Dots & Skeleton bars */}
              <div className="flex-1 space-y-3">
                {/* Row 1: Blue dot */}
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#3b82f6] shadow-xs shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div className="h-2 w-full rounded-full bg-slate-200/90" />
                    <div className="h-1.5 w-3/5 rounded-full bg-slate-100" />
                  </div>
                </div>

                {/* Row 2: Green dot */}
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#10b981] shadow-xs shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div className="h-2 w-4/5 rounded-full bg-slate-200/90" />
                    <div className="h-1.5 w-1/2 rounded-full bg-slate-100" />
                  </div>
                </div>

                {/* Row 3: Orange dot */}
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] shadow-xs shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div className="h-2 w-5/6 rounded-full bg-slate-200/90" />
                    <div className="h-1.5 w-2/3 rounded-full bg-slate-100" />
                  </div>
                </div>

                {/* Row 4: Coral / Red dot */}
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444] shadow-xs shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div className="h-2 w-3/4 rounded-full bg-slate-200/90" />
                    <div className="h-1.5 w-2/5 rounded-full bg-slate-100" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Pill Badge 1: Top-Right "✦ AI" */}
          <div className="absolute top-2 sm:top-3 right-0 sm:right-2 z-20 neu-floating-pill px-3.5 py-2 rounded-2xl flex items-center gap-2 shadow-[6px_8px_20px_rgba(175,193,218,0.5),-6px_-6px_16px_#ffffff]">
            <Sparkles className="w-4 h-4 text-[#2563eb]" />
            <span className="text-xs font-black tracking-wider text-[#1d4ed8]">AI</span>
          </div>

          {/* Floating Badge 2: Bottom-Right Chat Bubble */}
          <div className="absolute bottom-8 -right-2 sm:right-1 z-20 neu-floating-pill p-2.5 rounded-xl text-[#2563eb] shadow-[6px_8px_20px_rgba(175,193,218,0.5),-6px_-6px_16px_#ffffff]">
            <MessageSquare className="w-4 h-4 fill-[#2563eb]/20" />
          </div>

          {/* Floating Sticky Note 3: Bottom "Support Smarter" */}
          <div className="absolute -bottom-3 right-2 sm:right-6 z-30 neu-sticky-note px-4 py-2 rounded-2xl transform rotate-6 hover:rotate-3 transition-transform shadow-[8px_12px_25px_rgba(175,193,218,0.5),-6px_-6px_18px_#ffffff]">
            <div className="font-caveat text-xl sm:text-2xl font-bold text-slate-700 tracking-wide text-center">
              Support Smarter
            </div>
            {/* Curved hand-drawn blue underline */}
            <svg className="w-full h-2.5 mt-0.5" viewBox="0 0 120 12" fill="none">
              <path
                d="M3 7C25 3 65 3 117 9"
                stroke="#2563eb"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Left Panel Footer: Copyright */}
      <div className="relative z-10 pt-3 border-t border-slate-200/60 shrink-0">
        <p className="text-[11px] sm:text-xs text-slate-400 font-medium">
          © {new Date().getFullYear()} StrawCRM. All rights reserved.
        </p>
      </div>
    </div>
  );
}

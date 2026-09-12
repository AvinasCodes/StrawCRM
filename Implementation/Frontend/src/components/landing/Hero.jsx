import React, { useState } from 'react';
import {
  ArrowRight,
  Play,
  Plus,
  Check,
  Sparkles,
  Zap,
  ShieldCheck,
  TrendingUp,
  Clock,
  Search,
  MessageSquare,
  FileText,
  Sliders,
  Compass,
  ArrowUpRight,
  Layers,
  ChevronRight,
  User,
} from 'lucide-react';
import HeroScene from '../three/HeroScene';

const demoTickets = [
  { id: '#TKT-1845', customer: 'Rahul Mehta', issue: 'Login issue', status: 'Open' },
  { id: '#TKT-1844', customer: 'Sneha Kapoor', issue: 'Payment not working', status: 'In Progress' },
  { id: '#TKT-1843', customer: 'Amit Shah', issue: 'Feature request', status: 'Open' },
  { id: '#TKT-1842', customer: 'Priya Nair', issue: 'Bug in dashboard', status: 'Closed' },
];

export default function Hero({ onNavigate, onShowcase }) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    setMousePos({
      x: (clientX / innerWidth - 0.5) * 16,
      y: (clientY / innerHeight - 0.5) * 16,
    });
  };

  return (
    <section
      id="product"
      onMouseMove={handleMouseMove}
      className="relative text-white overflow-hidden select-none bg-[#030c24] flex flex-col justify-center pt-20 pb-8 sm:pt-24 sm:pb-12 lg:pt-24 lg:pb-14"
    >
      {/* ─── Ambient Liquid Glass Caustics & Glowing Blooms ─── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Large central caustic cyan bloom */}
        <div className="absolute top-1/4 right-1/4 w-[650px] h-[650px] rounded-full bg-radial from-cyan-500/20 via-blue-600/15 to-transparent blur-[120px] animate-pulse" style={{ animationDuration: '6s' }} />
        {/* Top-right royal glow */}
        <div className="absolute -top-24 -right-24 w-[550px] h-[550px] rounded-full bg-radial from-blue-500/25 via-indigo-600/10 to-transparent blur-[140px]" />
        {/* Bottom liquid wave glow */}
        <div className="absolute -bottom-32 left-1/4 w-[800px] h-[400px] rounded-full bg-radial from-sky-400/15 via-blue-600/10 to-transparent blur-[130px]" />
        {/* Cosmic star dust */}
        <div className="hero-stars opacity-40" />

        {/* Liquid Caustic Wave Ribbons (SVG curves matching bottom of screenshot) */}
        <div className="absolute -bottom-8 inset-x-0 h-48 opacity-65 pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 1440 280" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <path
              d="M0,180 C320,80 520,240 840,140 C1140,40 1320,180 1440,130 L1440,280 L0,280 Z"
              fill="url(#liquid-wave-grad)"
              className="drop-shadow-[0_-8px_20px_rgba(34,211,238,0.3)]"
            />
            <path
              d="M0,220 C280,140 600,270 960,190 C1200,130 1360,210 1440,180 L1440,280 L0,280 Z"
              fill="url(#liquid-wave-grad-2)"
              opacity="0.6"
            />
            <defs>
              <linearGradient id="liquid-wave-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0284c7" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#0369a1" stopOpacity="0.1" />
              </linearGradient>
              <linearGradient id="liquid-wave-grad-2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.3" />
                <stop offset="60%" stopColor="#38bdf8" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#020b1f" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          {/* ─────────────────────────────────────────────────────────────
              LEFT COLUMN: HERO COPY & GLASS STATS (Matches Screenshot)
          ───────────────────────────────────────────────────────────── */}
          <div className="lg:col-span-6 flex flex-col space-y-7 text-left">
            {/* Eyebrow Capsule */}
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-slate-900/50 backdrop-blur-xl border border-sky-400/30 text-sky-300 text-[11px] font-extrabold tracking-wider uppercase shadow-[0_0_18px_rgba(56,189,248,0.2),inset_0_1px_1px_rgba(255,255,255,0.4)] w-fit">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400/30" />
              <span>DATASTRAW INTERNAL OPERATIONS DESK</span>
            </div>

            {/* Giant Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-[60px] font-black text-white leading-[1.06] tracking-tight">
              Internal Support<br />
              &amp; <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-300 to-blue-500 drop-shadow-[0_0_35px_rgba(34,211,238,0.45)]">Client Ticket</span><br />
              Operations.
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-slate-300/90 max-w-xl font-normal leading-relaxed">
              The dedicated internal helpdesk for Datastraw.in teams. Triage client requests,
              streamline incident resolution, and leverage Gemini AI intelligence across all services.
            </p>

            {/* CTA Buttons Row */}
            <div className="flex items-center gap-4 flex-wrap pt-1">
              {/* Primary Glowing Liquid Glass CTA */}
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('/dashboard')}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 text-white font-extrabold text-sm shadow-[0_0_30px_rgba(14,165,233,0.7),inset_0_1px_2px_rgba(255,255,255,0.85)] hover:shadow-[0_0_45px_rgba(34,211,238,0.9)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group"
              >
                <span>Access Staff Desk</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Secondary Translucent Liquid Glass Button */}
              <button
                type="button"
                onClick={() => onShowcase && onShowcase()}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-900/40 hover:bg-slate-800/60 backdrop-blur-xl border border-sky-400/30 hover:border-cyan-400/60 text-white font-bold text-sm shadow-[0_4px_24px_rgba(0,10,35,0.4),inset_0_1px_1px_rgba(255,255,255,0.25)] hover:shadow-[0_0_25px_rgba(34,211,238,0.25)] active:scale-[0.98] transition-all cursor-pointer group"
              >
                <Play className="w-4 h-4 fill-white text-white group-hover:scale-110 transition-transform" />
                <span>System Overview</span>
              </button>
            </div>

            {/* Stats Bar (Single Seamless Floating Liquid Glass Pill Box) */}
            <div className="p-4 sm:p-4.5 rounded-2xl bg-slate-900/45 backdrop-blur-2xl border border-sky-400/25 shadow-[0_12px_35px_rgba(0,5,25,0.5),inset_0_1px_2px_rgba(255,255,255,0.25)] grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-2 max-w-xl">
              {/* Stat 1 */}
              <div className="flex items-center gap-2.5 sm:border-r sm:border-sky-400/15 sm:pr-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shrink-0 shadow-[0_0_10px_rgba(34,211,238,0.3)]">
                  <Zap className="w-4 h-4 text-cyan-300 fill-cyan-300/30" />
                </div>
                <div>
                  <div className="text-base sm:text-lg font-black text-white tracking-tight leading-none">&lt;10ms</div>
                  <div className="text-[10px] text-blue-200/70 font-semibold tracking-wide mt-1">Real-Time Sync</div>
                </div>
              </div>

              {/* Stat 2 */}
              <div className="flex items-center gap-2.5 sm:border-r sm:border-sky-400/15 sm:px-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-400/30 flex items-center justify-center text-sky-300 shrink-0 shadow-[0_0_10px_rgba(56,189,248,0.3)]">
                  <ShieldCheck className="w-4 h-4 text-sky-300" />
                </div>
                <div>
                  <div className="text-base sm:text-lg font-black text-white tracking-tight leading-none">99.8%</div>
                  <div className="text-[10px] text-blue-200/70 font-semibold tracking-wide mt-1">Internal SLA</div>
                </div>
              </div>

              {/* Stat 3 */}
              <div className="flex items-center gap-2.5 sm:border-r sm:border-sky-400/15 sm:px-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0 shadow-[0_0_10px_rgba(129,140,248,0.3)]">
                  <TrendingUp className="w-4 h-4 text-indigo-300" />
                </div>
                <div>
                  <div className="text-base sm:text-lg font-black text-white tracking-tight leading-none">3x</div>
                  <div className="text-[10px] text-blue-200/70 font-semibold tracking-wide mt-1">Staff Efficiency</div>
                </div>
              </div>

              {/* Stat 4 */}
              <div className="flex items-center gap-2.5 sm:pl-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-400/30 flex items-center justify-center text-purple-300 shrink-0 shadow-[0_0_10px_rgba(192,132,252,0.3)]">
                  <Clock className="w-4 h-4 text-purple-300" />
                </div>
                <div>
                  <div className="text-base sm:text-lg font-black text-white tracking-tight leading-none">24/7</div>
                  <div className="text-[10px] text-blue-200/70 font-semibold tracking-wide mt-1">Gemini AI Core</div>
                </div>
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              RIGHT COLUMN: 3D LIQUID GLASS DASHBOARD COMPOSITION
          ───────────────────────────────────────────────────────────── */}
          <div className="lg:col-span-6 relative flex items-center justify-center py-4 lg:py-2">
            {/* Ambient Refractive Background Glass Disc / Halo */}
            <div
              className="absolute w-[380px] sm:w-[500px] lg:w-[580px] h-[280px] sm:h-[360px] lg:h-[400px] rounded-[40px] bg-gradient-to-tr from-sky-500/15 via-blue-600/10 to-transparent border border-sky-400/30 blur-xs shadow-[0_0_70px_rgba(14,165,233,0.3)] -rotate-3 pointer-events-none"
              style={{
                transform: `rotate(-3deg) translate3d(${mousePos.x * 0.25}px, ${mousePos.y * 0.25}px, 0)`,
                transition: 'transform 0.3s ease-out',
              }}
            />

            {/* Master Dashboard Mockup Container */}
            <div
              className="relative w-full max-w-[620px] rounded-3xl bg-[#091838]/80 backdrop-blur-2xl border-2 border-sky-400/40 p-1.5 sm:p-2 shadow-[0_30px_70px_rgba(0,0,0,0.8),0_0_50px_rgba(14,165,233,0.35),inset_0_1px_2px_rgba(255,255,255,0.4)] cursor-pointer group transition-all"
              onClick={() => onNavigate && onNavigate('/dashboard')}
              title="Click to enter Staff Dashboard"
              style={{
                transform: `perspective(1200px) rotateY(-4deg) rotateX(2deg) translate3d(${mousePos.x * 0.35}px, ${mousePos.y * 0.35}px, 0)`,
                transition: 'transform 0.25s ease-out',
              }}
            >
              {/* Inner Dashboard Canvas */}
              <div className="w-full bg-[#f8fbff] text-slate-800 rounded-2xl overflow-hidden grid grid-cols-12 shadow-inner border border-white/60">
                {/* 1. Left Sidebar (col 4) */}
                <div className="col-span-4 bg-gradient-to-b from-[#05245d] via-[#041a46] to-[#020e29] text-slate-200 p-3 sm:p-3.5 flex flex-col justify-between select-none">
                  <div>
                    {/* Brand */}
                    <div className="flex items-center gap-1.5 mb-3">
                      <img
                        src="/brand-logo.png"
                        alt="StrawCRM Logo"
                        className="w-4 h-4 object-contain shrink-0 drop-shadow-[0_0_6px_rgba(34,211,238,0.5)]"
                      />
                      <span className="font-extrabold text-[11px] text-white tracking-tight">
                        Straw<span className="text-cyan-400">CRM</span>
                      </span>
                    </div>

                    {/* Nav Items */}
                    <div className="space-y-1 text-[9px] font-bold">
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-600 text-white shadow-sm">
                        <Compass className="w-3 h-3 text-cyan-300" />
                        <span>Dashboard</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 text-slate-400 hover:text-white">
                        <FileText className="w-3 h-3" />
                        <span>Tickets</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 text-slate-400 hover:text-white">
                        <Plus className="w-3 h-3" />
                        <span>Create Ticket</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 text-slate-400 hover:text-white">
                        <User className="w-3 h-3" />
                        <span>Customers</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 text-slate-400 hover:text-white">
                        <Sparkles className="w-3 h-3 text-cyan-400" />
                        <span>AI Assistant</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 text-slate-400 hover:text-white">
                        <TrendingUp className="w-3 h-3" />
                        <span>Reports</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 text-slate-400 hover:text-white">
                        <Sliders className="w-3 h-3" />
                        <span>Settings</span>
                      </div>
                    </div>
                  </div>

                  {/* User Profile */}
                  <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-900 font-black text-[9px] flex items-center justify-center shrink-0">
                      A
                    </div>
                    <div className="min-w-0">
                      <div className="text-[9px] font-bold text-white truncate">Aaryan Singh</div>
                      <div className="text-[7px] text-blue-200/60 truncate">admin@datastraw.in</div>
                    </div>
                  </div>
                </div>

                {/* 2. Main Dashboard Board (col 8) */}
                <div className="col-span-8 p-3 sm:p-4 bg-slate-50/90 flex flex-col space-y-3">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-black text-slate-900 leading-tight">
                        Aaryan 👋
                      </h3>
                      <p className="text-[8px] text-slate-400">Here's what's happening today.</p>
                    </div>
                    <button
                      type="button"
                      className="px-2 py-1 rounded-md bg-blue-600 text-white text-[8px] font-bold flex items-center gap-1 shadow-xs"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      <span>Create Ticket</span>
                    </button>
                  </div>

                  {/* 3 Metric Cards */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {/* Open */}
                    <div className="p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs relative">
                      <div className="w-4 h-4 rounded-md bg-orange-100 text-orange-600 flex items-center justify-center absolute top-1.5 right-1.5">
                        <Clock className="w-2.5 h-2.5" />
                      </div>
                      <div className="text-sm font-black text-slate-900 leading-none">12</div>
                      <div className="text-[7px] font-bold text-slate-500 mt-1">Open Tickets</div>
                      <div className="text-[6px] text-emerald-600 font-semibold mt-0.5">↑ 2 from yesterday</div>
                    </div>

                    {/* In Progress */}
                    <div className="p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs relative">
                      <div className="w-4 h-4 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center absolute top-1.5 right-1.5">
                        <ArrowUpRight className="w-2.5 h-2.5" />
                      </div>
                      <div className="text-sm font-black text-slate-900 leading-none">8</div>
                      <div className="text-[7px] font-bold text-slate-500 mt-1">In Progress</div>
                      <div className="text-[6px] text-emerald-600 font-semibold mt-0.5">↑ 1 from yesterday</div>
                    </div>

                    {/* Closed */}
                    <div className="p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs relative">
                      <div className="w-4 h-4 rounded-md bg-emerald-100 text-emerald-600 flex items-center justify-center absolute top-1.5 right-1.5">
                        <Check className="w-2.5 h-2.5" />
                      </div>
                      <div className="text-sm font-black text-slate-900 leading-none">25</div>
                      <div className="text-[7px] font-bold text-slate-500 mt-1">Closed</div>
                      <div className="text-[6px] text-emerald-600 font-semibold mt-0.5">↑ 12 from yesterday</div>
                    </div>
                  </div>

                  {/* Search Bar */}
                  <div className="h-6 px-2.5 bg-white border border-slate-200 rounded-lg flex items-center gap-1.5 text-[8px] text-slate-400 shadow-2xs">
                    <Search className="w-2.5 h-2.5 text-slate-400" />
                    <span>Search tickets...</span>
                  </div>

                  {/* Recent Tickets Table */}
                  <div className="rounded-xl bg-white border border-slate-200/90 overflow-hidden shadow-2xs">
                    <div className="px-2.5 py-1.5 bg-slate-100/70 border-b border-slate-200/80 flex items-center justify-between text-[8px] font-black text-slate-800 uppercase tracking-wider">
                      <span>Recent Tickets</span>
                      <span className="text-blue-600 cursor-pointer">View all →</span>
                    </div>

                    <div className="divide-y divide-slate-100 text-[8px]">
                      {demoTickets.map((t) => (
                        <div key={t.id} className="px-2.5 py-1.5 flex items-center justify-between">
                          <span className="font-mono font-bold text-blue-600">{t.id}</span>
                          <span className="font-bold text-slate-800 truncate max-w-[60px]">{t.customer}</span>
                          <span className="text-slate-500 truncate max-w-[80px]">{t.issue}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[7px] font-extrabold ${
                              t.status === 'Open'
                                ? 'bg-rose-100 text-rose-700'
                                : t.status === 'In Progress'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {t.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                THE 4 3D FLOATING LIQUID GLASS CARDS
            ───────────────────────────────────────────────────────────── */}

            {/* 1. TOP-LEFT FLOATING CARD: "New Ticket" (Compact) */}
            <div
              className="absolute -top-5 sm:-top-6 left-0 sm:left-2 z-20 transition-all pointer-events-none scale-85 sm:scale-90"
              style={{
                transform: `rotate(-5deg) translate3d(${-mousePos.x * 0.5}px, ${-mousePos.y * 0.5}px, 0)`,
              }}
            >
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#092252]/85 backdrop-blur-2xl border border-sky-300/50 shadow-[0_15px_35px_rgba(0,0,0,0.6),0_0_20px_rgba(34,211,238,0.25),inset_0_1px_1px_rgba(255,255,255,0.7)] text-white">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-400 to-teal-400 text-slate-950 font-black flex items-center justify-center shadow-[0_0_12px_rgba(52,211,153,0.6)] shrink-0">
                  <Plus className="w-4 h-4 stroke-[3]" />
                </div>
                <div>
                  <div className="text-xs font-black text-white leading-none">New Ticket</div>
                  <div className="text-[9px] text-cyan-200/90 font-medium mt-0.5">
                    Customer request • <span className="text-cyan-300 font-bold">2m ago</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. RIGHT FLOATING VERTICAL PANEL: "✦ AI Assistant" (Flanking Right Side) */}
            <div
              className="absolute -right-2 sm:-right-5 top-8 sm:top-10 z-25 transition-all pointer-events-none hidden sm:block scale-80 sm:scale-85 origin-top-right"
              style={{
                transform: `rotate(2deg) translate3d(${mousePos.x * 0.5}px, ${mousePos.y * 0.5}px, 0)`,
              }}
            >
              <div className="w-44 sm:w-48 p-3 rounded-2xl bg-[#071d47]/85 backdrop-blur-2xl border border-sky-300/40 shadow-[0_20px_45px_rgba(0,0,0,0.7),0_0_25px_rgba(14,165,233,0.3),inset_0_1px_1px_rgba(255,255,255,0.6)] space-y-1.5 text-white">
                {/* Panel Header */}
                <div className="flex items-center gap-1.5 pb-1 border-b border-white/10">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400/40" />
                  <span className="text-xs font-black text-white tracking-tight">AI Assistant</span>
                </div>

                {/* 4 Frosted Action Pills */}
                <div className="space-y-1 text-[10px] font-semibold text-slate-200">
                  <div className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 flex items-center gap-1.5 shadow-2xs">
                    <FileText className="w-3 h-3 text-cyan-300 shrink-0" />
                    <span className="truncate">Summarize this ticket</span>
                  </div>
                  <div className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 flex items-center gap-1.5 shadow-2xs">
                    <MessageSquare className="w-3 h-3 text-cyan-300 shrink-0" />
                    <span className="truncate">Suggest a response</span>
                  </div>
                  <div className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 flex items-center gap-1.5 shadow-2xs">
                    <Sliders className="w-3 h-3 text-cyan-300 shrink-0" />
                    <span className="truncate">Classify priority</span>
                  </div>
                  <div className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 flex items-center gap-1.5 shadow-2xs">
                    <Search className="w-3 h-3 text-cyan-300 shrink-0" />
                    <span className="truncate">Find similar issues</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. BOTTOM-LEFT FLOATING CARD: "Sneha Kapoor" (Positioned at bottom edge) */}
            <div
              className="absolute -bottom-3 sm:-bottom-4 left-6 sm:left-14 z-30 transition-all pointer-events-none scale-85 sm:scale-90"
              style={{
                transform: `rotate(4deg) translate3d(${-mousePos.x * 0.4}px, ${-mousePos.y * 0.4}px, 0)`,
              }}
            >
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#08204d]/85 backdrop-blur-2xl border border-sky-300/50 shadow-[0_15px_35px_rgba(0,0,0,0.65),0_0_20px_rgba(34,211,238,0.25),inset_0_1px_1px_rgba(255,255,255,0.7)] text-white">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-rose-200 to-amber-200 text-rose-950 font-black text-[10px] flex items-center justify-center shrink-0 shadow-sm ring-1 ring-white/30">
                  S
                </div>
                <div>
                  <div className="text-[11px] font-black text-white leading-tight">Sneha Kapoor</div>
                  <div className="text-[8.5px] text-slate-300 font-medium">Payment not working • <span className="font-mono text-cyan-300 font-bold">#TKT-1844</span></div>
                </div>
                <span className="px-1.5 py-0.5 rounded-full bg-rose-500/80 text-white font-extrabold text-[7.5px] ml-0.5">
                  Open
                </span>
              </div>
            </div>

            {/* 4. BOTTOM-RIGHT FLOATING CARD: "Issue Resolved!" (Positioned at bottom edge) */}
            <div
              className="absolute -bottom-3 sm:-bottom-4 right-3 sm:right-6 z-30 transition-all pointer-events-none scale-85 sm:scale-90"
              style={{
                transform: `rotate(-3deg) translate3d(${mousePos.x * 0.4}px, ${mousePos.y * 0.4}px, 0)`,
              }}
            >
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#092252]/85 backdrop-blur-2xl border border-sky-300/50 shadow-[0_15px_35px_rgba(0,0,0,0.65),0_0_20px_rgba(34,211,238,0.25),inset_0_1px_1px_rgba(255,255,255,0.7)] text-white">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-emerald-400 to-teal-400 text-slate-950 font-black flex items-center justify-center shadow-[0_0_12px_rgba(52,211,153,0.6)] shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <div>
                  <div className="text-[11px] font-black text-white leading-none">Issue Resolved!</div>
                  <div className="text-[8.5px] text-cyan-200/90 font-medium mt-0.5">Customer notified • <span className="text-cyan-300 font-bold">3m ago</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Managed Space Below: Live Internal Operations Capabilities Ribbon */}
        <div className="mt-8 sm:mt-10 pt-5 border-t border-sky-400/15 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-300/80">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-bold text-white text-[11px] sm:text-xs tracking-wide">Datastraw Internal Mesh Active</span>
            <span className="text-[10px] text-cyan-300/80 font-mono px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30">Live Sync</span>
          </div>

          <div className="flex items-center gap-5 sm:gap-8 text-[11px] text-slate-300/90 font-semibold">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Role-Based Triage</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Gemini 1.5 Synthesis</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sub-Second Response</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

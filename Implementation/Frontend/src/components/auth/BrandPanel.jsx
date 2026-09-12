import React from 'react';
import {
  Ticket,
  HeartHandshake,
  Sparkles,
  TrendingUp,
  Clock,
  Layers,
} from 'lucide-react';

export default function BrandPanel() {
  const benefits = [
    {
      title: 'Triage Tickets',
      desc: 'Centralize and prioritize client service tickets.',
      icon: Ticket,
    },
    {
      title: 'Accelerate SLAs',
      desc: 'Resolve Datastraw client inquiries faster.',
      icon: HeartHandshake,
    },
    {
      title: 'AI Assistant',
      desc: 'Instant context summaries and smart replies.',
      icon: Sparkles,
      highlight: true,
    },
    {
      title: 'Internal Metrics',
      desc: 'Real-time telemetry and team performance.',
      icon: TrendingUp,
    },
  ];

  return (
    <div className="relative h-full w-full flex flex-col justify-between p-6 lg:p-8 xl:p-10 bg-gradient-to-br from-[#010D36] via-[#011662] to-[#011E79] text-white select-none overflow-hidden">
      {/* Background Soft Orbital & Glow Effects */}
      <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-brand-electric/20 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-24 w-80 h-80 rounded-full bg-brand-cyan/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 left-1/4 w-72 h-72 rounded-full bg-[#011E79]/40 blur-2xl pointer-events-none" />

      {/* Grid Pattern Overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }}
      />

      {/* Top Header & Core Value Proposition */}
      <div className="relative z-10">
        {/* Brand Anchor */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/10 p-1.5 backdrop-blur-md border border-white/20 shadow-md flex items-center justify-center shrink-0">
            <img
              src="/brand-logo.png"
              alt="StrawCRM Logo"
              className="w-full h-full object-contain drop-shadow"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-white font-sans">
                Straw<span className="text-brand-cyan">CRM</span>
              </span>
              <span className="px-2 py-0.5 text-[9px] uppercase font-semibold tracking-wider bg-brand-electric/30 text-cyan-200 border border-brand-cyan/30 rounded-full">
                Datastraw Internal
              </span>
            </div>
            <p className="text-[11px] text-blue-200/80 font-medium tracking-wide">
              Datastraw.in Service Operations
            </p>
          </div>
        </div>

        {/* Primary Marketing Headline */}
        <div className="mt-6 lg:mt-7 max-w-lg">
          <h1 className="text-2xl lg:text-3xl xl:text-[2.1rem] font-extrabold tracking-tight text-white leading-[1.18]">
            Internal Support <br />
            &amp;{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-cyan via-sky-300 to-blue-200 drop-shadow-sm">
              Incident Management Desk
            </span>
          </h1>
          <p className="mt-2 text-xs lg:text-[13px] text-blue-100/80 leading-relaxed max-w-md">
            Internal ticketing workspace for Datastraw.in teams. Coordinate client issues,
            analyze requests with AI assistance, and track SLA resolution metrics.
          </p>
        </div>

        {/* Feature Benefits Grid */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-lg">
          {benefits.map((b) => {
            const Icon = b.icon;
            return (
              <div
                key={b.title}
                className={`p-2.5 rounded-xl border transition-all duration-150 ${
                  b.highlight
                    ? 'bg-gradient-to-r from-blue-950/60 to-blue-900/40 border-brand-cyan/30 shadow-sm'
                    : 'bg-white/[0.04] border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                      b.highlight
                        ? 'bg-brand-cyan/20 text-brand-cyan'
                        : 'bg-white/10 text-blue-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <h2 className="text-xs font-semibold text-white tracking-tight">
                    {b.title}
                  </h2>
                </div>
                <p className="text-[11px] text-blue-100/70 leading-snug pl-8">
                  {b.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Abstract StrawCRM Ticket UI Illustration (compact footer card) */}
      <div className="relative z-10 pt-4 border-t border-white/10 mt-4">
        <div className="p-3 rounded-xl bg-white/[0.05] backdrop-blur-md border border-white/15 shadow-lg max-w-lg">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-[11px] text-blue-200 font-medium">
            <div className="flex items-center gap-1.5">
              <Layers className="w-3 h-3 text-brand-cyan" />
              <span>Active Workspace Preview</span>
            </div>
            <span className="flex items-center gap-1 text-emerald-300 font-mono text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Connected
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs font-semibold text-brand-cyan">#TKT-1044</span>
                <span className="text-xs text-white font-medium truncate">Payment not working</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 shrink-0">
              <Clock className="w-2.5 h-2.5" />
              In Progress
            </span>
          </div>

          {/* AI Assistant pill */}
          <div className="mt-2 p-1.5 bg-gradient-to-r from-brand-electric/25 to-brand-cyan/20 rounded-lg border border-brand-cyan/30 flex items-center gap-1.5 text-[10px]">
            <Sparkles className="w-3 h-3 text-brand-cyan shrink-0" />
            <span className="text-blue-100 truncate">
              <strong className="text-white">AI Assistant:</strong> Drafted response & summary ready
            </span>
          </div>
        </div>

        <p className="mt-2.5 text-[11px] italic text-blue-200/60 tracking-wide text-center sm:text-left">
          “Happy Customers Build Stronger Businesses.”
        </p>
      </div>
    </div>
  );
}

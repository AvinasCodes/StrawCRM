import React, { useState } from 'react';
import { LayoutDashboard, Ticket, FileText, Bot, ArrowRight, Check } from 'lucide-react';

const VIEWS = [
  {
    id: 'dashboard',
    title: 'Executive Dashboard',
    desc: 'At-a-glance KPI cards, SLA progress, and latest team activity stream.',
    icon: LayoutDashboard,
    badge: 'Overview',
    previewImage: '/brand-icon.png',
  },
  {
    id: 'tickets',
    title: 'Tickets Workspace',
    desc: 'Multi-criteria search, date filters, bulk actions, and instant status pills.',
    icon: Ticket,
    badge: 'Triage',
  },
  {
    id: 'detail',
    title: 'Ticket Detail & Audit Notes',
    desc: 'Complete customer context, internal agent logs, and state transition histories.',
    icon: FileText,
    badge: 'Resolution',
  },
  {
    id: 'ai',
    title: 'Gemini AI Copilot',
    desc: 'Automated summaries, suggested reply drafts, and customer sentiment classification.',
    icon: Bot,
    badge: 'Intelligence',
  },
];

export default function ProductShowcase({ onNavigate }) {
  const [activeView, setActiveView] = useState('dashboard');

  return (
    <section className="relative py-24 px-4 sm:px-6 lg:px-8 bg-[#020B1F] overflow-hidden">
      {/* Ambient background illumination */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-brand-royal/20 rounded-full blur-[200px] pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-12 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/20 text-brand-cyan text-xs font-semibold uppercase tracking-wider">
            <span>Unified Architecture</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
            One interface. Infinite clarity.
          </h2>
          <p className="text-sm text-slate-400">
            Switch effortlessly between macro metrics, granular ticket queues, and AI synthesis without ever losing your place.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {VIEWS.map((v) => {
            const Icon = v.icon;
            const isActive = activeView === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setActiveView(v.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-brand-electric text-white border-cyan-400/50 shadow-blue-glow scale-105'
                    : 'bg-white/[0.04] text-slate-300 border-white/10 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{v.title}</span>
              </button>
            );
          })}
        </div>

        {/* Large 3D Tilt Layered Product Presentation Canvas */}
        <div className="relative rounded-3xl border border-white/20 bg-gradient-to-b from-[#011E79]/40 to-[#011662]/70 backdrop-blur-2xl p-6 sm:p-10 shadow-2xl shadow-black/50 overflow-hidden transform-gpu">
          {/* Subtle Window Chrome Header */}
          <div className="pb-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="ml-3 text-[11px] font-mono text-slate-400">strawcrm.app/{activeView}</span>
            </div>
            <span className="text-[10px] bg-brand-cyan/20 text-brand-cyan px-2 py-0.5 rounded-full font-mono font-bold">
              Live Sync Active
            </span>
          </div>

          {/* Active View Visual Demonstration Content */}
          <div className="mt-6 min-h-[360px] sm:min-h-[420px] flex items-center justify-center">
            {activeView === 'dashboard' && (
              <div className="w-full space-y-6 animate-in fade-in zoom-in-95 duration-300">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                  <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/10">
                    <p className="text-[11px] text-slate-400">Active Queue</p>
                    <p className="text-2xl font-bold text-white font-mono mt-1">12 Open</p>
                    <span className="text-[10px] text-rose-400">Critical: 2</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/10">
                    <p className="text-[11px] text-slate-400">In Progress</p>
                    <p className="text-2xl font-bold text-brand-cyan font-mono mt-1">8 Active</p>
                    <span className="text-[10px] text-blue-300">Assigned reps</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/10">
                    <p className="text-[11px] text-slate-400">Resolved</p>
                    <p className="text-2xl font-bold text-emerald-400 font-mono mt-1">25 Closed</p>
                    <span className="text-[10px] text-emerald-300">98% satisfaction</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/10">
                    <p className="text-[11px] text-slate-400">Total Ingest</p>
                    <p className="text-2xl font-bold text-white font-mono mt-1">45 Tickets</p>
                    <span className="text-[10px] text-slate-300">30-day window</span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-300 pb-2 border-b border-white/10">
                    <span className="font-semibold text-white">Recent Support Stream</span>
                    <span className="text-[11px] text-brand-cyan">Live telemetry</span>
                  </div>
                  <div className="space-y-2">
                    {[
                      { id: '#TKT-1045', user: 'Rahul Mehta', issue: 'Login OTP delay', state: 'Open', color: 'bg-[#FEECEB] text-[#E03137]' },
                      { id: '#TKT-1044', user: 'Sneha Kapoor', issue: 'Payment not working on checkout', state: 'In Progress', color: 'bg-[#E8F1FD] text-[#1967D2]' },
                      { id: '#TKT-1042', user: 'Priya Nair', issue: 'Bug in dashboard report CSV export', state: 'Closed', color: 'bg-[#E6F4EA] text-[#137333]' },
                    ].map((row) => (
                      <div key={row.id} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] text-xs">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-brand-cyan font-bold">{row.id}</span>
                          <span className="text-white font-medium">{row.user}</span>
                          <span className="text-slate-400 hidden sm:inline">{row.issue}</span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${row.color}`}>
                          {row.state}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeView === 'tickets' && (
              <div className="w-full space-y-4 animate-in fade-in zoom-in-95 duration-300">
                <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-between">
                  <span className="text-xs text-white font-semibold">Triage Filter Engine</span>
                  <span className="text-xs text-brand-cyan font-mono">Showing 1-8 of 45 tickets</span>
                </div>
                <div className="space-y-2">
                  {[
                    { id: '#TKT-1045', name: 'Rahul Mehta', title: 'Login issue on 2FA OTP timeout', badge: 'Open' },
                    { id: '#TKT-1044', name: 'Sneha Kapoor', title: 'Payment not working on checkout', badge: 'In Progress' },
                    { id: '#TKT-1043', name: 'Amit Shah', title: 'Feature request: Multi-currency billing', badge: 'Open' },
                    { id: '#TKT-1042', name: 'Priya Nair', title: 'Bug in dashboard report CSV export', badge: 'Closed' },
                    { id: '#TKT-1041', name: 'Karan Verma', title: 'Account recovery assistance required', badge: 'In Progress' },
                  ].map((t) => (
                    <div key={t.id} className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-brand-cyan">{t.id}</span>
                        <span className="font-semibold text-white">{t.name}</span>
                        <span className="text-slate-300 truncate max-w-sm">{t.title}</span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 text-white">
                        {t.badge}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeView === 'detail' && (
              <div className="w-full max-w-3xl mx-auto space-y-4 p-6 rounded-2xl bg-white/[0.04] border border-white/10 animate-in fade-in zoom-in-95 duration-300 text-left">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div>
                    <span className="text-xs font-mono text-brand-cyan font-bold">Ticket #TKT-1044</span>
                    <p className="text-base font-bold text-white mt-0.5">Payment not working on checkout</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#E8F1FD] text-[#1967D2]">
                    In Progress
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400">Customer</span>
                    <p className="font-semibold text-white">Sneha Kapoor (sneha@example.com)</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Created At</span>
                    <p className="font-semibold text-white">Sep 9, 2026 at 10:24 AM</p>
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 text-xs text-slate-200">
                  "I am unable to complete the payment. It shows an error every time I try. Please help."
                </div>
                <div className="space-y-1.5 pt-2">
                  <p className="text-[11px] font-semibold text-slate-400">Internal Notes & Audit Log:</p>
                  <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-400/20 text-xs text-blue-200">
                    <strong>Support Agent:</strong> Investigating payment gateway 3D-secure timeout. Contacted merchant desk.
                  </div>
                </div>
              </div>
            )}

            {activeView === 'ai' && (
              <div className="w-full max-w-2xl mx-auto p-6 rounded-2xl bg-white/[0.04] border border-cyan-400/30 animate-in fade-in zoom-in-95 duration-300 space-y-4 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white text-sm font-bold">
                    <Bot className="w-5 h-5 text-brand-cyan" />
                    <span>Gemini AI Ticket Synthesis</span>
                  </div>
                  <span className="text-[10px] font-mono text-brand-cyan bg-brand-cyan/20 px-2 py-0.5 rounded-full">
                    Latency: 420ms
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2 text-xs">
                  <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Executive Summary</p>
                  <p className="text-slate-200 leading-relaxed">
                    Customer experienced a gateway 3D-Secure timeout on payment confirmation. System automatically initiated trace #TX-99201. Transaction release scheduled.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-r from-[#011E79]/80 to-[#0B63F6]/30 border border-cyan-400/20 space-y-2 text-xs">
                  <p className="text-brand-cyan font-semibold uppercase tracking-wider text-[10px]">Suggested Response Draft</p>
                  <p className="text-white leading-relaxed font-sans">
                    "Hi Sneha, I've verified your transaction with our payment processor. The authorization hold is being released back to your bank within 1-2 business days..."
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Action Footer */}
          <div className="mt-8 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-300">
              {VIEWS.find((v) => v.id === activeView)?.desc}
            </p>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('/login')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-electric hover:bg-[#0952D0] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer whitespace-nowrap"
            >
              <span>Launch {VIEWS.find((v) => v.id === activeView)?.title}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

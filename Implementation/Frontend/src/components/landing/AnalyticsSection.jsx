import React, { useState } from 'react';
import { BarChart3, TrendingUp, ArrowUpRight, ArrowDownRight, Clock, Users, ArrowRight } from 'lucide-react';

export default function AnalyticsSection({ onNavigate }) {
  const [range, setRange] = useState('30d');

  return (
    <section id="analytics" className="relative py-24 px-4 sm:px-6 lg:px-8 bg-[#020B1F] overflow-hidden">
      {/* Glow background */}
      <div className="absolute top-1/2 right-1/4 w-[600px] h-[500px] bg-brand-royal/25 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-12 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              <span>Datastraw Operations Telemetry</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
              Metrics driving internal support SLA.
            </h2>
            <p className="text-sm text-slate-400">
              Real-time reporting across ticket volumes, first response times, and Datastraw staff throughput to maintain enterprise SLAs.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-white/[0.06] p-1 rounded-2xl border border-white/10 text-xs self-start md:self-auto">
            {['7d', '30d', '90d'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
                  range === r
                    ? 'bg-brand-electric text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Last {r}
              </button>
            ))}
          </div>
        </div>

        {/* Reports Interface Showcase Card */}
        <div className="rounded-3xl border border-white/15 bg-gradient-to-b from-[#011E79]/30 to-[#011662]/50 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl space-y-8">
          {/* Top 4 Stat Tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10">
              <span className="text-xs text-slate-400 font-medium">Total Tickets</span>
              <p className="text-2xl sm:text-3xl font-extrabold text-white font-mono mt-1">45</p>
              <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold mt-1">
                <ArrowUpRight className="w-3 h-3" />
                <span>+20% this month</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10">
              <span className="text-xs text-slate-400 font-medium">Open Queue</span>
              <p className="text-2xl sm:text-3xl font-extrabold text-rose-400 font-mono mt-1">12</p>
              <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold mt-1">
                <ArrowDownRight className="w-3 h-3" />
                <span>-10% resolution velocity</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10">
              <span className="text-xs text-slate-400 font-medium">In Progress</span>
              <p className="text-2xl sm:text-3xl font-extrabold text-blue-400 font-mono mt-1">8</p>
              <div className="flex items-center gap-1 text-[11px] text-blue-300 font-semibold mt-1">
                <span>5 active reps</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10">
              <span className="text-xs text-slate-400 font-medium">Closed / Resolved</span>
              <p className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono mt-1">25</p>
              <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold mt-1">
                <ArrowUpRight className="w-3 h-3" />
                <span>+36% CSAT rating</span>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Status Breakdown (Left 4 cols) */}
            <div className="lg:col-span-4 p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-wider">Tickets by Status</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Live distribution snapshot</p>
              </div>

              {/* Visual Ring Gauge */}
              <div className="flex items-center justify-center my-6 relative">
                <svg className="w-36 h-36 -rotate-90" viewBox="0 0 100 100">
                  {/* Background Circle */}
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#011E79" strokeWidth="12" />
                  {/* Closed (55%) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="12"
                    strokeDasharray="251.2"
                    strokeDashoffset="113"
                    strokeLinecap="round"
                  />
                  {/* In Progress (18%) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="12"
                    strokeDasharray="251.2"
                    strokeDashoffset="205"
                    strokeLinecap="round"
                  />
                  {/* Open (27%) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#F43F5E"
                    strokeWidth="12"
                    strokeDasharray="251.2"
                    strokeDashoffset="220"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-mono font-extrabold text-white">45</span>
                  <span className="text-[10px] text-slate-400">Total</span>
                </div>
              </div>

              {/* Legend */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    Open
                  </span>
                  <span className="font-mono text-white font-semibold">12 (27%)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    In Progress
                  </span>
                  <span className="font-mono text-white font-semibold">8 (18%)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    Closed
                  </span>
                  <span className="font-mono text-white font-semibold">25 (55%)</span>
                </div>
              </div>
            </div>

            {/* Ticket Volume Over Time (Right 8 cols) */}
            <div className="lg:col-span-8 p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white uppercase tracking-wider">Tickets Over Time</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">30-day ticket intake & resolution velocity</p>
                </div>
                <span className="text-[10px] text-brand-cyan bg-brand-cyan/10 px-2 py-0.5 rounded-full font-mono">
                  Peak: 38/day
                </span>
              </div>

              {/* Curved Trend Line SVG */}
              <div className="h-44 w-full my-4 relative flex items-end">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 500 150" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#0B63F6" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* Area fill */}
                  <path
                    d="M 0 130 C 50 110, 100 80, 150 110 C 200 140, 250 50, 300 70 C 350 90, 400 30, 450 45 L 500 20 L 500 150 L 0 150 Z"
                    fill="url(#curveGradient)"
                  />
                  {/* Line stroke */}
                  <path
                    d="M 0 130 C 50 110, 100 80, 150 110 C 200 140, 250 50, 300 70 C 350 90, 400 30, 450 45 L 500 20"
                    fill="none"
                    stroke="#22D3EE"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  {/* Highlight Nodes */}
                  <circle cx="150" cy="110" r="4" fill="#020B27" stroke="#22D3EE" strokeWidth="2" />
                  <circle cx="300" cy="70" r="4" fill="#020B27" stroke="#22D3EE" strokeWidth="2" />
                  <circle cx="450" cy="45" r="4" fill="#020B27" stroke="#22D3EE" strokeWidth="2" />
                </svg>
              </div>

              {/* Timeline markers */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-white/10 pt-2 font-mono">
                <span>Sep 1</span>
                <span>Sep 8</span>
                <span>Sep 15</span>
                <span>Sep 22</span>
                <span>Sep 30</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

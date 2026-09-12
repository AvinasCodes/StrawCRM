import React, { useState } from 'react';
import { Mail, MessageSquare, FileSpreadsheet, StickyNote, Ticket, Users, ArrowRight, Check, Sparkles } from 'lucide-react';

export default function ProblemSection({ onNavigate }) {
  const [unified, setUnified] = useState(true);

  const scatteredItems = [
    {
      id: 'email',
      icon: Mail,
      label: 'Disconnected Emails',
      detail: 'Inbox overflow & missed customer replies',
      chaoticPos: '-translate-x-12 -translate-y-10 rotate-[-8deg]',
      color: 'border-rose-400/40 text-rose-300',
    },
    {
      id: 'chat',
      icon: MessageSquare,
      label: 'Scattered Slack DMs',
      detail: 'Urgent requests lost in channel threads',
      chaoticPos: 'translate-x-16 -translate-y-8 rotate-[6deg]',
      color: 'border-amber-400/40 text-amber-300',
    },
    {
      id: 'sheets',
      icon: FileSpreadsheet,
      label: 'Manual Spreadsheets',
      detail: 'Stale statuses & broken macros',
      chaoticPos: '-translate-x-16 translate-y-12 rotate-[4deg]',
      color: 'border-emerald-400/40 text-emerald-300',
    },
    {
      id: 'notes',
      icon: StickyNote,
      label: 'Lost Internal Notes',
      detail: 'Context trapped in rep scratchpads',
      chaoticPos: 'translate-x-12 translate-y-14 rotate-[-6deg]',
      color: 'border-blue-400/40 text-blue-300',
    },
  ];

  return (
    <section id="features" className="relative py-24 px-4 sm:px-6 lg:px-8 bg-[#020B1F] overflow-hidden">
      {/* Radial backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(1,30,121,0.25)_0%,transparent_70%)] pointer-events-none" />

      <div className="max-w-6xl mx-auto text-center relative z-10 space-y-12">
        {/* Section Header */}
        <div className="max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-brand-cyan text-xs font-semibold uppercase tracking-wider">
            <span>The Fragmentation Problem</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
            Support shouldn't feel scattered.
          </h2>
          <p className="text-sm sm:text-base text-slate-400">
            When customer inquiries live across five different tools, resolution slows down and customers suffer.
          </p>
        </div>

        {/* Interactive Mode Toggle */}
        <div className="flex justify-center">
          <div className="inline-flex items-center p-1.5 rounded-2xl bg-white/[0.05] border border-white/10 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setUnified(false)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                !unified
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Without StrawCRM: Scattered
            </button>
            <button
              type="button"
              onClick={() => setUnified(true)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                unified
                  ? 'bg-brand-electric text-white shadow-blue-glow font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              With StrawCRM: Unified Core
            </button>
          </div>
        </div>

        {/* Visualization Arena */}
        <div className="relative min-h-[380px] sm:min-h-[420px] rounded-3xl border border-white/10 bg-[#011662]/30 backdrop-blur-xl p-8 flex items-center justify-center overflow-hidden">
          {/* Central StrawCRM Core Hub */}
          <div
            className={`transition-all duration-700 ease-out z-20 flex flex-col items-center ${
              unified ? 'scale-100 opacity-100' : 'scale-90 opacity-40 blur-xs'
            }`}
          >
            <div className="relative">
              <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-brand-electric to-brand-cyan opacity-40 blur-xl animate-pulse" />
              <div className="w-24 h-24 rounded-3xl bg-[#011E79] border-2 border-cyan-400/50 p-3 flex items-center justify-center shadow-glow">
                <img src="/brand-logo.png" alt="StrawCRM Core" className="w-full h-full object-contain" />
              </div>
            </div>
            <div className="mt-4 text-center">
              <span className="text-base font-bold text-white tracking-wide">
                Straw<span className="text-brand-cyan">CRM</span> Workspace
              </span>
              <p className="text-xs text-cyan-300/80 mt-0.5">
                All inquiries synchronized in real time
              </p>
            </div>
          </div>

          {/* Floating Fragments */}
          {scatteredItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className={`absolute transition-all duration-700 ease-out p-3.5 rounded-2xl bg-[#020B27]/85 backdrop-blur-md border shadow-elevated ${
                  item.color
                } ${
                  unified
                    ? 'translate-x-0 translate-y-0 scale-75 opacity-0 pointer-events-none'
                    : `${item.chaoticPos} scale-100 opacity-100`
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-white/10">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-white">{item.label}</p>
                    <p className="text-[10px] text-slate-300">{item.detail}</p>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Connective Beam Grid when Unified */}
          {unified && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-96 h-96 rounded-full border border-cyan-400/20 animate-ping opacity-25" />
              <div className="w-[500px] h-[500px] rounded-full border border-blue-500/20" />
            </div>
          )}
        </div>

        {/* Transition Summary Text */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <p className="text-sm font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-cyan" />
            <span>Bring it all together into one intelligent workspace.</span>
          </p>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('/login')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-cyan hover:underline cursor-pointer"
          >
            <span>See the unified dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}

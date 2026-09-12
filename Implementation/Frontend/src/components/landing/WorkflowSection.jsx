import React, { useState } from 'react';
import { PlusCircle, Layers, Bot, CheckCircle2, BarChart3, ArrowRight } from 'lucide-react';

const STAGES = [
  {
    id: 'create',
    step: '01',
    title: 'Create',
    subtitle: 'Omnichannel Intake',
    desc: 'Tickets ingest via email, web forms, or in-app triggers with automatic priority classification.',
    icon: PlusCircle,
    color: 'from-blue-500/20 to-cyan-500/20 border-cyan-400/40 text-cyan-300',
  },
  {
    id: 'manage',
    step: '02',
    title: 'Manage',
    subtitle: 'Unified Workspace',
    desc: 'Sort by status, customer history, or urgency. Internal notes keep your whole team synchronized.',
    icon: Layers,
    color: 'from-blue-600/20 to-indigo-600/20 border-blue-400/40 text-blue-300',
  },
  {
    id: 'ai-assist',
    step: '03',
    title: 'AI Assist',
    subtitle: 'Gemini Copilot',
    desc: 'Instant context summaries and suggested replies drafted automatically in your team’s tone of voice.',
    icon: Bot,
    color: 'from-cyan-500/20 to-blue-500/20 border-cyan-300/50 text-brand-cyan',
  },
  {
    id: 'resolve',
    step: '04',
    title: 'Resolve',
    subtitle: 'One-Click Resolution',
    desc: 'Fast resolution with automated customer satisfaction survey triggers and audit trail logging.',
    icon: CheckCircle2,
    color: 'from-emerald-500/20 to-teal-500/20 border-emerald-400/40 text-emerald-300',
  },
  {
    id: 'analyze',
    step: '05',
    title: 'Analyze',
    subtitle: 'Operational Insights',
    desc: 'Live telemetry on ticket volume, resolution times, agent workload, and SLA compliance.',
    icon: BarChart3,
    color: 'from-purple-500/20 to-indigo-500/20 border-purple-400/40 text-purple-300',
  },
];

export default function WorkflowSection({ onNavigate }) {
  const [activeStage, setActiveStage] = useState(2); // default to AI Assist

  return (
    <section id="workflow" className="relative py-24 px-4 sm:px-6 lg:px-8 bg-[#020B1F] overflow-hidden">
      <div className="max-w-6xl mx-auto space-y-12 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-brand-cyan text-xs font-semibold uppercase tracking-wider">
            <span>Internal Operations Pipeline</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
            Datastraw Support Lifecycle
          </h2>
          <p className="text-sm text-slate-400">
            The standard operating procedure for Datastraw service personnel — from issue intake to verified closure.
          </p>
        </div>

        {/* Interactive 5-Stage Horizontal Process */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
          {STAGES.map((stage, idx) => {
            const Icon = stage.icon;
            const isActive = activeStage === idx;
            return (
              <div
                key={stage.id}
                onMouseEnter={() => setActiveStage(idx)}
                onClick={() => setActiveStage(idx)}
                className={`p-5 rounded-3xl border transition-all duration-300 cursor-pointer flex flex-col justify-between relative overflow-hidden backdrop-blur-xl ${
                  isActive
                    ? `bg-gradient-to-b ${stage.color} shadow-elevated scale-[1.03] z-10`
                    : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20'
                }`}
              >
                {/* Node Connector Beam */}
                {idx < STAGES.length - 1 && (
                  <div className="hidden md:block absolute top-8 -right-3 w-6 h-[2px] bg-gradient-to-r from-white/30 to-transparent z-20 pointer-events-none" />
                )}

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-xs font-bold text-slate-400 tracking-wider">
                      {stage.step}
                    </span>
                    <div
                      className={`p-2 rounded-xl border ${
                        isActive
                          ? 'bg-white/10 border-white/20 text-white'
                          : 'bg-white/[0.05] border-white/10 text-slate-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-white tracking-tight">{stage.title}</h3>
                  <p className="text-xs text-brand-cyan font-semibold mt-0.5">{stage.subtitle}</p>

                  <p className="text-xs text-slate-300/90 mt-3 leading-relaxed font-normal">
                    {stage.desc}
                  </p>
                </div>

                <div className="mt-6 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="capitalize">{stage.id} Stage</span>
                  <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-brand-cyan animate-pulse' : 'bg-slate-600'}`} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="text-center pt-4">
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('/login')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 text-white text-xs font-semibold backdrop-blur-md transition-all cursor-pointer group"
          >
            <span>Experience the complete workflow</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </section>
  );
}

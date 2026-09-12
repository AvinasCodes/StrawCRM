import React from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg = 'bg-[#E2E9F2]',
  iconColor = 'text-sky-600',
  accentGlow = 'bg-sky-400/10',
  change = null,
  changeLabel = 'from yesterday',
  loading = false,
}) {
  if (loading) {
    return (
      <div className="rounded-2xl bg-[#E8EEF5] p-3 sm:p-3.5 shadow-neu-card border border-white/70 animate-pulse space-y-2">
        <div className="flex items-center justify-between">
          <div className="h-3 w-20 bg-slate-300/60 rounded-lg" />
          <div className="w-8 h-8 rounded-xl bg-[#E2E9F2] shadow-neu-inset" />
        </div>
        <div className="h-6 w-12 bg-slate-300/60 rounded-xl my-1" />
        <div className="h-2.5 w-24 bg-slate-300/40 rounded-lg" />
      </div>
    );
  }

  const hasChange = change !== null && change !== undefined;
  const isPositive = hasChange && change > 0;
  const isNegative = hasChange && change < 0;

  return (
    <div className="group relative rounded-2xl bg-[#E8EEF5] p-4 sm:p-4.5 shadow-neu-card hover:shadow-neu-card-hover border border-white/70 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
      {/* Soft ambient gradient orb in the corner */}
      <div className={`pointer-events-none absolute -top-8 -right-8 w-20 h-20 rounded-full ${accentGlow} blur-xl opacity-60 group-hover:opacity-100 transition-opacity`} />

      <div className="relative z-10 flex items-center justify-between mb-2">
        <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider">{title}</span>
        <div className="w-9 h-9 rounded-xl bg-[#E2E9F2] shadow-neu-inset border border-white/60 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
          <Icon className={`w-4 h-4 stroke-[2.3] ${iconColor}`} />
        </div>
      </div>

      <div className="relative z-10 flex items-baseline gap-2 my-1.5">
        <span className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 leading-none">
          {value ?? 0}
        </span>
      </div>

      <div className="relative z-10 flex items-center gap-1.5 text-[11px] mt-2">
        {hasChange ? (
          <>
            <span
              className={`inline-flex items-center gap-0.5 font-bold px-1.5 py-0.5 rounded text-[10px] shadow-neu-btn border border-white/80 ${
                isNegative
                  ? 'bg-rose-50 text-rose-700'
                  : isPositive
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-[#E2E9F2] text-slate-600'
              }`}
            >
              {isNegative && <ArrowDownRight className="w-2.5 h-2.5 stroke-[2.5]" />}
              {isPositive && <ArrowUpRight className="w-2.5 h-2.5 stroke-[2.5]" />}
              {!isNegative && !isPositive && <Minus className="w-2.5 h-2.5 stroke-[2.5]" />}
              {Math.abs(change)}
            </span>
            <span className="text-slate-500 font-medium text-[10px]">{changeLabel}</span>
          </>
        ) : (
          <span className="text-slate-500 font-medium text-[10px]">{subtitle}</span>
        )}
      </div>
    </div>
  );
}

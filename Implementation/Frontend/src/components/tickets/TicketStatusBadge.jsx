import React from 'react';

export default function TicketStatusBadge({ status, className = '', showIcon = true }) {
  const normStatus = (status || 'Open').toLowerCase();

  if (normStatus === 'open') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl text-xs font-bold bg-rose-50/90 text-rose-700 border border-rose-200/90 shadow-[0_1px_2px_rgba(244,63,94,0.08)] whitespace-nowrap shrink-0 select-none ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
        <span>Open</span>
      </span>
    );
  }

  if (normStatus === 'in progress') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl text-xs font-bold bg-blue-50/90 text-blue-700 border border-blue-200/90 shadow-[0_1px_2px_rgba(59,130,246,0.08)] whitespace-nowrap shrink-0 select-none ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
        <span>In Progress</span>
      </span>
    );
  }

  if (normStatus === 'closed') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl text-xs font-bold bg-emerald-50/90 text-emerald-700 border border-emerald-200/90 shadow-[0_1px_2px_rgba(16,185,129,0.08)] whitespace-nowrap shrink-0 select-none ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
        <span>Closed</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap shrink-0 select-none ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
      <span>{status}</span>
    </span>
  );
}


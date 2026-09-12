import React, { useState } from 'react';
import { ArrowRight, Search, Ticket, MoreVertical, Clock, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import TicketStatusBadge from '../tickets/TicketStatusBadge';

const DEMO_TICKETS = [
  {
    id: 'TKT-1045',
    customer: 'Rahul Mehta',
    email: 'rahul@example.com',
    subject: 'Login issue on 2FA OTP timeout',
    status: 'Open',
    date: 'Sep 9, 2026',
    priority: 'High',
  },
  {
    id: 'TKT-1044',
    customer: 'Sneha Kapoor',
    email: 'sneha@example.com',
    subject: 'Payment not working on checkout',
    status: 'In Progress',
    date: 'Sep 9, 2026',
    priority: 'Critical',
  },
  {
    id: 'TKT-1043',
    customer: 'Amit Shah',
    email: 'amit@example.com',
    subject: 'Feature request: Multi-currency billing',
    status: 'Open',
    date: 'Sep 8, 2026',
    priority: 'Normal',
  },
  {
    id: 'TKT-1042',
    customer: 'Priya Nair',
    email: 'priya@example.com',
    subject: 'Bug in dashboard report CSV export',
    status: 'Closed',
    date: 'Sep 8, 2026',
    priority: 'Resolved',
  },
  {
    id: 'TKT-1041',
    customer: 'Karan Verma',
    email: 'karan@example.com',
    subject: 'Account recovery assistance required',
    status: 'In Progress',
    date: 'Sep 8, 2026',
    priority: 'High',
  },
];

export default function TicketShowcase({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('All');
  const [hoveredId, setHoveredId] = useState(null);

  const filteredTickets = DEMO_TICKETS.filter((t) => {
    if (activeTab === 'All') return true;
    return t.status.toLowerCase() === activeTab.toLowerCase();
  });

  return (
    <section id="tickets" className="relative py-24 px-4 sm:px-6 lg:px-8 bg-[#020B1F] overflow-hidden">
      {/* Background radial highlight */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-brand-royal/20 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-10 relative z-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/20 text-brand-cyan text-xs font-semibold uppercase tracking-wider">
              <span>Datastraw Service Queue</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
              Internal Ticketing &amp; SLA Tracking
            </h2>
            <p className="text-sm text-slate-400">
              Dedicated service queue for Datastraw operations. Triage client requests, assign team members, and resolve incidents with sub-second responsiveness.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate && onNavigate('/tickets')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-electric hover:bg-[#0952D0] active:bg-[#0742AB] text-white text-xs font-semibold shadow-blue-glow transition-all cursor-pointer self-start md:self-auto group"
          >
            <span>View Internal Queue</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* 3D Perspective Workspace Card */}
        <div className="relative rounded-3xl border border-white/15 bg-gradient-to-b from-[#011E79]/40 to-[#011662]/60 backdrop-blur-2xl p-4 sm:p-6 shadow-2xl shadow-black/40 overflow-hidden transform-gpu hover:border-cyan-400/30 transition-all duration-500">
          {/* Top Bar of the Mock Workspace */}
          <div className="pb-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/10 text-xs text-slate-300">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] text-slate-400">Search by ID, customer, subject...</span>
              </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 bg-white/[0.06] p-1 rounded-xl border border-white/10 text-xs">
              {['All', 'Open', 'In Progress', 'Closed'].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setActiveTab(status)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    activeTab === status
                      ? 'bg-brand-electric text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Tickets Table */}
          <div className="overflow-x-auto no-scrollbar mt-4">
            <table className="w-full text-left text-xs text-slate-300 border-collapse table-auto md:table-fixed">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3 sm:px-4 md:w-[15%]">Ticket ID</th>
                  <th className="py-3 px-3 sm:px-4 md:w-[22%]">Customer</th>
                  <th className="py-3 px-3 sm:px-4 md:w-[32%]">Subject</th>
                  <th className="py-3 px-3 sm:px-4 md:w-[15%]">Status</th>
                  <th className="py-3 px-3 sm:px-4 md:w-[12%]">Created</th>
                  <th className="py-3 px-2 sm:px-4 text-right md:w-[4%]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {filteredTickets.map((ticket) => {
                  const isHovered = hoveredId === ticket.id;
                  return (
                    <tr
                      key={ticket.id}
                      onMouseEnter={() => setHoveredId(ticket.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      onClick={() => onNavigate && onNavigate('/tickets')}
                      className={`transition-all duration-200 cursor-pointer ${
                        isHovered
                          ? 'bg-white/[0.08] shadow-sm transform translate-x-1'
                          : 'hover:bg-white/[0.04]'
                      }`}
                    >
                      {/* ID */}
                      <td className="py-3.5 px-3 sm:px-4 font-mono font-bold text-brand-cyan whitespace-nowrap">
                        #{ticket.id}
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-3 sm:px-4 truncate">
                        <p className="font-semibold text-white truncate">{ticket.customer}</p>
                        <p className="text-[10px] text-slate-400 truncate">{ticket.email}</p>
                      </td>

                      {/* Subject */}
                      <td className="py-3.5 px-3 sm:px-4 text-slate-200 truncate font-medium">
                        {ticket.subject}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 sm:px-4 whitespace-nowrap">
                        <TicketStatusBadge status={ticket.status} />
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-3 sm:px-4 text-slate-400 whitespace-nowrap">
                        {ticket.date}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-2 sm:px-4 text-right text-slate-400">
                        <div className="inline-flex p-1 rounded-lg hover:bg-white/10 hover:text-white transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer note */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
            <span>Showing {filteredTickets.length} of {DEMO_TICKETS.length} live demonstration tickets</span>
            <span className="text-brand-cyan flex items-center gap-1 font-medium">
              <Sparkles className="w-3 h-3" />
              Live Sync Active
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

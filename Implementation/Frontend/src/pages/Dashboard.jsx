import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  Search,
  AlertCircle,
  Clock,
  CheckCircle2,
  Ticket,
  Calendar,
  ChevronDown,
  RefreshCw,
  X,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  AlertTriangle,
  Loader2,
  Users,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/useAuth';
import StatCard from '../components/dashboard/StatCard';
import TicketStatusBadge from '../components/tickets/TicketStatusBadge';
import TicketActionMenu from '../components/tickets/TicketActionMenu';
import CreateTicketModal from '../components/tickets/CreateTicketModal';
import TicketDetailModal from '../components/tickets/TicketDetailModal';
import MinimalDeleteButton from '../components/ui/MinimalDeleteButton';
import {
  subscribeTickets,
  subscribeCustomers,
  updateTicket,
  deleteTicket,
  triggerHardReload,
} from '../services/firestoreService';

export default function Dashboard({ onNavigate }) {
  const { user } = useAuth();

  // Dashboard state
  const [summary, setSummary] = useState({
    open: 0,
    in_progress: 0,
    closed: 0,
    total: 0,
    changes: { open: 0, in_progress: 0, closed: 0 },
  });
  const [tickets, setTickets] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeStatusFilter, setActiveStatusFilter] = useState('All');
  const [dateRange, setDateRange] = useState('7d');
  const [rangeDropdownOpen, setRangeDropdownOpen] = useState(false);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState(null);

  // Delete state
  const [deleteModal, setDeleteModal] = useState(null); // { ticket }
  const [deleting, setDeleting] = useState(false);

  // Debounce search input (350ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Realtime subscription for live dashboard summary & recent tickets
  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubscribe = subscribeTickets(
      {
        search: debouncedSearch,
        status: activeStatusFilter === 'All' ? '' : activeStatusFilter,
        timeRange: dateRange === '7d' ? 'Last 7 days' : dateRange === '30d' ? 'Last 30 days' : 'All Time',
      },
      (liveTickets) => {
        const open = liveTickets.filter((t) => (t.status || '').toLowerCase() === 'open').length;
        const in_progress = liveTickets.filter((t) => (t.status || '').toLowerCase() === 'in progress').length;
        const closed = liveTickets.filter((t) => (t.status || '').toLowerCase() === 'closed').length;
        const total = liveTickets.length;

        setSummary({
          open,
          in_progress,
          closed,
          total,
          changes: { open: 0, in_progress: 0, closed: 0 },
        });

        setTickets(liveTickets.slice(0, 10));
        setLoading(false);
      },
      (err) => {
        console.warn('[Dashboard] Realtime subscription notice:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [debouncedSearch, activeStatusFilter, dateRange]);

  // Realtime subscription for live customers directory
  useEffect(() => {
    const unsubscribeCust = subscribeCustomers(
      (liveCustomers) => {
        if (Array.isArray(liveCustomers)) {
          setCustomers(liveCustomers);
        }
      },
      () => { }
    );
    return () => unsubscribeCust();
  }, []);

  // Compute recent customers merging live customers and tickets, filtered by debouncedSearch
  const recentCustomers = useMemo(() => {
    const customerMap = new Map();

    // 1. From customers subscription
    customers.forEach((c) => {
      const key = (c.customer_email || c.customer_id || c.customer_name || '').toLowerCase().trim();
      if (key) {
        customerMap.set(key, {
          customer_id: c.customer_id || 'CUST-001',
          customer_name: c.customer_name || 'Customer',
          customer_email: c.customer_email || '',
          ticket_count: c.ticket_count || (c.tickets ? c.tickets.length : 1),
          latest_subject: c.latest_subject || 'Support Inquiry',
          latest_date: c.latest_ticket_date || c.created_at || new Date().toISOString(),
          tickets: Array.isArray(c.tickets) ? c.tickets : [],
        });
      }
    });

    // 2. Supplement/update from recent tickets
    tickets.forEach((t) => {
      const key = (t.customer_email || t.customer_name || '').toLowerCase().trim();
      if (key) {
        const existing = customerMap.get(key);
        if (existing) {
          if (!existing.latest_date || new Date(t.created_at) > new Date(existing.latest_date)) {
            existing.latest_date = t.created_at;
            existing.latest_subject = t.subject || existing.latest_subject;
          }
          if (t.customer_id && !existing.customer_id) existing.customer_id = t.customer_id;
          if (!existing.tickets) existing.tickets = [];
          if (!existing.tickets.some((tk) => tk.ticket_id === t.ticket_id)) {
            existing.tickets.push(t);
          }
        } else {
          customerMap.set(key, {
            customer_id: t.customer_id || `CUST-${String(customerMap.size + 1).padStart(3, '0')}`,
            customer_name: t.customer_name || 'Customer',
            customer_email: t.customer_email || '',
            ticket_count: 1,
            latest_subject: t.subject || 'Support Inquiry',
            latest_date: t.created_at || new Date().toISOString(),
            tickets: [t],
          });
        }
      }
    });

    let list = Array.from(customerMap.values());

    // Filter by debouncedSearch across customer attributes and associated tickets
    if (debouncedSearch && debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase();
      list = list.filter((c) => {
        const nameMatch = (c.customer_name || '').toLowerCase().includes(q);
        const emailMatch = (c.customer_email || '').toLowerCase().includes(q);
        const idMatch =
          (c.customer_id || '').toLowerCase().includes(q) ||
          `#${(c.customer_id || '').toLowerCase()}`.includes(q);
        const subjectMatch = (c.latest_subject || '').toLowerCase().includes(q);
        const ticketMatch = (c.tickets || []).some(
          (t) =>
            (t.ticket_id || '').toLowerCase().includes(q) ||
            `#${(t.ticket_id || '').toLowerCase()}`.includes(q) ||
            (t.subject || '').toLowerCase().includes(q) ||
            (t.description || '').toLowerCase().includes(q) ||
            (t.category || '').toLowerCase().includes(q)
        );
        return nameMatch || emailMatch || idMatch || subjectMatch || ticketMatch;
      });
    }

    return list
      .sort((a, b) => new Date(b.latest_date || 0) - new Date(a.latest_date || 0))
      .slice(0, 5);
  }, [customers, tickets, debouncedSearch]);

  // Format user display name from Firebase
  const displayName =
    user?.displayName ||
    (user?.email
      ? user.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      : 'Agent');

  // Helper to determine if a ticket is assigned to current user
  const isAssignedToCurrentUser = (t) => {
    if (!user) return false;
    const userEmail = (user.email || '').toLowerCase().trim();
    const userName = (user.displayName || '').toLowerCase().trim();
    const assignedEmail = (t.assigned_to_email || '').toLowerCase().trim();
    const assignedName = (t.assigned_to_name || '').toLowerCase().trim();

    if (t.assigned_to_id && user.id && String(t.assigned_to_id) === String(user.id)) return true;
    if (assignedEmail && userEmail && assignedEmail === userEmail) return true;
    if (assignedName && (assignedName === userName || assignedName === 'you' || assignedName === 'me')) return true;
    return false;
  };

  // Handle status update directly from action menu or modal
  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      await updateTicket(ticketId, { status: newStatus });
    } catch (err) {
      alert(err.message || 'Failed to update ticket status.');
    }
  };

  // Delete handlers
  const handleDeleteSingle = (ticket) => {
    setDeleteModal({ ticket });
  };

  const confirmDelete = async () => {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      await deleteTicket(deleteModal.ticket.ticket_id);
      setDeleteModal(null);
      // If the deleted ticket is currently open in detail modal, close it
      if (selectedTicketId === deleteModal.ticket.ticket_id) {
        setSelectedTicketId(null);
      }
      triggerHardReload();
    } catch (err) {
      alert(err.message || 'Failed to delete ticket.');
    } finally {
      setDeleting(false);
    }
  };

  const handleTicketCreated = () => { };
  const handleTicketUpdated = () => { };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Today';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return String(dateStr);
    }
  };

  const rangeOptions = [
    { label: 'Today', value: 'today' },
    { label: 'Last 7 days', value: '7d' },
    { label: 'Last 30 days', value: '30d' },
    { label: 'All time', value: 'all' },
  ];

  const currentRangeLabel =
    rangeOptions.find((opt) => opt.value === dateRange)?.label || 'Last 7 days';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <main className="flex-1 min-h-0 p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6 w-full no-scrollbar bg-[#E8EEF5] text-slate-800 transition-all duration-200">
      {/* ─────────────────────────────────────────────────────────────────────────
          1. DASHBOARD HEADER
      ───────────────────────────────────────────────────────────────────────── */}
      <div className="shrink-0 pb-3 border-b border-slate-300/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {getGreeting()}, {displayName} 👋
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-[#E8EEF5] text-emerald-700 shadow-neu-btn border border-white/80">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Verified
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-semibold">
            Here&apos;s what&apos;s happening with your support tickets today.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* Top-Right CTA: + Create Ticket */}
          <button
            type="button"
            onClick={() => {
              if (onNavigate) {
                setCreateModalOpen(true);
              } else {
                setCreateModalOpen(true);
              }
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-black shadow-[3px_3px_12px_rgba(14,165,233,0.35),-2px_-2px_8px_rgba(255,255,255,0.9)] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Create Ticket</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          2. KPI CARDS (Real backend summary numbers)
      ───────────────────────────────────────────────────────────────────────── */}
      <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-4 my-2">
        <StatCard
          title="Open Tickets"
          value={summary.open}
          icon={AlertCircle}
          iconBg="bg-[#E2E9F2]"
          iconColor="text-rose-600"
          accentGlow="bg-rose-400/20"
          change={summary.changes?.open}
          changeLabel="from yesterday"
          loading={loading && !summary.total}
        />

        <StatCard
          title="In Progress"
          value={summary.in_progress}
          icon={Clock}
          iconBg="bg-[#E2E9F2]"
          iconColor="text-sky-600"
          accentGlow="bg-sky-400/20"
          change={summary.changes?.in_progress}
          changeLabel="from yesterday"
          loading={loading && !summary.total}
        />

        <StatCard
          title="Closed"
          value={summary.closed}
          icon={CheckCircle2}
          iconBg="bg-[#E2E9F2]"
          iconColor="text-emerald-600"
          accentGlow="bg-emerald-400/20"
          change={summary.changes?.closed}
          changeLabel="from yesterday"
          loading={loading && !summary.total}
        />

        <StatCard
          title="Total Tickets"
          value={summary.total}
          icon={Ticket}
          iconBg="bg-[#E2E9F2]"
          iconColor="text-indigo-600"
          accentGlow="bg-indigo-400/20"
          subtitle="All-time workspace"
          loading={loading && !summary.total}
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          3. SEARCH, DATE FILTER & STATUS TABS
      ───────────────────────────────────────────────────────────────────────── */}
      <div className="shrink-0 my-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Debounced Search Field */}
        <div className="relative flex-1 sm:max-w-sm group/search">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 group-hover/search:text-sky-600 group-focus-within/search:text-sky-600 transition-colors z-20">
            <Search className="w-4 h-4 stroke-[2.3] transition-transform duration-200 group-hover/search:scale-110 group-focus-within/search:scale-110" />
          </div>
          <input
            id="dashboard-search-input"
            name="dashboardSearch"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tickets, customers, or keywords..."
            className="neu-input w-full pl-10 pr-14 py-2.5 text-xs font-bold text-slate-900 placeholder:text-slate-400"
          />
          <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center gap-1 z-20">
            {searchTerm ? (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                aria-label="Clear search"
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-lg bg-[#E8EEF5] shadow-neu-btn text-[10px] text-slate-500 font-mono border border-white/80">
                ⌘K
              </kbd>
            )}
          </div>
        </div>

        {/* Filters Group */}
        <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
          {/* Status Quick Filter Tabs */}
          <div className="flex items-center gap-1 bg-[#E2E9F2] shadow-neu-inset p-1.5 rounded-2xl border border-white/60 text-xs font-bold overflow-x-auto no-scrollbar max-w-full shrink-0">
            {['All', 'Open', 'In Progress', 'Closed'].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setActiveStatusFilter(status)}
                className={`px-3.5 py-1.5 rounded-xl transition-all duration-200 cursor-pointer text-xs ${activeStatusFilter === status
                    ? 'bg-[#E8EEF5] text-sky-600 shadow-neu-btn border border-white/90 font-black'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Date Filter Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setRangeDropdownOpen(!rangeDropdownOpen)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#E8EEF5] shadow-neu-btn hover:shadow-neu-card active:shadow-neu-btn-pressed border border-white/80 rounded-2xl text-xs font-bold text-slate-700 transition-all cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-sky-500" />
              <span>{currentRangeLabel}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {rangeDropdownOpen && (
              <div className="origin-top-right absolute right-0 mt-2 w-44 rounded-2xl bg-[#E8EEF5] shadow-neu-card border border-white/80 py-1.5 z-30 divide-y divide-slate-200/50 animate-in fade-in zoom-in-95 duration-100">
                {rangeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setDateRange(opt.value);
                      setRangeDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-xs transition-colors flex items-center justify-between cursor-pointer ${dateRange === opt.value
                        ? 'text-sky-600 font-black bg-white/40'
                        : 'text-slate-700 hover:bg-white/30 font-bold'
                      }`}
                  >
                    <span>{opt.label}</span>
                    {dateRange === opt.value && <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* ─────────────────────────────────────────────────────────────────────────
          4. RECENT TICKETS TABLE CONTAINER (Neumorphism Soft UI)
      ───────────────────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-[#E8EEF5] p-3.5 sm:p-4 shadow-neu-card hover:shadow-neu-card-hover border border-white/70 transition-all duration-300 flex flex-col shrink-0 space-y-2.5">
        {/* Table Card Header Strip */}
        <div className="shrink-0 pb-2 border-b border-slate-300/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#E2E9F2] shadow-neu-inset border border-white/60 flex items-center justify-center text-sky-500">
              <Ticket className="w-3.5 h-3.5 stroke-[2.3]" />
            </div>
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Recent Tickets
            </h2>
            <span className="px-2 py-0.5 rounded-lg bg-[#E2E9F2] shadow-neu-inset text-slate-600 text-[10px] font-mono font-bold">
              {tickets.length}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Real-Time Sync</span>
          </div>
        </div>

        {error ? (
          /* Error State with Functional Retry */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-10 h-10 rounded-xl bg-[#E2E9F2] shadow-neu-inset text-rose-600 flex items-center justify-center mb-2">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-900">Unable to load dashboard</h3>
            <p className="text-[11px] text-slate-500 max-w-sm mt-0.5 mb-3">
              Something went wrong while loading your support data.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#E8EEF5] shadow-neu-btn hover:shadow-neu-card active:shadow-neu-btn-pressed border border-white/80 text-sky-600 font-bold text-xs transition-all cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Try Again</span>
            </button>
          </div>
        ) : loading && tickets.length === 0 ? (
          /* Localized Skeleton Table Loading State */
          <div className="flex-1 p-3 space-y-3 animate-pulse">
            <div className="h-4 bg-slate-300/40 rounded-xl w-1/4" />
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-9 bg-[#E2E9F2] shadow-neu-inset rounded-xl" />
              ))}
            </div>
          </div>
        ) : tickets.length === 0 ? (
          /* Empty States */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            {searchTerm || activeStatusFilter !== 'All' ? (
              <>
                <div className="w-10 h-10 rounded-xl bg-[#E2E9F2] shadow-neu-inset text-slate-400 flex items-center justify-center mb-2">
                  <Search className="w-5 h-5" />
                </div>
                <h3 className="text-xs font-bold text-slate-900">No tickets found</h3>
                <p className="text-[11px] text-slate-500 max-w-sm mt-0.5 mb-3">
                  Try a different search term or clear your filters.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setActiveStatusFilter('All');
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-[#E8EEF5] shadow-neu-btn hover:shadow-neu-card active:shadow-neu-btn-pressed border border-white/80 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  Clear Filters
                </button>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-xl bg-[#E2E9F2] shadow-neu-inset text-sky-500 flex items-center justify-center mb-2">
                  <Ticket className="w-5 h-5" />
                </div>
                <h3 className="text-xs font-bold text-slate-900">No tickets yet</h3>
                <p className="text-[11px] text-slate-500 max-w-sm mt-0.5 mb-3">
                  Create your first support ticket to get started.
                </p>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-black shadow-[2px_2px_8px_rgba(14,165,233,0.3)] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Create Ticket</span>
                </button>
              </>
            )}
          </div>
        ) : (
          /* Table Viewport */
          <div className="overflow-x-auto divide-y divide-slate-300/40 no-scrollbar">
            <table className="w-full text-left text-xs border-collapse table-fixed min-w-[760px]">
              <colgroup>
                <col className="w-28" />
                <col className="w-48" />
                <col className="w-52" />
                <col className="w-32" />
                <col className="w-28" />
                <col className="w-24" />
                <col className="w-20" />
              </colgroup>
              <thead className="bg-[#E2E9F2]/80 border-b border-slate-300/50 text-slate-700 uppercase font-black text-[11px] tracking-wider">
                <tr>
                  <th className="py-2 px-3 whitespace-nowrap rounded-l-xl">Ticket ID</th>
                  <th className="py-2 px-3 whitespace-nowrap">Customer</th>
                  <th className="py-2 px-3 whitespace-nowrap">Subject</th>
                  <th className="py-2 px-3 whitespace-nowrap">Assignee</th>
                  <th className="py-2 px-3 whitespace-nowrap">Status</th>
                  <th className="py-2 px-3 whitespace-nowrap">Created</th>
                  <th className="py-2 px-3 text-center whitespace-nowrap rounded-r-xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300/30">
                {tickets.map((t) => (
                  <tr
                    key={t.ticket_id}
                    onClick={() => setSelectedTicketId(t.ticket_id)}
                    className="hover:bg-white/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-[#E8EEF5] shadow-neu-btn border border-white/80 font-mono text-[11px] font-black text-sky-600 group-hover:text-sky-700 transition-colors whitespace-nowrap">
                        #{t.ticket_id}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-neu-btn border border-white/70">
                          {(t.customer_name || 'C').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-black text-xs text-slate-900 group-hover:text-sky-600 transition-colors truncate">
                            {t.customer_name || 'Customer'}
                          </p>
                          {t.customer_email && (
                            <p className="text-[10px] font-semibold text-slate-400 truncate">
                              {t.customer_email}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-xs text-slate-800 truncate block group-hover:text-slate-900">
                        {t.subject}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {isAssignedToCurrentUser(t) ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#E8EEF5] text-emerald-700 text-[11px] font-black shadow-neu-btn border border-white/80">
                          <span>⭐ You</span>
                        </span>
                      ) : t.assigned_to_name ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#E8EEF5] text-purple-700 text-[11px] font-bold shadow-neu-btn border border-white/80">
                          <span className="truncate max-w-[90px]">👤 {t.assigned_to_name}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#E2E9F2] text-slate-500 text-[11px] font-bold shadow-neu-inset">
                          <span>👥 Pool</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <TicketStatusBadge status={t.status} />
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px] whitespace-nowrap font-bold">
                      {formatDate(t.created_at)}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center">
                        <TicketActionMenu
                          ticket={t}
                          onView={(ticket) => setSelectedTicketId(ticket.ticket_id)}
                          onStatusChange={handleStatusChange}
                          onDelete={handleDeleteSingle}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer Strip */}
        <div className="shrink-0 pt-2 border-t border-slate-300/40 flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>
            Showing <strong className="text-slate-800 font-bold">{tickets.length}</strong>{' '}
            {tickets.length === 1 ? 'ticket' : 'tickets'}
            {debouncedSearch ? (
              <span> matching &ldquo;<strong className="text-slate-700">{debouncedSearch}</strong>&rdquo;</span>
            ) : null}
          </span>

          <button
            type="button"
            onClick={() => {
              if (onNavigate) onNavigate('/tickets');
            }}
            className="inline-flex items-center gap-1.5 font-black text-sky-600 hover:text-sky-700 group/link transition-colors cursor-pointer"
          >
            <span>View all tickets</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          5. RECENT CUSTOMERS TABLE CONTAINER (Neumorphism Soft UI)
      ───────────────────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-[#E8EEF5] p-3.5 sm:p-4 shadow-neu-card hover:shadow-neu-card-hover border border-white/70 transition-all duration-300 flex flex-col shrink-0 space-y-2.5">
        {/* Table Card Header Strip */}
        <div className="shrink-0 pb-2 border-b border-slate-300/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#E2E9F2] shadow-neu-inset border border-white/60 flex items-center justify-center text-sky-500">
              <Users className="w-3.5 h-3.5 stroke-[2.3]" />
            </div>
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Recent Customers
            </h2>
            <span className="px-2 py-0.5 rounded-lg bg-[#E2E9F2] shadow-neu-inset text-slate-600 text-[10px] font-mono font-bold">
              {recentCustomers.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Active Directory</span>
          </div>
        </div>

        {recentCustomers.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            {searchTerm ? (
              <>
                <div className="w-10 h-10 rounded-xl bg-[#E2E9F2] shadow-neu-inset text-slate-400 flex items-center justify-center mb-2">
                  <Search className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">No customers found</h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1 mb-3">
                  No customer records match &ldquo;{searchTerm}&rdquo;. Try another search term or clear your search.
                </p>
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="px-3.5 py-1.5 rounded-xl bg-[#E8EEF5] shadow-neu-btn hover:shadow-neu-card active:shadow-neu-btn-pressed border border-white/80 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  Clear Search
                </button>
              </>
            ) : (
              <p className="text-xs text-slate-500 font-medium">No customer records available yet.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto divide-y divide-slate-300/40 no-scrollbar">
            <table className="w-full text-left text-xs border-collapse table-fixed min-w-[760px]">
              <colgroup>
                <col className="w-28" />
                <col className="w-48" />
                <col className="w-28" />
                <col className="w-52" />
                <col className="w-24" />
                <col className="w-24" />
              </colgroup>
              <thead className="bg-[#E2E9F2]/80 border-b border-slate-300/50 text-slate-700 uppercase font-black text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 whitespace-nowrap rounded-l-xl">Customer ID</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Customer</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">Inquiries</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Latest Inquiry</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Last Active</th>
                  <th className="py-2.5 pr-3 pl-2 text-right whitespace-nowrap rounded-r-xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300/30">
                {recentCustomers.map((c) => (
                  <tr
                    key={c.customer_id || c.customer_email}
                    onClick={() => {
                      if (onNavigate) onNavigate('/customers');
                    }}
                    className="hover:bg-white/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-[#E8EEF5] shadow-neu-btn border border-white/80 font-mono text-xs font-black text-sky-600 group-hover:text-sky-700 transition-colors whitespace-nowrap">
                        #{c.customer_id}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-neu-btn border border-white/70">
                          {(c.customer_name || 'C').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-black text-slate-900 group-hover:text-sky-600 transition-colors truncate">
                            {c.customer_name}
                          </p>
                          {c.customer_email && (
                            <p className="text-[10px] font-semibold text-slate-400 truncate">
                              {c.customer_email}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-black shadow-neu-btn bg-[#E8EEF5] text-sky-600 border border-white/80">
                        <Ticket className="w-3 h-3 stroke-[2.3]" />
                        <span>{c.ticket_count} {c.ticket_count === 1 ? 'ticket' : 'tickets'}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-slate-800 truncate block group-hover:text-slate-900">
                        {c.latest_subject}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 text-xs whitespace-nowrap font-bold">
                      {formatDate(c.latest_date)}
                    </td>
                    <td className="py-2.5 pr-3 pl-2 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onNavigate) onNavigate('/customers');
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#E8EEF5] shadow-neu-btn hover:shadow-neu-card active:shadow-neu-btn-pressed border border-white/80 text-slate-700 hover:text-sky-600 text-xs font-bold transition-all cursor-pointer"
                        title="View customer history"
                      >
                        <span>History</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer Strip */}
        <div className="shrink-0 pt-3 border-t border-slate-300/40 flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>
            Showing <strong className="text-slate-800 font-bold">{recentCustomers.length}</strong>{' '}
            recent {recentCustomers.length === 1 ? 'customer' : 'customers'}
            {debouncedSearch ? (
              <span> matching &ldquo;<strong className="text-slate-700">{debouncedSearch}</strong>&rdquo;</span>
            ) : null}
          </span>

          <button
            type="button"
            onClick={() => {
              if (onNavigate) onNavigate('/customers');
            }}
            className="inline-flex items-center gap-1.5 font-black text-sky-600 hover:text-sky-700 group/link transition-colors cursor-pointer"
          >
            <span>View all customers</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          6. FUNCTIONAL MODALS
      ───────────────────────────────────────────────────────────────────────── */}
      <CreateTicketModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => { }}
      />

      <TicketDetailModal
        ticketId={selectedTicketId}
        isOpen={Boolean(selectedTicketId)}
        onClose={() => setSelectedTicketId(null)}
        onUpdated={(updatedTicket) => {
          if (!updatedTicket || !updatedTicket.ticket_id) return;
          const uid = (updatedTicket.ticket_id || '').replace(/^#/, '').toUpperCase();
          setTickets((prev) =>
            prev.map((t) =>
              (t.ticket_id || '').replace(/^#/, '').toUpperCase() === uid
                ? { ...t, ...updatedTicket }
                : t
            )
          );
        }}
        onDelete={handleDeleteSingle}
      />

      {/* ── Delete Confirmation Modal (Neumorphic) ── */}
      {deleteModal && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => !deleting && setDeleteModal(null)}
        >
          <div
            className="w-full max-w-md bg-[#E8EEF5] rounded-3xl shadow-neu-card border border-white/80 p-6 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#E8EEF5] shadow-neu-btn border border-rose-300/80 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Delete Ticket #{deleteModal.ticket.ticket_id}?
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-medium">
                  Are you sure you want to permanently delete ticket &ldquo;{deleteModal.ticket.subject || deleteModal.ticket.ticket_id}&rdquo;? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-300/40">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteModal(null)}
                className="px-4 py-2 rounded-full bg-[#E8EEF5] shadow-neu-btn hover:shadow-neu-card border border-white/80 text-xs font-bold text-slate-700 transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <MinimalDeleteButton
                disabled={deleting}
                deleting={deleting}
                onConfirm={confirmDelete}
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </main>
  );
}

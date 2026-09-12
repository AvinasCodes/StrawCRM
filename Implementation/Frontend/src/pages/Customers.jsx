import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Users,
  Ticket,
  X,
  RotateCcw,
  Plus,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { subscribeCustomers, subscribeTickets, syncFromBackend, deleteCustomer } from '../services/firestoreService';
import { listCustomers } from '../services/api';
import MinimalDeleteButton from '../components/ui/MinimalDeleteButton';
import CustomerTicketHistoryPanel from '../components/customers/CustomerTicketHistoryPanel';
import TicketDetailModal from '../components/tickets/TicketDetailModal';

// Deduplication & Ticket counting helpers
const getCustomerTicketCount = (c) => {
  if (typeof c.ticket_count === 'number') return c.ticket_count;
  if (Array.isArray(c.tickets)) return c.tickets.length;
  return 0;
};

const hasCustomerOpenTickets = (c) =>
  (c.tickets || []).some((t) => {
    const s = (t.status || '').toLowerCase();
    return s === 'open' || s === 'in progress';
  });

function SortIcon({ field, currentField, direction }) {
  if (currentField !== field) {
    return <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />;
  }
  return direction === 'asc' ? (
    <ArrowUp className="w-3.5 h-3.5 text-sky-600" />
  ) : (
    <ArrowDown className="w-3.5 h-3.5 text-sky-600" />
  );
}

export default function Customers({ onNavigate }) {
  const [customers, setCustomers] = useState([]);
  const [allTickets, setAllTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Customer ticket history panel & ticket detail state
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [deletingCustomer, setDeletingCustomer] = useState(false);

  // Active filter tab: 'all' | 'active' | 'repeat'
  const [activeTab, setActiveTab] = useState('all');

  // Sorting state: { field: 'name' | 'tickets' | 'date', direction: 'asc' | 'desc' }
  const [sortConfig, setSortConfig] = useState({ field: 'date', direction: 'desc' });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchDirectFromBackend = async () => {
    try {
      const serverList = await listCustomers({ search: debouncedSearch });
      if (Array.isArray(serverList)) {
        const cleanList = serverList.filter((c) => {
          const cid = (c.customer_id || '').toUpperCase();
          const email = (c.customer_email || '').toLowerCase();
          const name = (c.customer_name || '').toLowerCase();
          if (cid === 'CUST-004' || cid === 'CUST-999') return false;
          if (email.includes('browsertest') || name.includes('browsertest')) return false;
          const count = getCustomerTicketCount(c);
          if (count === 0) return false;
          return true;
        });
        if (cleanList.length === 0) return;
        setCustomers((prev) => {
          const map = new Map();
          prev.forEach((c) => {
            if (getCustomerTicketCount(c) > 0) {
              map.set(c.customer_id || c.customer_email, c);
            }
          });
          cleanList.forEach((c) => {
            const k = c.customer_id || c.customer_email;
            map.set(k, { ...map.get(k), ...c });
          });
          return Array.from(map.values());
        });
      }
    } catch { }
  };

  useEffect(() => {
    setLoading(true);

    fetchDirectFromBackend().finally(() => setLoading(false));

    const unsubscribeCustomers = subscribeCustomers(
      (liveCustomers) => {
        if (Array.isArray(liveCustomers)) {
          // Filter out customers with 0 active tickets
          const withTickets = liveCustomers.filter((c) => getCustomerTicketCount(c) > 0);
          setCustomers(withTickets);
        }
        setLoading(false);
      },
      (err) => {
        console.warn('[Customers] Realtime subscription notice:', err);
        setLoading(false);
      }
    );

    const unsubscribeTickets = subscribeTickets(
      {},
      (liveTickets) => {
        if (Array.isArray(liveTickets)) {
          setAllTickets(liveTickets);
          // If all tickets in CRM are deleted, customer accounts list is immediately cleared
          if (liveTickets.length === 0) {
            setCustomers([]);
          }
        }
      },
      () => { }
    );

    return () => {
      unsubscribeCustomers();
      unsubscribeTickets();
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await syncFromBackend();
    await fetchDirectFromBackend();
    setRefreshing(false);
  };

  // Compute live tickets belonging to the selected customer for the panel
  const selectedCustomerTickets = useMemo(() => {
    if (!selectedCustomer) return [];
    const cid = (selectedCustomer.customer_id || '').toUpperCase().trim();
    const cemail = (selectedCustomer.customer_email || '').toLowerCase().trim();
    const cname = (selectedCustomer.customer_name || '').toLowerCase().trim();

    const matches = allTickets.filter((t) => {
      const tcid = (t.customer_id || '').toUpperCase().trim();
      const temail = (t.customer_email || '').toLowerCase().trim();
      const tname = (t.customer_name || '').toLowerCase().trim();

      if (cid && tcid === cid) return true;
      if (cemail && temail === cemail) return true;
      if (cname && tname === cname) return true;
      return false;
    });

    if (matches.length > 0) {
      return matches.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }

    return (selectedCustomer.tickets || []).slice().sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, [selectedCustomer, allTickets]);

  const handleOpenCustomerTickets = (customer, e) => {
    if (e) e.stopPropagation();
    setSelectedCustomer(customer);
  };

  const handleCreateTicketForCustomer = (customer) => {
    if (onNavigate && customer) {
      onNavigate(
        `/tickets/create?customer_id=${encodeURIComponent(customer.customer_id || '')}&customer_name=${encodeURIComponent(customer.customer_name || '')}&customer_email=${encodeURIComponent(customer.customer_email || '')}`
      );
    }
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const total = customers.length;
    let withOpen = 0;
    let repeat = 0;
    let totalInquiries = 0;

    customers.forEach((c) => {
      const ticketCount = getCustomerTicketCount(c);
      totalInquiries += ticketCount;
      if (ticketCount > 1) repeat += 1;
      if (hasCustomerOpenTickets(c)) withOpen += 1;
    });

    return { total, withOpen, repeat, totalInquiries };
  }, [customers]);

  // Filtering & Tab Logic
  const filtered = useMemo(() => {
    return customers.filter((c) => {
      const q = debouncedSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (c.customer_id || '').toLowerCase().includes(q) ||
        (c.customer_name || '').toLowerCase().includes(q) ||
        (c.customer_email || '').toLowerCase().includes(q) ||
        (c.latest_subject || '').toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (activeTab === 'active') {
        return hasCustomerOpenTickets(c);
      }
      if (activeTab === 'repeat') {
        return getCustomerTicketCount(c) > 1;
      }
      return true;
    });
  }, [customers, debouncedSearch, activeTab]);

  // Sorting Logic
  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      if (sortConfig.field === 'name') {
        const nameA = (a.customer_name || '').toLowerCase();
        const nameB = (b.customer_name || '').toLowerCase();
        return sortConfig.direction === 'asc'
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      }
      if (sortConfig.field === 'tickets') {
        const countA = getCustomerTicketCount(a);
        const countB = getCustomerTicketCount(b);
        return sortConfig.direction === 'asc' ? countA - countB : countB - countA;
      }
      // Default: date
      const dateA = new Date(a.latest_ticket_date || 0).getTime();
      const dateB = new Date(b.latest_ticket_date || 0).getTime();
      return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
    });
    return list;
  }, [filtered, sortConfig]);

  const toggleSort = (field) => {
    setSortConfig((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  return (
    <main className="flex-1 flex flex-col h-full min-h-0 p-3 sm:p-5 lg:p-6 pb-24 md:pb-6 overflow-y-auto lg:overflow-hidden w-full relative bg-[#E8EEF5] text-slate-800 transition-all duration-200">
      {/* ─────────────────────────────────────────────────────────────────────────
          1. HEADER & ACTIONS (Mobile Optimized)
         ───────────────────────────────────────────────────────────────────────── */}
      <div className="shrink-0 pb-2.5 border-b border-slate-300/40 flex items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
              Customer Accounts
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-[#E8EEF5] text-sky-700 shadow-neu-btn border border-white/80">
              <Users className="w-3 h-3 text-sky-600" />
              {stats.total}
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 font-semibold hidden sm:block">
            Directory of verified customer profiles, deterministic IDs, and ticket history.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleRefresh}
            aria-label="Refresh customers directory"
            title="Sync latest customers from backend"
            className="p-2.5 rounded-2xl bg-[#E8EEF5] shadow-neu-btn hover:shadow-neu-card active:shadow-neu-btn-pressed border border-white/80 text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
          >
            <RotateCcw
              className={`w-4 h-4 ${refreshing || loading ? 'animate-spin text-sky-600' : ''}`}
            />
          </button>

          {/* New Ticket CTA */}
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('/tickets/create')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-black shadow-[3px_3px_12px_rgba(14,165,233,0.35),-2px_-2px_8px_rgba(255,255,255,0.9)] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Ticket</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          2. CONTEXTUAL METRICS OVERVIEW (KPI Mini-Cards)
         ───────────────────────────────────────────────────────────────────────── */}
      <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-3.5 my-3.5">
        {/* Total Customers */}
        <div className="bg-[#E8EEF5] rounded-2xl shadow-neu-card border border-white/80 p-4 flex items-center gap-3.5 hover:shadow-neu-card-hover transition-all">
          <div className="w-11 h-11 rounded-2xl bg-[#E2E9F2] shadow-neu-inset border border-sky-100/50 text-sky-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Total Accounts</p>
            <p className="text-xl font-black text-slate-900 tracking-tight">{stats.total}</p>
          </div>
        </div>

        {/* With Open Issues */}
        <div className="bg-[#E8EEF5] rounded-2xl shadow-neu-card border border-white/80 p-4 flex items-center gap-3.5 hover:shadow-neu-card-hover transition-all">
          <div className="w-11 h-11 rounded-2xl bg-[#E2E9F2] shadow-neu-inset border border-rose-100/50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Open Inquiries</p>
            <p className="text-xl font-black text-slate-900 tracking-tight">{stats.withOpen}</p>
          </div>
        </div>

        {/* Repeat Accounts */}
        <div className="bg-[#E8EEF5] rounded-2xl shadow-neu-card border border-white/80 p-4 flex items-center gap-3.5 hover:shadow-neu-card-hover transition-all">
          <div className="w-11 h-11 rounded-2xl bg-[#E2E9F2] shadow-neu-inset border border-purple-100/50 text-purple-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Repeat Accounts</p>
            <p className="text-xl font-black text-slate-900 tracking-tight">{stats.repeat}</p>
          </div>
        </div>

        {/* Total Inquiries */}
        <div className="bg-[#E8EEF5] rounded-2xl shadow-neu-card border border-white/80 p-4 flex items-center gap-3.5 hover:shadow-neu-card-hover transition-all">
          <div className="w-11 h-11 rounded-2xl bg-[#E2E9F2] shadow-neu-inset border border-emerald-100/50 text-emerald-600 flex items-center justify-center shrink-0">
            <Ticket className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Total Inquiries</p>
            <p className="text-xl font-black text-slate-900 tracking-tight">{stats.totalInquiries}</p>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          3. SEARCH & CONTEXT-AWARE SEGMENTED TABS
         ───────────────────────────────────────────────────────────────────────── */}
      <div className="shrink-0 mb-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 sm:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="customers-search-input"
            name="customersSearch"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by customer ID (#CUST-001), name, or email..."
            className="w-full pl-10 pr-14 py-2.5 bg-[#E2E9F2] shadow-neu-inset border border-slate-300/40 rounded-2xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-500/50 transition-all"
          />
          <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
            {searchTerm ? (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                aria-label="Clear search"
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-lg bg-[#E8EEF5] shadow-neu-btn border border-white/80 text-[10px] text-slate-500 font-mono font-bold">
                ⌘K
              </kbd>
            )}
          </div>
        </div>

        {/* Context-Aware Segmented Tabs */}
        <div className="flex items-center gap-1.5 bg-[#E2E9F2] shadow-neu-inset p-1.5 rounded-2xl border border-slate-300/40 text-xs font-bold self-stretch sm:self-auto overflow-x-auto no-scrollbar max-w-full">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer text-xs shrink-0 ${activeTab === 'all'
                ? 'bg-[#E8EEF5] text-sky-600 font-black shadow-neu-btn border border-white/80'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            All Accounts ({stats.total})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer text-xs shrink-0 ${activeTab === 'active'
                ? 'bg-[#E8EEF5] text-rose-600 font-black shadow-neu-btn border border-white/80'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            Open Issues ({stats.withOpen})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('repeat')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer text-xs shrink-0 ${activeTab === 'repeat'
                ? 'bg-[#E8EEF5] text-purple-600 font-black shadow-neu-btn border border-white/80'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            Repeat ({stats.repeat})
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          4. CUSTOMERS TABLE CONTAINER WITH NEUMORPHIC SOFT UI DESIGN
         ───────────────────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 bg-[#E8EEF5] rounded-3xl shadow-neu-card border border-white/80 flex flex-col overflow-hidden transition-all">
        {/* Table Card Header Strip */}
        <div className="shrink-0 px-6 h-12 border-b border-slate-300/50 bg-[#E2E9F2]/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              Customer Directory
            </h2>
            <span className="text-xs font-black text-sky-600 bg-[#E8EEF5] px-2.5 py-0.5 rounded-xl shadow-neu-btn border border-white/80">
              {sorted.length}
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-[#E8EEF5] shadow-neu-btn border border-white/80 text-xs font-bold text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Real-Time Sync</span>
          </div>
        </div>

        {loading && customers.length === 0 ? (
          <div className="flex-1 p-6 space-y-4 animate-pulse">
            <div className="h-6 bg-[#E2E9F2] shadow-neu-inset rounded-xl w-1/4 border border-slate-300/30" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-12 bg-[#E2E9F2] shadow-neu-inset rounded-2xl border border-slate-300/30" />
              ))}
            </div>
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#E8EEF5] shadow-neu-card border border-white/80 text-slate-400 flex items-center justify-center mb-3">
              <Users className="w-7 h-7 text-slate-500" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No customers found</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
              {searchTerm
                ? 'No customer records match your current search query.'
                : 'No customers are currently listed in this filter tab.'}
            </p>
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="px-4 py-2 rounded-2xl bg-[#E8EEF5] shadow-neu-btn hover:shadow-neu-card active:shadow-neu-btn-pressed border border-white/80 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          /* Table Viewport with Strict Semantic <thead /> & <tbody /> */
          <div className="overflow-y-auto overflow-x-auto flex-1 divide-y divide-slate-300/30 no-scrollbar">
            <table className="w-full text-left text-xs border-collapse table-fixed min-w-[780px]">
              <colgroup>
                <col className="w-[15%]" />
                <col className="w-[24%]" />
                <col className="w-[14%]" />
                <col className="w-[22%]" />
                <col className="w-[12%]" />
                <col className="w-[13%]" />
              </colgroup>
              <thead className="sticky top-0 bg-[#E2E9F2]/95 backdrop-blur-md border-b border-slate-300/60 text-slate-700 uppercase font-black text-[11px] tracking-wider z-10">
                <tr className="h-10.5">
                  {/* Customer ID Header */}
                  <th scope="col" className="px-4 pl-6 align-middle whitespace-nowrap">
                    <div className="flex items-center h-full">
                      <span>Customer ID</span>
                    </div>
                  </th>

                  {/* Customer Name Header with Sorting */}
                  <th
                    scope="col"
                    onClick={() => toggleSort('name')}
                    className="px-4 align-middle whitespace-nowrap cursor-pointer hover:text-sky-600 transition-colors select-none"
                  >
                    <div className="flex items-center gap-1.5 h-full">
                      <span>Customer</span>
                      <SortIcon field="name" currentField={sortConfig.field} direction={sortConfig.direction} />
                    </div>
                  </th>

                  {/* Total Tickets Header with Sorting */}
                  <th
                    scope="col"
                    onClick={() => toggleSort('tickets')}
                    className="px-4 align-middle whitespace-nowrap cursor-pointer hover:text-sky-600 transition-colors select-none"
                  >
                    <div className="flex items-center gap-1.5 h-full">
                      <span>Inquiries</span>
                      <SortIcon field="tickets" currentField={sortConfig.field} direction={sortConfig.direction} />
                    </div>
                  </th>

                  {/* Recent Inquiry Topic Header */}
                  <th scope="col" className="px-4 align-middle whitespace-nowrap">
                    <div className="flex items-center h-full">
                      <span>Latest Inquiry</span>
                    </div>
                  </th>

                  {/* Last Activity Header with Sorting */}
                  <th
                    scope="col"
                    onClick={() => toggleSort('date')}
                    className="px-4 align-middle whitespace-nowrap cursor-pointer hover:text-sky-600 transition-colors select-none"
                  >
                    <div className="flex items-center gap-1.5 h-full">
                      <span>Last Active</span>
                      <SortIcon field="date" currentField={sortConfig.field} direction={sortConfig.direction} />
                    </div>
                  </th>

                  {/* Actions Header */}
                  <th scope="col" className="px-4 pr-6 text-center align-middle whitespace-nowrap">
                    <div className="flex items-center justify-center h-full">
                      <span>Actions</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300/30">
                {sorted.map((c) => {
                  const ticketCount = getCustomerTicketCount(c);
                  const hasOpenTicket = hasCustomerOpenTickets(c);

                  return (
                    <tr
                      key={c.customer_id || c.customer_email}
                      onClick={() => handleOpenCustomerTickets(c)}
                      className="h-14 transition-all duration-150 hover:bg-white/40 cursor-pointer group"
                    >
                      {/* Customer ID Badge */}
                      <td className="px-4 pl-6 align-middle whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-xl bg-[#E8EEF5] shadow-neu-btn border border-white/80 font-mono text-xs font-bold text-sky-600 group-hover:border-sky-300 group-hover:shadow-neu-card transition-all whitespace-nowrap">
                          #{c.customer_id || 'CUST-001'}
                        </span>
                      </td>

                      {/* Customer Avatar & Contact */}
                      <td className="px-4 align-middle truncate">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-neu-btn border border-white/80">
                            {(c.customer_name || 'C').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 group-hover:text-sky-600 transition-colors truncate">
                              {c.customer_name || 'Customer'}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate font-medium">
                              {c.customer_email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Inquiries Count Pill */}
                      <td className="px-4 align-middle whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-[#E8EEF5] shadow-neu-btn border border-white/80 ${ticketCount > 1
                                ? 'text-purple-700'
                                : 'text-sky-600'
                              }`}
                          >
                            <Ticket className="w-3.5 h-3.5" />
                            <span>
                              {ticketCount} {ticketCount === 1 ? 'ticket' : 'tickets'}
                            </span>
                          </span>

                          {hasOpenTicket && (
                            <span
                              className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"
                              title="Active open ticket"
                            />
                          )}
                        </div>
                      </td>

                      {/* Recent Inquiry Subject */}
                      <td className="px-4 align-middle truncate">
                        <p className="font-semibold text-slate-800 truncate group-hover:text-sky-700 transition-colors">
                          {c.latest_subject || 'General Inquiry'}
                        </p>
                      </td>

                      {/* Last Activity Date */}
                      <td className="px-4 align-middle text-slate-600 text-xs whitespace-nowrap font-medium">
                        {c.latest_ticket_date
                          ? new Date(c.latest_ticket_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                          : 'Recently'}
                      </td>

                      {/* Action Links */}
                      <td className="px-4 pr-6 align-middle text-center whitespace-nowrap">
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            onClick={(e) => handleOpenCustomerTickets(c, e)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E8EEF5] shadow-neu-btn hover:shadow-neu-card active:shadow-neu-btn-pressed border border-white/80 text-slate-700 hover:text-sky-600 text-xs font-bold transition-all cursor-pointer group/btn"
                            title={`View ticket history for ${c.customer_name || 'Customer'}`}
                          >
                            <span>Tickets</span>
                            <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer */}
        <div className="shrink-0 mt-auto py-3.5 px-6 bg-[#E2E9F2]/90 border-t border-slate-300/40 flex items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#E8EEF5] shadow-neu-inset border border-white/60 text-xs text-slate-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
              <span>
                Showing <span className="font-black text-slate-800">{sorted.length}</span> unique {sorted.length === 1 ? 'customer' : 'customers'}
              </span>
            </div>
            {searchTerm && sorted.length !== customers.length && (
              <span className="text-[11px] font-bold text-sky-600 bg-sky-100/70 border border-sky-200/80 px-2.5 py-0.5 rounded-xl shadow-2xs">
                Filtered from {customers.length} total
              </span>
            )}
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#E8EEF5] shadow-neu-btn border border-white/80 text-[11px] font-bold text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {sorted.length} Active {sorted.length === 1 ? 'Profile' : 'Profiles'}
          </span>
        </div>
      </div>

      {/* Dedicated Customer Ticket History Slide-Over Panel */}
      <CustomerTicketHistoryPanel
        isOpen={!!selectedCustomer}
        customer={selectedCustomer}
        tickets={selectedCustomerTickets}
        onClose={() => setSelectedCustomer(null)}
        onSelectTicket={(ticketId) => setSelectedTicketId(ticketId)}
        onCreateTicket={handleCreateTicketForCustomer}
        onCustomerDeleted={(deletedId) => {
          const cleanDeleted = String(deletedId).trim().toUpperCase();
          setCustomers((prev) =>
            prev.filter(
              (c) =>
                (c.customer_id || '').toUpperCase() !== cleanDeleted &&
                (c.customer_email || '').toLowerCase() !== String(deletedId).toLowerCase()
            )
          );
          setSelectedCustomer(null);
          syncFromBackend();
        }}
      />

      {/* Ticket Detail Modal (when opening ticket from customer history panel) */}
      {selectedTicketId && (
        <TicketDetailModal
          ticketId={selectedTicketId}
          isOpen={!!selectedTicketId}
          onClose={() => setSelectedTicketId(null)}
          onUpdated={() => syncFromBackend()}
        />
      )}

      {/* Confirmation Modal for Customer Deletion (Identical to Ticket Delete Modal) */}
      {customerToDelete && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => !deletingCustomer && setCustomerToDelete(null)}
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
                  Remove Customer {customerToDelete.customer_name || customerToDelete.customer_id}?
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-medium">
                  Are you sure you want to permanently delete customer &ldquo;{customerToDelete.customer_name || customerToDelete.customer_id}&rdquo; and all associated tickets? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-300/40">
              <button
                type="button"
                disabled={deletingCustomer}
                onClick={() => setCustomerToDelete(null)}
                className="px-4 py-2 rounded-full bg-[#E8EEF5] shadow-neu-btn hover:shadow-neu-card border border-white/80 text-xs font-bold text-slate-700 transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <MinimalDeleteButton
                disabled={deletingCustomer}
                deleting={deletingCustomer}
                label="Remove Customer"
                confirmLabel="Confirm Remove"
                deletingLabel="Removing..."
                onConfirm={async () => {
                  setDeletingCustomer(true);
                  try {
                    const id = customerToDelete.customer_id || customerToDelete.customer_email;
                    await deleteCustomer(id);
                    setCustomers((prev) =>
                      prev.filter(
                        (cust) =>
                          (cust.customer_id || '').toUpperCase() !== String(id).toUpperCase() &&
                          (cust.customer_email || '').toLowerCase() !== String(id).toLowerCase()
                      )
                    );
                    setCustomerToDelete(null);
                  } catch (err) {
                    alert(err.message || 'Failed to remove customer');
                  } finally {
                    setDeletingCustomer(false);
                  }
                }}
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </main>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  Search,
  Ticket,
  AlertCircle,
  RotateCcw,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Loader2,
  Clock,
  Calendar,
  Tag,
  LayoutGrid,
  List,
  GripVertical,
  Trash2,
} from 'lucide-react';
import TicketStatusBadge from '../components/tickets/TicketStatusBadge';
import TicketActionMenu from '../components/tickets/TicketActionMenu';
import TicketDetailModal from '../components/tickets/TicketDetailModal';
import CreateTicketModal from '../components/tickets/CreateTicketModal';
import MinimalDeleteButton from '../components/ui/MinimalDeleteButton';
import DragDeleteDustbin from '../components/tickets/DragDeleteDustbin';
import {
  subscribeTickets,
  updateTicket,
  deleteTicket,
  triggerHardReload,
} from '../services/firestoreService';
import { useAuth } from '../context/useAuth';
import { getActiveAgents } from '../services/teamAgents';
import useSidebarPinned from '../hooks/useSidebarPinned';

// Retro Barcode Stamp for Authentic Ticket Stubs
const RetroBarcode = ({ ticketId }) => {
  const cleanId = String(ticketId || 'TKT').replace(/^#/, '');
  return (
    <div className="flex flex-col items-end select-none opacity-70 group-hover:opacity-100 transition-opacity">
      <div className="flex items-end gap-[1.5px] h-3.5">
        <div className="w-[1.5px] h-3.5 bg-slate-800" />
        <div className="w-[3px] h-2.5 bg-slate-800" />
        <div className="w-[1px] h-3.5 bg-slate-800" />
        <div className="w-[2px] h-3.5 bg-slate-800" />
        <div className="w-[1px] h-2 bg-slate-800" />
        <div className="w-[3.5px] h-3.5 bg-slate-800" />
        <div className="w-[1px] h-2.5 bg-slate-800" />
        <div className="w-[2px] h-3.5 bg-slate-800" />
        <div className="w-[1.5px] h-3.5 bg-slate-800" />
        <div className="w-[3px] h-3.5 bg-slate-800" />
        <div className="w-[1px] h-3.5 bg-slate-800" />
        <div className="w-[2.5px] h-2.5 bg-slate-800" />
        <div className="w-[1.5px] h-3.5 bg-slate-800" />
        <div className="w-[3px] h-3 bg-slate-800" />
        <div className="w-[1px] h-3.5 bg-slate-800" />
        <div className="w-[2px] h-3.5 bg-slate-800" />
        <div className="w-[3.5px] h-3.5 bg-slate-800" />
        <div className="w-[1.5px] h-2.5 bg-slate-800" />
        <div className="w-[2.5px] h-3.5 bg-slate-800" />
        <div className="w-[1px] h-3.5 bg-slate-800" />
      </div>
      <span className="font-mono text-[7.5px] tracking-widest text-slate-500 font-bold uppercase mt-0.5">
        *{cleanId}*
      </span>
    </div>
  );
};

// Retro Rubber Stamp for Status Classification (Authentic Document Stamp Design)
const RetroStatusStamp = ({ status }) => {
  const norm = (status || 'Open').toLowerCase();
  let color = 'border-rose-500/90 text-rose-600 bg-rose-50/80 shadow-rose-200/40';
  let rotate = '-rotate-2';
  let text = 'OPEN';

  if (norm.includes('progress')) {
    color = 'border-blue-600/90 text-blue-600 bg-blue-50/80 shadow-blue-200/40';
    rotate = 'rotate-2';
    text = 'IN PROGRESS';
  } else if (norm.includes('closed') || norm.includes('resolved')) {
    color = 'border-emerald-600/90 text-emerald-700 bg-emerald-50/80 shadow-emerald-200/40';
    rotate = '-rotate-2';
    text = 'RESOLVED';
  }

  return (
    <div
      className={`inline-flex items-center justify-center px-3.5 py-1 rounded-lg border-2 border-dashed font-mono font-black text-xs sm:text-[13px] tracking-widest uppercase shadow-2xs select-none transition-transform duration-200 group-hover:scale-105 ${color} ${rotate}`}
    >
      <span>{text}</span>
    </div>
  );
};

const ITEMS_PER_PAGE = 9; // 9 cards per page (3x3 grid)

export default function Tickets({ onNavigate }) {
  const { user } = useAuth();
  const isSidebarPinned = useSidebarPinned();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Drag-to-Delete interactive state
  const [draggedTicket, setDraggedTicket] = useState(null);
  const [isDraggingCard, setIsDraggingCard] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const handleCardDragStart = (e, ticket) => {
    setDraggedTicket(ticket);
    setIsDraggingCard(true);
    try {
      e.dataTransfer.setData('text/plain', ticket.ticket_id);
      e.dataTransfer.effectAllowed = 'move';
    } catch {}
  };

  const handleCardDragEnd = () => {
    setIsDraggingCard(false);
    setDraggedTicket(null);
  };

  const handleDropDelete = async (ticket) => {
    setIsDraggingCard(false);
    setDraggedTicket(null);
    if (!ticket || !ticket.ticket_id) return;

    const id = ticket.ticket_id;

    // Optimistic removal — immediately hide from UI before Firestore propagates
    setTickets((prev) => prev.filter((t) => t.ticket_id !== id));
    if (selectedTicketId === id) setSelectedTicketId(null);

    setToastMessage({
      text: `Ticket #${id} moved to trash`,
      ticket,
    });
    setTimeout(() => {
      setToastMessage((curr) => (curr?.ticket?.ticket_id === id ? null : curr));
    }, 5000);

    try {
      await deleteTicket(id);
      triggerHardReload();
    } catch (err) {
      // Rollback: re-add if delete failed
      setTickets((prev) => [...prev, ticket]);
      alert(err.message || 'Failed to delete ticket');
    }
  };

  // Active agents directory for agent filters
  const activeAgents = useMemo(() => getActiveAgents(user), [user]);

  // View Mode: 'grid' (default retro ticket cards) | 'table' (tabular view)
  const [viewMode, setViewMode] = useState(() => {
    try {
      const raw = localStorage.getItem('strawcrm_preferences');
      if (raw) {
        const p = JSON.parse(raw);
        if (p.defaultViewMode === 'table' || p.defaultViewMode === 'grid') {
          return p.defaultViewMode;
        }
      }
    } catch { }
    return 'grid';
  });

  // Sync viewMode when changed from Settings or other components
  useEffect(() => {
    const handleViewChange = (e) => {
      const mode = e.detail?.viewMode;
      if (mode === 'grid' || mode === 'table') {
        setViewMode(mode);
      }
    };
    const handleStorage = (e) => {
      if (e.key === 'strawcrm_preferences') {
        try {
          const p = JSON.parse(e.newValue || '{}');
          if (p.defaultViewMode) setViewMode(p.defaultViewMode);
        } catch { }
      }
    };
    window.addEventListener('tickets-view-mode-change', handleViewChange);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('tickets-view-mode-change', handleViewChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    try {
      const raw = localStorage.getItem('strawcrm_preferences');
      const prefs = raw ? JSON.parse(raw) : {};
      prefs.defaultViewMode = mode;
      localStorage.setItem('strawcrm_preferences', JSON.stringify(prefs));
      window.dispatchEvent(new CustomEvent('tickets-view-mode-change', { detail: { viewMode: mode } }));
    } catch { }
  };

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [selectedTimeRange, setSelectedTimeRange] = useState('All Time');
  const [selectedAgentFilter, setSelectedAgentFilter] = useState('all'); // 'all' | 'me' | 'unassigned' | agent.id
  const [timeDropdownOpen, setTimeDropdownOpen] = useState(false);

  // Delete state
  const [deleteModal, setDeleteModal] = useState(null); // ticket object to delete
  const [deleting, setDeleting] = useState(false);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Debounce search input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Read URL query params on mount for instant customer ticket filtering
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const s = params.get('search') || params.get('customer_id');
      if (s) {
        setSearchTerm(s);
      }
    }
  }, []);

  // Realtime subscription
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeTickets(
      {
        search: debouncedSearch,
        status: selectedStatus === 'All Status' ? '' : selectedStatus,
        timeRange: selectedTimeRange,
      },
      (liveTickets) => {
        setTickets(liveTickets || []);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.warn('[Tickets] Realtime subscription notice:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [debouncedSearch, selectedStatus, selectedTimeRange]);

  // Reset pagination to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedStatus, selectedTimeRange, selectedAgentFilter]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setSelectedStatus('All Status');
    setSelectedTimeRange('All Time');
    setSelectedAgentFilter('all');
    setCurrentPage(1);
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      await updateTicket(ticketId, { status: newStatus });
    } catch (err) {
      alert(err.message || 'Failed to update ticket status.');
    }
  };

  // Helper to determine if a ticket is assigned to the current user
  const isAssignedToCurrentUser = (t) => {
    if (!user || !t) return false;
    // Match by exact agent ID (most reliable)
    if (user.id && t.assigned_to_id && String(user.id) === String(t.assigned_to_id)) return true;
    // Match by exact email only (not substring/fuzzy name match to avoid false positives)
    const userEmail = (user.email || '').toLowerCase().trim();
    const assignedEmail = (t.assigned_to_email || '').toLowerCase().trim();
    if (userEmail && assignedEmail && userEmail === assignedEmail) return true;
    return false;
  };

  // Count of tickets assigned specifically to the logged-in user
  const myTicketsCount = useMemo(() => {
    return tickets.filter((t) => isAssignedToCurrentUser(t)).length;
  }, [tickets, user]);

  // Count of tickets in the unassigned team pool
  const unassignedTicketsCount = useMemo(() => {
    return tickets.filter((t) => !t.assigned_to_name && !t.assigned_to_email && !t.assigned_to_id).length;
  }, [tickets]);

  // Compute displayed tickets filtered by agent selection
  const displayedTickets = useMemo(() => {
    if (selectedAgentFilter === 'all') return tickets;
    if (selectedAgentFilter === 'me') {
      return tickets.filter((t) => isAssignedToCurrentUser(t));
    }
    if (selectedAgentFilter === 'unassigned') {
      return tickets.filter((t) => !t.assigned_to_name && !t.assigned_to_email && !t.assigned_to_id);
    }
    const targetAgent = activeAgents.find((a) => a.id === selectedAgentFilter);
    if (targetAgent) {
      const targetEmail = (targetAgent.email || '').toLowerCase().trim();
      const targetName = (targetAgent.name || '').toLowerCase().trim();
      return tickets.filter((t) => {
        const aEmail = (t.assigned_to_email || '').toLowerCase().trim();
        const aName = (t.assigned_to_name || '').toLowerCase().trim();
        return (targetEmail && aEmail === targetEmail) || (targetName && aName === targetName);
      });
    }
    return tickets;
  }, [tickets, selectedAgentFilter, user, activeAgents]);

  // Format date as "Sep 10, 2026"
  const formatDate = (isoString) => {
    if (!isoString) return 'Just now';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return String(isoString);
    }
  };

  // Helper to determine priority label and visual theme
  const getPriorityInfo = (p, status) => {
    const normP = (p || '').toLowerCase();
    const normS = (status || '').toLowerCase();
    if (normP === 'urgent' || normS === 'urgent') {
      return {
        label: 'Urgent',
        color: 'bg-rose-50 text-rose-700 border-rose-200',
        bar: 'bg-rose-500',
        topBorder: 'border-t-rose-500',
      };
    }
    if (normP === 'high') {
      return {
        label: 'High',
        color: 'bg-amber-50 text-amber-700 border-amber-200',
        bar: 'bg-amber-500',
        topBorder: 'border-t-amber-500',
      };
    }
    if (normP === 'low') {
      return {
        label: 'Low',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        bar: 'bg-emerald-500',
        topBorder: 'border-t-emerald-500',
      };
    }
    return {
      label: p || 'Medium',
      color: 'bg-blue-50 text-brand-electric border-blue-200',
      bar: 'bg-brand-electric',
      topBorder: 'border-t-brand-electric',
    };
  };

  // Pagination calculations on displayedTickets
  const totalTickets = displayedTickets.length;
  const totalPages = Math.max(1, Math.ceil(totalTickets / ITEMS_PER_PAGE));
  const effectivePage = Math.min(currentPage, totalPages);

  const paginatedTickets = useMemo(() => {
    const startIndex = (effectivePage - 1) * ITEMS_PER_PAGE;
    return displayedTickets.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [displayedTickets, effectivePage]);

  const startRecord = totalTickets === 0 ? 0 : (effectivePage - 1) * ITEMS_PER_PAGE + 1;
  const endRecord = Math.min(effectivePage * ITEMS_PER_PAGE, totalTickets);

  // Delete Handlers
  const handleDeleteSingle = (ticket) => {
    setDeleteModal(ticket);
  };

  const confirmDelete = async () => {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      const id = deleteModal.ticket_id;
      await deleteTicket(id);
      if (selectedTicketId === id) setSelectedTicketId(null);
      setDeleteModal(null);
      triggerHardReload();
    } catch (err) {
      alert(err.message || 'Failed to delete ticket');
    } finally {
      setDeleting(false);
    }
  };

  // Generate page numbers array (e.g. 1, 2, 3, 4, 5)
  const pageNumbers = useMemo(() => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, effectivePage - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }, [effectivePage, totalPages]);

  const timeRangeOptions = [
    { label: 'All Time', value: 'All Time' },
    { label: 'Today', value: 'Today' },
    { label: 'Last 7 days', value: 'Last 7 days' },
    { label: 'Last 30 days', value: 'Last 30 days' },
    { label: 'Last 3 months', value: 'Last 3 months' },
  ];

  const isFiltered =
    Boolean(searchTerm) ||
    selectedStatus !== 'All Status' ||
    selectedTimeRange !== 'All Time' ||
    selectedAgentFilter !== 'all';

  return (
    <main className="flex-1 flex flex-col h-full min-h-0 w-full bg-[#E8EEF5] text-slate-800 p-4 sm:p-5 lg:p-6 space-y-4 no-scrollbar w-full overflow-y-auto lg:overflow-hidden transition-all duration-200">
      {/* ─────────────────────────────────────────────────────────────────────────
          1. HEADER WITH STATS & ACTIONS (Neumorphic Soft UI)
         ───────────────────────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-300/40">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Tickets
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-[#E8EEF5] text-sky-600 shadow-neu-btn border border-white/80">
              <Ticket className="w-3.5 h-3.5 text-sky-500" />
              {totalTickets} {totalTickets === 1 ? 'Ticket' : 'Tickets'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Manage and track customer support requests across your workspace.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {/* Refresh Real-Time Button */}
          <button
            type="button"
            onClick={async () => {
              setLoading(true);
              await syncFromBackend();
              setLoading(false);
            }}
            aria-label="Refresh tickets"
            title="Refresh tickets from backend"
            className="p-2.5 rounded-2xl bg-[#E8EEF5] shadow-neu-btn hover:shadow-neu-card active:shadow-neu-btn-pressed border border-white/80 text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-600' : ''}`} />
          </button>

          {/* Primary CTA: + Create Ticket */}
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 text-white text-xs font-bold shadow-[4px_4px_12px_rgba(14,165,233,0.35),-2px_-2px_8px_rgba(255,255,255,0.7)] hover:shadow-[6px_6px_16px_rgba(14,165,233,0.45),-3px_-3px_10px_rgba(255,255,255,0.9)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Create Ticket</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          2. FILTER & SEARCH TOOLBAR
          - Expanded (!isSidebarPinned): Generous widths, search on left, filters right-aligned with ml-auto
          - Unexpanded (isSidebarPinned): Fits cleanly on ONE single row without wrapping, preserving original heights
         ───────────────────────────────────────────────────────────────────────── */}
      <div
        className={`shrink-0 flex items-center justify-between w-full py-0.5 ${
          !isSidebarPinned
            ? 'gap-3 flex-wrap lg:flex-nowrap'
            : 'gap-1.5 sm:gap-2 flex-nowrap overflow-x-visible'
        }`}
      >
        {/* Sunken Search Input */}
        <div
          className={`relative shrink-0 group/search ${
            !isSidebarPinned
              ? 'w-full sm:w-64 md:w-72'
              : 'w-36 sm:w-40 lg:w-44'
          }`}
        >
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-hover/search:text-sky-600 group-focus-within/search:text-sky-600 transition-colors z-20">
            <Search className="w-4 h-4 stroke-[2.3]" />
          </div>
          <input
            id="tickets-search-input"
            name="ticketsSearch"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={!isSidebarPinned ? 'Search by ID, customer, topic...' : 'Search...'}
            className="neu-input w-full pl-9 pr-7 py-2 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none"
          />
          <div className="absolute inset-y-0 right-0 pr-2 flex items-center z-20">
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                aria-label="Clear search"
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right-Aligned Filter Group */}
        <div
          className={`flex items-center shrink-0 ml-auto ${
            !isSidebarPinned
              ? 'gap-2 sm:gap-2.5 flex-wrap sm:flex-nowrap'
              : 'gap-1.5 sm:gap-2 flex-nowrap'
          }`}
        >
          {/* Segmented Status Tabs in Sunken Track */}
          <div className="flex items-center gap-0.5 bg-[#E2E9F2] shadow-neu-inset p-1 rounded-2xl border border-white/60 shrink-0">
            {['All Status', 'Open', 'In Progress', 'Closed'].map((status) => {
              const active = selectedStatus === status;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setSelectedStatus(status)}
                  className={`${
                    !isSidebarPinned ? 'px-3 py-1.5' : 'px-2 py-1.5'
                  } rounded-xl transition-all duration-150 cursor-pointer text-xs shrink-0 ${
                    active
                      ? 'bg-[#E8EEF5] text-sky-600 font-extrabold shadow-neu-btn border border-white/80'
                      : 'text-slate-600 hover:text-slate-900 font-medium'
                  }`}
                >
                  {status}
                </button>
              );
            })}
          </div>

          {/* My Tickets Quick Pill */}
          <button
            type="button"
            onClick={() => setSelectedAgentFilter(selectedAgentFilter === 'me' ? 'all' : 'me')}
            className={`inline-flex items-center gap-1.5 ${
              !isSidebarPinned ? 'px-3.5 py-1.5' : 'px-2.5 py-1.5'
            } rounded-2xl text-xs font-bold transition-all cursor-pointer border shrink-0 ${
              selectedAgentFilter === 'me'
                ? 'bg-emerald-600 text-white border-white/40 shadow-[3px_3px_8px_rgba(16,185,129,0.4),-2px_-2px_6px_rgba(255,255,255,0.8)]'
                : 'bg-[#E8EEF5] text-emerald-700 border-white/80 shadow-neu-btn hover:shadow-neu-card'
            }`}
            title="Show tickets assigned to me"
          >
            <span>⭐ My Tickets</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                selectedAgentFilter === 'me'
                  ? 'bg-emerald-800 text-white'
                  : 'bg-[#E2E9F2] shadow-neu-inset text-emerald-800'
              }`}
            >
              {myTicketsCount}
            </span>
          </button>

          {/* Team Pool (Unassigned) Quick Pill */}
          <button
            type="button"
            onClick={() => setSelectedAgentFilter(selectedAgentFilter === 'unassigned' ? 'all' : 'unassigned')}
            className={`inline-flex items-center gap-1.5 ${
              !isSidebarPinned ? 'px-3.5 py-1.5' : 'px-2.5 py-1.5'
            } rounded-2xl text-xs font-bold transition-all cursor-pointer border shrink-0 ${
              selectedAgentFilter === 'unassigned'
                ? 'bg-amber-600 text-white border-white/40 shadow-[3px_3px_8px_rgba(217,119,6,0.4),-2px_-2px_6px_rgba(255,255,255,0.8)]'
                : 'bg-[#E8EEF5] text-amber-800 border-white/80 shadow-neu-btn hover:shadow-neu-card'
            }`}
            title="Show tickets in unassigned team pool"
          >
            <span>👥 Team Pool</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                selectedAgentFilter === 'unassigned'
                  ? 'bg-amber-800 text-white'
                  : 'bg-[#E2E9F2] shadow-neu-inset text-amber-900'
              }`}
            >
              {unassignedTicketsCount}
            </span>
          </button>

          {/* Time Range Custom Dropdown */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setTimeDropdownOpen(!timeDropdownOpen)}
              className={`inline-flex items-center gap-1.5 ${
                !isSidebarPinned ? 'px-3.5 py-1.5' : 'px-2.5 py-1.5'
              } bg-[#E8EEF5] shadow-neu-btn hover:shadow-neu-card active:shadow-neu-btn-pressed border border-white/80 rounded-2xl text-xs font-bold text-slate-700 cursor-pointer transition-all shrink-0`}
            >
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>{selectedTimeRange}</span>
              <ChevronDown className="w-4 h-4 text-slate-500" />
            </button>

            {timeDropdownOpen && (
              <div className="origin-top-right absolute right-0 mt-2 w-44 rounded-2xl bg-[#E8EEF5] shadow-neu-card border border-white/80 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
                {timeRangeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setSelectedTimeRange(opt.value);
                      setTimeDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-xs transition-colors flex items-center justify-between ${
                      selectedTimeRange === opt.value
                        ? 'bg-[#E2E9F2] text-sky-600 font-extrabold shadow-neu-inset'
                        : 'text-slate-700 hover:bg-white/40 font-medium'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {selectedTimeRange === opt.value && (
                      <span className="w-2 h-2 rounded-full bg-sky-500" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reset Filters Button - Prominently displayed right on the same row */}
          {isFiltered ? (
            <button
              type="button"
              onClick={handleResetFilters}
              title="Reset all active filters"
              className={`inline-flex items-center gap-1.5 ${
                !isSidebarPinned ? 'px-3 py-1.5' : 'px-2.5 py-1.5'
              } bg-rose-50 hover:bg-rose-100 text-rose-700 active:bg-rose-200 border border-rose-300 shadow-neu-btn active:shadow-neu-btn-pressed rounded-2xl text-xs font-bold transition-all cursor-pointer shrink-0 animate-in fade-in`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
              <span>Reset</span>
            </button>
          ) : (
            <button
              type="button"
              disabled
              title="No filters active"
              className={`inline-flex items-center gap-1.5 ${
                !isSidebarPinned ? 'px-3 py-1.5' : 'px-2.5 py-1.5'
              } bg-[#E8EEF5] text-slate-400 border border-slate-300/40 rounded-2xl text-xs font-semibold shrink-0 opacity-40 cursor-default`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          3. MAIN VIEWPORT: RETRO TICKET CARDS GRID vs TABLE VIEW (Neumorphic Card)
         ───────────────────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 rounded-3xl bg-[#E8EEF5] shadow-neu-card border border-white/60 flex flex-col overflow-hidden transition-all">
        {/* Table/Grid Card Header Strip */}
        <div className="shrink-0 px-5 h-11 bg-[#E2E9F2]/80 border-b border-slate-300/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Ticket className="w-4 h-4 text-sky-600" />
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Support Tickets
            </span>

            <span className="text-[10px] font-black text-slate-600 bg-[#E8EEF5] px-2 py-0.5 rounded-xl shadow-neu-btn border border-white/80">
              {totalTickets}
            </span>
            {isFiltered && (
              <button
                type="button"
                onClick={handleResetFilters}
                title="Click to reset all active filters"
                className="text-[10px] font-black text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded-xl border border-rose-200 shadow-neu-btn flex items-center gap-1 cursor-pointer transition-all"
              >
                <RotateCcw className="w-2.5 h-2.5 text-rose-600" />
                <span>Filtered (Reset ✕)</span>
              </button>
            )}
          </div>


          <div className="flex items-center gap-3">
            {/* View Mode Switcher in Sunken Track */}
            <div className="flex items-center bg-[#E2E9F2] shadow-neu-inset p-0.5 rounded-xl border border-white/60">
              <button
                type="button"
                onClick={() => handleViewModeChange('grid')}
                title="Ticket Cards (Grid)"
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${viewMode === 'grid'
                    ? 'bg-[#E8EEF5] text-sky-600 shadow-neu-btn border border-white/80'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Cards</span>
              </button>
              <button
                type="button"
                onClick={() => handleViewModeChange('table')}
                title="Table View (List)"
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${viewMode === 'table'
                    ? 'bg-[#E8EEF5] text-sky-600 shadow-neu-btn border border-white/80'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Table</span>
              </button>
            </div>

            <div className="hidden xs:flex items-center gap-2 text-[11px] font-bold text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              <span>Real-Time Sync</span>
            </div>
          </div>
        </div>

        {error ? (
          /* Error State */
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#E8EEF5] shadow-neu-card border border-white/80 text-rose-600 flex items-center justify-center mb-3">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h3 className="text-base font-black text-slate-800">Unable to load tickets</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1 mb-5">{error}</p>
            <button
              type="button"
              onClick={() => setError(null)}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-2xl bg-[#E8EEF5] shadow-neu-btn hover:shadow-neu-card active:shadow-neu-btn-pressed border border-white/80 text-sky-600 text-xs font-bold transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        ) : loading && tickets.length === 0 ? (
          /* Skeleton Loading */
          <div className="flex-1 p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-64 bg-[#E2E9F2] shadow-neu-inset rounded-3xl p-6 space-y-4 border border-white/60"
              />
            ))}
          </div>
        ) : totalTickets === 0 ? (
          /* Empty States */
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            {isFiltered ? (
              <>
                <div className="w-14 h-14 rounded-2xl bg-[#E8EEF5] shadow-neu-btn border border-white/80 text-slate-400 flex items-center justify-center mb-3">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-black text-slate-800">No tickets found</h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1 mb-5">
                  No support tickets match your active search or filters.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-4 py-2 rounded-2xl bg-[#E8EEF5] shadow-neu-btn hover:shadow-neu-card text-slate-700 text-xs font-bold border border-white/80 transition-all cursor-pointer"
                >
                  Clear Filters
                </button>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-[#E8EEF5] shadow-neu-btn border border-white/80 text-sky-600 flex items-center justify-center mb-3">
                  <Ticket className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-black text-slate-800">No tickets yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1 mb-5">
                  Create your first support ticket to get started with StrawCRM.
                </p>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 text-white text-xs font-bold shadow-neu-btn hover:shadow-neu-card cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Ticket</span>
                </button>
              </>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          /* ─────────────────────────────────────────────────────────────────
              SQUARICAL NEUMORPHIC TICKET CARDS GRID VIEW
             ───────────────────────────────────────────────────────────────── */
          <div className="overflow-y-auto flex-1 pt-3 px-4 pb-4 sm:pt-3.5 sm:px-5 sm:pb-5 no-scrollbar">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5 lg:gap-6">
              {paginatedTickets.map((t) => {
                const priorityInfo = getPriorityInfo(t.priority, t.status);
                const customerInitial = (t.customer_name || 'C').charAt(0).toUpperCase();

                return (
                  <div
                    key={t.ticket_id}
                    draggable
                    onDragStart={(e) => handleCardDragStart(e, t)}
                    onDragEnd={handleCardDragEnd}
                    onClick={() => {
                      if (!isDraggingCard) setSelectedTicketId(t.ticket_id);
                    }}
                    className={`rounded-[22px] bg-[#EEF4FA] border transition-all duration-200 relative flex flex-col justify-between p-3.5 sm:p-4 group cursor-pointer font-jakarta select-none ${
                      draggedTicket?.ticket_id === t.ticket_id
                        ? 'border-rose-400/60 shadow-[0_12px_30px_rgba(225,29,72,0.25)] scale-[1.04] rotate-[2deg] opacity-80 ring-2 ring-rose-300/50 cursor-grabbing z-30'
                        : 'border-white/60 shadow-[4px_6px_16px_rgba(165,182,206,0.32),-1px_-1px_3px_rgba(255,255,255,0.18)] hover:shadow-[6px_8px_20px_rgba(155,174,200,0.42),-1px_-1px_4px_rgba(255,255,255,0.25)] hover:-translate-y-0.5'
                    }`}
                  >
                    {/* Drag Grip Handle — visible on hover */}
                    <div className="absolute top-1.5 right-1.5 p-1 rounded-lg text-slate-400 opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:text-rose-500 hover:bg-rose-50 transition-all cursor-grab active:cursor-grabbing z-20"
                      title="Drag to trash to delete"
                    >
                      <GripVertical className="w-3.5 h-3.5" />
                    </div>
                    {/* ─────────────────────────────────────────────────────────
                        1. TOP ROW: Ticket ID, Priority & Status Stamp + Action Menu
                       ───────────────────────────────────────────────────────── */}
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E2EAF3] shadow-[inset_1px_1px_2px_rgba(168,184,206,0.5),inset_-1px_-1px_2px_rgba(255,255,255,0.95)] border border-white/50 text-slate-800 font-mono text-[10px] font-black tracking-wide">
                            <Ticket className="w-2.5 h-2.5 text-sky-600" />
                            <span>#{t.ticket_id}</span>
                          </span>

                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${priorityInfo.color}`}
                          >
                            <span>{priorityInfo.label}</span>
                          </span>
                        </div>

                        {/* Status Stamp */}
                        <div className="shrink-0">
                          <TicketStatusBadge status={t.status} />
                        </div>
                      </div>

                      {/* Customer Info Card */}
                      <div className="flex items-center gap-2.5 mt-2.5 mb-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-[0_2px_6px_rgba(99,102,241,0.3)] ring-2 ring-white/80">
                          {customerInitial}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-extrabold text-xs text-slate-900 leading-tight truncate group-hover:text-sky-600 transition-colors">
                            {t.customer_name || 'Valued Customer'}
                          </h4>
                          <p className="text-[10px] text-slate-500 font-medium truncate">
                            {t.customer_email || 'No email registered'}
                          </p>
                        </div>
                        {t.category && (
                          <span className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-[#E2EAF3] shadow-[inset_1px_1px_2px_rgba(168,184,206,0.4)] text-[9px] font-bold text-slate-600 border border-white/60">
                            <Tag className="w-2.5 h-2.5 text-slate-400" />
                            <span className="truncate max-w-[65px]">{t.category}</span>
                          </span>
                        )}
                      </div>

                      {/* Subject & Description Snippet */}
                      <div className="mt-1">
                        <h3 className="font-bold text-xs text-slate-800 leading-snug line-clamp-1 group-hover:text-slate-900 transition-colors">
                          {t.subject || 'Untitled Ticket Subject'}
                        </h3>
                        {t.description && (
                          <p className="text-[11px] text-slate-500 font-medium line-clamp-1 leading-normal mt-0.5">
                            {t.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* ─────────────────────────────────────────────────────────
                        2. TICKET PERFORATION & TEAR NOTCHES
                       ───────────────────────────────────────────────────────── */}
                    <div>
                      <div className="relative flex items-center select-none pointer-events-none my-1.5 -mx-3.5 sm:-mx-4">
                        {/* Left Inward Notch */}
                        <div className="absolute -left-[1px] top-1/2 -translate-y-1/2 w-2.5 h-5 rounded-r-full bg-[#E8EEF5] border-y border-r border-slate-300/60 shadow-[inset_-1.5px_0_2px_rgba(15,23,42,0.08)]" />

                        {/* Dashed Tear Line */}
                        <div className="w-full border-b border-dashed border-slate-300/60 group-hover:border-sky-400/50 mx-3.5 transition-colors" />

                        {/* Right Inward Notch */}
                        <div className="absolute -right-[1px] top-1/2 -translate-y-1/2 w-2.5 h-5 rounded-l-full bg-[#E8EEF5] border-y border-l border-slate-300/60 shadow-[inset_1.5px_0_2px_rgba(15,23,42,0.08)]" />
                      </div>

                      {/* ─────────────────────────────────────────────────────────
                          3. TICKET STUB FOOTER: ISSUED DATE & BARCODE
                         ───────────────────────────────────────────────────────── */}
                      <div className="flex items-center justify-between pt-0.5">
                        <div className="flex flex-col text-[9px] text-slate-400 font-medium">
                          <div className="flex items-center gap-1 text-slate-500 font-semibold">
                            <Clock className="w-2.5 h-2.5 text-slate-400" />
                            <span>ISSUED: {formatDate(t.created_at)}</span>
                          </div>
                          {isAssignedToCurrentUser(t) ? (
                            <span className="text-[8.5px] font-black text-emerald-600 mt-0.5">
                              ⭐ Assigned to You
                            </span>
                          ) : t.assigned_to_name ? (
                            <span className="font-mono text-[8.5px] uppercase tracking-wider text-slate-400 mt-0.5">
                              👤 {t.assigned_to_name}
                            </span>
                          ) : (
                            <span className="font-mono text-[8.5px] uppercase tracking-wider text-slate-400 mt-0.5">
                              👥 Team Pool
                            </span>
                          )}
                        </div>

                        {/* Barcode Stamp */}
                        <RetroBarcode ticketId={t.ticket_id} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ─────────────────────────────────────────────────────────────────
              TABULAR VIEW (Neumorphic table styling)
             ───────────────────────────────────────────────────────────────── */
          <div className="flex-1 overflow-y-auto overflow-x-auto divide-y divide-slate-300/30 no-scrollbar">
            <table className="w-full text-left text-xs border-collapse table-fixed min-w-[700px]">
              <colgroup>
                <col className="w-[11%]" />
                <col className="w-[20%]" />
                <col className="w-[20%]" />
                <col className="w-[13%]" />
                <col className="w-[8%]" />
                <col className="w-[11%]" />
                <col className="w-[9%]" />
                <col className="w-[8%]" />
              </colgroup>
              <thead className="sticky top-0 bg-[#E2E9F2]/95 backdrop-blur-xs border-b border-slate-300/50 text-slate-700 uppercase font-black text-[10.5px] tracking-wider z-10">
                <tr className="h-8.5 sm:h-9">
                  <th className="px-3 pl-5 sm:pl-6 py-1.5 align-middle whitespace-nowrap">Ticket ID</th>
                  <th className="px-3 py-1.5 align-middle whitespace-nowrap">Customer</th>
                  <th className="px-3 py-1.5 align-middle">Subject</th>
                  <th className="px-3 py-1.5 align-middle whitespace-nowrap">Assignee</th>
                  <th className="px-3 py-1.5 align-middle whitespace-nowrap">Priority</th>
                  <th className="px-3 py-1.5 align-middle whitespace-nowrap">Status</th>
                  <th className="px-3 py-1.5 align-middle whitespace-nowrap">Created</th>
                  <th className="px-2 pr-6 sm:pr-7 py-1.5 align-middle text-center whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300/20">
                {paginatedTickets.map((t) => {
                  const priorityInfo = getPriorityInfo(t.priority, t.status);
                  return (
                    <tr
                      key={t.ticket_id}
                      onClick={() => setSelectedTicketId(t.ticket_id)}
                      className="transition-colors duration-150 cursor-pointer group hover:bg-white/40"
                    >
                      <td className="py-2.5 sm:py-3 px-3 pl-5 sm:pl-6 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-xl bg-[#E8EEF5] shadow-neu-btn border border-white/80 font-mono text-xs font-bold text-sky-600 whitespace-nowrap">
                          #{t.ticket_id}
                        </span>
                      </td>
                      <td className="py-2.5 sm:py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm ring-2 ring-white/70">
                            {(t.customer_name || 'C').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 max-w-[140px] sm:max-w-[180px]">
                            <p className="font-bold text-slate-900 group-hover:text-sky-600 transition-colors truncate">
                              {t.customer_name || 'Customer'}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">
                              {t.customer_email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 sm:py-3 px-3">
                        <span className="font-semibold text-slate-800 line-clamp-1 group-hover:text-slate-900">
                          {t.subject}
                        </span>
                      </td>
                      <td className="py-2.5 sm:py-3 px-3 whitespace-nowrap">
                        {isAssignedToCurrentUser(t) ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#E8EEF5] shadow-neu-btn border border-emerald-300/80 text-emerald-700 text-[11px] font-black">
                            <span>⭐ You</span>
                          </span>
                        ) : t.assigned_to_name ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xl bg-[#E8EEF5] shadow-neu-btn border border-purple-300/80 text-purple-700 text-[11px] font-semibold">
                            <span>👤 {t.assigned_to_name}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xl bg-[#E8EEF5] shadow-neu-btn border border-white/80 text-slate-500 text-[11px] font-medium">
                            <span>👥 Team Pool</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 sm:py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-xl text-xs font-bold border whitespace-nowrap shrink-0 select-none ${priorityInfo.color}`}
                        >
                          {priorityInfo.label}
                        </span>
                      </td>
                      <td className="py-2.5 sm:py-3 px-3 whitespace-nowrap">
                        <TicketStatusBadge status={t.status} />
                      </td>
                      <td className="py-2.5 sm:py-3 px-3 text-slate-500 text-xs whitespace-nowrap font-medium">
                        {formatDate(t.created_at)}
                      </td>
                      <td
                        className="py-2.5 sm:py-3 px-2 pr-6 sm:pr-7 text-center whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────────
            5. FOOTER & PAGINATION CONTROLS (Neumorphic Tactile Buttons)
           ───────────────────────────────────────────────────────────────────────── */}
        <div className="shrink-0 mt-auto py-3.5 px-6 bg-[#E2E9F2]/90 border-t border-slate-300/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-semibold">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#E8EEF5] shadow-neu-inset border border-white/60 text-xs text-slate-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-sky-500 shadow-[0_0_6px_rgba(14,165,233,0.6)]" />
              <span>
                Showing <span className="font-black text-slate-800">{totalTickets === 0 ? 0 : `${startRecord}–${endRecord}`}</span> of{' '}
                <span className="font-black text-slate-800">{totalTickets}</span> tickets
              </span>
            </div>
            {isFiltered && totalTickets !== tickets.length && (
              <span className="text-[11px] font-bold text-sky-600 bg-sky-100/70 border border-sky-200/80 px-2.5 py-0.5 rounded-xl shadow-2xs">
                Filtered from {tickets.length} total
              </span>
            )}
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center gap-2">
              {/* Previous Page */}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                aria-label="Previous page"
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-[#E8EEF5] shadow-neu-btn hover:shadow-neu-card active:shadow-neu-btn-pressed border border-white/80 text-slate-600 hover:text-slate-900 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Page Numbers */}
              {pageNumbers.map((num) => {
                const isActive = num === effectivePage;
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setCurrentPage(num)}
                    aria-label={`Page ${num}`}
                    aria-current={isActive ? 'page' : undefined}
                    className={`w-8 h-8 flex items-center justify-center rounded-xl text-xs font-black transition-all cursor-pointer ${isActive
                        ? 'bg-[#E2E9F2] text-sky-600 shadow-neu-inset border border-white/60'
                        : 'bg-[#E8EEF5] shadow-neu-btn hover:shadow-neu-card border border-white/80 text-slate-700'
                      }`}
                  >
                    {num}
                  </button>
                );
              })}

              {/* Next Page */}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                aria-label="Next page"
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-[#E8EEF5] shadow-neu-btn hover:shadow-neu-card active:shadow-neu-btn-pressed border border-white/80 text-slate-600 hover:text-slate-900 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#E8EEF5] shadow-neu-btn border border-white/80 text-[11px] font-bold text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Page 1 of 1
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          6. CONFIRMATION MODAL FOR DELETION (Neumorphic Modal)
         ───────────────────────────────────────────────────────────────────────── */}
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
                  Delete Ticket #{deleteModal.ticket_id}?
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-medium">
                  Are you sure you want to permanently delete ticket &ldquo;{deleteModal.subject || deleteModal.ticket_id}&rdquo;? This action cannot be undone.
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

      {/* ─────────────────────────────────────────────────────────────────────────
          7. MODALS
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
        onDelete={(ticket) => {
          setSelectedTicketId(null);
          handleDeleteSingle(ticket);
        }}
      />

      {/* ─────────────────────────────────────────────────────────────────────────
          8. DRAG-TO-DELETE DUSTBIN (Portal to body)
         ───────────────────────────────────────────────────────────────────────── */}
      {createPortal(
        <DragDeleteDustbin
          isDragging={isDraggingCard}
          draggedTicket={draggedTicket}
          onDropDelete={handleDropDelete}
        />,
        document.body
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          9. UNDO DELETE TOAST
         ───────────────────────────────────────────────────────────────────────── */}
      {toastMessage && createPortal(
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-900 text-white shadow-[0_12px_40px_rgba(0,0,0,0.4)] border border-white/10 backdrop-blur-lg">
            <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="text-xs font-bold">{toastMessage.text}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="ml-2 px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-[11px] font-black text-white transition-all cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>,
        document.body
      )}
    </main>
  );
}



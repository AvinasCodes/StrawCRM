import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  User,
  Mail,
  Ticket,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Copy,
  Check,
  Calendar,
  Sparkles,
  MessageSquare,
  Paperclip,
  Tag,
  ShieldCheck,
  Filter,
  Trash2,
  Loader2,
} from 'lucide-react';
import TicketStatusBadge from '../tickets/TicketStatusBadge';
import MinimalDeleteButton from '../ui/MinimalDeleteButton';
import { deleteCustomer } from '../../services/firestoreService';

export default function CustomerTicketHistoryPanel({
  isOpen,
  customer,
  tickets = [],
  onClose,
  onSelectTicket,
  onCreateTicket,
  onCustomerDeleted,
}) {
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'open' | 'in progress' | 'closed'
  const [copiedId, setCopiedId] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Reset delete state when customer or modal changes
  useEffect(() => {
    setConfirmDelete(false);
    setDeleteError(null);
    setDeleting(false);
  }, [customer, isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Copy Customer ID
  const handleCopyId = () => {
    if (!customer?.customer_id) return;
    navigator.clipboard?.writeText?.(customer.customer_id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Compute metrics for this specific customer
  const stats = useMemo(() => {
    const total = tickets.length;
    let openCount = 0;
    let inProgressCount = 0;
    let closedCount = 0;

    tickets.forEach((t) => {
      const s = (t.status || '').toLowerCase();
      if (s === 'open') openCount += 1;
      else if (s === 'in progress') inProgressCount += 1;
      else if (s === 'closed') closedCount += 1;
    });

    return { total, openCount, inProgressCount, closedCount };
  }, [tickets]);

  // Filter tickets by status
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const s = (t.status || '').toLowerCase();
      if (statusFilter === 'open') return s === 'open';
      if (statusFilter === 'in progress') return s === 'in progress';
      if (statusFilter === 'closed') return s === 'closed';
      return true; // 'all'
    });
  }, [tickets, statusFilter]);

  if (!isOpen || !customer) return null;

  const getPriorityBadge = (priority) => {
    const p = (priority || 'medium').toLowerCase();
    if (p === 'urgent') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xl text-[10px] font-black bg-[#E8EEF5] shadow-neu-btn border border-white/80 text-rose-700">
          <AlertCircle className="w-3 h-3 text-rose-600" />
          Urgent
        </span>
      );
    }
    if (p === 'high') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xl text-[10px] font-black bg-[#E8EEF5] shadow-neu-btn border border-white/80 text-amber-700">
          <AlertCircle className="w-3 h-3 text-amber-600" />
          High
        </span>
      );
    }
    if (p === 'low') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xl text-[10px] font-black bg-[#E8EEF5] shadow-neu-btn border border-white/80 text-emerald-700">
          Low
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xl text-[10px] font-black bg-[#E8EEF5] shadow-neu-btn border border-white/80 text-sky-700">
        Medium
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Recently';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return String(dateStr);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Panel Content */}
      <aside
        className="relative w-full max-w-lg bg-[#E8EEF5] text-slate-800 h-full shadow-2xl flex flex-col z-50 overflow-hidden animate-in slide-in-from-right duration-300 border-l border-white/80"
        aria-label="Customer Ticket History Panel"
      >
        {/* ─────────────────────────────────────────────────────────────────────────
            PANEL TOP BAR
        ───────────────────────────────────────────────────────────────────────── */}
        <div className="shrink-0 px-4 py-2.5 bg-[#E8EEF5] border-b border-slate-300/50 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#E2E9F2] shadow-neu-inset border border-slate-300/30 flex items-center justify-center shrink-0">
              <Ticket className="w-3.5 h-3.5 text-sky-600" />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 leading-none">
                Customer Ticket History
              </h2>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                Internal Account Records &amp; Activity Log
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close ticket history panel"
            className="p-1.5 rounded-lg bg-[#E8EEF5] shadow-neu-btn hover:shadow-neu-card active:shadow-neu-btn-pressed border border-white/80 text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ─────────────────────────────────────────────────────────────────────────
            CUSTOMER PROFILE HEADER CARD
        ───────────────────────────────────────────────────────────────────────── */}
        <div className="shrink-0 p-3 bg-[#E8EEF5] border-b border-slate-300/50">
          <div className="p-2.5 rounded-xl bg-[#E8EEF5] shadow-neu-card border border-white/80 flex items-center gap-3">
            {/* Avatar with gradient & initial */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-neu-btn border border-white/80">
              {(customer.customer_name || 'C').charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-black text-slate-900 tracking-tight leading-none">
                  {customer.customer_name || 'Customer Account'}
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#E8EEF5] shadow-neu-btn border border-white/80 text-emerald-700">
                  <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                  Verified
                </span>
              </div>

              <div className="flex items-center gap-2.5 mt-1 text-xs text-slate-500 flex-wrap">
                {/* Email */}
                <span className="flex items-center gap-1 text-slate-600 font-medium truncate text-[11px]">
                  <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                  {customer.customer_email || 'No email registered'}
                </span>

                {/* Customer ID Badge */}
                <button
                  type="button"
                  onClick={handleCopyId}
                  title="Click to copy Customer ID"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#E8EEF5] shadow-neu-btn hover:shadow-neu-card active:shadow-neu-btn-pressed border border-white/80 text-slate-700 font-mono text-[10px] font-bold hover:text-sky-600 transition-all cursor-pointer"
                >
                  <span>#{customer.customer_id || 'CUST-001'}</span>
                  {copiedId ? (
                    <Check className="w-2.5 h-2.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-2.5 h-2.5 text-slate-400" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────────────
            STATUS TABS BAR
        ───────────────────────────────────────────────────────────────────────── */}
        <div className="shrink-0 px-3.5 py-2 border-b border-slate-300/50 bg-[#E8EEF5] flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wider">
              Inquiries
            </h4>
            <span className="text-[11px] font-bold text-sky-600 bg-[#E8EEF5] shadow-neu-btn border border-white/80 px-2 py-0.5 rounded-lg">
              {filteredTickets.length} of {tickets.length}
            </span>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-0.5 bg-[#E2E9F2] shadow-neu-inset p-0.5 rounded-xl border border-slate-300/40 text-[10px] font-semibold shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-[#E8EEF5] text-slate-900 font-black shadow-neu-btn border border-white/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('open')}
              className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'open'
                  ? 'bg-[#E8EEF5] text-rose-600 font-black shadow-neu-btn border border-white/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Open ({stats.openCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('in progress')}
              className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'in progress'
                  ? 'bg-[#E8EEF5] text-sky-600 font-black shadow-neu-btn border border-white/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              In Prog ({stats.inProgressCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('closed')}
              className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'closed'
                  ? 'bg-[#E8EEF5] text-emerald-600 font-black shadow-neu-btn border border-white/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Closed ({stats.closedCount})
            </button>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────────────
            TICKET HISTORY TIMELINE LIST
        ───────────────────────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 bg-[#E8EEF5] no-scrollbar">
          {filteredTickets.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <div className="w-12 h-12 rounded-xl bg-[#E8EEF5] shadow-neu-card border border-white/80 text-slate-400 flex items-center justify-center mb-2">
                <Ticket className="w-6 h-6 text-slate-500" />
              </div>
              <h4 className="text-xs font-bold text-slate-800">No tickets found</h4>
              <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs">
                {statusFilter !== 'all'
                  ? 'No tickets match your active filter criteria.'
                  : 'This customer has no ticket history recorded yet.'}
              </p>
              {statusFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('all');
                  }}
                  className="mt-2 px-3 py-1 rounded-xl bg-[#E8EEF5] shadow-neu-btn hover:shadow-neu-card active:shadow-neu-btn-pressed border border-white/80 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  Reset Filter
                </button>
              )}
            </div>
          ) : (
            filteredTickets.map((t) => {
              const notesCount = (t.notes || []).length;
              const attachCount = (t.attachments || []).length;

              return (
                <div
                  key={t.ticket_id}
                  onClick={() => onSelectTicket && onSelectTicket(t.ticket_id)}
                  className="group p-3 bg-[#E8EEF5] rounded-2xl shadow-neu-card hover:shadow-neu-card-hover border border-white/80 transition-all duration-200 cursor-pointer relative flex flex-col gap-2"
                >
                  {/* Top Badges Row */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] font-black text-sky-600 bg-[#E8EEF5] px-2 py-0.5 rounded-lg shadow-neu-btn border border-white/80">
                        #{t.ticket_id}
                      </span>
                      <TicketStatusBadge status={t.status} />
                      {getPriorityBadge(t.priority)}
                    </div>

                    {t.category && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-[#E2E9F2] shadow-neu-inset px-2 py-0.5 rounded-lg border border-slate-300/30">
                        <Tag className="w-2.5 h-2.5 text-slate-400" />
                        {t.category}
                      </span>
                    )}
                  </div>

                  {/* Subject & Description */}
                  <div>
                    <h5 className="text-xs font-black text-slate-900 group-hover:text-sky-600 transition-colors line-clamp-1">
                      {t.subject || 'Support Ticket'}
                    </h5>
                    {t.description && (
                      <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-1 leading-normal font-normal">
                        {t.description}
                      </p>
                    )}
                  </div>

                  {/* Meta Footer Row */}
                  <div className="pt-2 border-t border-slate-300/40 flex items-center justify-between text-[10px] text-slate-500">
                    <div className="flex items-center gap-2.5">
                      <span className="flex items-center gap-1 text-slate-600 font-medium">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {formatDate(t.created_at)}
                      </span>

                      {notesCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                          <MessageSquare className="w-3 h-3 text-slate-400" />
                          {notesCount}
                        </span>
                      )}

                      {attachCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                          <Paperclip className="w-3 h-3 text-slate-400" />
                          {attachCount}
                        </span>
                      )}
                    </div>

                    <span className="inline-flex items-center gap-0.5 font-bold text-sky-600 group-hover:translate-x-0.5 transition-transform text-[11px]">
                      <span>View Details</span>
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────────────────
            PANEL ACTION FOOTER
        ───────────────────────────────────────────────────────────────────────── */}
        <div className="shrink-0 px-3.5 py-2 bg-[#E2E9F2]/90 border-t border-slate-300/40 flex items-center justify-between gap-2.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#E8EEF5] shadow-neu-inset border border-white/60 text-[11px] text-slate-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shadow-[0_0_6px_rgba(14,165,233,0.6)]" />
            <span>
              Showing <span className="font-black text-slate-800">{filteredTickets.length}</span> of{' '}
              <span className="font-black text-slate-800">{tickets.length}</span> records
            </span>
          </div>

          <div className="flex items-center gap-2">
            {deleteError && (
              <span className="text-[10px] font-bold text-rose-600 truncate max-w-[160px]" title={deleteError}>
                {deleteError}
              </span>
            )}

            <MinimalDeleteButton
              label="Remove Customer"
              confirmLabel="Confirm Remove"
              deletingLabel="Removing..."
              deleting={deleting}
              disabled={deleting}
              onConfirm={async () => {
                if (!customer) return;
                setDeleting(true);
                setDeleteError(null);
                try {
                  const idToDelete = customer.customer_id || customer.customer_email;
                  await deleteCustomer(idToDelete);
                  if (onCustomerDeleted) {
                    onCustomerDeleted(idToDelete);
                  }
                  onClose();
                } catch (err) {
                  setDeleteError(err.message || 'Failed to remove customer');
                  setDeleting(false);
                }
              }}
            />
          </div>
        </div>
      </aside>
    </div>,
    document.body
  );
}

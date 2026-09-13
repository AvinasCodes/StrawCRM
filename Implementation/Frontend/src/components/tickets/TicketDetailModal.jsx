import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Clock,
  User,
  Mail,
  FileText,
  Sparkles,
  Send,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  MessageSquare,
  Trash2,
  RotateCcw,
  ChevronDown,
  Ticket,
  Tag,
  Paperclip,
  Scissors,
  ShieldCheck,
} from 'lucide-react';
import TicketAttachments from './TicketAttachments';
import { useAuth } from '../../context/useAuth';
import { useTeamChat } from '../../context/TeamChatContext';
import { getTicketAISummary, getTicketAIReply } from '../../services/api';
import { useTicketDetail } from '../../hooks/useTicketDetail';
import { useUpdateTicket, useAddNote } from '../../hooks/useUpdateTicket';
import { dedupNotes, updateTicket as fsUpdateTicket } from '../../services/firestoreService';
import { getActiveAgents } from '../../services/teamAgents';
import { dispatchAssignmentNotification } from '../../services/notificationService';



// Retro Barcode Stamp for Authentic Ticket Stubs
const RetroBarcode = ({ ticketId }) => {
  const cleanId = String(ticketId || 'TKT').replace(/^#/, '');
  return (
    <div className="flex flex-col items-end select-none opacity-80 hover:opacity-100 transition-opacity">
      <div className="flex items-end gap-[1.5px] h-6">
        <div className="w-[1.5px] h-6 bg-slate-800" />
        <div className="w-[3px] h-5 bg-slate-800" />
        <div className="w-[1px] h-6 bg-slate-800" />
        <div className="w-[2px] h-6 bg-slate-800" />
        <div className="w-[1px] h-4.5 bg-slate-800" />
        <div className="w-[3.5px] h-6 bg-slate-800" />
        <div className="w-[1px] h-5 bg-slate-800" />
        <div className="w-[2px] h-6 bg-slate-800" />
        <div className="w-[1.5px] h-6 bg-slate-800" />
        <div className="w-[3px] h-5 bg-slate-800" />
        <div className="w-[1px] h-6 bg-slate-800" />
        <div className="w-[2.5px] h-4.5 bg-slate-800" />
        <div className="w-[1.5px] h-6 bg-slate-800" />
        <div className="w-[3px] h-6 bg-slate-800" />
        <div className="w-[1px] h-6 bg-slate-800" />
        <div className="w-[2px] h-6 bg-slate-800" />
        <div className="w-[3.5px] h-6 bg-slate-800" />
        <div className="w-[1.5px] h-5 bg-slate-800" />
        <div className="w-[2.5px] h-6 bg-slate-800" />
        <div className="w-[1px] h-6 bg-slate-800" />
      </div>
      <span className="font-mono text-[9px] tracking-widest text-slate-500 font-bold mt-1 uppercase">
        *{cleanId}*
      </span>
    </div>
  );
};

// Priority visual theme helper
const getPriorityInfo = (p, status) => {
  const normP = (p || '').toLowerCase();
  const normS = (status || '').toLowerCase();
  if (normP === 'urgent' || normS === 'urgent') {
    return {
      label: 'Urgent',
      color: 'bg-rose-50 text-rose-700 border-rose-200',
      topBorder: 'border-t-rose-500',
    };
  }
  if (normP === 'high') {
    return {
      label: 'High',
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      topBorder: 'border-t-amber-500',
    };
  }
  if (normP === 'low') {
    return {
      label: 'Low',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      topBorder: 'border-t-emerald-500',
    };
  }
  return {
    label: p || 'Medium',
    color: 'bg-blue-50 text-brand-electric border-blue-200',
    topBorder: 'border-t-brand-electric',
  };
};

export default function TicketDetailModal({ ticketId, isOpen, onClose, onUpdated, onDelete }) {
  const { user } = useAuth();
  const { openChat } = useTeamChat();
  const messagesEndRef = useRef(null);
  const chatScrollRef = useRef(null);

  // Fetch ticket detail (with real-time subscription)
  const { ticket: remoteTicket, loading, error, refetch } = useTicketDetail(isOpen ? ticketId : null);

  // LOCAL NOTES STATE — single source of truth for the chat thread.
  // We never let remoteTicket.notes overwrite this once the modal is open;
  // instead we MERGE incoming notes by id/text to prevent duplicates.
  const [notes, setNotes] = useState([]);
  const [ticket, setTicket] = useState(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (remoteTicket) {
      setTicket((prev) => {
        const isSameTicket = prev && (prev.ticket_id || '').toUpperCase() === (remoteTicket.ticket_id || '').toUpperCase();

        // Merge notes: keep pending optimistic bubbles, merge remote notes, pass through dedupNotes
        setNotes((prevNotes) => {
          const pending = prevNotes.filter((n) => n._isOptimistic);
          const remoteList = remoteTicket.notes || [];
          return dedupNotes([...remoteList, ...pending]);
        });

        if (!isSameTicket) {
          return remoteTicket;
        }

        const prevTime = new Date(prev?.updated_at || 0).getTime();
        const remoteTime = new Date(remoteTicket?.updated_at || 0).getTime();
        const useRemoteAssignee = remoteTime >= prevTime;

        return {
          ...prev,
          ...remoteTicket,
          assigned_to_name: useRemoteAssignee
            ? (remoteTicket.assigned_to_name !== undefined ? remoteTicket.assigned_to_name : '')
            : (prev.assigned_to_name !== undefined ? prev.assigned_to_name : ''),
          assigned_to_email: useRemoteAssignee
            ? (remoteTicket.assigned_to_email !== undefined ? remoteTicket.assigned_to_email : '')
            : (prev.assigned_to_email !== undefined ? prev.assigned_to_email : ''),
          assigned_to_id: useRemoteAssignee
            ? (remoteTicket.assigned_to_id !== undefined ? remoteTicket.assigned_to_id : '')
            : (prev.assigned_to_id !== undefined ? prev.assigned_to_id : ''),
          subject: (remoteTicket.subject && remoteTicket.subject.trim() && remoteTicket.subject !== 'Support Ticket') ? remoteTicket.subject : prev.subject,
          description: (remoteTicket.description && remoteTicket.description.trim()) ? remoteTicket.description : prev.description,
          customer_name: (remoteTicket.customer_name && remoteTicket.customer_name.trim() && remoteTicket.customer_name !== 'Customer') ? remoteTicket.customer_name : prev.customer_name,
          customer_email: remoteTicket.customer_email || prev.customer_email,
          customer_id: remoteTicket.customer_id || prev.customer_id,
          raised_by_name: (remoteTicket.raised_by_name && remoteTicket.raised_by_name !== 'Customer') ? remoteTicket.raised_by_name : (prev.raised_by_name || prev.customer_name),
          raised_by_user_id: (remoteTicket.raised_by_user_id && remoteTicket.raised_by_user_id !== 'usr_agent_01')
            ? remoteTicket.raised_by_user_id
            : (prev.raised_by_user_id || remoteTicket.raised_by_user_id),
          created_at: remoteTicket.created_at || prev.created_at,
          status: remoteTicket.status || prev.status,
          updated_at: remoteTicket.updated_at || prev.updated_at,
        };
      });
    } else if (!isOpen) {
      setTicket(null);
      setNotes([]);
    }
  }, [remoteTicket, isOpen]);

  // Auto-scroll chat to latest message — scrolls ONLY the chat container, never the parent modal
  useEffect(() => {
    if (isOpen && notes.length) {
      setTimeout(() => {
        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
      }, 50);
    }
  }, [notes.length, isOpen]);

  // Mutation hooks
  const updateTicketMutation = useUpdateTicket();
  const addNoteMutation = useAddNote();
  const updatingStatus = updateTicketMutation.isPending;
  const addingNote = addNoteMutation.isPending;

  // Note input state
  const [newNote, setNewNote] = useState('');

  // Refresh state for manual refetch button
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setTimeout(() => setRefreshing(false), 600);
    }
  };

  // AI Assistant state
  const [aiSummary, setAiSummary] = useState(null);
  const [loadingAiSummary, setLoadingAiSummary] = useState(false);
  const [aiSummaryError, setAiSummaryError] = useState(null);
  const [aiReply, setAiReply] = useState(null);
  const [loadingAiReply, setLoadingAiReply] = useState(false);
  const [aiReplyError, setAiReplyError] = useState(null);
  const [replyTone, setReplyTone] = useState('friendly');
  const [replyCopied, setReplyCopied] = useState(false);

  // Reset AI state when a different ticket is opened
  useEffect(() => {
    if (!isOpen || !ticketId) return;
    setAiSummary(null);
    setAiReply(null);
    setAiSummaryError(null);
    setAiReplyError(null);
    setNewNote('');
  }, [isOpen, ticketId]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // ──────────────────────────────────────────────────────────────────
  // Status Change — Instant Optimistic (<1ms) + Background Sync
  // ──────────────────────────────────────────────────────────────────
  const handleStatusChange = (newStatus) => {
    if (!ticket || updatingStatus || ticket.status === newStatus) return;

    const prevStatus = ticket.status;
    const updatedTicket = { ...ticket, status: newStatus };
    setTicket(updatedTicket);

    updateTicketMutation.mutate(
      { ticketId: ticket.ticket_id, status: newStatus },
      {
        onSuccess: (serverResponse) => {
          if (serverResponse && serverResponse.ticket_id) {
            setTicket(serverResponse);
            if (onUpdated) onUpdated(serverResponse);
          } else {
            if (onUpdated) onUpdated(updatedTicket);
          }
        },
        onError: (err) => {
          setTicket((prev) => (prev ? { ...prev, status: prevStatus } : prev));
          const isNetworkError = err?.status === 0 || err?.message?.includes('backend');
          if (!isNetworkError) {
            alert(err.message || 'Failed to update status.');
          }
        },
      }
    );

    // Notify parent immediately for optimistic list sync
    if (onUpdated) onUpdated(updatedTicket);
  };

  // Helper to determine if the ticket is assigned to the current user
  const isAssignedToCurrentUser = () => {
    if (!user || !ticket) return false;
    const userEmail = (user.email || '').toLowerCase().trim();
    const userName = (user.displayName || '').toLowerCase().trim();
    const assignedEmail = (ticket.assigned_to_email || '').toLowerCase().trim();
    const assignedName = (ticket.assigned_to_name || '').toLowerCase().trim();

    if (ticket.assigned_to_id && user.id && String(ticket.assigned_to_id) === String(user.id)) return true;
    if (assignedEmail && userEmail && assignedEmail === userEmail) return true;
    if (assignedName && (assignedName === userName || assignedName === 'you' || assignedName === 'me')) return true;
    return false;
  };

  // Reassign ticket to any agent or unassigned pool with realtime sync
  const handleAssigneeChange = async (agentId) => {
    if (!ticket) return;
    try {
      const nowIso = new Date().toISOString();
      let patch = {
        updated_at: nowIso,
      };
      if (!agentId || agentId === 'unassigned') {
        patch.assigned_to_name = '';
        patch.assigned_to_email = '';
        patch.assigned_to_id = '';
      } else {
        const ag = getActiveAgents(user).find((a) => a.id === agentId);
        if (ag) {
          patch.assigned_to_name = ag.name;
          patch.assigned_to_email = ag.email;
          patch.assigned_to_id = ag.id;

          // Corner notification indicating automated email was dispatched to agent
          dispatchAssignmentNotification({
            ticket: { ...ticket, ...patch },
            agentName: ag.name,
            agentEmail: ag.email,
          });
        }
      }
      setTicket((prev) => ({ ...prev, ...patch }));
      await fsUpdateTicket(ticket.ticket_id, patch);
      if (onUpdated) onUpdated({ ...ticket, ...patch });

    } catch (err) {
      alert(err.message || 'Failed to reassign ticket.');
    }
  };

  // ──────────────────────────────────────────────────────────────────
  // Add Note — Optimistic (<1ms) + Background Sync + Dedup
  // ──────────────────────────────────────────────────────────────────
  const handleAddNote = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const noteText = newNote.trim();
    if (!noteText || addingNote || submittingRef.current) return;

    submittingRef.current = true;
    const authorName =
      user?.displayName ||
      (user?.email ? user.email.split('@')[0] : 'Support Agent');
    const authorEmail = user?.email || '';
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const optimisticNote = {
      id: tempId,
      note_text: noteText,
      author_name: authorName,
      author_email: authorEmail,
      created_at: new Date().toISOString(),
      _isOptimistic: true,
    };

    // 1. Clear input immediately
    setNewNote('');

    // 2. Append optimistic bubble to LOCAL notes state
    setNotes((prev) => dedupNotes([...prev, optimisticNote]));

    // 3. Mutate backend & firestore
    addNoteMutation.mutate(
      { ticketId: ticket.ticket_id, noteText, authorName, authorEmail },
      {
        onSuccess: (updated) => {
          submittingRef.current = false;
          setNotes((prev) => {
            const remaining = prev.filter((n) => n.id !== tempId);
            const serverNotes = updated?.notes || [];
            return dedupNotes([...remaining, ...serverNotes]);
          });
          if (updated && onUpdated) onUpdated({ ...updated, notes: undefined });
        },
        onError: (err) => {
          submittingRef.current = false;
          setNotes((prev) => prev.filter((n) => n.id !== tempId));
          setNewNote(noteText);
          const isNetworkError = err?.status === 0 || err?.message?.includes('backend');
          if (!isNetworkError) {
            alert(err.message || 'Failed to add note.');
          }
        },
      }
    );
  };

  // ──────────────────────────────────────────────────────────────────
  // AI Assistant handlers (server-side AI calls)
  // ──────────────────────────────────────────────────────────────────
  const handleGenerateSummary = async () => {
    if (!ticket || loadingAiSummary) return;
    try {
      setLoadingAiSummary(true);
      setAiSummaryError(null);
      const res = await getTicketAISummary(ticket.ticket_id, ticket);
      if (res && res.summary) {
        setAiSummary(res);
      } else {
        setAiSummaryError('AI service did not return a summary.');
      }
    } catch (err) {
      setAiSummaryError(err.message || 'Failed to generate summary from AI.');
      setAiSummary(null);
    } finally {
      setLoadingAiSummary(false);
    }
  };

  const handleGenerateReply = async () => {
    if (!ticket || loadingAiReply) return;
    try {
      setLoadingAiReply(true);
      setAiReplyError(null);
      const res = await getTicketAIReply(ticket.ticket_id, '', replyTone, ticket);
      if (res && res.suggested_reply) {
        setAiReply(res.suggested_reply);
      } else {
        setAiReplyError('AI service did not return a reply.');
      }
      setReplyCopied(false);
    } catch (err) {
      setAiReplyError(err.message || 'Failed to generate reply from AI.');
      setAiReply(null);
      setReplyCopied(false);
    } finally {
      setLoadingAiReply(false);
    }
  };

  const handleCopyReply = () => {
    if (!aiReply) return;
    navigator.clipboard.writeText(aiReply);
    setReplyCopied(true);
    setTimeout(() => setReplyCopied(false), 2000);
  };

  const handleSendViaEmail = () => {
    if (!ticket || !aiReply) return;
    const recipient = ticket.customer_email || '';
    const cleanId = String(ticket.ticket_id || ticketId).replace(/^#/, '');
    const subject = `Re: [${cleanId}] ${ticket.subject || 'Support Ticket'}`;
    const body = aiReply;

    const mailtoUrl = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Just now';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return String(dateStr);
    }
  };

  const priorityInfo = getPriorityInfo(ticket?.priority, ticket?.status);
  const customerInitial = (ticket?.customer_name || 'C').charAt(0).toUpperCase();
  const attachmentCount = (ticket?.attachments || []).length;

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[#071330]/65 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[538px] sm:max-w-[634px] max-h-[90vh] rounded-2xl bg-[#EEF4FA] border border-slate-300/50 shadow-[0_24px_50px_rgba(15,23,42,0.35),0_8px_20px_rgba(145,168,198,0.25)] flex flex-col relative font-sans select-none overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* ─────────────────────────────────────────────────────────────
            1. TICKET TOP HEADER (Ticket Card Top Row)
           ───────────────────────────────────────────────────────────── */}
        <div className="shrink-0 px-5 sm:px-6 pt-4 pb-3 flex items-center justify-between gap-3 bg-[#EEF4FA] border-b border-slate-200/60">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Ticket ID Pill */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#E2EAF3] shadow-[inset_1px_1px_2px_rgba(168,184,206,0.5),inset_-1px_-1px_2px_rgba(255,255,255,0.95)] border border-white/60 font-mono text-xs font-black text-slate-800">
              <Ticket className="w-3.5 h-3.5 text-sky-600" />
              <span>#{ticket?.ticket_id || ticketId}</span>
            </span>

            {/* Priority Badge */}
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-xl text-xs font-bold border whitespace-nowrap shrink-0 select-none ${priorityInfo.color}`}
            >
              {priorityInfo.label}
            </span>

            {/* Status Selector Badge */}
            {ticket && (
              <div className="relative inline-flex items-center shrink-0">
                <select
                  value={ticket.status}
                  disabled={updatingStatus}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className={`text-xs font-mono font-black uppercase tracking-wider pl-2.5 pr-6 py-1 rounded-xl bg-[#E8EEF5] shadow-neu-btn border cursor-pointer disabled:opacity-50 appearance-none transition-all shrink-0 ${
                    (ticket.status || '').toLowerCase().includes('progress')
                      ? 'border-blue-300/80 text-blue-600'
                      : (ticket.status || '').toLowerCase().includes('closed')
                        ? 'border-emerald-300/80 text-emerald-700'
                        : 'border-rose-300/80 text-rose-600'
                  }`}
                >
                  <option value="Open">OPEN</option>
                  <option value="In Progress">IN PROGRESS</option>
                  <option value="Closed">CLOSED</option>
                </select>
                <ChevronDown className="w-3 h-3 absolute right-1.5 pointer-events-none opacity-60" />
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {ticket && (
              <button
                type="button"
                onClick={() => {
                  const cleanId = String(ticket.ticket_id || ticketId).replace(/^#/, '');
                  openChat(cleanId);
                }}
                title="Discuss in Team Chat"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#011662] hover:bg-[#08227e] text-white text-xs font-bold whitespace-nowrap shrink-0 transition-all active:scale-95 cursor-pointer shadow-neu-btn border border-white/20"
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0 text-sky-300" />
                <span className="hidden sm:inline">Team Chat</span>
              </button>
            )}

            {ticket && (
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing || loading}
                aria-label="Refresh ticket data"
                title="Refresh ticket data"
                className="p-1.5 rounded-xl bg-[#E8EEF5] shadow-neu-btn hover:shadow-neu-card active:shadow-neu-btn-pressed border border-white/80 text-slate-500 hover:text-sky-600 transition-all cursor-pointer disabled:opacity-40"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            )}

            {onDelete && ticket && (
              <button
                type="button"
                onClick={() => onDelete(ticket)}
                aria-label="Delete ticket"
                title="Delete Ticket"
                className="p-1.5 rounded-xl bg-[#E8EEF5] shadow-neu-btn hover:shadow-neu-card active:shadow-neu-btn-pressed border border-white/80 text-rose-500 hover:text-rose-700 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              title="Close modal (Esc)"
              className="p-1.5 rounded-xl bg-[#E8EEF5] shadow-neu-btn hover:shadow-neu-card active:shadow-neu-btn-pressed border border-white/80 text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            2. CUSTOMER & ASSIGNMENT ROW (Like Ticket Card Customer Profile)
           ───────────────────────────────────────────────────────────── */}
        {ticket && (
          <div className="shrink-0 px-5 sm:px-6 py-3 bg-[#EEF4FA] flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-[0_2px_6px_rgba(99,102,241,0.3)] ring-2 ring-white/80">
                {customerInitial}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-extrabold text-xs text-slate-900 leading-tight truncate">
                    {ticket.customer_name || 'Valued Customer'}
                  </h4>
                  {ticket.category && (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-[#E2EAF3] shadow-[inset_1px_1px_2px_rgba(168,184,206,0.4)] text-[9px] font-bold text-slate-600 border border-white/60">
                      <Tag className="w-2.5 h-2.5 text-slate-400" />
                      <span>{ticket.category}</span>
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                  {ticket.customer_email || 'No email registered'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              {ticket.raised_by_name && (
                <span className="text-[10px] font-mono text-slate-400 font-medium">
                  BY: <strong className="text-slate-700">{ticket.raised_by_name}</strong>
                </span>
              )}
              <div className="relative inline-flex items-center">
                <select
                  value={
                    (!ticket.assigned_to_name && !ticket.assigned_to_email && !ticket.assigned_to_id)
                      ? 'unassigned'
                      : (getActiveAgents(user).find(
                        (a) =>
                          (ticket.assigned_to_email && a.email?.toLowerCase() === ticket.assigned_to_email?.toLowerCase()) ||
                          (ticket.assigned_to_id && a.id === ticket.assigned_to_id) ||
                          (ticket.assigned_to_name && a.name?.toLowerCase() === ticket.assigned_to_name?.toLowerCase())
                      )?.id || 'unassigned')
                  }
                  onChange={(e) => handleAssigneeChange(e.target.value)}
                  className={`text-xs font-bold pl-2.5 pr-6 py-1 rounded-xl bg-[#E8EEF5] shadow-neu-btn border border-white/80 cursor-pointer appearance-none transition-all ${
                    isAssignedToCurrentUser()
                      ? 'text-emerald-700 font-extrabold'
                      : ticket.assigned_to_name
                        ? 'text-purple-700 font-bold'
                        : 'text-slate-600 font-medium'
                  }`}
                  title="Assign agent"
                >
                  <option value="unassigned">👥 Team Pool (Unassigned)</option>
                  {getActiveAgents(user).map((ag) => {
                    const isMe = user && (user.id === ag.id || user.email?.toLowerCase() === ag.email?.toLowerCase());
                    return (
                      <option key={ag.id} value={ag.id}>
                        👤 {ag.name} ({ag.email}) {isMe ? '— You' : ''}
                      </option>
                    );
                  })}
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 pointer-events-none" />
              </div>
            </div>
          </div>
        )}

        {/* Subtle Divider */}
        <div className="border-b border-slate-200/80" />

        {/* ─────────────────────────────────────────────────────────────
            4. TICKET CONTENT & EXPANDABLE TOOLS
           ───────────────────────────────────────────────────────────── */}
        <div
          className="flex-1 overflow-y-auto px-5 sm:px-6 py-3.5 space-y-3.5 no-scrollbar bg-[#EEF4FA]"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-2.5">
              <Loader2 className="w-7 h-7 animate-spin text-sky-600" />
              <span className="text-xs font-mono font-medium text-slate-500">Loading ticket dossier...</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 shadow-neu-inset">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <p className="font-medium">{error}</p>
            </div>
          ) : ticket ? (
            <>
              {/* Subject */}
              <div>
                <h3 className="font-black text-base sm:text-lg text-slate-900 leading-snug">
                  {ticket.subject || 'Untitled Ticket Subject'}
                </h3>
              </div>

              {/* Description Body (Sunken Soft Inset Sheet) */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[#E2EAF3]/80 shadow-[inset_1px_1px_3px_rgba(168,184,206,0.5),inset_-1px_-1px_3px_rgba(255,255,255,0.95)] border border-white/60 text-xs sm:text-sm text-slate-800 leading-relaxed font-sans whitespace-pre-line">
                {ticket.description || 'No description provided for this ticket.'}
              </div>

              {/* Auxiliary Tools Strip: AI & Attachments */}
              <div className="pt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* AI Summary Button */}
                  <button
                    type="button"
                    onClick={handleGenerateSummary}
                    disabled={loadingAiSummary}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      aiSummary
                        ? 'bg-[#E2EAF3] text-sky-700 shadow-neu-inset border border-white/70'
                        : 'bg-[#E8EEF5] text-slate-700 shadow-neu-btn hover:shadow-neu-card border border-white/80'
                    }`}
                  >
                    {loadingAiSummary ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                    )}
                    <span>AI Summary</span>
                  </button>

                  {/* AI Reply Button */}
                  <button
                    type="button"
                    onClick={handleGenerateReply}
                    disabled={loadingAiReply}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      aiReply
                        ? 'bg-[#E2EAF3] text-indigo-700 shadow-neu-inset border border-white/70'
                        : 'bg-[#E8EEF5] text-slate-700 shadow-neu-btn hover:shadow-neu-card border border-white/80'
                    }`}
                  >
                    {loadingAiReply ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                    )}
                    <span>Suggest Reply</span>
                  </button>

                  {/* Attachments Counter Chip */}
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#E8EEF5] shadow-neu-btn text-xs font-bold text-slate-600 border border-white/80">
                    <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                    <span>Attachments ({attachmentCount})</span>
                  </span>
                </div>

                {/* AI Summary Card Output */}
                {aiSummary && (
                  <div className="mt-3 p-3.5 rounded-2xl bg-[#EEF4FA] border border-white/90 shadow-[inset_1px_1px_2px_rgba(168,184,206,0.3)] space-y-1.5 text-xs text-slate-700 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-300/40">
                      <span className="font-bold text-sky-800 text-[11px] uppercase tracking-wider flex items-center gap-1 font-mono">
                        <Sparkles className="w-3 h-3 text-sky-600" />
                        Key Insights
                      </span>
                      <button
                        type="button"
                        onClick={() => setAiSummary(null)}
                        className="text-[10px] text-slate-400 hover:text-slate-600 font-mono"
                      >
                        Dismiss
                      </button>
                    </div>
                    <p className="font-bold text-slate-900">{aiSummary.summary}</p>
                    {aiSummary.key_points && (
                      <ul className="space-y-0.5 text-slate-600 text-xs pl-1 pt-0.5">
                        {aiSummary.key_points.map((pt, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-600 mt-1.5 shrink-0" />
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* AI Reply Card Output */}
                {aiReply && (
                  <div className="mt-3 p-3.5 rounded-2xl bg-[#EEF4FA] border border-white/90 shadow-[inset_1px_1px_2px_rgba(168,184,206,0.3)] space-y-2 text-xs animate-in fade-in duration-200">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-300/40 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                      <span className="text-indigo-800 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-indigo-600" />
                        Suggested Response
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleCopyReply}
                          className="hover:text-indigo-600 transition-colors cursor-pointer flex items-center gap-0.5"
                        >
                          {replyCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{replyCopied ? 'Copied' : 'Copy'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setAiReply(null)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                    <p className="text-slate-800 whitespace-pre-line leading-relaxed p-2.5 rounded-xl bg-white/70 border border-white font-mono text-xs">
                      {aiReply}
                    </p>
                    {ticket.customer_email && (
                      <div className="pt-1 flex items-center justify-between text-xs">
                        <span className="text-slate-400 text-[11px] truncate">To: {ticket.customer_email}</span>
                        <button
                          type="button"
                          onClick={handleSendViaEmail}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-[#011662] hover:bg-[#08227e] text-white text-xs font-bold transition-all shadow-neu-btn"
                        >
                          <Mail className="w-3 h-3 text-sky-300" />
                          <span>Send via Email</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Attachments Component */}
                <div className="mt-3">
                  <TicketAttachments
                    ticketId={ticket.ticket_id}
                    attachments={ticket.attachments || []}
                    onAttachmentAdded={() => {
                      if (onUpdated) onUpdated(ticket);
                    }}
                    onAttachmentRemoved={(removedId) => {
                      setTicket((prev) => {
                        if (!prev) return prev;
                        const updated = {
                          ...prev,
                          attachments: (prev.attachments || []).filter(
                            (a) => a.id !== removedId && a.url !== removedId
                          ),
                        };
                        if (onUpdated) onUpdated(updated);
                        return updated;
                      });
                    }}
                  />
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Subtle Divider */}
        <div className="border-t border-slate-200/80" />

        {/* ─────────────────────────────────────────────────────────────
            6. TICKET STUB FOOTER (Authentic Issued Date & Barcode)
           ───────────────────────────────────────────────────────────── */}
        <div className="shrink-0 px-5 sm:px-6 py-3 bg-[#EEF4FA] flex items-center justify-between gap-3 select-none">
          <div className="flex flex-col text-[10px] text-slate-400 font-medium">
            <div className="flex items-center gap-1.5 text-slate-600 font-bold">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>ISSUED: {formatDate(ticket?.created_at)}</span>
            </div>
            <span className="font-mono text-[9px] uppercase tracking-wider text-slate-400 mt-0.5">
              OFFICIAL STRAWCRM SERVICE PASS • #{ticket?.ticket_id || ticketId}
            </span>
          </div>

          <RetroBarcode ticketId={ticket?.ticket_id || ticketId} />
        </div>
      </div>
    </div>,
    document.body
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  FileText,
  Copy,
  Check,
  User,
  Mail,
  MessageSquare,
  ChevronDown,
  RefreshCw,
  Briefcase,
  Smile,
  Heart,
  Pencil,
  Send,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BarChart2,
  Zap,
  X,
  Shield,
  Tag,
  Ticket,
  ExternalLink,
  HelpCircle,
  ThumbsUp,
  Meh,
  Frown,
  ArrowRight,
} from 'lucide-react';
import { subscribeTickets, syncFromBackend, updateTicket } from '../services/firestoreService';
import { getTicketAISummary, getTicketAIReply, queryTicketAI, sendTicketResponseToCustomer } from '../services/api';

const stripMarkdownAsterisks = (text) => (text || '').replace(/\*\*([^*]+)\*\*/g, '$1');

function renderFormattedMarkdown(text) {
  if (!text) return null;
  const lines = text.split('\n');

  return (
    <div className="space-y-2">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1.5" />;

        // Bullet line (* or - or •)
        const isBullet = /^[*\-•]\s+/.test(trimmed);
        // Numbered line (1., 2., etc.)
        const isNumbered = /^\d+\.\s+/.test(trimmed);

        let content = trimmed;
        let prefix = null;

        if (isBullet) {
          content = trimmed.replace(/^[*\-•]\s+/, '');
          prefix = <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-500 mr-2 shrink-0 mt-1.5" />;
        } else if (isNumbered) {
          const numMatch = trimmed.match(/^(\d+\.)\s+/);
          content = trimmed.replace(/^\d+\.\s+/, '');
          prefix = <span className="font-bold text-sky-600 mr-1.5 shrink-0 text-xs">{numMatch ? numMatch[1] : '•'}</span>;
        }

        // Parse **bold** parts
        const parts = content.split(/(\*\*[^*]+?\*\*)/g);

        return (
          <div key={idx} className={`flex items-start ${isBullet || isNumbered ? 'pl-1' : ''}`}>
            {prefix}
            <div className="flex-1 text-xs text-slate-800 leading-relaxed font-sans">
              {parts.map((part, pIdx) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  const boldText = part.slice(2, -2);
                  return (
                    <strong key={pIdx} className="font-bold text-slate-900">
                      {boldText}
                    </strong>
                  );
                }
                return part;
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AIAssistant({ onNavigate }) {
  const [tickets, setTickets] = useState([]);
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [loadingTickets, setLoadingTickets] = useState(true);

  // Active Tab: 'response' | 'summary' | 'priority' | 'custom'
  const [activeTab, setActiveTab] = useState('response');

  // Mobile ticket context collapsible state
  const [dossierCollapsed, setDossierCollapsed] = useState(false);

  // Tone: 'friendly' | 'professional' | 'apologetic'
  const [tone, setTone] = useState('friendly');

  // Guidance instructions for Reply
  const [instructions, setInstructions] = useState('');

  // Editing state for suggested reply
  const [isEditingReply, setIsEditingReply] = useState(false);
  const [editableReply, setEditableReply] = useState('');

  // AI Generation State
  const [summaryData, setSummaryData] = useState(null);
  const [loadingReply, setLoadingReply] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [copiedReply, setCopiedReply] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [priorityApplied, setPriorityApplied] = useState(false);
  const [applyingPriority, setApplyingPriority] = useState(false);
  const [replyError, setReplyError] = useState(null);
  const [summaryError, setSummaryError] = useState(null);

  // Custom Prompt / Ask AI state
  const [customPrompt, setCustomPrompt] = useState('');
  const [customAnswer, setCustomAnswer] = useState('');
  const [loadingCustom, setLoadingCustom] = useState(false);
  const [customError, setCustomError] = useState(null);
  const [copiedCustom, setCopiedCustom] = useState(false);

  // Send via Email Modal state (Official response directly to customer email)
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailModalSubject, setEmailModalSubject] = useState('');
  const [emailModalMessage, setEmailModalMessage] = useState('');
  const [emailCustomerRecipient, setEmailCustomerRecipient] = useState('');
  const [emailCustomerName, setEmailCustomerName] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailModalStatus, setEmailModalStatus] = useState(null); // 'success' | 'error' | null
  const [emailModalFeedback, setEmailModalFeedback] = useState('');

  // Subscribe to live tickets
  useEffect(() => {
    setLoadingTickets(true);
    syncFromBackend();

    const unsubscribe = subscribeTickets(
      {},
      (liveTickets) => {
        const list = liveTickets || [];
        setTickets(list);

        if (list.length > 0) {
          setSelectedTicketId((prev) => {
            if (prev && list.some((t) => t.ticket_id === prev)) return prev;
            return list[0].ticket_id;
          });
        }
        setLoadingTickets(false);
      },
      (err) => {
        console.warn('[AIAssistant] Tickets subscription notice:', err);
        setLoadingTickets(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const selectedTicket = useMemo(() => {
    if (!tickets.length) return null;
    return tickets.find((t) => t.ticket_id === selectedTicketId) || tickets[0] || null;
  }, [tickets, selectedTicketId]);

  // Reset output state when ticket changes
  useEffect(() => {
    if (!selectedTicket) return;

    setIsEditingReply(false);
    setCopiedReply(false);
    setEmailSent(false);
    setPriorityApplied(false);

    setEditableReply('');
    setSummaryData(null);
    setReplyError(null);
    setSummaryError(null);
    setCustomAnswer('');
    setCustomError(null);
  }, [selectedTicketId]);

  // Generate Reply and Summary
  const handleGenerate = async () => {
    if (!selectedTicket || loadingReply || loadingSummary) return;
    try {
      setLoadingReply(true);
      setLoadingSummary(true);
      setReplyError(null);
      setSummaryError(null);

      const replyPromise = getTicketAIReply(selectedTicket.ticket_id, instructions, tone, selectedTicket)
        .then((res) => {
          if (res && res.suggested_reply) {
            setEditableReply(stripMarkdownAsterisks(res.suggested_reply));
          } else {
            setReplyError('AI service did not return a response.');
          }
        })
        .catch((err) => {
          setReplyError(err.message || 'Failed to generate AI response.');
        })
        .finally(() => {
          setLoadingReply(false);
        });

      const summaryPromise = getTicketAISummary(selectedTicket.ticket_id, selectedTicket)
        .then((res) => {
          if (res && res.summary) {
            setSummaryData(res);
          } else {
            setSummaryError('AI service did not return a summary.');
          }
        })
        .catch((err) => {
          setSummaryError(err.message || 'Failed to generate AI summary.');
        })
        .finally(() => {
          setLoadingSummary(false);
        });

      await Promise.allSettled([replyPromise, summaryPromise]);
    } catch (err) {
      setReplyError(err.message || 'Failed to generate AI insights.');
    }
  };

  // Dedicated Smart Reply generation with custom tone & guidance
  const handleRegenerateReply = async (newTone, newInstructions) => {
    if (!selectedTicket || loadingReply) return;
    const toneToUse = newTone !== undefined ? newTone : tone;
    const instructionsToUse = newInstructions !== undefined ? newInstructions : instructions;

    try {
      setLoadingReply(true);
      setReplyError(null);
      setIsEditingReply(false);

      const res = await getTicketAIReply(
        selectedTicket.ticket_id,
        instructionsToUse,
        toneToUse,
        selectedTicket
      );

      if (res && res.suggested_reply) {
        setEditableReply(stripMarkdownAsterisks(res.suggested_reply));
      } else {
        setReplyError('AI service did not return a response.');
      }
    } catch (err) {
      setReplyError(err.message || 'Failed to generate AI response.');
    } finally {
      setLoadingReply(false);
    }
  };

  // Custom Prompt / Ask AI Handler (Pure extraction/question answering, not email drafting)
  const handleCustomQuery = async (queryOverride) => {
    const promptToRun = typeof queryOverride === 'string' ? queryOverride : customPrompt;
    if (!promptToRun.trim() || !selectedTicket || loadingCustom) return;

    try {
      setLoadingCustom(true);
      setCustomError(null);
      setCustomAnswer('');

      const res = await queryTicketAI(
        selectedTicket.ticket_id,
        promptToRun.trim(),
        selectedTicket
      );

      if (res && res.answer) {
        setCustomAnswer(res.answer);
      } else {
        setCustomError('AI could not formulate an answer for this prompt.');
      }
    } catch (err) {
      setCustomError(err.message || 'Failed to process custom question.');
    } finally {
      setLoadingCustom(false);
    }
  };

  // Copy reply text
  const handleCopyReply = () => {
    if (!editableReply) return;
    navigator.clipboard.writeText(editableReply);
    setCopiedReply(true);
    setTimeout(() => setCopiedReply(false), 2000);
  };

  // Copy Ticket ID
  const handleCopyTicketId = () => {
    if (!selectedTicket?.ticket_id) return;
    const cleanId = selectedTicket.ticket_id.replace(/^#/, '');
    navigator.clipboard.writeText(`#${cleanId}`);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Copy Custom Answer
  const handleCopyCustom = () => {
    if (!customAnswer) return;
    navigator.clipboard.writeText(customAnswer);
    setCopiedCustom(true);
    setTimeout(() => setCopiedCustom(false), 2000);
  };

  // Send via Email action
  const handleOpenSendEmailModal = () => {
    if (!selectedTicket) return;
    const cleanId = selectedTicket.ticket_id
      ? `#${selectedTicket.ticket_id.replace(/^#/, '')}`
      : '#TKT-001';

    const custName = selectedTicket.customer_name || 'Customer';
    const custEmail = selectedTicket.customer_email || '';
    const currentReply =
      editableReply ||
      `Dear ${custName},\n\nThank you for reaching out regarding "${selectedTicket.subject || 'your request'}". Our team is currently working on your request and we will follow up with you shortly with an update.\n\nBest regards,\nSupport Operations`;

    setEmailCustomerName(custName);
    setEmailCustomerRecipient(custEmail);
    setEmailModalSubject(`[StrawCRM] Update on Ticket ${cleanId}: ${selectedTicket.subject || 'Support Request'}`);
    setEmailModalMessage(currentReply);
    setEmailModalStatus(null);
    setEmailModalFeedback('');
    setShowEmailModal(true);
  };

  const handleConfirmSendEmail = async () => {
    if (!selectedTicket?.ticket_id || sendingEmail) return;
    if (!emailModalSubject.trim() || !emailModalMessage.trim()) {
      setEmailModalStatus('error');
      setEmailModalFeedback('Subject and message cannot be empty.');
      return;
    }

    if (!emailCustomerRecipient.trim()) {
      setEmailModalStatus('error');
      setEmailModalFeedback('Please provide a valid customer email address.');
      return;
    }

    try {
      setSendingEmail(true);
      setEmailModalStatus(null);
      setEmailModalFeedback('');

      const res = await sendTicketResponseToCustomer(selectedTicket.ticket_id, {
        subject: emailModalSubject.trim(),
        message: emailModalMessage.trim(),
        ticket_data: selectedTicket,
        recipient_email: emailCustomerRecipient.trim(),
        recipient_name: emailCustomerName.trim(),
      });

      setEmailModalStatus('success');
      setEmailModalFeedback(`✓ Response sent successfully to customer (${res?.recipient || emailCustomerRecipient})`);
      setEmailSent(true);
      setTimeout(() => setEmailSent(false), 4000);
      setTimeout(() => {
        setShowEmailModal(false);
      }, 1600);
    } catch (err) {
      setEmailModalStatus('error');
      setEmailModalFeedback(
        err.message || 'Unable to send email to customer. Please check server SMTP configuration and try again.'
      );
    } finally {
      setSendingEmail(false);
    }
  };

  // Apply Priority to Ticket
  const handleApplyPriority = async () => {
    if (!selectedTicket || !summaryData?.suggested_priority || applyingPriority) return;
    try {
      setApplyingPriority(true);
      const targetPriority = (summaryData.suggested_priority || 'medium').toLowerCase();
      await updateTicket(selectedTicket.ticket_id, { priority: targetPriority });
      setPriorityApplied(true);
      setTimeout(() => setPriorityApplied(false), 3000);
    } catch (err) {
      alert(err.message || 'Failed to update priority.');
    } finally {
      setApplyingPriority(false);
    }
  };

  // Helper date formatter
  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      return (
        d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
        ', ' +
        d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      );
    } catch {
      return String(dateStr);
    }
  };

  // Status visual mapping
  const getStatusBadge = (rawStatus) => {
    const norm = (rawStatus || 'Open').toLowerCase().trim();
    if (norm === 'closed' || norm === 'resolved') {
      return {
        label: 'Closed',
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        dot: 'bg-emerald-500',
      };
    }
    if (norm === 'in progress' || norm === 'in_progress') {
      return {
        label: 'In Progress',
        bg: 'bg-blue-50 text-blue-700 border-blue-200/80',
        dot: 'bg-blue-500 animate-pulse',
      };
    }
    return {
      label: 'Open',
      bg: 'bg-rose-50 text-rose-700 border-rose-200/80',
      dot: 'bg-rose-500',
    };
  };

  // Priority visual mapping
  const getPriorityBadge = (p) => {
    const norm = (p || 'medium').toLowerCase();
    if (norm === 'urgent') return 'bg-rose-50 text-rose-700 border-rose-200';
    if (norm === 'high') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (norm === 'low') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    return 'bg-blue-50 text-sky-700 border-blue-200';
  };

  const statusInfo = getStatusBadge(selectedTicket?.status);
  const customerInitial = (selectedTicket?.customer_name || 'C').charAt(0).toUpperCase();

  return (
    <div className="h-full flex-1 min-h-0 flex flex-col p-2.5 sm:p-5 pb-24 md:pb-5 overflow-y-auto lg:overflow-hidden w-full bg-[#E8EEF5] text-slate-800 font-sans select-none">
      {/* ─────────────────────────────────────────────────────────────────────────
          1. COMPACT TOP HEADER (Mobile Optimized)
         ───────────────────────────────────────────────────────────────────────── */}
      <header className="shrink-0 pb-2 sm:pb-3 flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#E2E9F2] shadow-neu-inset border border-slate-300/40 text-sky-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-sky-600 fill-sky-600/20" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-xl font-black text-slate-900 tracking-tight">
                AI Assistant
              </h1>
              <span className="text-[10px] font-extrabold text-slate-500 bg-[#E2E9F2] px-2 py-0.5 rounded-lg border border-slate-300/40 shadow-neu-inset">
                Copilot
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium hidden sm:block">
              Analyze tickets, generate responses, and summarize support issues in seconds.
            </p>
          </div>
        </div>

        {/* Header Right Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => syncFromBackend()}
            title="Refresh ticket data"
            className="p-2 rounded-xl bg-[#E8EEF5] shadow-neu-btn hover:shadow-neu-card active:shadow-neu-btn-pressed border border-white/60 text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Quick Ticket Counter */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#E2E9F2] shadow-neu-inset border border-slate-300/40 text-[10px] sm:text-[11px] font-bold text-slate-600">
            <Ticket className="w-3 h-3 text-sky-600" />
            <span>{tickets.length} Available</span>
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────────────────
          2. FULL-BODY UNIFIED NEUMORPHIC WORKSPACE
         ───────────────────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 rounded-2xl sm:rounded-3xl bg-[#E8EEF5] shadow-neu-card border border-white/60 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden transition-all">
        {loadingTickets ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
            <span className="text-xs font-bold font-mono text-slate-600">
              Synchronizing workspace tickets...
            </span>
          </div>
        ) : (
          <>
            {/* ─────────────────────────────────────────────────────────────────
                LEFT COLUMN: TICKET CONTEXT & DOSSIER (~360px width)
               ───────────────────────────────────────────────────────────────── */}
            <aside
              aria-label="Ticket Context"
              className="w-full lg:w-80 xl:w-[380px] shrink-0 border-b lg:border-b-0 lg:border-r border-slate-300/50 flex flex-col h-auto lg:h-full bg-[#E8EEF5]/70"
            >
              {/* Ticket Selector Strip */}
              <div className="shrink-0 p-3 sm:p-4 border-b border-slate-300/40 bg-[#E2E9F2]/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Active Ticket
                  </span>
                  <div className="flex items-center gap-2">
                    {selectedTicket && (
                      <span className="text-[10px] font-mono font-bold text-slate-500">
                        1 of {tickets.length}
                      </span>
                    )}
                    {/* Mobile Collapse/Expand Toggle */}
                    <button
                      type="button"
                      onClick={() => setDossierCollapsed((prev) => !prev)}
                      className="lg:hidden px-2 py-0.5 rounded-lg bg-[#E8EEF5] shadow-neu-btn border border-white/60 text-slate-600 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      title={dossierCollapsed ? 'Expand Ticket Details' : 'Collapse Ticket Details'}
                    >
                      <span>{dossierCollapsed ? 'Show Details' : 'Hide Details'}</span>
                      <ChevronDown
                        className={`w-3 h-3 transition-transform duration-200 ${
                          dossierCollapsed ? '-rotate-90' : 'rotate-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Dropdown Selector */}
                <div className="relative">
                  <select
                    value={selectedTicket?.ticket_id || selectedTicketId}
                    onChange={(e) => setSelectedTicketId(e.target.value)}
                    className="w-full bg-[#E8EEF5] shadow-neu-inset border border-slate-300/50 text-slate-800 font-bold text-xs rounded-xl pl-3 pr-8 py-2 appearance-none focus:outline-none cursor-pointer transition-all truncate"
                  >
                    {tickets.length === 0 ? (
                      <option value="">No tickets found</option>
                    ) : (
                      tickets.map((t) => (
                        <option key={t.ticket_id} value={t.ticket_id}>
                          #{t.ticket_id.replace(/^#/, '')} · {t.subject || 'Support Ticket'}
                        </option>
                      ))
                    )}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Scrollable Ticket Details */}
              <div className={`${dossierCollapsed ? 'hidden lg:flex' : 'flex'} flex-1 flex-col overflow-y-auto p-3 sm:p-4 space-y-3 max-h-72 lg:max-h-none no-scrollbar`}>
                {selectedTicket ? (
                  <>
                    {/* Top Identity Row */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#E2EAF3] shadow-[inset_1px_1px_2px_rgba(168,184,206,0.5),inset_-1px_-1px_2px_rgba(255,255,255,0.95)] border border-white/60 font-mono text-xs font-black text-slate-800">
                          <Ticket className="w-3 h-3 text-sky-600" />
                          <span>#{selectedTicket.ticket_id.replace(/^#/, '')}</span>
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyTicketId}
                          title="Copy Ticket ID"
                          className="p-1 rounded-lg bg-[#E8EEF5] shadow-neu-btn hover:shadow-neu-card active:shadow-neu-btn-pressed border border-white/60 text-slate-500 hover:text-sky-600 transition-all cursor-pointer"
                        >
                          {copiedId ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-extrabold border ${getPriorityBadge(
                            selectedTicket.priority
                          )}`}
                        >
                          {selectedTicket.priority || 'Medium'}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-extrabold border ${statusInfo.bg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                          <span>{statusInfo.label}</span>
                        </span>
                      </div>
                    </div>

                    {/* Customer Profile Card */}
                    <div className="p-3 rounded-2xl bg-[#E8EEF5] shadow-neu-card border border-white/60 flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-[0_2px_6px_rgba(99,102,241,0.3)] ring-2 ring-white/80">
                        {customerInitial}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-extrabold text-xs text-slate-900 truncate">
                          {selectedTicket.customer_name || 'Valued Customer'}
                        </h3>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">
                          {selectedTicket.customer_email || 'No email attached'}
                        </p>
                      </div>
                      {selectedTicket.category && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-[#E2EAF3] shadow-[inset_1px_1px_2px_rgba(168,184,206,0.4)] text-[9px] font-bold text-slate-600 border border-white/60 shrink-0">
                          <Tag className="w-2.5 h-2.5 text-slate-400" />
                          <span>{selectedTicket.category}</span>
                        </span>
                      )}
                    </div>

                    {/* Subject & Description (Sunken Well) */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                        Inquiry Dossier
                      </span>
                      <div className="p-3 rounded-2xl bg-[#E2E9F2] shadow-neu-inset border border-slate-300/40 space-y-2">
                        <h4 className="text-xs font-black text-slate-900 leading-snug">
                          {selectedTicket.subject || 'Support Request'}
                        </h4>
                        <div className="text-[11px] text-slate-700 leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap font-medium no-scrollbar">
                          {selectedTicket.description || 'No issue description provided.'}
                        </div>
                      </div>
                    </div>

                    {/* Metadata Specs */}
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="p-2 rounded-xl bg-[#E8EEF5] shadow-neu-btn border border-white/60">
                        <span className="text-slate-400 font-bold block">Created</span>
                        <span className="font-bold text-slate-700 truncate block mt-0.5">
                          {formatDateTime(selectedTicket.created_at)}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-[#E8EEF5] shadow-neu-btn border border-white/60">
                        <span className="text-slate-400 font-bold block">Assigned To</span>
                        <span className="font-bold text-slate-700 truncate block mt-0.5">
                          {selectedTicket.assigned_to_name || 'Team Pool'}
                        </span>
                      </div>
                    </div>

                    {/* Jump to Support Desk */}
                    {onNavigate && (
                      <button
                        type="button"
                        onClick={() => onNavigate('/tickets')}
                        className="w-full py-2 px-3 rounded-xl bg-[#E8EEF5] shadow-neu-btn hover:shadow-neu-card active:shadow-neu-btn-pressed border border-white/60 text-sky-600 hover:text-sky-700 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <span>Open in Support Desk</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </>
                ) : (
                  <div className="py-10 text-center text-slate-400 text-xs font-medium">
                    Please select a ticket to view its details.
                  </div>
                )}
              </div>
            </aside>

            {/* ─────────────────────────────────────────────────────────────────
                RIGHT COLUMN: AI STUDIO WORKSPACE (Flex-1 Full Body)
               ───────────────────────────────────────────────────────────────── */}
            <main
              aria-label="AI Studio Workspace"
              className="flex-1 min-h-0 flex flex-col bg-[#EEF4FA]/40 overflow-visible lg:overflow-hidden"
            >
              {/* Studio Header Toolbar */}
              <div className="shrink-0 px-3 sm:px-6 py-2.5 sm:py-3 bg-[#E2E9F2]/70 border-b border-slate-300/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                {/* Segmented Neumorphic Tab Bar */}
                <div className="flex items-center bg-[#E2E9F2] shadow-neu-inset p-1 rounded-2xl border border-white/60 text-xs font-bold gap-1 overflow-x-auto no-scrollbar w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setActiveTab('response')}
                    className={`py-1.5 px-3 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                      activeTab === 'response'
                        ? 'bg-[#E8EEF5] text-sky-600 font-black shadow-neu-btn border border-white/80'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Smart Reply</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('summary')}
                    className={`py-1.5 px-3 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                      activeTab === 'summary'
                        ? 'bg-[#E8EEF5] text-sky-600 font-black shadow-neu-btn border border-white/80'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Summary</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('priority')}
                    className={`py-1.5 px-3 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                      activeTab === 'priority'
                        ? 'bg-[#E8EEF5] text-sky-600 font-black shadow-neu-btn border border-white/80'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <BarChart2 className="w-3.5 h-3.5" />
                    <span>Priority & Sentiment</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('custom')}
                    className={`py-1.5 px-3 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                      activeTab === 'custom'
                        ? 'bg-[#E8EEF5] text-sky-600 font-black shadow-neu-btn border border-white/80'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Ask AI</span>
                  </button>
                </div>

                {/* Primary Action Capsule Button */}
                <button
                  type="button"
                  disabled={loadingReply || loadingSummary}
                  onClick={handleGenerate}
                  className="px-4 py-2 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:brightness-105 active:scale-[0.98] text-white text-xs font-black shadow-[2px_2px_8px_rgba(14,165,233,0.35)] flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:pointer-events-none w-full sm:w-auto shrink-0"
                >
                  {loadingReply || loadingSummary ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  )}
                  <span>
                    {loadingReply || loadingSummary ? 'Generating Insights...' : 'Generate AI Insights'}
                  </span>
                </button>
              </div>

              {/* Viewport Content Area */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 no-scrollbar">
                {/* ─────────────────────────────────────────────────────────────
                    TAB 1: SMART REPLY (Default)
                   ───────────────────────────────────────────────────────────── */}
                {activeTab === 'response' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    {/* Tone Selection Bar */}
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Sliders className="w-3.5 h-3.5 text-sky-600" />
                        <span className="text-xs font-black text-slate-800">Response Tone</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {[
                          { id: 'friendly', label: 'Friendly', icon: Smile },
                          { id: 'professional', label: 'Professional', icon: Briefcase },
                          { id: 'apologetic', label: 'Apologetic', icon: Heart },
                        ].map((t) => {
                          const IconComp = t.icon;
                          const isActive = tone === t.id;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                setTone(t.id);
                                handleRegenerateReply(t.id, instructions);
                              }}
                              className={`py-1 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                isActive
                                  ? 'bg-[#E2E9F2] text-sky-600 font-black shadow-neu-inset border border-sky-300/40'
                                  : 'bg-[#E8EEF5] shadow-neu-btn hover:shadow-neu-card border border-white/60 text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              <IconComp className="w-3 h-3" />
                              <span>{t.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Optional Guidance Input */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                        Custom Guidance (Optional instructions for the AI)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          id="ai-instructions-input"
                          name="aiInstructions"
                          type="text"
                          value={instructions}
                          onChange={(e) => setInstructions(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleRegenerateReply(tone, instructions);
                            }
                          }}
                          placeholder="e.g. Request error screenshots, offer 15% courtesy credit, mention warranty policy..."
                          className="flex-1 px-3.5 py-2 rounded-xl bg-[#E2E9F2] shadow-neu-inset border border-slate-300/40 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-400 transition-all font-medium"
                        />
                        <button
                          type="button"
                          disabled={loadingReply}
                          onClick={() => handleRegenerateReply(tone, instructions)}
                          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:brightness-105 active:scale-95 text-white text-xs font-black shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50 transition-all"
                        >
                          {loadingReply ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5 text-white" />
                          )}
                          <span>{loadingReply ? 'Generating...' : 'Generate Reply'}</span>
                        </button>
                      </div>
                      {instructions.trim() && (
                        <p className="text-[10px] font-semibold text-sky-600">
                          Press Enter or click &ldquo;Generate Reply&rdquo; to apply
                        </p>
                      )}
                    </div>

                    {/* Response Card Canvas */}
                    <div className="rounded-2xl bg-[#E8EEF5] shadow-neu-card border border-white/60 p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap border-b border-slate-300/40 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-900">
                            Suggested Response
                          </span>
                          {editableReply && (
                            <span className="text-[10px] font-bold text-slate-500">
                              · {editableReply.split(/\s+/).filter(Boolean).length} words
                            </span>
                          )}
                        </div>

                        {editableReply && (
                          <div className="flex items-center gap-2">
                            {/* Copy Button */}
                            <button
                              type="button"
                              onClick={handleCopyReply}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#E8EEF5] shadow-neu-btn hover:shadow-neu-card active:shadow-neu-btn-pressed border border-white/60 text-xs font-bold text-slate-700 transition-all cursor-pointer"
                            >
                              {copiedReply ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span className="text-emerald-600 font-black">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 text-slate-500" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>

                            {/* Edit Mode Toggle */}
                            <button
                              type="button"
                              onClick={() => setIsEditingReply(!isEditingReply)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                isEditingReply
                                  ? 'bg-[#E2E9F2] border-sky-400 text-sky-600 shadow-neu-inset'
                                  : 'bg-[#E8EEF5] shadow-neu-btn hover:shadow-neu-card active:shadow-neu-btn-pressed border-white/60 text-slate-700'
                              }`}
                            >
                              <Pencil className="w-3 h-3 text-slate-500" />
                              <span>{isEditingReply ? 'Done' : 'Edit'}</span>
                            </button>

                            {/* Send Email Button */}
                            <button
                              type="button"
                              onClick={handleOpenSendEmailModal}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:brightness-105 active:scale-[0.98] text-white text-xs font-black shadow-[2px_2px_8px_rgba(14,165,233,0.3)] transition-all cursor-pointer"
                            >
                              {emailSent ? (
                                <>
                                  <Check className="w-3 h-3 text-white" />
                                  <span>Sent</span>
                                </>
                              ) : (
                                <>
                                  <Send className="w-3 h-3 text-white" />
                                  <span>Send Email</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Canvas Area */}
                      {replyError ? (
                        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2.5">
                          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-rose-800">Generation Notice</p>
                            <p className="text-[11px] text-rose-600 mt-0.5">{replyError}</p>
                          </div>
                        </div>
                      ) : isEditingReply ? (
                        <textarea
                          rows={8}
                          value={editableReply}
                          onChange={(e) => setEditableReply(e.target.value)}
                          className="w-full p-3.5 text-xs text-slate-800 leading-relaxed bg-[#E2E9F2] shadow-neu-inset border border-slate-300/40 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-400 font-sans"
                        />
                      ) : editableReply ? (
                        <div className="p-4 bg-[#E2E9F2] shadow-neu-inset border border-slate-300/40 rounded-xl text-xs text-slate-800 whitespace-pre-line leading-relaxed font-sans min-h-[160px]">
                          {editableReply}
                        </div>
                      ) : (
                        <div className="py-12 px-4 flex flex-col items-center justify-center text-center text-slate-500">
                          <div className="w-12 h-12 rounded-2xl bg-[#E2E9F2] shadow-neu-inset border border-slate-300/40 text-sky-600 flex items-center justify-center mb-3">
                            <Sparkles className="w-6 h-6 text-sky-600 fill-sky-600/20" />
                          </div>
                          <p className="text-xs font-black text-slate-800">
                            No AI draft generated yet
                          </p>
                          <p className="text-[11px] text-slate-500 max-w-sm mt-1">
                            Click <strong className="text-sky-600">"Generate AI Insights"</strong> above to produce a tailored support reply for this ticket.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ─────────────────────────────────────────────────────────────
                    TAB 2: TICKET SUMMARY
                   ───────────────────────────────────────────────────────────── */}
                {activeTab === 'summary' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="rounded-2xl bg-[#E8EEF5] shadow-neu-card border border-white/60 p-4 sm:p-5 space-y-3.5">
                      <div className="flex items-center justify-between border-b border-slate-300/40 pb-2.5">
                        <span className="text-xs font-black text-slate-900">
                          Executive Case Summary
                        </span>
                        {summaryData?.summary && (
                          <span className="text-[10px] font-extrabold text-sky-600 bg-[#E2E9F2] px-2 py-0.5 rounded-lg border border-slate-300/40 shadow-neu-inset">
                            Live Analysis
                          </span>
                        )}
                      </div>

                      {summaryError ? (
                        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2.5">
                          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-rose-800">Summary Notice</p>
                            <p className="text-[11px] text-rose-600 mt-0.5">{summaryError}</p>
                          </div>
                        </div>
                      ) : summaryData?.summary ? (
                        <div className="space-y-3">
                          <div className="p-3.5 bg-[#E2E9F2] shadow-neu-inset border border-slate-300/40 rounded-xl text-xs text-slate-800 leading-relaxed font-sans">
                            {summaryData.summary}
                          </div>

                          {/* Key Points Bullet List */}
                          {summaryData.key_points && summaryData.key_points.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                                Key Findings
                              </span>
                              <div className="space-y-1.5">
                                {summaryData.key_points.map((pt, idx) => (
                                  <div
                                    key={idx}
                                    className="p-2.5 rounded-xl bg-[#E8EEF5] shadow-neu-btn border border-white/60 text-xs text-slate-700 flex items-center gap-2"
                                  >
                                    <div className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                                    <span>{pt}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Action Switch */}
                          <div className="pt-2 flex justify-end">
                            <button
                              type="button"
                              onClick={() => setActiveTab('response')}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white text-xs font-black shadow-[2px_2px_8px_rgba(14,165,233,0.3)] transition-all cursor-pointer"
                            >
                              <span>Draft Reply for Customer</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="py-12 px-4 flex flex-col items-center justify-center text-center text-slate-500">
                          <div className="w-12 h-12 rounded-2xl bg-[#E2E9F2] shadow-neu-inset border border-slate-300/40 text-sky-600 flex items-center justify-center mb-3">
                            <FileText className="w-6 h-6 text-sky-600" />
                          </div>
                          <p className="text-xs font-black text-slate-800">
                            No summary generated yet
                          </p>
                          <p className="text-[11px] text-slate-500 max-w-sm mt-1">
                            Click <strong className="text-sky-600">"Generate AI Insights"</strong> above to summarize this ticket's core issue and bullet points.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ─────────────────────────────────────────────────────────────
                    TAB 3: PRIORITY & SENTIMENT
                   ───────────────────────────────────────────────────────────── */}
                {activeTab === 'priority' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Priority Card */}
                      <div className="rounded-2xl bg-[#E8EEF5] shadow-neu-card border border-white/60 p-4 sm:p-5 space-y-3">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                          AI Priority Evaluation
                        </span>

                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-slate-800">
                            Recommended Tier:
                          </span>
                          <span
                            className={`px-3 py-1 rounded-xl text-xs font-black shadow-neu-btn border ${getPriorityBadge(
                              summaryData?.suggested_priority || selectedTicket?.priority
                            )}`}
                          >
                            {summaryData?.suggested_priority || selectedTicket?.priority || 'Medium'}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-600 leading-relaxed bg-[#E2E9F2] p-3 rounded-xl shadow-neu-inset border border-slate-300/40">
                          Priority is deduced through urgency indicators in the subject, description sentiment, and SLA escalation thresholds.
                        </p>

                        <button
                          type="button"
                          disabled={applyingPriority || priorityApplied}
                          onClick={handleApplyPriority}
                          className={`w-full py-2 px-3.5 rounded-xl text-xs font-black transition-all shadow-neu-btn hover:shadow-neu-card border border-white/60 flex items-center justify-center gap-1.5 cursor-pointer ${
                            priorityApplied
                              ? 'bg-emerald-600 text-white'
                              : 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-[2px_2px_8px_rgba(14,165,233,0.3)]'
                          }`}
                        >
                          {applyingPriority ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                          ) : priorityApplied ? (
                            <Check className="w-3.5 h-3.5 text-white" />
                          ) : (
                            <Zap className="w-3.5 h-3.5 text-white" />
                          )}
                          <span>
                            {priorityApplied
                              ? 'Priority Updated in Database!'
                              : `Apply "${summaryData?.suggested_priority || 'Medium'}" to Ticket`}
                          </span>
                        </button>
                      </div>

                      {/* Sentiment Gauge Card */}
                      <div className="rounded-2xl bg-[#E8EEF5] shadow-neu-card border border-white/60 p-4 sm:p-5 space-y-3">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                          Customer Sentiment
                        </span>

                        {(() => {
                          const sent = (summaryData?.sentiment || 'Neutral').toLowerCase();
                          const isPositive = sent.includes('positive');
                          const isFrustrated = sent.includes('frustrated') || sent.includes('urgent');

                          return (
                            <>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-extrabold text-slate-800">
                                  Detected Mood:
                                </span>
                                <span
                                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black shadow-neu-btn border ${
                                    isPositive
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : isFrustrated
                                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                                      : 'bg-blue-50 text-sky-700 border-blue-200'
                                  }`}
                                >
                                  {isPositive ? (
                                    <ThumbsUp className="w-3 h-3 text-emerald-600" />
                                  ) : isFrustrated ? (
                                    <Frown className="w-3 h-3 text-rose-600" />
                                  ) : (
                                    <Meh className="w-3 h-3 text-sky-600" />
                                  )}
                                  <span>{summaryData?.sentiment || 'Neutral'}</span>
                                </span>
                              </div>

                              <p className="text-[11px] text-slate-600 leading-relaxed bg-[#E2E9F2] p-3 rounded-xl shadow-neu-inset border border-slate-300/40">
                                {isFrustrated
                                  ? 'Customer expresses acute frustration or dissatisfaction. Apologetic and swift resolution recommended.'
                                  : isPositive
                                  ? 'Customer is cooperative and polite. Maintain encouraging and friendly tone.'
                                  : 'Standard inquiry with neutral tone. Professional tone is suitable.'}
                              </p>

                              <div className="p-2.5 rounded-xl bg-[#E8EEF5] shadow-neu-btn border border-white/60 flex items-center justify-between text-[11px] font-bold">
                                <span className="text-slate-500">Recommended Tone:</span>
                                <span className="text-sky-600 capitalize">
                                  {isFrustrated ? 'Apologetic' : isPositive ? 'Friendly' : 'Professional'}
                                </span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                {/* ─────────────────────────────────────────────────────────────
                    TAB 4: ASK AI / CUSTOM QUERY
                   ───────────────────────────────────────────────────────────── */}
                {activeTab === 'custom' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="rounded-2xl bg-[#E8EEF5] shadow-neu-card border border-white/60 p-4 sm:p-5 space-y-3.5">
                      <div className="flex items-center justify-between border-b border-slate-300/40 pb-2.5">
                        <span className="text-xs font-black text-slate-900">
                          Custom Query on this Ticket
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          #{selectedTicket?.ticket_id}
                        </span>
                      </div>

                      {/* Prompt Input & Send */}
                      <div className="space-y-2">
                        <div className="relative">
                          <input
                            id="ai-custom-prompt-input"
                            name="customPrompt"
                            type="text"
                            value={customPrompt}
                            onChange={(e) => setCustomPrompt(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCustomQuery();
                            }}
                            placeholder="Ask any question about this ticket (e.g. What is the customer requesting?)"
                            className="w-full pl-3.5 pr-20 py-2.5 rounded-xl bg-[#E2E9F2] shadow-neu-inset border border-slate-300/40 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-400 font-sans"
                          />
                          <button
                            type="button"
                            disabled={!customPrompt.trim() || loadingCustom}
                            onClick={() => handleCustomQuery()}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 text-white text-xs font-black shadow-sm hover:brightness-105 active:scale-95 disabled:opacity-40 transition-all cursor-pointer flex items-center gap-1"
                          >
                            {loadingCustom ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Send className="w-3 h-3" />
                            )}
                            <span>Ask</span>
                          </button>
                        </div>

                        {/* Quick Suggestion Chips */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          <span className="text-[10px] text-slate-400 font-bold">Suggestions:</span>
                          {[
                            'Extract customer key demands',
                            'Draft refund policy explanation',
                            'Recommend next troubleshooting step',
                          ].map((chip, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setCustomPrompt(chip);
                                handleCustomQuery(chip);
                              }}
                              className="px-2.5 py-0.5 rounded-lg bg-[#E8EEF5] shadow-neu-btn hover:shadow-neu-card border border-white/60 text-[10px] font-bold text-slate-600 hover:text-sky-600 transition-all cursor-pointer"
                            >
                              {chip}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Custom Answer Output */}
                      {customError ? (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                          <span>{customError}</span>
                        </div>
                      ) : customAnswer ? (
                        <div className="space-y-2 pt-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                              AI Answer
                            </span>
                            <button
                              type="button"
                              onClick={handleCopyCustom}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#E8EEF5] shadow-neu-btn hover:shadow-neu-card border border-white/60 text-[10px] font-bold text-slate-700 transition-all cursor-pointer"
                            >
                              {copiedCustom ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span className="text-emerald-600 font-bold">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 text-slate-500" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                          <div className="p-3.5 bg-[#E2E9F2] shadow-neu-inset border border-slate-300/40 rounded-xl text-xs text-slate-800 leading-relaxed font-sans">
                            {renderFormattedMarkdown(customAnswer)}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            </main>
          </>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          SEND VIA EMAIL CONFIRMATION MODAL (Sends directly to CUSTOMER)
         ───────────────────────────────────────────────────────────────────────────── */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071330]/65 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-[#E8EEF5] shadow-[0_24px_50px_rgba(15,23,42,0.35)] border border-slate-300/50 rounded-3xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-300/40 flex items-center justify-between bg-[#E2E9F2]/70">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-[#E2E9F2] shadow-neu-inset border border-slate-300/40 text-sky-600 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-sky-600" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Send Response to Customer
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Direct email communication delivered via SMTP
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !sendingEmail && setShowEmailModal(false)}
                disabled={sendingEmail}
                className="w-8 h-8 rounded-xl bg-[#E8EEF5] shadow-neu-btn hover:shadow-neu-card border border-white/60 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-3.5 overflow-y-auto no-scrollbar">
              {/* Customer Recipient Card */}
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-400/30 rounded-2xl flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-950 flex-1">
                  <span className="font-extrabold text-emerald-700 block text-[10px] uppercase tracking-wider mb-1">
                    Customer Recipient
                  </span>
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="font-bold text-slate-900 text-sm">
                      {emailCustomerName || 'Valued Customer'}
                    </span>
                    <input
                      id="email-customer-recipient-input"
                      name="emailCustomerRecipient"
                      type="email"
                      value={emailCustomerRecipient}
                      onChange={(e) => setEmailCustomerRecipient(e.target.value)}
                      disabled={sendingEmail}
                      placeholder="customer@example.com"
                      className="px-2.5 py-1 rounded-lg bg-[#E2E9F2] shadow-neu-inset border border-slate-300/40 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                  <p className="text-[10px] text-emerald-800/80">
                    This official support reply will be sent directly to the customer's inbox.
                  </p>
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block">
                  Subject Line
                </label>
                <input
                  id="email-modal-subject-input"
                  name="emailModalSubject"
                  type="text"
                  value={emailModalSubject}
                  onChange={(e) => setEmailModalSubject(e.target.value)}
                  disabled={sendingEmail}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#E2E9F2] shadow-neu-inset border border-slate-300/40 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all"
                  placeholder="Email Subject"
                />
              </div>

              {/* Message Body */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block">
                  Response Preview
                </label>
                <textarea
                  id="email-modal-message-body"
                  name="emailModalMessage"
                  rows={6}
                  value={emailModalMessage}
                  onChange={(e) => setEmailModalMessage(e.target.value)}
                  disabled={sendingEmail}
                  className="w-full p-3.5 rounded-xl bg-[#E2E9F2] shadow-neu-inset border border-slate-300/40 text-xs font-medium text-slate-800 leading-relaxed focus:outline-none focus:ring-1 focus:ring-sky-500 resize-none transition-all font-sans"
                  placeholder="Message content..."
                />
              </div>

              {/* Feedback messages */}
              {emailModalStatus === 'success' && (
                <div className="p-3 bg-emerald-500/15 border border-emerald-400/50 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{emailModalFeedback}</span>
                </div>
              )}

              {emailModalStatus === 'error' && (
                <div className="p-3 bg-rose-500/15 border border-rose-400/50 rounded-xl text-xs font-bold text-rose-800 flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{emailModalFeedback}</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 sm:p-5 border-t border-slate-300/40 flex items-center justify-end bg-[#E2E9F2]/70">
              <button
                type="button"
                onClick={handleConfirmSendEmail}
                disabled={sendingEmail}
                className="blob-btn whitespace-nowrap"
              >
                {sendingEmail ? (
                  <span className="relative z-10 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-current" />
                    <span>Sending to Customer...</span>
                  </span>
                ) : (
                  <span className="relative z-10 flex items-center gap-2">
                    <Send className="w-3.5 h-3.5 text-current transition-colors duration-300" />
                    <span>Send to Customer</span>
                  </span>
                )}
                <span className="blob-btn__inner" aria-hidden="true">
                  <span className="blob-btn__blobs">
                    <span className="blob-btn__blob" />
                    <span className="blob-btn__blob" />
                    <span className="blob-btn__blob" />
                    <span className="blob-btn__blob" />
                  </span>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SVG Filter for Gooey Blob Physics */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        version="1.1"
        style={{ position: 'fixed', top: 0, left: 0, width: 0, height: 0, pointerEvents: 'none', opacity: 0 }}
        aria-hidden="true"
      >
        <defs>
          <filter id="goo">
            <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="10" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 21 -7"
              result="goo"
            />
            <feBlend in2="goo" in="SourceGraphic" result="mix" />
          </filter>
        </defs>
      </svg>
    </div>
  );
}

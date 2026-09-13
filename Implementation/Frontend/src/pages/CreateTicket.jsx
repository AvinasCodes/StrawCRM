import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Sparkles,
  Paperclip,
  Trash2,
  FileText,
  User,
  Tag,
  Check,
  Upload,
  Image as ImageIcon,
  ChevronDown,
  UserCheck,
  X,
  Send,
  Clock,
  ShieldCheck,
  HelpCircle,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { createTicket, subscribeCustomers, subscribeTickets } from '../services/firestoreService';
import { useAuth } from '../context/useAuth';
import {
  uploadTicketAttachment,
  formatFileSize,
  validateAttachment,
} from '../services/storageService';
import { getActiveAgents } from '../services/teamAgents';
import { dispatchAssignmentNotification } from '../services/notificationService';


const PRIORITIES = [
  { id: 'Low', label: 'Low', activeText: 'text-emerald-700 font-black', dot: 'bg-emerald-500' },
  { id: 'Medium', label: 'Medium', activeText: 'text-blue-700 font-black', dot: 'bg-blue-500' },
  { id: 'High', label: 'High', activeText: 'text-amber-700 font-black', dot: 'bg-amber-500' },
  { id: 'Urgent', label: 'Urgent', activeText: 'text-rose-700 font-black', dot: 'bg-rose-500' },
];

/**
 * Strips raw markdown syntax (# and *) so textarea descriptions remain clean and human-readable.
 */
export function cleanMarkdownFromText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    // Convert markdown headers to clean labeled sections (### Issue Overview -> Issue Overview:)
    .replace(/^#{1,6}\s*(.+)$/gm, (_match, p1) => {
      const trimmed = p1.trim();
      return trimmed.endsWith(':') ? trimmed : `${trimmed}:`;
    })
    // Strip bold & italic markdown asterisks / underscores (**text** -> text, *text* -> text)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Strip remaining hashtags in front of words or ticket tags (#TKT-002 -> TKT-002)
    .replace(/(^|\s)#+([a-zA-Z0-9_-]+)/g, '$1$2')
    // Normalize any repeated colons
    .replace(/:{2,}/g, ':')
    .trim();
}

export default function CreateTicket({ onNavigate }) {
  const { user } = useAuth();

  // Form fields
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [description, setDescription] = useState('');
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  // Active Agents directory for ticket assignment
  const activeAgents = useMemo(() => getActiveAgents(user), [user]);
  const [assignedAgentId, setAssignedAgentId] = useState(''); // '' means Unassigned (Shared Team Pool)

  const assignedAgent = useMemo(() => {
    return activeAgents.find((a) => a.id === assignedAgentId) || null;
  }, [activeAgents, assignedAgentId]);

  // Dynamic Existing Categories fetched ONLY from live tickets (no dummy categories)
  const [existingCategories, setExistingCategories] = useState([]);
  const [categorySuggestions, setCategorySuggestions] = useState([]);
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const categoryDropdownRef = useRef(null);

  // Subscribe to live tickets to dynamically extract all existing categories from real database
  useEffect(() => {
    const unsubscribeTickets = subscribeTickets(
      {},
      (liveTickets) => {
        if (Array.isArray(liveTickets) && liveTickets.length > 0) {
          const liveCats = Array.from(
            new Set(
              liveTickets
                .map((t) => (t.category || '').trim())
                .filter(Boolean)
            )
          ).sort();
          setExistingCategories(liveCats);
        }
      },
      () => { }
    );
    return () => unsubscribeTickets();
  }, []);

  // Auto-recommend category based on subject & description against real existing categories
  useEffect(() => {
    if (category) return;
    if (!existingCategories.length) return;

    const query = `${subject} ${description}`.toLowerCase();
    if (!query.trim()) return;

    // 1. Direct name match
    const directMatch = existingCategories.find((cat) =>
      query.includes(cat.toLowerCase())
    );
    if (directMatch) {
      setCategory(directMatch);
      return;
    }

    // 2. Keyword heuristic mapping to real existing categories
    for (const cat of existingCategories) {
      const catLower = cat.toLowerCase();
      if (
        catLower.includes('mobile') &&
        (query.includes('whatsapp') || query.includes('phone') || query.includes('app') || query.includes('android') || query.includes('ios'))
      ) {
        setCategory(cat);
        return;
      }
      const words = catLower.split(/\s+/).filter((w) => w.length > 3);
      if (words.some((w) => query.includes(w))) {
        setCategory(cat);
        return;
      }
    }
  }, [subject, description, existingCategories, category]);

  // Dismiss category dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target)) {
        setShowCategorySuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Recommend existing categories on typing any letter
  const handleCategoryChange = (val) => {
    setCategory(val);
    if (!val.trim()) {
      setCategorySuggestions(existingCategories);
      setShowCategorySuggestions(existingCategories.length > 0);
      return;
    }
    const q = val.toLowerCase().trim();
    const matches = existingCategories.filter((cat) =>
      cat.toLowerCase().includes(q)
    );
    setCategorySuggestions(matches);
    setShowCategorySuggestions(matches.length > 0);
  };

  const handleCategoryFocus = () => {
    const q = category.toLowerCase().trim();
    const matches = q
      ? existingCategories.filter((cat) => cat.toLowerCase().includes(q))
      : existingCategories;
    setCategorySuggestions(matches);
    setShowCategorySuggestions(matches.length > 0);
  };

  // Attachments state
  const [pendingFiles, setPendingFiles] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const fileInputRef = useRef(null);

  // Customers autocomplete
  const [existingCustomers, setExistingCustomers] = useState([]);
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // States
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [createdTicketId, setCreatedTicketId] = useState(null);
  const [isPolishing, setIsPolishing] = useState(false);

  // Fetch existing customers for instant auto-suggest
  useEffect(() => {
    const unsubscribe = subscribeCustomers(
      (list) => {
        if (Array.isArray(list)) setExistingCustomers(list);
      },
      () => { }
    );
    return () => unsubscribe();
  }, []);

  // Filter customer suggestions on customer name change
  const handleCustomerNameChange = (val) => {
    setCustomerName(val);
    if (!val.trim()) {
      setCustomerSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const q = val.toLowerCase().trim();
    const matches = existingCustomers.filter(
      (c) =>
        (c.customer_name || '').toLowerCase().includes(q) ||
        (c.customer_email || '').toLowerCase().includes(q)
    );
    setCustomerSuggestions(matches.slice(0, 5));
    setShowSuggestions(matches.length > 0);
  };

  const selectSuggestedCustomer = (cust) => {
    setCustomerName(cust.customer_name || '');
    setCustomerEmail(cust.customer_email || '');
    setShowSuggestions(false);
  };

  // AI Smart Assistant: Polish Subject & Description (Zero markdown syntax, pure clean text)
  const handleAIPolish = () => {
    if (!description.trim() && !subject.trim()) {
      setError('Please enter a brief note or draft first so AI can polish it.');
      return;
    }
    setIsPolishing(true);
    setError(null);

    setTimeout(() => {
      let polishedSubject = subject.trim();
      if (!polishedSubject && description.trim()) {
        const firstLine = description.split('\n')[0].replace(/[^a-zA-Z0-9 ]/g, '').trim();
        polishedSubject = firstLine.slice(0, 50) || 'Support Assistance Request';
      }

      let polishedDesc = cleanMarkdownFromText(description.trim());
      if (polishedDesc.length > 5) {
        if (!polishedDesc.toLowerCase().includes('issue overview:')) {
          polishedDesc = `Issue Overview:\n${polishedDesc}\n\nImpact Assessment:\nAffects customer operations and requires priority investigation.\n\nNext Action Items:\n1. Review telemetry & system logs\n2. Dispatch resolution to client`;
        }
      }

      setSubject(polishedSubject.replace(/\b\w/g, (c) => c.toUpperCase()));
      setDescription(cleanMarkdownFromText(polishedDesc));
      setIsPolishing(false);
    }, 400);
  };

  // Auto-clean pasted text so markdown syntax (# and *) never pollutes the description
  const handleDescriptionPaste = (e) => {
    const pastedText = e.clipboardData?.getData('text');
    if (pastedText && (/^#{1,6}\s/m.test(pastedText) || /\*\*/.test(pastedText) || /#TKT/i.test(pastedText))) {
      e.preventDefault();
      const cleaned = cleanMarkdownFromText(pastedText);
      const target = e.target;
      const start = target.selectionStart || 0;
      const end = target.selectionEnd || 0;
      const newText = description.slice(0, start) + cleaned + description.slice(end);
      setDescription(newText);
    }
  };

  // File Upload Handlers
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    for (const file of files) {
      const v = validateAttachment(file);
      if (!v.valid) {
        setError(v.error);
        return;
      }
    }
    setError(null);
    setPendingFiles((prev) => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveFile = (index) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Form Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (!customerName.trim()) {
      setError('Customer name is required.');
      return;
    }
    if (!customerEmail.trim() || !customerEmail.includes('@')) {
      setError('Please provide a valid customer email address.');
      return;
    }
    if (!subject.trim()) {
      setError('Ticket subject is required.');
      return;
    }
    if (!description.trim() || description.trim().length < 5) {
      setError('Description must be at least 5 characters long.');
      return;
    }

    setSubmitting(true);

    try {
      let uploadedAttachments = [];
      if (pendingFiles.length > 0) {
        setUploadingFiles(true);
        for (const file of pendingFiles) {
          const att = await uploadTicketAttachment(null, file);
          uploadedAttachments.push(att);
        }
        setUploadingFiles(false);
      }

      const creatorName =
        user?.displayName ||
        (user?.email
          ? user.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
          : 'Support Staff');
      const creatorId =
        user?.uid ||
        user?.id ||
        (user?.email ? user.email.split('@')[0] : `usr_${customerName.trim().toLowerCase().replace(/\s+/g, '_')}`);

      const assignedToName = assignedAgent
        ? (assignedAgent.rawName || assignedAgent.name)
        : null;
      const assignedToEmail = assignedAgent?.email || null;

      const res = await createTicket({
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim(),
        subject: subject.trim(),
        description: description.trim(),
        category: category?.trim() || 'General Inquiry',
        priority,
        assigned_to_name: assignedToName || '',
        assigned_to_email: assignedToEmail || '',
        assigned_to_id: assignedAgent?.id || '',
        attachments: uploadedAttachments,
        raised_by_name: creatorName,
        raised_by_user_id: creatorId,
        status: 'Open',
      });

      setCreatedTicketId(res?.ticket_id || 'TKT-NEW');
      setSuccess(true);

      if (assignedAgent && assignedAgent.email) {
        dispatchAssignmentNotification({
          ticket: { ...(res || {}), ...{ customer_name: customerName, subject, priority, ticket_id: res?.ticket_id || 'TKT-NEW' } },
          agentName: assignedAgent.name,
          agentEmail: assignedAgent.email,
        });
      }

      setTimeout(() => {
        if (onNavigate) onNavigate('/tickets');
      }, 1000);

    } catch (err) {
      setError(err.message || 'Failed to create ticket. Please try again.');
      setSubmitting(false);
      setUploadingFiles(false);
    }
  };

  const handleCancel = () => {
    if (onNavigate) onNavigate('/tickets');
  };

  return (
    <main className="flex-1 flex flex-col min-h-0 bg-[#E8EEF5] text-slate-900 p-4 sm:p-5 lg:p-6 no-scrollbar w-full overflow-y-auto">
      <div className="w-full flex flex-col min-h-0 transition-all duration-200">
        {/* ─────────────────────────────────────────────────────────────────────────
            1. HEADER & BREADCRUMB (Clean, full width, no Neumorphism badge)
           ───────────────────────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-300/40 shrink-0">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={handleCancel}
              className="w-10 h-10 rounded-2xl bg-[#E8EEF5] shadow-neu-btn hover:shadow-neu-card active:shadow-neu-btn-pressed border border-white/80 flex items-center justify-center text-slate-600 hover:text-sky-600 transition-all cursor-pointer shrink-0"
              title="Back to Tickets"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">Tickets</span>
                <span className="text-xs text-slate-400">/</span>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Create Support Ticket
                </h1>
              </div>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                Dispatch a customer ticket directly into the StrawCRM queue with live tracking.
              </p>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────────────
            SUCCESS & ERROR BANNERS
           ───────────────────────────────────────────────────────────────────────── */}
        {success && (
          <div className="p-4 rounded-2xl bg-[#E2E9F2] shadow-neu-inset border border-emerald-400/50 flex items-center justify-between gap-3 text-emerald-800 text-xs font-bold animate-in fade-in slide-in-from-top-2 mt-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-xl bg-[#E8EEF5] shadow-neu-btn flex items-center justify-center text-emerald-600 shrink-0">
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              </div>
              <span>
                Ticket <strong className="font-mono text-emerald-950 font-black">#{createdTicketId}</strong> created successfully! Redirecting to ticket list...
              </span>
            </div>
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600 shrink-0" />
          </div>
        )}

        {error && (
          <div className="p-4 rounded-2xl bg-[#E2E9F2] shadow-neu-inset border border-rose-400/50 flex items-center gap-3 text-rose-700 text-xs font-bold animate-in fade-in mt-3 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 stroke-[2.5]" />
            <span>{error}</span>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────────
            BALANCED 2-COLUMN RESPONSIVE LAYOUT (Compact & Symmetrical Height)
           ───────────────────────────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col mt-3">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch">
            {/* LEFT COLUMN: Main Ticket Content (7 Cols) */}
            <div className="lg:col-span-7 flex flex-col">
              {/* Primary Ticket Details Card */}
              <div className="rounded-2xl bg-[#E8EEF5] p-4 sm:p-5 shadow-neu-card hover:shadow-neu-card-hover border border-white/70 transition-all duration-300 flex flex-col justify-between gap-3 h-full">
                <div className="space-y-3 flex flex-col">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-300/40 shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#E2E9F2] shadow-neu-inset border border-white/60 flex items-center justify-center text-sky-500">
                        <FileText className="w-3.5 h-3.5 stroke-[2.2]" />
                      </div>
                      <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        Ticket Content & Context
                      </h2>
                    </div>
                  </div>

                  {/* Customer Identity Split Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
                    {/* Customer Name */}
                    <div className="relative">
                      <label
                        htmlFor="customer-name"
                        className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wide"
                      >
                        Customer Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="customer-name"
                        type="text"
                        value={customerName}
                        onChange={(e) => handleCustomerNameChange(e.target.value)}
                        onFocus={() => customerSuggestions.length > 0 && setShowSuggestions(true)}
                        placeholder="e.g. Priya Sharma"
                        disabled={submitting || success}
                        required
                        className="neu-input w-full px-3.5 py-1.5 text-xs font-bold text-slate-800 placeholder:font-normal placeholder:text-slate-400"
                      />

                      {/* Customer Autocomplete Dropdown */}
                      {showSuggestions && customerSuggestions.length > 0 && (
                        <div className="absolute left-0 right-0 mt-2 bg-[#E8EEF5] rounded-2xl shadow-neu-card border border-white/80 py-1.5 z-30 divide-y divide-slate-200/50 animate-in fade-in zoom-in-95 duration-100">
                          <div className="px-3 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            Existing Customers
                          </div>
                          {customerSuggestions.map((cust) => (
                            <button
                              key={cust.customer_id || cust.customer_email}
                              type="button"
                              onClick={() => selectSuggestedCustomer(cust)}
                              className="w-full text-left px-3.5 py-2 hover:bg-white/40 flex items-center justify-between transition-colors cursor-pointer"
                            >
                              <div>
                                <p className="font-black text-xs text-slate-900">{cust.customer_name}</p>
                                <p className="text-[11px] text-slate-500">{cust.customer_email}</p>
                              </div>
                              <span className="font-mono text-[10px] px-2 py-0.5 rounded-lg bg-[#E2E9F2] shadow-neu-inset text-slate-600 font-bold">
                                {cust.customer_id}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Customer Email */}
                    <div>
                      <label
                        htmlFor="customer-email"
                        className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wide"
                      >
                        Customer Email <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="customer-email"
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="e.g. priya@techcorp.io"
                        disabled={submitting || success}
                        required
                        className="neu-input w-full px-3.5 py-1.5 text-xs font-bold text-slate-800 placeholder:font-normal placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  {/* Ticket Subject */}
                  <div className="shrink-0">
                    <label
                      htmlFor="ticket-subject"
                      className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wide"
                    >
                      Ticket Subject <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="ticket-subject"
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Brief summary of the issue or inquiry..."
                      disabled={submitting || success}
                      required
                      className="neu-input w-full px-3.5 py-1.5 text-xs font-bold text-slate-800 placeholder:font-normal placeholder:text-slate-400"
                    />
                  </div>

                  {/* Description with AI Assistant Header Button & Expand Toggle */}
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between mb-1.5 shrink-0">
                      <label
                        htmlFor="ticket-description"
                        className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide"
                      >
                        Detailed Description <span className="text-rose-500">*</span>
                      </label>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setIsDescriptionExpanded((prev) => !prev)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#E8EEF5] shadow-neu-btn hover:shadow-neu-card active:shadow-neu-btn-pressed border border-white/80 text-[11px] font-bold text-slate-600 hover:text-sky-600 transition-all cursor-pointer"
                          title={isDescriptionExpanded ? 'Collapse description box' : 'Expand description box'}
                        >
                          {isDescriptionExpanded ? (
                            <>
                              <Minimize2 className="w-3 h-3 text-sky-500" />
                              <span>Collapse</span>
                            </>
                          ) : (
                            <>
                              <Maximize2 className="w-3 h-3 text-sky-500" />
                              <span>Expand</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={handleAIPolish}
                          disabled={isPolishing || submitting || success}
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#E8EEF5] shadow-neu-btn hover:shadow-neu-card active:shadow-neu-btn-pressed border border-white/80 text-[11px] font-bold text-sky-600 hover:text-sky-700 transition-all cursor-pointer"
                          title="Enhance structure with AI"
                        >
                          {isPolishing ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin text-sky-500" />
                              <span>Polishing...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3 text-sky-500" />
                              <span>AI Polish Draft</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <textarea
                      id="ticket-description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      onPaste={handleDescriptionPaste}
                      placeholder="Explain the technical problem, customer circumstances, error logs, or steps to reproduce..."
                      disabled={submitting || success}
                      required
                      className={`neu-input w-full p-3 text-xs font-normal text-slate-800 resize-y min-h-[180px] max-h-[500px] placeholder:font-normal placeholder:text-slate-400 transition-[height] duration-200 ${isDescriptionExpanded ? 'h-72 sm:h-80' : 'h-48 sm:h-52'
                        }`}
                    />
                  </div>
                </div>

                {/* Simple Attachments Section */}
                <div className="pt-2.5 border-t border-slate-300/40 shrink-0">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                      Attachments
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">
                      PNG, JPG, PDF, TXT (up to 10MB)
                    </span>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    multiple
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.txt,.csv,.json"
                  />

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={submitting || success}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E8EEF5] shadow-neu-btn hover:shadow-neu-card active:shadow-neu-btn-pressed border border-white/80 text-xs font-bold text-slate-700 hover:text-sky-600 transition-all cursor-pointer group"
                    >
                      <Paperclip className="w-3.5 h-3.5 text-sky-500 group-hover:rotate-12 transition-transform" />
                      <span>Attach Files</span>
                    </button>

                    {pendingFiles.length === 0 ? (
                      <span className="text-xs text-slate-400 italic">No files attached yet</span>
                    ) : (
                      <span className="text-xs font-bold text-sky-600">
                        {pendingFiles.length} file{pendingFiles.length > 1 ? 's' : ''} attached
                      </span>
                    )}
                  </div>

                  {/* Uploaded Pending Files Chips */}
                  {pendingFiles.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {pendingFiles.map((file, idx) => (
                        <div
                          key={`${file.name}-${idx}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#E8EEF5] shadow-neu-btn border border-white/80 text-xs"
                        >
                          <FileText className="w-3 h-3 text-sky-500 shrink-0" />
                          <span className="font-bold text-slate-800 max-w-[140px] truncate" title={file.name}>
                            {file.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({formatFileSize(file.size)})
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(idx)}
                            className="ml-1 p-0.5 rounded text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Remove file"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Classification, Assignment & Actions (5 Cols) */}
            <div className="lg:col-span-5 flex flex-col">
              {/* Classification & Routing Card */}
              <div className="rounded-2xl bg-[#E8EEF5] p-4 sm:p-5 shadow-neu-card hover:shadow-neu-card-hover border border-white/70 transition-all duration-300 flex flex-col justify-between gap-3 h-full">
                <div className="space-y-3 flex flex-col">
                  <div>
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-300/40">
                      <div className="w-7 h-7 rounded-lg bg-[#E2E9F2] shadow-neu-inset border border-white/60 flex items-center justify-center text-sky-500">
                        <Tag className="w-3.5 h-3.5 stroke-[2.2]" />
                      </div>
                      <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        Classification & Assignment
                      </h2>
                    </div>

                    {/* Priority Level Segmented Selector */}
                    <div className="mt-3">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                        Priority Level
                      </label>
                      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#E2E9F2] shadow-neu-inset border border-white/60">
                        {PRIORITIES.map((p) => {
                          const isSelected = priority === p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setPriority(p.id)}
                              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs transition-all duration-200 cursor-pointer ${isSelected
                                  ? `bg-[#E8EEF5] shadow-neu-btn border border-white/90 ${p.activeText}`
                                  : 'text-slate-500 hover:text-slate-800 font-semibold'
                                }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${p.dot} ${isSelected ? 'shadow-[0_0_6px_currentColor]' : ''}`} />
                              <span>{p.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Category Picker */}
                    <div className="relative mt-3" ref={categoryDropdownRef}>
                      <label
                        htmlFor="ticket-category"
                        className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wide"
                      >
                        Ticket Category
                      </label>
                      <div className="relative">
                        <input
                          id="ticket-category"
                          type="text"
                          value={category}
                          onChange={(e) => handleCategoryChange(e.target.value)}
                          onFocus={handleCategoryFocus}
                          placeholder={existingCategories[0] ? `e.g. ${existingCategories[0]}` : 'e.g. Mobile Support'}
                          disabled={submitting || success}
                          className="neu-input w-full px-3.5 py-1.5 text-xs font-bold text-slate-800 placeholder:font-normal placeholder:text-slate-400"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCategorySuggestions(!showCategorySuggestions)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer z-20"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Dropdown Suggestions */}
                      {showCategorySuggestions && categorySuggestions.length > 0 && (
                        <div className="absolute left-0 right-0 mt-2 bg-[#E8EEF5] rounded-2xl shadow-neu-card border border-white/80 py-1.5 z-30 max-h-48 overflow-y-auto no-scrollbar divide-y divide-slate-200/50">
                          {categorySuggestions.map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => {
                                setCategory(cat);
                                setShowCategorySuggestions(false);
                              }}
                              className="w-full text-left px-3.5 py-2 text-xs font-bold text-slate-800 hover:bg-white/40 flex items-center justify-between transition-colors cursor-pointer"
                            >
                              <span>{cat}</span>
                              {category === cat && <Check className="w-3.5 h-3.5 text-sky-500" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Assign Support Agent */}
                    <div className="mt-3">
                      <label
                        htmlFor="assigned-agent"
                        className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wide"
                      >
                        Assign Support Agent
                      </label>
                      <div className="relative">
                        <select
                          id="assigned-agent"
                          value={assignedAgentId}
                          onChange={(e) => setAssignedAgentId(e.target.value)}
                          disabled={submitting || success}
                          className="neu-input w-full appearance-none px-3.5 py-1.5 text-xs font-bold text-slate-800 cursor-pointer"
                        >
                          <option value="">Unassigned (Shared Pool)</option>
                          {activeAgents.map((agent) => (
                            <option key={agent.id} value={agent.id}>
                              {agent.name} ({agent.email}) {agent.isCurrentUser ? '(You)' : ''} — {agent.status}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 z-20" />
                      </div>
                    </div>
                  </div>

                  {/* Dispatch Parameters & Routing Info Box */}
                  <div className="p-3 rounded-xl bg-[#E2E9F2] shadow-neu-inset border border-white/60 space-y-1.5 mt-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                      <span>Response SLA Target</span>
                      <span className="text-emerald-600 font-extrabold">&lt; 15 mins</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                      <span>Live Triage Status</span>
                      <span className="text-sky-600 font-extrabold">Instant Sync Active</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                      <span>Automated Dispatch</span>
                      <span className="text-purple-600 font-extrabold">Email + App Alerts</span>
                    </div>
                  </div>
                </div>

                {/* Submit Action Button pinned at bottom */}
                <div className="pt-2.5 border-t border-slate-300/40 mt-auto shrink-0">
                  <button
                    type="submit"
                    disabled={submitting || success}
                    className="uiverse-dispatch-btn w-full"
                  >
                    <div className="dots_border" />
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white relative z-10" />
                        <span className="text_button">Dispatching Ticket...</span>
                      </>
                    ) : (
                      <>
                        <Send className="btn-send-icon stroke-[2.3]" />
                        <span className="text_button">Create & Dispatch Ticket</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}

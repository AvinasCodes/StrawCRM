import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, AlertCircle, Loader2, Paperclip, FileText, Trash2, Sparkles, Check, ChevronDown } from 'lucide-react';
import { useCreateTicket, generateTempTicketId } from '../../hooks/useCreateTicket';
import { generateMutationId } from '../../lib/db';
import { useAuth } from '../../context/useAuth';
import {
  uploadTicketAttachment,
  formatFileSize,
  validateAttachment,
} from '../../services/storageService';
import { subscribeTickets } from '../../services/firestoreService';
import { getActiveAgents } from '../../services/teamAgents';
import { dispatchAssignmentNotification } from '../../services/notificationService';


const PRIORITIES = [
  { id: 'Low', label: 'Low', dot: 'bg-emerald-500' },
  { id: 'Medium', label: 'Med', dot: 'bg-amber-500' },
  { id: 'High', label: 'High', dot: 'bg-orange-500' },
  { id: 'Urgent', label: 'Urgent', dot: 'bg-rose-500' },
];

const DEFAULT_CATEGORIES = [
  'Technical Support',
  'Billing & Payments',
  'Account Access',
  'Bug Report',
  'Feature Request',
  'General Inquiry',
];

export default function CreateTicketModal({ isOpen, onClose, onSuccess }) {
  const { user } = useAuth();
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [description, setDescription] = useState('');

  // Active Agents directory for assignment
  const activeAgents = useMemo(() => getActiveAgents(user), [user]);
  const [assignedAgentId, setAssignedAgentId] = useState(''); // '' means Unassigned

  const assignedAgent = useMemo(() => {
    return activeAgents.find((a) => a.id === assignedAgentId) || null;
  }, [activeAgents, assignedAgentId]);

  // Dynamic Existing Categories fetched from live tickets + standard categories
  const [existingCategories, setExistingCategories] = useState(DEFAULT_CATEGORIES);
  const [categorySuggestions, setCategorySuggestions] = useState([]);
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const categoryDropdownRef = useRef(null);

  // Subscribe to live tickets to dynamically extract all existing categories
  useEffect(() => {
    const unsubscribeTickets = subscribeTickets(
      {},
      (liveTickets) => {
        if (Array.isArray(liveTickets) && liveTickets.length > 0) {
          const liveCats = liveTickets
            .map((t) => (t.category || '').trim())
            .filter(Boolean);
          const combined = Array.from(new Set([...DEFAULT_CATEGORIES, ...liveCats])).sort();
          setExistingCategories(combined);
        }
      },
      () => {}
    );
    return () => unsubscribeTickets();
  }, []);

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
      setShowCategorySuggestions(true);
      return;
    }
    const q = val.toLowerCase().trim();
    const matches = existingCategories.filter((cat) =>
      cat.toLowerCase().includes(q)
    );
    setCategorySuggestions(matches);
    setShowCategorySuggestions(true);
  };

  const handleCategoryFocus = () => {
    const q = category.toLowerCase().trim();
    const matches = q
      ? existingCategories.filter((cat) => cat.toLowerCase().includes(q))
      : existingCategories;
    setCategorySuggestions(matches);
    setShowCategorySuggestions(true);
  };
  const [pendingFiles, setPendingFiles] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const fileInputRef = useRef(null);

  const createTicketMutation = useCreateTicket();
  const submitting = createTicketMutation.isPending || uploadingFiles;
  const mutationError = createTicketMutation.isError
    ? (createTicketMutation.error?.message || 'Failed to create ticket.')
    : null;
  const error = validationError || mutationError;

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setCustomerName('');
      setCustomerEmail('');
      setSubject('');
      setCategory('');
      setCategorySuggestions([]);
      setShowCategorySuggestions(false);
      setAssignedAgentId('');
      setPriority('Medium');
      setDescription('');
      setPendingFiles([]);
      setUploadingFiles(false);
      setValidationError(null);
      createTicketMutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Handle escape key
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

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    for (const file of files) {
      const v = validateAttachment(file);
      if (!v.valid) {
        setValidationError(v.error);
        return;
      }
    }
    setValidationError(null);
    setPendingFiles((prev) => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveFile = (index) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError(null);

    // Frontend validation
    if (!customerName.trim()) {
      setValidationError('Customer name is required.');
      return;
    }
    if (!customerEmail.trim() || !customerEmail.includes('@')) {
      setValidationError('Please provide a valid customer email address.');
      return;
    }
    if (!subject.trim()) {
      setValidationError('Ticket subject is required.');
      return;
    }
    if (!description.trim() || description.trim().length < 5) {
      setValidationError('Description must be at least 5 characters long.');
      return;
    }

    const tempId = generateTempTicketId();
    const mutationId = generateMutationId();

    let uploadedAttachments = [];
    if (pendingFiles.length > 0) {
      try {
        setUploadingFiles(true);
        for (const file of pendingFiles) {
          const att = await uploadTicketAttachment(tempId, file);
          uploadedAttachments.push(att);
        }
      } catch (err) {
        setValidationError(err.message || 'Failed to upload attachments.');
        setUploadingFiles(false);
        return;
      } finally {
        setUploadingFiles(false);
      }
    }

    const creatorName =
      user?.displayName ||
      (user?.email ? user.email.split('@')[0].replace('.', ' ').replace(/^./, (c) => c.toUpperCase()) : 'Support Staff');
    const creatorId =
      user?.uid ||
      user?.id ||
      (user?.email ? user.email.split('@')[0] : `usr_${customerName.trim().toLowerCase().replace(/\s+/g, '_')}`);

    const selectedAgent = activeAgents.find((a) => a.id === assignedAgentId);
    const assignedToName = selectedAgent
      ? (selectedAgent.rawName || selectedAgent.name)
      : null;
    const assignedToEmail = selectedAgent?.email || null;

    const ticketData = {
      customer_name: customerName.trim(),
      customer_email: customerEmail.trim(),
      subject: subject.trim(),
      category: category.trim() || 'General Inquiry',
      priority: priority || 'Medium',
      assigned_to_name: assignedToName || '',
      assigned_to_email: assignedToEmail || '',
      assigned_to_id: selectedAgent?.id || '',
      description: description.trim(),
      attachments: uploadedAttachments,
      raised_by_name: creatorName,
      raised_by_user_id: creatorId,
    };

    createTicketMutation.mutate(
      { ticketData, tempId, mutationId },
      {
        onSuccess: (res) => {
          if (selectedAgent && selectedAgent.email) {
            dispatchAssignmentNotification({
              ticket: res || ticketData,
              agentName: selectedAgent.name,
              agentEmail: selectedAgent.email,
            });
          }
          if (onSuccess) onSuccess(res);
          onClose();
        },
        onError: (err) => {
          // Network errors — ticket is already showing optimistically, just close
          const isNetworkError = err?.status === 0 || err?.message?.includes('backend');
          if (isNetworkError) {
            if (selectedAgent && selectedAgent.email) {
              dispatchAssignmentNotification({
                ticket: { ticket_id: tempId, ...ticketData },
                agentName: selectedAgent.name,
                agentEmail: selectedAgent.email,
              });
            }
            if (onSuccess) onSuccess({ ticket_id: tempId, created_at: new Date().toISOString() });
            onClose();
          }
        },
      }
    );

  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] max-h-[92vh] bg-[#E8EEF5] text-slate-800 rounded-2xl shadow-2xl border border-slate-300/70 overflow-hidden flex flex-col transition-all"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-300/60 bg-[#E2E9F2]/70 shrink-0">
          <div>
            <h2 id="modal-title" className="text-sm font-extrabold text-slate-900 tracking-tight">
              Create Support Ticket
            </h2>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Fill in customer details and inquiry description.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg bg-[#E2E9F2] hover:bg-slate-200 active:bg-slate-300 border border-slate-300/60 text-slate-600 hover:text-slate-900 transition-all cursor-pointer shadow-xs"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-3.5 space-y-2.5 overflow-y-auto no-scrollbar flex-1">
          {error && (
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-[#E2E9F2] border border-rose-400/50 text-rose-700 text-xs font-bold animate-in fade-in shadow-xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="customer-name" className="block text-[11px] font-bold text-slate-700 mb-1">
                Customer Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="customer-name"
                name="customerName"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Avinash Singh"
                required
                className="w-full px-3 py-1.5 bg-[#E2E9F2] shadow-[inset_1.5px_1.5px_3px_rgba(15,23,42,0.08)] border border-slate-300/60 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/30 transition-all font-medium"
              />
            </div>

            <div>
              <label htmlFor="customer-email" className="block text-[11px] font-bold text-slate-700 mb-1">
                Customer Email <span className="text-rose-500">*</span>
              </label>
              <input
                id="customer-email"
                name="customerEmail"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="e.g. name@gmail.com"
                required
                className="w-full px-3 py-1.5 bg-[#E2E9F2] shadow-[inset_1.5px_1.5px_3px_rgba(15,23,42,0.08)] border border-slate-300/60 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/30 transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <label htmlFor="ticket-subject" className="block text-[11px] font-bold text-slate-700 mb-1">
              Subject <span className="text-rose-500">*</span>
            </label>
            <input
              id="ticket-subject"
              name="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Delivery status delayed for order #1049"
              required
              className="w-full px-3 py-1.5 bg-[#E2E9F2] shadow-[inset_1.5px_1.5px_3px_rgba(15,23,42,0.08)] border border-slate-300/60 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/30 transition-all font-medium"
            />
          </div>

          {/* ROW 3: CATEGORY & ASSIGN AGENT (BALANCED 50/50) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Category Input */}
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <label htmlFor="modal-ticket-category" className="block text-[11px] font-bold text-slate-700">
                  Category
                </label>
                <span className="text-[9px] text-slate-500 font-semibold">Type to recommend</span>
              </div>

              <div className="relative" ref={categoryDropdownRef}>
                <div className="relative">
                  <input
                    id="modal-ticket-category"
                    name="category"
                    type="text"
                    value={category}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    onFocus={handleCategoryFocus}
                    placeholder="Select or type category..."
                    autoComplete="off"
                    className="w-full px-3 py-1.5 bg-[#E2E9F2] shadow-[inset_1.5px_1.5px_3px_rgba(15,23,42,0.08)] border border-slate-300/60 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/30 pr-7 transition-all font-medium"
                  />
                  {category && (
                    <button
                      type="button"
                      onClick={() => {
                        setCategory('');
                        setCategorySuggestions(existingCategories);
                        setShowCategorySuggestions(true);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                      title="Clear category"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Autocomplete Recommendation Dropdown */}
                {showCategorySuggestions && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#E8EEF5] border border-slate-300/70 rounded-xl shadow-xl z-30 py-1 max-h-40 overflow-y-auto divide-y divide-slate-300/40 animate-in fade-in duration-100 no-scrollbar">
                    <div className="px-3 py-0.5 text-[8px] font-black text-slate-500 uppercase tracking-wider flex items-center justify-between bg-[#E2E9F2]/70">
                      <span>Existing Categories</span>
                      <span>{categorySuggestions.length} found</span>
                    </div>
                    {categorySuggestions.length > 0 ? (
                      categorySuggestions.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setCategory(cat);
                            setShowCategorySuggestions(false);
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs text-slate-800 hover:bg-white/80 hover:text-sky-600 flex items-center justify-between transition-colors cursor-pointer group"
                        >
                          <span className="font-semibold group-hover:font-bold">{cat}</span>
                          {category.toLowerCase() === cat.toLowerCase() && (
                            <Check className="w-3 h-3 text-sky-600" />
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-xs text-slate-600">
                        <p>No matching existing category.</p>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setShowCategorySuggestions(false);
                          }}
                          className="mt-1 text-xs text-sky-600 font-bold hover:underline cursor-pointer"
                        >
                          Use &quot;{category}&quot; as new category
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Assign to Agent Selector */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="modal-assigned-agent"
                  className="block text-[11px] font-bold text-slate-700"
                >
                  Assign to Agent
                </label>
                <span className="text-[9px] text-slate-500 font-semibold">
                  {assignedAgent ? 'Direct Assignment' : 'Team Pool'}
                </span>
              </div>
              <div className="relative">
                <select
                  id="modal-assigned-agent"
                  value={assignedAgentId}
                  onChange={(e) => setAssignedAgentId(e.target.value)}
                  className="w-full pl-3 pr-7 py-1.5 bg-[#E2E9F2] shadow-[inset_1.5px_1.5px_3px_rgba(15,23,42,0.08)] border border-slate-300/60 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400/30 cursor-pointer appearance-none transition-all"
                >
                  <option value="">⚡ Unassigned (Shared Pool)</option>
                  {activeAgents.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.name} ({ag.status})
                    </option>
                  ))}
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>

          {/* ROW 4: PRIORITY LEVEL (CLEAN SEGMENTED TRACK WITH TACTILE PILLS - NO WHITE SHADOW) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Priority Level
            </label>
            <div className="grid grid-cols-4 gap-1 bg-[#E2E9F2] shadow-[inset_1.5px_1.5px_3px_rgba(15,23,42,0.08)] p-0.5 rounded-xl border border-slate-300/60 h-[32px] items-center">
              {PRIORITIES.map((p) => {
                const active = priority === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPriority(p.id)}
                    className={`h-full px-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      active
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-300/80 font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description Textarea */}
          <div>
            <label htmlFor="ticket-desc" className="block text-[11px] font-bold text-slate-700 mb-1">
              Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="ticket-desc"
              name="description"
              rows={2.5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide context regarding the customer inquiry or technical issue..."
              required
              className="w-full p-2.5 bg-[#E2E9F2] shadow-[inset_1.5px_1.5px_3px_rgba(15,23,42,0.08)] border border-slate-300/60 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/30 resize-none transition-all font-medium leading-normal"
            />
          </div>

          {/* Attachments Section */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-slate-700">
                Attachments <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#E2E9F2] hover:bg-slate-200 border border-slate-300/60 text-[11px] font-bold text-sky-600 transition-all cursor-pointer shadow-xs"
              >
                <Paperclip className="w-3 h-3" />
                <span>Add files</span>
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              className="hidden"
              accept="image/*,.pdf,.txt,.doc,.docx,.csv,.json,.log"
            />

            {pendingFiles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {pendingFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/80 border border-slate-300/60 text-[11px] font-bold text-slate-700 shadow-xs"
                  >
                    <FileText className="w-3 h-3 text-sky-600 shrink-0" />
                    <span className="max-w-[130px] truncate">{file.name}</span>
                    <span className="text-[9px] text-slate-400 font-medium">({formatFileSize(file.size)})</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      className="text-slate-400 hover:text-rose-500 transition-colors ml-0.5 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-300/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-[#E2E9F2] hover:bg-slate-200 border border-slate-300/60 text-xs font-bold text-slate-700 hover:text-slate-900 transition-all cursor-pointer shadow-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:brightness-105 active:scale-[0.98] text-white text-xs font-black shadow-[0_3px_10px_rgba(14,165,233,0.35)] disabled:opacity-50 transition-all cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Create Ticket</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

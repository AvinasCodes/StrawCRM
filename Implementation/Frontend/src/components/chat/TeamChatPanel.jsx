import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  MessageSquare,
  Send,
  X,
  Ticket,
  Clock,
  Check,
  CheckCheck,
  User,
  Loader2,
  AtSign,
  Hash,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import {
  subscribeTeamMessages,
  sendTeamMessage,
  subscribeTickets,
} from '../../services/firestoreService';
import TicketStatusBadge from '../tickets/TicketStatusBadge';

export default function TeamChatPanel({ isOpen, onClose, onOpenTicket, initialTicketMention }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  // Available tickets for @ mention engine
  const [availableTickets, setAvailableTickets] = useState([]);

  // Mention autocomplete state
  const [mentionQuery, setMentionQuery] = useState(null); // null when not active, string when typing after @
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);

  const inputRef = useRef(null);
  const messagesScrollRef = useRef(null);

  // Subscribe to real-time team messages
  useEffect(() => {
    const unsub = subscribeTeamMessages((list) => {
      setMessages(list || []);
    });
    return () => unsub();
  }, []);

  // Subscribe to tickets for @ autocomplete lookup
  useEffect(() => {
    const unsub = subscribeTickets({}, (tickets) => {
      setAvailableTickets(tickets || []);
    });
    return () => unsub();
  }, []);

  // Handle pre-filled mention from TicketDetailModal
  useEffect(() => {
    if (initialTicketMention && isOpen) {
      setInputText((prev) => {
        const mentionTag = `@#${initialTicketMention} `;
        if (prev.includes(mentionTag)) return prev;
        return `${mentionTag}${prev}`;
      });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [initialTicketMention, isOpen]);

  // Auto-scroll chat to latest message
  useEffect(() => {
    if (isOpen && messages.length) {
      setTimeout(() => {
        if (messagesScrollRef.current) {
          messagesScrollRef.current.scrollTop = messagesScrollRef.current.scrollHeight;
        }
      }, 50);
    }
  }, [messages.length, isOpen]);

  // Filter tickets matching mentionQuery
  const matchingTickets = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase().trim().replace(/^#/, '');
    return availableTickets
      .filter((t) => {
        const id = (t.ticket_id || '').toLowerCase();
        const sub = (t.subject || '').toLowerCase();
        const cust = (t.customer_name || '').toLowerCase();
        return !q || id.includes(q) || sub.includes(q) || cust.includes(q);
      })
      .slice(0, 6);
  }, [availableTickets, mentionQuery]);

  // Handle text input and detect @ mention token
  const handleInputChange = (e) => {
    const val = e.target.value;
    const cursorPos = e.target.selectionStart;
    setInputText(val);

    // Look backwards from cursor to find if we're currently typing an @ token
    const textBeforeCursor = val.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const afterAt = textBeforeCursor.slice(lastAtIndex + 1);
      if (!afterAt.includes('\n') && afterAt.length <= 30) {
        setMentionQuery(afterAt);
        setMentionStartIndex(lastAtIndex);
        setSelectedMentionIndex(0);
        return;
      }
    }

    setMentionQuery(null);
    setMentionStartIndex(-1);
  };

  // Insert selected ticket mention into input text
  const insertTicketMention = (ticket) => {
    if (!ticket?.ticket_id) return;
    const cleanId = ticket.ticket_id.replace(/^#/, '');
    const mentionTag = `@#${cleanId} `;

    if (mentionStartIndex !== -1) {
      const before = inputText.slice(0, mentionStartIndex);
      const after = inputText.slice(inputRef.current?.selectionStart || mentionStartIndex);
      setInputText(`${before}${mentionTag}${after}`);
    } else {
      setInputText((prev) => `${prev} ${mentionTag}`);
    }

    setMentionQuery(null);
    setMentionStartIndex(-1);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  };

  // Keyboard navigation for mention popover & submit
  const handleKeyDown = (e) => {
    if (mentionQuery !== null && matchingTickets.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex((prev) => (prev + 1) % matchingTickets.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex((prev) => (prev - 1 + matchingTickets.length) % matchingTickets.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertTicketMention(matchingTickets[selectedMentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  // Send message handler
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const textToSend = inputText.trim();
    if (!textToSend || sending) return;

    try {
      setSending(true);
      setInputText('');
      setMentionQuery(null);

      // Extract mentions from text (e.g., @#TKT-001 or @TKT-001)
      const mentionMatches = textToSend.match(/@#?([a-zA-Z0-9_-]+)/g) || [];
      const mentions = mentionMatches.map((m) => m.replace(/^@#?/, '').toUpperCase());

      const authorName =
        user?.displayName ||
        (user?.email
          ? user.email
              .split('@')[0]
              .replace(/[._-]/g, ' ')
              .replace(/\b\w/g, (c) => c.toUpperCase())
          : 'Agent');

      await sendTeamMessage({
        text: textToSend,
        authorName,
        authorEmail: user?.email || '',
        mentions,
      });
    } catch (err) {
      console.warn('[TeamChatPanel] Send error:', err);
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (dateStr) => {
    if (!dateStr) return 'Just now';
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch {
      return 'Just now';
    }
  };

  // Render text with clickable ticket chips
  const renderMessageContent = (text, isMe = false) => {
    if (!text) return null;
    const parts = text.split(/(@#?[a-zA-Z0-9_-]+|#[a-zA-Z0-9_-]+)/g);

    return parts.map((part, i) => {
      const isMention = part.startsWith('@') || part.startsWith('#');
      if (isMention) {
        const cleanId = part.replace(/^[@#]+/, '').toUpperCase();
        const matchedTicket = availableTickets.find(
          (t) => (t.ticket_id || '').toUpperCase() === cleanId
        );

        return (
          <button
            key={i}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenTicket) onOpenTicket(cleanId);
            }}
            title={
              matchedTicket
                ? `View Ticket #${cleanId}: ${matchedTicket.subject}`
                : `View Ticket #${cleanId}`
            }
            className={`inline-flex items-center gap-1 mx-0.5 px-2 py-0.5 rounded-lg font-mono text-[10px] font-black transition-all cursor-pointer select-none ${
              isMe
                ? 'bg-white/20 hover:bg-white/30 text-white border border-white/30 shadow-xs'
                : 'bg-[#E2EAF3] hover:bg-[#D5E1EE] text-sky-700 border border-white/70 shadow-[inset_1px_1px_2px_rgba(168,184,206,0.5),inset_-1px_-1px_2px_rgba(255,255,255,0.95)]'
            }`}
          >
            <Ticket className="w-2.5 h-2.5" />
            <span>#{cleanId}</span>
          </button>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#071330]/65 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md sm:max-w-lg bg-[#E8EEF5] h-full shadow-[-20px_0_50px_rgba(15,23,42,0.3)] border-l border-white/60 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200 relative select-none font-sans"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* ─────────────────────────────────────────────────────────────
            1. PANEL HEADER (Neumorphic Bar)
           ───────────────────────────────────────────────────────────── */}
        <div className="shrink-0 px-4 sm:px-5 py-3.5 bg-[#E2E9F2]/80 border-b border-slate-300/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#E2E9F2] shadow-neu-inset border border-slate-300/40 text-sky-600 flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4 text-sky-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">
                  Team Workspace Chat
                </h3>
                <span className="text-[10px] font-black text-slate-600 bg-[#E8EEF5] px-2 py-0.5 rounded-xl shadow-neu-btn border border-white/80">
                  {messages.length}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-[10px] font-black text-emerald-700 shadow-neu-btn">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Channel</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-[#E8EEF5] shadow-neu-btn hover:shadow-neu-card active:shadow-neu-btn-pressed border border-white/80 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
              title="Close chat panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            2. SCROLLABLE MESSAGES FEED
           ───────────────────────────────────────────────────────────── */}
        <div
          ref={messagesScrollRef}
          className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-[#E8EEF5] no-scrollbar"
        >
          {messages.length > 0 ? (
            messages.map((m) => {
              const isMe =
                (m.author_email && user?.email && m.author_email.toLowerCase() === user.email.toLowerCase()) ||
                (m.author_name && user?.displayName && m.author_name.toLowerCase() === user.displayName.toLowerCase()) ||
                (user?.email && m.author_name && m.author_name.toLowerCase().includes(user.email.split('@')[0].toLowerCase()));

              const authorName = isMe ? 'You' : m.author_name || 'Team Member';
              const initial = (m.author_name || authorName || 'T').charAt(0).toUpperCase();

              return (
                <div
                  key={m.id}
                  className={`flex items-end gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Sender Avatar */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-xs shrink-0 shadow-[0_2px_6px_rgba(99,102,241,0.25)] ring-2 ring-white/80 ${
                      isMe
                        ? 'bg-gradient-to-br from-sky-500 to-blue-600'
                        : 'bg-gradient-to-br from-indigo-500 to-purple-600'
                    }`}
                  >
                    {isMe ? (user?.displayName?.charAt(0).toUpperCase() || 'Y') : initial}
                  </div>

                  {/* Message Bubble & Meta */}
                  <div className={`flex flex-col gap-1 max-w-[82%] ${isMe ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`flex items-center gap-1.5 px-1 text-[10px] text-slate-400 font-medium ${
                        isMe ? 'flex-row-reverse' : 'flex-row'
                      }`}
                    >
                      <span className={`font-extrabold ${isMe ? 'text-sky-600' : 'text-slate-700'}`}>
                        {authorName}
                      </span>
                      <span>·</span>
                      <span>{formatMessageTime(m.created_at)}</span>
                      {isMe && <CheckCheck className="w-3 h-3 text-sky-500 stroke-[2.5]" />}
                    </div>

                    <div
                      className={`px-3.5 py-2.5 text-xs sm:text-[13px] leading-relaxed whitespace-pre-line break-words transition-all font-sans ${
                        isMe
                          ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-2xl rounded-tr-xs shadow-[2px_3px_10px_rgba(14,165,233,0.35)] border border-white/20'
                          : 'bg-[#EEF4FA] text-slate-800 rounded-2xl rounded-tl-xs shadow-[4px_6px_14px_rgba(165,182,206,0.32),-1px_-1px_3px_rgba(255,255,255,0.2)] border border-white/80'
                      }`}
                    >
                      {renderMessageContent(m.text, isMe)}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <div className="w-12 h-12 rounded-2xl bg-[#E2E9F2] shadow-neu-inset border border-slate-300/40 text-slate-400 flex items-center justify-center mb-3">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h4 className="text-xs font-black text-slate-800">No team messages yet</h4>
              <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                Start a conversation with your team. Type <strong className="font-mono text-sky-600">@</strong> to mention any customer support ticket.
              </p>
            </div>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────
            3. PINNED INPUT BAR WITH @ AUTOCOMPLETE
           ───────────────────────────────────────────────────────────── */}
        <div className="relative z-20 shrink-0 p-3 sm:p-4 bg-[#E2E9F2]/80 border-t border-slate-300/40">
          {/* @ Ticket Autocomplete Recommendation Popover */}
          {mentionQuery !== null && matchingTickets.length > 0 && (
            <div className="absolute bottom-full left-3.5 right-3.5 mb-2.5 bg-[#E8EEF5] rounded-2xl shadow-neu-card border border-white/80 overflow-hidden z-30 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3.5 py-2 bg-[#E2E9F2] border-b border-slate-300/40 flex items-center justify-between text-[10px] font-black text-slate-500 uppercase tracking-wider">
                <span className="flex items-center gap-1.5 text-sky-600">
                  <AtSign className="w-3 h-3" /> Mention Ticket (↑↓ to navigate, Enter to select)
                </span>
                <span className="bg-[#E8EEF5] px-2 py-0.5 rounded-md shadow-neu-btn border border-white/80">
                  {matchingTickets.length} found
                </span>
              </div>

              <div className="max-h-56 overflow-y-auto divide-y divide-slate-300/40 no-scrollbar">
                {matchingTickets.map((t, idx) => {
                  const isSelected = idx === selectedMentionIndex;
                  return (
                    <button
                      key={t.ticket_id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        insertTicketMention(t);
                      }}
                      onMouseEnter={() => setSelectedMentionIndex(idx)}
                      className={`w-full text-left p-2.5 flex items-center justify-between gap-3 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#E2E9F2] shadow-neu-inset text-sky-600'
                          : 'hover:bg-white/40 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono text-xs font-black px-2 py-0.5 rounded-lg bg-[#E8EEF5] shadow-neu-btn border border-white/80 text-sky-600 shrink-0">
                          #{t.ticket_id}
                        </span>
                        <div className="min-w-0">
                          <p className="font-extrabold text-xs text-slate-900 truncate">
                            {t.subject || 'Support Ticket'}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            Customer: {t.customer_name || 'Customer'}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5">
                        <TicketStatusBadge status={t.status} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="space-y-1.5">
            {/* Sunken Neumorphic Input Track */}
            <div className="relative flex items-center bg-[#E8EEF5] shadow-neu-inset border border-slate-300/50 rounded-2xl p-1.5 focus-within:border-sky-400/60 focus-within:ring-1 focus-within:ring-sky-400/30 transition-all">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type a team message or @ to reference ticket..."
                disabled={sending}
                className="flex-1 px-3 py-1.5 text-xs sm:text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent font-medium"
              />

              {/* Quick @ mention button */}
              <button
                type="button"
                onClick={() => {
                  setInputText((prev) => `${prev}@`);
                  setMentionQuery('');
                  setMentionStartIndex(inputText.length);
                  setTimeout(() => inputRef.current?.focus(), 10);
                }}
                className="w-7 h-7 rounded-xl bg-[#E8EEF5] shadow-neu-btn hover:shadow-neu-card active:shadow-neu-btn-pressed border border-white/60 text-slate-500 hover:text-sky-600 flex items-center justify-center transition-all cursor-pointer mr-1.5 shrink-0"
                title="Mention a ticket (@)"
              >
                <AtSign className="w-3.5 h-3.5" />
              </button>

              {/* Send Button */}
              <button
                type="submit"
                disabled={!inputText.trim() || sending}
                aria-label="Send message"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:brightness-105 active:scale-95 text-white text-xs font-black shadow-[2px_2px_8px_rgba(14,165,233,0.35)] transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none shrink-0"
              >
                {sending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Send</span>
              </button>
            </div>

            <div className="flex items-center justify-between px-1 text-[10px] text-slate-500 font-medium">
              <span>Press <strong className="text-slate-700">Enter</strong> to send</span>
              <span>Type <strong className="text-sky-600 font-mono">@</strong> to link ticket</span>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}

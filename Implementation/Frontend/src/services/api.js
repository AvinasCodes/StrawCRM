import { auth, isConfigured } from '../lib/firebase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Retrieve Firebase ID token for the currently authenticated user.
 * In development without active user, falls back to a dev mock token accepted by backend.
 */
export async function getAuthToken() {
  if (isConfigured && auth && auth.currentUser) {
    try {
      return await auth.currentUser.getIdToken();
    } catch (err) {
      console.warn('Failed to retrieve Firebase ID token:', err);
    }
  }

  // Check if simulated session exists in localStorage
  try {
    const sessionStr = localStorage.getItem('strawcrm_auth_session');
    if (sessionStr) {
      const session = JSON.parse(sessionStr);
      if (session?.idToken || session?.token) {
        return session.idToken || session.token;
      }
    }
  } catch {
    // Ignore localStorage parse error
  }

  // Default dev token (accepted in development mode by backend security.py)
  return 'dev-test-token';
}

let backendOnline = null; // null = unverified, true = online, false = offline
let lastOfflineCheck = 0;
const RETRY_OFFLINE_AFTER_MS = 5000; // retry after 5s if temporarily down

/**
 * Standard HTTP request wrapper with Bearer token injection, request timeout, and error normalization
 */
async function request(endpoint, options = {}, timeoutMs = 8000) {
  // If backend failed very recently (<5s), fail fast but don't lock user out
  if (backendOnline === false && (Date.now() - lastOfflineCheck < RETRY_OFFLINE_AFTER_MS)) {
    const netError = new Error('Backend offline. Operating in instant offline store mode.');
    netError.status = 0;
    throw netError;
  }

  const token = await getAuthToken();
  const url = `${API_BASE_URL}${endpoint}`;

  const effectiveTimeout = timeoutMs;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), effectiveTimeout);

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });
    clearTimeout(timer);

    // Backend successfully reached
    backendOnline = true;

    if (!response.ok) {
      let errorMessage = 'Something went wrong. Please try again.';

      try {
        const errorData = await response.json();
        if (errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            // Pydantic validation error array
            errorMessage = errorData.detail.map((d) => d.msg || d.message).join(', ');
          } else {
            errorMessage = errorData.detail;
          }
        }
      } catch {
        // Fallback to HTTP status mapping per requirements
        switch (response.status) {
          case 401:
            errorMessage = 'Your session has expired. Please sign in again.';
            break;
          case 403:
            errorMessage = "You don't have permission to perform this action.";
            break;
          case 404:
            errorMessage = 'Ticket not found.';
            break;
          case 422:
            errorMessage = 'Please check the information you entered.';
            break;
          case 429:
            errorMessage = 'Too many requests. Please try again shortly.';
            break;
          case 500:
          default:
            errorMessage = 'Something went wrong. Please try again.';
            break;
        }
      }

      const error = new Error(errorMessage);
      error.status = response.status;
      throw error;
    }

    return await response.json();
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError' || (err.name === 'TypeError' && err.message.includes('fetch'))) {
      backendOnline = false;
      lastOfflineCheck = Date.now();
      const netError = new Error('Database/backend request timed out or unavailable. Switching to instant mode.');
      netError.status = 0;
      throw netError;
    }
    throw err;
  }
}



// In-memory frontend cache for ultra-responsive dashboard transitions
const _clientCache = new Map();
function getCached(key, ttlMs = 15000) {
  const item = _clientCache.get(key);
  if (item && Date.now() < item.expiresAt) return item.data;
  return null;
}
function setCached(key, data, ttlMs = 15000) {
  _clientCache.set(key, { data, expiresAt: Date.now() + ttlMs });
}
export function invalidateClientCache() {
  _clientCache.clear();
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard Service APIs
// ─────────────────────────────────────────────────────────────────────────────
export async function getDashboardSummary(range = '7d') {
  const cacheKey = `dash_${range}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const data = await request(`/api/dashboard/summary?range=${encodeURIComponent(range)}`);
  setCached(cacheKey, data, 20000);
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tickets Service APIs
// ─────────────────────────────────────────────────────────────────────────────
export async function listTickets({ search = '', status = '', customer_id = '', timeRange = 'All Time' } = {}) {
  const params = new URLSearchParams();
  if (search && search.trim()) params.append('search', search.trim());
  if (status && status !== 'All' && status !== 'All Status') params.append('status', status);
  if (customer_id && customer_id.trim()) params.append('customer_id', customer_id.trim());

  const qs = params.toString();
  const result = await request(`/api/tickets${qs ? `?${qs}` : ''}`);

  if (timeRange && timeRange !== 'All Time' && Array.isArray(result)) {
    const now = Date.now();
    return result.filter((t) => {
      if (!t.created_at) return true;
      const diffDays = (now - new Date(t.created_at)) / (1000 * 60 * 60 * 24);
      if (timeRange === 'Today') return diffDays <= 1;
      if (timeRange === 'Last 7 days') return diffDays <= 7;
      if (timeRange === 'Last 30 days') return diffDays <= 30;
      if (timeRange === 'Last 3 months') return diffDays <= 90;
      return true;
    });
  }

  return result;
}

export async function getTicket(ticketId) {
  return await request(`/api/tickets/${encodeURIComponent(ticketId)}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Customers Service APIs
// ─────────────────────────────────────────────────────────────────────────────
export async function listCustomers({ search = '' } = {}) {
  const params = new URLSearchParams();
  if (search && search.trim()) params.append('search', search.trim());
  const qs = params.toString();
  return await request(`/api/customers${qs ? `?${qs}` : ''}`);
}

export async function getCustomer(customerId) {
  return await request(`/api/customers/${encodeURIComponent(customerId)}`);
}

export async function getCustomerTickets(customerId) {
  return await request(`/api/customers/${encodeURIComponent(customerId)}/tickets`);
}

export async function deleteCustomer(customerId) {
  invalidateClientCache();
  return await request(`/api/customers/${encodeURIComponent(customerId)}`, {
    method: 'DELETE',
  });
}

import {
  createTicket as fsCreateTicket,
  updateTicket as fsUpdateTicket,
  addNote as fsAddNote,
  deleteTicket as fsDeleteTicket,
  deleteTicketsBulk as fsDeleteTicketsBulk,
} from './firestoreService';

export async function createTicket(ticketData) {
  invalidateClientCache();
  return await fsCreateTicket(ticketData);
}

export async function updateTicket(ticketId, updateData) {
  invalidateClientCache();
  return await fsUpdateTicket(ticketId, updateData);
}

export async function addTicketNote(ticketId, noteText, authorName) {
  invalidateClientCache();
  try {
    return await fsAddNote(ticketId, noteText, authorName);
  } catch (err) {
    throw err;
  }
}

export async function deleteTicket(ticketId) {
  invalidateClientCache();
  return await fsDeleteTicket(ticketId);
}

export async function deleteTicketsBulk(ticketIds) {
  invalidateClientCache();
  return await fsDeleteTicketsBulk(ticketIds);
}


// ─────────────────────────────────────────────────────────────────────────────
// Gemini AI Service APIs (Configured via VITE_GEMINI_API_KEY)
// ─────────────────────────────────────────────────────────────────────────────
async function callDirectGemini(prompt) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) return null;

  for (const model of ['gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-3.5-flash']) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text.trim();
      }
    } catch (e) {
      console.warn(`[Direct Gemini] Model ${model} failed:`, e);
    }
  }
  return null;
}

function deduceTicketPriority(subject = '', description = '') {
  const text = `${subject} ${description}`.toLowerCase();
  if (['urgent', 'critical', 'down', 'outage', 'emergency', 'crash', 'asap', 'billing', 'breach', 'security'].some(w => text.includes(w))) {
    return { priority: 'Urgent', sentiment: 'Urgent' };
  }
  if (['error', 'fail', 'bug', 'broken', 'cannot', 'unable', 'delay', 'stuck', 'issue', 'polish'].some(w => text.includes(w))) {
    return { priority: 'High', sentiment: 'Frustrated' };
  }
  if (['typo', 'minor', 'feedback', 'suggestion', 'info'].some(w => text.includes(w))) {
    return { priority: 'Low', sentiment: 'Positive' };
  }
  return { priority: 'Normal', sentiment: 'Neutral' };
}

export async function getTicketAISummary(ticketId, ticketData = null) {
  try {
    const res = await request(
      `/api/tickets/${encodeURIComponent(ticketId)}/ai-summary`,
      {
        method: 'POST',
        body: JSON.stringify({ ticket_data: ticketData }),
      },
      30000
    );
    if (res && res.summary) return res;
  } catch (err) {
    console.warn('[AI Service] Backend AI summary request fell back to direct Gemini client:', err);
  }

  // Fallback: Direct Gemini Client Call
  const prompt = `You are an expert customer support AI assistant for StrawCRM.
Analyze the following customer support ticket and return a strict JSON object with these keys:
- "summary": A concise 1-2 sentence executive summary of the customer's inquiry.
- "key_points": A list of 2 to 3 key bullet points.
- "suggested_priority": "Low", "Normal", "High", or "Urgent".
- "sentiment": "Frustrated", "Neutral", "Urgent", or "Positive".

Ticket Information:
Ticket ID: ${ticketId}
Customer: ${ticketData?.customer_name || 'Customer'}
Subject: ${ticketData?.subject || 'Support Ticket'}
Description: ${ticketData?.description || ''}
Status: ${ticketData?.status || 'Open'}

Respond ONLY with valid JSON.`;

  try {
    const directResult = await callDirectGemini(prompt);
    if (directResult) {
      let cleaned = directResult;
      if (cleaned.includes('```json')) {
        cleaned = cleaned.split('```json')[1].split('```')[0].trim();
      } else if (cleaned.includes('```')) {
        cleaned = cleaned.split('```')[1].split('```')[0].trim();
      }
      const parsed = JSON.parse(cleaned);
      return {
        ticket_id: ticketId,
        summary: parsed.summary || parsed.description || 'Summary generated.',
        key_points: parsed.key_points || [],
        suggested_priority: parsed.suggested_priority || 'Normal',
        sentiment: parsed.sentiment || 'Neutral',
      };
    }
  } catch (e) {
    console.warn('[AI Service] Direct Gemini summary parse error:', e);
  }

  // Final Instant Fallback
  const deduced = deduceTicketPriority(ticketData?.subject, ticketData?.description);
  const descSnippet = (ticketData?.description || '').trim();
  return {
    ticket_id: ticketId,
    summary: descSnippet
      ? `Customer ${ticketData?.customer_name || 'User'} inquires: ${descSnippet.length > 120 ? descSnippet.slice(0, 120) + '...' : descSnippet}`
      : `Inquiry regarding "${ticketData?.subject || 'Support Ticket'}".`,
    key_points: [
      `Subject: ${ticketData?.subject || 'Support Request'}`,
      `Reported by: ${ticketData?.customer_name || 'Customer'}`,
      `Status: ${ticketData?.status || 'Open'}`,
    ],
    suggested_priority: deduced.priority,
    sentiment: deduced.sentiment,
  };
}

export async function getTicketAIReply(ticketId, instructions = '', tone = 'professional', ticketData = null) {
  try {
    const res = await request(
      `/api/tickets/${encodeURIComponent(ticketId)}/ai-reply`,
      {
        method: 'POST',
        body: JSON.stringify({ instructions, tone, ticket_data: ticketData }),
      },
      30000
    );
    if (res && res.suggested_reply) return res;
  } catch (err) {
    console.warn('[AI Service] Backend AI reply request fell back to direct Gemini client:', err);
  }

  // Fallback: Direct Gemini Client Call
  const toneGuideline = {
    friendly: 'warm, approachable, cheerful, and encouraging',
    professional: 'clear, formal, polite, and reassuring',
    apologetic: 'deeply empathetic, acknowledging any frustration, and solution-oriented',
  }[(tone || 'friendly').toLowerCase()] || 'helpful and polite';

  const customGuidanceBlock = instructions && instructions.trim()
    ? `\nAGENT'S MANDATORY CUSTOM GUIDANCE:\n"${instructions.trim()}"\n**CRITICAL PRIORITY**: The agent's custom guidance above MUST BE STRICTLY APPLIED to the response. It overrides default tone guidelines if there is a conflict.\n`
    : '';

  const prompt = `You are an AI assistant helping a Customer Support Agent draft an email response to a customer.

Context:
- Support Agent is replying to the customer: ${ticketData?.customer_name || 'Customer'}
- Customer's Subject: ${ticketData?.subject || 'Support Ticket'}
- Customer's Message / Issue: ${ticketData?.description || ''}
- Default Tone: ${tone} (${toneGuideline})
${customGuidanceBlock}

CRITICAL RULES:
1. This is an email written by the support agent TO the customer (${ticketData?.customer_name || 'Customer'}).
2. The customer is an external client contacting our support. Do NOT tell the customer to "log into StrawCRM" or "change StrawCRM settings" unless their inquiry is explicitly about StrawCRM software.
3. Directly answer, resolve, or provide guidance addressing the customer's actual topic ("${ticketData?.subject || ''}: ${ticketData?.description || ''}").
4. If the agent provided custom guidance, reflect it faithfully in the email wording, mood, and content.
5. Provide ONLY the email text ready to send. No placeholders like [Your Name] or preamble. Sign off as "Support Team".`;

  try {
    const directReply = await callDirectGemini(prompt);
    if (directReply) {
      return {
        ticket_id: ticketId,
        suggested_reply: directReply.trim(),
        tone: tone,
      };
    }
  } catch (e) {
    console.warn('[AI Service] Direct Gemini reply error:', e);
  }

  // Final Instant Fallback Template
  const customerName = ticketData?.customer_name || 'Customer';
  const subject = ticketData?.subject || 'your inquiry';
  return {
    ticket_id: ticketId,
    suggested_reply: `Hi ${customerName},\n\nThank you for getting in touch with our Support Team regarding "${subject}".\n\nWe have reviewed your request and our team is actively addressing it. We will keep you closely informed with updates.\n\nPlease feel free to reply directly to this message if you have any additional details to provide.\n\nBest regards,\nSupport Team`,
    tone: tone,
  };
}

export async function queryTicketAI(ticketId, query, ticketData = null, messages = []) {
  try {
    const res = await request(
      `/api/tickets/${encodeURIComponent(ticketId)}/ai-query`,
      {
        method: 'POST',
        body: JSON.stringify({ query, ticket_data: ticketData, messages }),
      },
      30000
    );
    if (res && res.answer) return res;
  } catch (err) {
    console.warn('[AI Service] Backend AI query request fell back to direct Gemini client:', err);
  }

  // Fallback: Direct Gemini RAG Call with full grounding context & conversation memory
  const notesText = Array.isArray(ticketData?.notes) && ticketData.notes.length > 0
    ? ticketData.notes.map((n) => `- [${n.created_at || 'Note'}] ${n.author_name || 'Agent'}: ${n.note_text || ''}`).join('\n')
    : 'None recorded yet.';

  const historyText = Array.isArray(messages) && messages.length > 0
    ? messages.slice(-6).map((m) => `${m.role === 'user' ? 'Support Agent' : 'Gemini Copilot'}: ${m.content}`).join('\n')
    : 'No prior messages in this conversation.';

  const prompt = `You are an expert AI Support Copilot assisting an internal Customer Support Agent at StrawCRM / Datastraw.
You are equipped with a RAG (Retrieval-Augmented Generation) engine grounded on live CRM data and support knowledge.

=== RETRIEVED GROUNDING CONTEXT (RAG) ===

[DOCUMENT 1: CURRENT TICKET DETAILS]
- Ticket ID: #${String(ticketId).replace(/^#/, '')}
- Customer Name: ${ticketData?.customer_name || 'Customer'} (${ticketData?.customer_email || 'No email'})
- Subject: ${ticketData?.subject || 'Support Ticket'}
- Priority: ${ticketData?.priority || 'Normal'}
- Current Status: ${ticketData?.status || 'Open'}
- Category: ${ticketData?.category || 'General Support'}
- Problem Description:
${ticketData?.description || 'No description provided.'}

[DOCUMENT 2: INTERNAL AGENT NOTES & COLLABORATION]
${notesText}

[DOCUMENT 3: DATASTRAW CRM KNOWLEDGE & OPERATIONAL POLICIES]
- Urgent / Critical SLA: Initial response < 1 hr, resolution target < 4 hrs.
- High SLA: Initial response < 4 hrs, resolution target < 12 hrs.
- Normal SLA: Initial response < 8 hrs, resolution target < 24 hrs.
- Low SLA: Initial response < 24 hrs, resolution target < 48 hrs.
- Troubleshooting standard: Check browser cache/cookies, verify auth token session, test in incognito mode.
- Escalation: Tier 1 Support Agent -> Tier 2 Technical Support -> Operations Lead.
- Refunds: Evaluated by Billing Lead within 3-5 business days.

=== END RETRIEVED GROUNDING CONTEXT ===

=== RECENT CONVERSATION HISTORY ===
${historyText}
=== END CONVERSATION HISTORY ===

CURRENT AGENT INQUIRY:
"${query.trim()}"

CRITICAL COPILOT INSTRUCTIONS:
1. Ground your response directly in the retrieved ticket data, notes, and CRM policies above.
2. Provide direct, actionable, and structured information (checklists, bullet points, next steps).
3. If asked to extract demands or troubleshoot, provide concrete, practical solutions.
4. You are speaking directly to the internal support agent.
5. Use clean markdown formatting.`;

  const sources = [
    `Ticket #${String(ticketId).replace(/^#/, '')} Details`,
    ...(Array.isArray(ticketData?.notes) && ticketData.notes.length > 0 ? [`${ticketData.notes.length} Internal Notes`] : []),
    `Customer: ${ticketData?.customer_name || 'Customer'}`,
    'Datastraw SLA & Support Policy KB',
  ];

  try {
    const directAnswer = await callDirectGemini(prompt);
    if (directAnswer) {
      return {
        ticket_id: ticketId,
        query: query,
        answer: directAnswer.trim(),
        sources: sources,
      };
    }
  } catch (e) {
    console.warn('[AI Service] Direct Gemini query error:', e);
  }

  return {
    ticket_id: ticketId,
    query: query,
    answer: `Ticket #${ticketId} Grounded Analysis:\n• Customer: ${ticketData?.customer_name || 'Customer'}\n• Issue: ${ticketData?.subject || 'Support Request'}\n• Details: ${ticketData?.description || 'No description provided.'}`,
    sources: sources,
  };
}


// ─────────────────────────────────────────────────────────────────────────────
// Analytics Service APIs
// ─────────────────────────────────────────────────────────────────────────────
export async function getAnalyticsOverview() {
  return await request('/api/analytics/overview');
}

// ─────────────────────────────────────────────────────────────────────────────
// Users & Directory Service APIs
// ─────────────────────────────────────────────────────────────────────────────
export async function getWorkspaceUsers({ status, search } = {}) {
  try {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.append('status', status);
    if (search && search.trim()) params.append('search', search.trim());
    const qs = params.toString();
    return await request(`/api/users${qs ? `?${qs}` : ''}`);
  } catch (err) {
    // If backend offline, caller handles fallback gracefully
    throw err;
  }
}

export async function sendUserHeartbeat(userData) {
  try {
    return await request('/api/users/heartbeat', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  } catch (err) {
    return null;
  }
}

export async function updateRemoteUserRole(email, role) {
  try {
    return await request('/api/users/role', {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    });
  } catch (err) {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Email Dispatch APIs (Directly to Customer)
// ─────────────────────────────────────────────────────────────────────────────
export async function sendTicketResponseToCustomer(ticketId, { subject, message, ticket_data, recipient_email, recipient_name }) {
  return await request(`/api/tickets/${encodeURIComponent(ticketId)}/send-email`, {
    method: 'POST',
    body: JSON.stringify({
      subject,
      message,
      ticket_data,
      recipient_email,
      recipient_name,
    }),
  });
}

// Backward compatibility alias
export const sendTicketEmailToAgent = sendTicketResponseToCustomer;



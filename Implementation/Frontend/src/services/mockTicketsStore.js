/**
 * Mock Tickets Store for StrawCRM
 * Clean initial store for customer tickets.
 * Persists in localStorage for resilient offline/fallback operation.
 */

import DUMMY_TICKETS from './dummyTickets.json';

const STORAGE_KEY = 'strawcrm_tickets_db';

export const INITIAL_TICKETS = [];

function getStoredTickets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Could not read tickets from localStorage:', e);
  }
  return [];
}

function saveStoredTickets(tickets) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
  } catch (e) {
    console.warn('Could not save tickets to localStorage:', e);
  }
}

export function getMockTickets({ search = '', status = 'All', customer_id = '', timeRange = 'All Time' } = {}) {
  let tickets = getStoredTickets();

  // Filter by customer_id
  if (customer_id && customer_id.trim()) {
    const cid = customer_id.trim().replace(/^#/, '').toUpperCase();
    tickets = tickets.filter(
      (t) => (t.customer_id || '').toUpperCase() === cid || (t.customer_email || '').toLowerCase() === customer_id.toLowerCase()
    );
  }

  // Status filtering
  if (status && status !== 'All' && status !== 'All Status') {
    tickets = tickets.filter(
      (t) => (t.status || '').toLowerCase() === status.toLowerCase()
    );
  }

  // Time filtering
  if (timeRange && timeRange !== 'All Time') {
    const now = Date.now();
    tickets = tickets.filter((t) => {
      if (!t.created_at) return true;
      const created = new Date(t.created_at).getTime();
      const diffMs = now - created;
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (timeRange === 'Today') return diffDays <= 1;
      if (timeRange === 'Last 7 days') return diffDays <= 7;
      if (timeRange === 'Last 30 days') return diffDays <= 30;
      if (timeRange === 'Last 3 months') return diffDays <= 90;
      return true;
    });
  }

  // Search filtering across ticket_id, customer_id, name, email, subject, description
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    tickets = tickets.filter((t) => {
      return (
        (t.ticket_id || '').toLowerCase().includes(q) ||
        (t.customer_id || '').toLowerCase().includes(q) ||
        (t.customer_name || '').toLowerCase().includes(q) ||
        (t.customer_email || '').toLowerCase().includes(q) ||
        (t.subject || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q)
      );
    });
  }

  return tickets;
}

export function getMockTicket(ticketId) {
  if (!ticketId) return null;
  const tickets = getStoredTickets();
  const rawId = String(ticketId).trim();
  const cleanId = rawId.replace(/^#/, '').toUpperCase();

  // 1. Direct or normalized ticket_id match
  let found = tickets.find(
    (t) => (t.ticket_id || '').replace(/^#/, '').toUpperCase() === cleanId
  );
  if (found) return found;

  // 2. Customer ID match
  found = tickets.find(
    (t) => (t.customer_id || '').replace(/^#/, '').toUpperCase() === cleanId
  );
  if (found) return found;

  // 3. Numeric match (e.g. '1' -> 'TKT-001' or 'CUST-001')
  const digits = cleanId.match(/\d+/);
  if (digits) {
    const num = parseInt(digits[0], 10);
    const tktFormatted = `TKT-${String(num).padStart(3, '0')}`;
    found = tickets.find((t) => (t.ticket_id || '').toUpperCase() === tktFormatted);
    if (found) return found;

    const custFormatted = `CUST-${String(num).padStart(3, '0')}`;
    found = tickets.find((t) => (t.customer_id || '').toUpperCase() === custFormatted);
    if (found) return found;
  }

  // 4. Email match
  found = tickets.find((t) => (t.customer_email || '').toLowerCase() === rawId.toLowerCase());
  if (found) return found;

  return null;
}

export function createMockTicket(ticketData) {
  const tickets = getStoredTickets();

  let maxIdNum = 0;
  tickets.forEach((t) => {
    const match = (t.ticket_id || '').match(/\d+/);
    if (match) {
      const num = parseInt(match[0], 10);
      if (num > maxIdNum) maxIdNum = num;
    }
  });

  const nextId = `TKT-${String(maxIdNum + 1).padStart(3, '0')}`;
  const nowIso = new Date().toISOString();

  const newTicket = {
    ticket_id: nextId,
    customer_id: ticketData.customer_id || `CUST-${String(tickets.length + 1).padStart(3, '0')}`,
    raised_by_user_id: ticketData.raised_by_user_id || 'usr_agent_01',
    customer_name: ticketData.customer_name,
    customer_email: ticketData.customer_email,
    subject: ticketData.subject,
    description: ticketData.description,
    status: 'Open',
    created_at: nowIso,
    updated_at: nowIso,
    notes: [],
  };

  const updatedTickets = [newTicket, ...tickets];
  saveStoredTickets(updatedTickets);

  return {
    ticket_id: nextId,
    customer_id: newTicket.customer_id,
    raised_by_user_id: newTicket.raised_by_user_id,
    created_at: nowIso,
  };
}

export function updateMockTicket(ticketId, updateData) {
  const tickets = getStoredTickets();
  const normId = (ticketId || '').replace(/^#/, '').toLowerCase();
  const index = tickets.findIndex((t) => (t.ticket_id || '').replace(/^#/, '').toLowerCase() === normId);

  if (index === -1) {
    return null;
  }

  const existing = tickets[index];
  const nowIso = new Date().toISOString();

  const updated = {
    ...existing,
    status: updateData.status || existing.status,
    updated_at: nowIso,
  };

  if (updateData.notes && updateData.notes.trim()) {
    const notes = existing.notes ? [...existing.notes] : [];
    notes.push({
      id: notes.length + 1,
      note_text: updateData.notes.trim(),
      author_name: updateData.author_name || 'Support Agent',
      author_email: updateData.author_email || '',
      created_at: nowIso,
    });
    updated.notes = notes;
  }

  tickets[index] = updated;
  saveStoredTickets(tickets);

  return updated;
}

export function deleteMockTicket(ticketId) {
  const tickets = getStoredTickets();
  const normId = (ticketId || '').replace(/^#/, '').toUpperCase();
  const filtered = tickets.filter((t) => (t.ticket_id || '').replace(/^#/, '').toUpperCase() !== normId);
  saveStoredTickets(filtered);
  return true;
}

export function deleteMockTickets(ticketIds = []) {
  const tickets = getStoredTickets();
  const targetSet = new Set(ticketIds.map((id) => (id || '').replace(/^#/, '').toUpperCase()));
  const filtered = tickets.filter((t) => !targetSet.has((t.ticket_id || '').replace(/^#/, '').toUpperCase()));
  saveStoredTickets(filtered);
  return { deleted_count: tickets.length - filtered.length };
}

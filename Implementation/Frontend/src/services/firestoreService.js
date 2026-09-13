/**
 * StrawCRM — Firebase Firestore & REST Realtime Synchronization Service
 *
 * Provides instant optimistic mutations (<1ms), multi-ID fetching,
 * real-time listeners, and automatic bidirectional synchronization between
 * the FastAPI backend REST API and Google Cloud Firestore.
 */

import {
  collection,
  doc,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  onSnapshot,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db, auth, isConfigured } from '../lib/firebase';


const TICKETS_COLLECTION = 'tickets';
const NOTES_SUBCOLLECTION = 'notes';
const CUSTOMERS_COLLECTION = 'customers';

const _rawApiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const API_BASE_URL = _rawApiUrl.startsWith('http') ? _rawApiUrl : `https://${_rawApiUrl}`;

async function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  try {
    if (isConfigured && auth && auth.currentUser) {
      const token = await auth.currentUser.getIdToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        return headers;
      }
    }
  } catch { }

  try {
    const raw = localStorage.getItem('strawcrm_auth_session');
    if (raw) {
      const s = JSON.parse(raw);
      const tok = s?.idToken || s?.token;
      if (tok) {
        headers['Authorization'] = `Bearer ${tok}`;
        return headers;
      }
    }
  } catch { }

  headers['Authorization'] = 'Bearer dev-test-token';
  return headers;
}

export function healTicket(t) {
  if (!t || !t.ticket_id) return t;
  return t;
}

const LOCAL_STORAGE_KEY = 'strawcrm_tickets_cache';
const DELETED_CUSTOMERS_STORAGE_KEY = 'strawcrm_deleted_customers';
const DELETED_TICKETS_STORAGE_KEY = 'strawcrm_deleted_ticket_ids';
const DUMMY_CUSTOMER_IDS = new Set(['CUST-004', 'CUST-999', 'TKT-004', 'TKT-999', '#CUST-004', '#CUST-999']);
const DUMMY_CUSTOMER_EMAILS = new Set(['browsertest@example.com']);
const DUMMY_CUSTOMER_SUBJECTS = new Set(['browser test ticket', 'testing extra fields']);

const _deletedCustomerIds = (() => {
  const set = new Set(['CUST-004', 'CUST-999', 'BROWSERTEST@EXAMPLE.COM']);
  try {
    const raw = localStorage.getItem(DELETED_CUSTOMERS_STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) arr.forEach((id) => set.add(String(id).toUpperCase().trim()));
    }
  } catch { }
  return set;
})();

function persistDeletedCustomers() {
  try {
    localStorage.setItem(DELETED_CUSTOMERS_STORAGE_KEY, JSON.stringify(Array.from(_deletedCustomerIds)));
  } catch { }
}

// Tombstone set: tracks ticket IDs deleted locally so sync/snapshot can never resurrect them
const _deletedIds = (() => {
  const set = new Set(['TKT-004', 'TKT-999']);
  try {
    const raw = localStorage.getItem(DELETED_TICKETS_STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        arr.forEach((id) => set.add(String(id).replace(/^#/, '').toUpperCase().trim()));
      }
    }
  } catch { }
  return set;
})();

function persistDeletedTicketIds() {
  try {
    localStorage.setItem(DELETED_TICKETS_STORAGE_KEY, JSON.stringify(Array.from(_deletedIds)));
  } catch { }
}

let _localTickets = (() => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((t) => {
          const cid = (t.customer_id || '').toUpperCase().trim();
          const email = (t.customer_email || '').toLowerCase().trim();
          const subj = (t.subject || '').toLowerCase().trim();
          const tid = (t.ticket_id || '').replace(/^#/, '').toUpperCase().trim();
          if (DUMMY_CUSTOMER_IDS.has(cid) || DUMMY_CUSTOMER_IDS.has(tid) || _deletedCustomerIds.has(cid)) return false;
          if (_deletedIds.has(tid)) return false;
          if (DUMMY_CUSTOMER_EMAILS.has(email) || _deletedCustomerIds.has(email.toUpperCase())) return false;
          if (DUMMY_CUSTOMER_SUBJECTS.has(subj)) return false;
          return true;
        });
      }
    }
  } catch { }
  return [];
})();

const _listeners = new Set();
const _detailListeners = new Map(); // cleanId.toUpperCase() -> Set of callback functions

function persistLocalTickets() {
  try {
    // Only store first 100 tickets to keep localStorage lightweight
    const light = _localTickets.slice(0, 100).map((t) => {
      if (!t.attachments || t.attachments.length === 0) return t;
      return {
        ...t,
        attachments: t.attachments.map((a) => ({ ...a, data: null })),
      };
    });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(light));
  } catch { }
}

function notifyDetailListeners(cleanId, ticket) {
  if (!cleanId || !ticket) return;
  const key = String(cleanId).trim().replace(/^#/, '').toUpperCase();
  const cbs = _detailListeners.get(key);
  if (cbs && cbs.size > 0) {
    cbs.forEach((cb) => {
      try {
        cb({ ...ticket });
      } catch (err) {
        console.warn('[firestoreService] Detail listener callback error:', err);
      }
    });
  }
}

function notifyLocalListeners() {
  persistLocalTickets();
  _listeners.forEach((cb) => {
    try {
      cb([..._localTickets]);
    } catch { }
  });
}

/**
 * Background synchronization with FastAPI backend REST API.
 * Ensures tickets created by ANY ID, curl, test suite, or browser are immediately loaded.
 */
let _syncPromise = null;

export async function syncFromBackend() {
  if (_syncPromise) return _syncPromise;
  _syncPromise = (async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/api/tickets`, {
        headers: { Authorization: headers.Authorization, Accept: 'application/json' },
      });
      if (res.ok) {
        const serverTickets = await res.json();
        if (Array.isArray(serverTickets)) {
          if (serverTickets.length === 0 && _localTickets.length > 0) {
            return;
          }
          const map = new Map();
          _localTickets.forEach((t) => map.set((t.ticket_id || '').toUpperCase(), { ...t }));

          // 1. Index server tickets — Server is the authoritative source of truth for inquiry details
          // Skip any tickets that were deleted locally (tombstone guard)
          serverTickets.forEach((st) => {
            const stKey = (st.ticket_id || '').replace(/^#/, '').toUpperCase();
            if (_deletedIds.has(stKey)) return; // don't resurrect locally-deleted tickets
            const key = (st.ticket_id || '').toUpperCase();
            const lt = map.get(key) || _localTickets.find((t) => (t.ticket_id || '').toUpperCase() === key);

            const merged = {
              ...st,
              customer_name: (st.customer_name && st.customer_name.trim()) || lt?.customer_name || 'Customer',
              customer_email: st.customer_email || lt?.customer_email || '',
              subject: (st.subject && st.subject.trim()) || lt?.subject || 'Support Ticket',
              description: (st.description && st.description.trim()) || lt?.description || '',
              customer_id: st.customer_id || lt?.customer_id || 'CUST-001',
              assigned_to_name: st.assigned_to_name !== undefined ? st.assigned_to_name : (lt?.assigned_to_name || ''),
              assigned_to_email: st.assigned_to_email !== undefined ? st.assigned_to_email : (lt?.assigned_to_email || ''),
              assigned_to_id: st.assigned_to_id !== undefined ? st.assigned_to_id : (lt?.assigned_to_id || ''),
              priority: st.priority || lt?.priority || 'Normal',
              raised_by_user_id: (st.raised_by_user_id && st.raised_by_user_id !== 'usr_agent_01')
                ? st.raised_by_user_id
                : (lt?.raised_by_user_id || st.raised_by_user_id || ''),
              raised_by_name: st.raised_by_name || lt?.raised_by_name || st.customer_name || 'Customer',
              created_at: st.created_at || lt?.created_at || new Date().toISOString(),
            };

            if (lt) {
              const ltTime = new Date(lt.updated_at || lt.created_at || 0).getTime();
              const serverTime = new Date(st.updated_at || st.created_at || 0).getTime();
              const useServer = serverTime >= ltTime;

              merged.status = useServer ? st.status : (lt.status || st.status);
              merged.updated_at = useServer ? st.updated_at : (lt.updated_at || st.updated_at);
              if (!useServer) {
                if (lt.assigned_to_name !== undefined) merged.assigned_to_name = lt.assigned_to_name;
                if (lt.assigned_to_email !== undefined) merged.assigned_to_email = lt.assigned_to_email;
                if (lt.assigned_to_id !== undefined) merged.assigned_to_id = lt.assigned_to_id;
                if (lt.priority) merged.priority = lt.priority;
              }

              // Notes: merge server notes with any local offline notes
              const serverNoteIds = new Set((st.notes || []).map((n) => String(n.id || n.note_text)));
              const extraLocalNotes = (lt.notes || []).filter((n) => !serverNoteIds.has(String(n.id || n.note_text)));
              merged.notes = [...(st.notes || []), ...extraLocalNotes];

              merged.attachments = (st.attachments && st.attachments.length > 0)
                ? st.attachments
                : (lt.attachments || []);
            } else {
              merged.notes = st.notes || [];
              merged.attachments = st.attachments || [];
            }

            map.set(key, merged);
          });

          // Preserve any recent optimistic tickets (< 90s) that haven't arrived from server yet
          const nowMs = Date.now();
          _localTickets.forEach((lt) => {
            const ltKey = (lt.ticket_id || '').replace(/^#/, '').toUpperCase();
            if (_deletedIds.has(ltKey)) return;
            if (!map.has(ltKey)) {
              const ageMs = nowMs - new Date(lt.created_at || nowMs).getTime();
              if (ageMs < 90000) {
                map.set(ltKey, lt);
              }
            }
          });

          // Filter out locally-deleted tickets from the merged result
          _localTickets = Array.from(map.values()).filter(
            (t) => !_deletedIds.has((t.ticket_id || '').replace(/^#/, '').toUpperCase())
          );
          _localTickets.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
          notifyLocalListeners();

          // Notify any active detail listeners of updated ticket state
          _detailListeners.forEach((cbs, key) => {
            const t = _localTickets.find((item) => (item.ticket_id || '').toUpperCase() === key);
            if (t) {
              cbs.forEach((cb) => {
                try { cb({ ...t }); } catch { }
              });
            }
          });
        }
      }
    } catch (err) {
      // Backend offline or unreachable, local store continues safely
    } finally {
      _syncPromise = null;
    }
  })();
  return _syncPromise;
}

// Kick off background sync immediately
syncFromBackend();

/**
 * Generate a sequential or unique Ticket ID (e.g. TKT-001, TKT-002)
 */
function generateTicketId(existingTickets = []) {
  let maxNum = 0;
  existingTickets.forEach((t) => {
    const m = (t.ticket_id || '').match(/(\d+)/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxNum) maxNum = n;
    }
  });
  return `TKT-${String(maxNum + 1).padStart(3, '0')}`;
}

/**
 * Subscribe to realtime tickets list with live onSnapshot listener and backend fallback.
 * Returns an unsubscribe function.
 */
export function subscribeTickets(filters = {}, onUpdate, onError) {
  const { status = 'All', search = '', timeRange = 'All Time' } = filters;

  const localListener = (all) => {
    const filtered = filterTickets(all, { status, search, timeRange });
    onUpdate(filtered);
  };
  _listeners.add(localListener);

  // Initial instant emission from local cache (0ms)
  localListener(_localTickets);

  // Sync latest tickets from backend in parallel
  syncFromBackend();

  // Polling to keep multiple user logins, tabs, and ports synchronized
  // Only polls when the browser tab is active/visible to prevent log flooding
  const pollTimer = setInterval(() => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      return;
    }
    syncFromBackend();
  }, 10000);

  const onFocus = () => {
    syncFromBackend();
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', onFocus);
  }

  if (!db) {
    return () => {
      _listeners.delete(localListener);
      clearInterval(pollTimer);
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', onFocus);
      }
    };
  }

  try {
    const colRef = collection(db, TICKETS_COLLECTION);
    const unsubFs = onSnapshot(
      colRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const rawTickets = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            rawTickets.push({
              ...data,
              id: docSnap.id,
              ticket_id: data.ticket_id || docSnap.id,
              customer_id: data.customer_id || 'CUST-001',
              raised_by_user_id: data.raised_by_user_id || 'usr_agent_01',
              customer_name: data.customer_name || 'Customer',
              customer_email: data.customer_email || '',
              subject: data.subject || '',
              description: data.description || '',
              status: data.status || 'Open',
              priority: data.priority || 'Normal',
              assigned_to_name: data.assigned_to_name !== undefined ? data.assigned_to_name : '',
              assigned_to_email: data.assigned_to_email !== undefined ? data.assigned_to_email : '',
              assigned_to_id: data.assigned_to_id !== undefined ? data.assigned_to_id : '',
              attachments: data.attachments || [],
              created_at: data.created_at || new Date().toISOString(),
              updated_at: data.updated_at || new Date().toISOString(),
              notes: data.notes || [],
            });
          });

          // Smart merge: preserve existing local/backend notes and avoid reverting newer status
          const mergedMap = new Map();
          _localTickets.forEach((t) => mergedMap.set((t.ticket_id || '').toUpperCase(), { ...t }));

          rawTickets.forEach((rt) => {
            const key = (rt.ticket_id || '').toUpperCase();
            // Don't re-add tickets that were deleted locally
            if (_deletedIds.has(key.replace(/^#/, ''))) return;
            const existing = mergedMap.get(key);
            if (!existing) {
              if (rt.subject && rt.subject.trim()) {
                mergedMap.set(key, rt);
              }
            } else {
              const existingTime = new Date(existing.updated_at || existing.created_at || 0).getTime();
              const rtTime = new Date(rt.updated_at || rt.created_at || 0).getTime();
              const useRt = rtTime > existingTime;

              mergedMap.set(key, {
                ...existing,
                customer_name: (rt.customer_name && rt.customer_name !== 'Customer') ? rt.customer_name : existing.customer_name,
                customer_email: rt.customer_email || existing.customer_email,
                subject: (rt.subject && rt.subject.trim()) ? rt.subject : existing.subject,
                description: (rt.description && rt.description.trim()) ? rt.description : existing.description,
                customer_id: rt.customer_id || existing.customer_id,
                raised_by_user_id: (rt.raised_by_user_id && rt.raised_by_user_id !== 'usr_agent_01') ? rt.raised_by_user_id : existing.raised_by_user_id,
                raised_by_name: rt.raised_by_name || existing.raised_by_name || existing.customer_name,
                assigned_to_name: rt.assigned_to_name !== undefined ? rt.assigned_to_name : existing.assigned_to_name,
                assigned_to_email: rt.assigned_to_email !== undefined ? rt.assigned_to_email : existing.assigned_to_email,
                assigned_to_id: rt.assigned_to_id !== undefined ? rt.assigned_to_id : existing.assigned_to_id,
                priority: rt.priority || existing.priority,
                created_at: rt.created_at || existing.created_at,
                status: useRt ? (rt.status || existing.status) : existing.status,
                updated_at: useRt ? rt.updated_at : existing.updated_at,
                notes: (rt.notes && rt.notes.length > 0) ? rt.notes : (existing.notes || []),
                attachments: (rt.attachments && rt.attachments.length > 0) ? rt.attachments : (existing.attachments || []),
              });
            }
          });
          // Filter out locally-deleted tickets from Firestore snapshot merge result
          _localTickets = Array.from(mergedMap.values()).filter(
            (t) => !_deletedIds.has((t.ticket_id || '').replace(/^#/, '').toUpperCase())
          );

          _localTickets.sort((a, b) => {
            const tA = new Date(a.created_at).getTime() || 0;
            const tB = new Date(b.created_at).getTime() || 0;
            return tB - tA;
          });

          const filtered = filterTickets(_localTickets, { status, search, timeRange });
          onUpdate(filtered);
        }
      },
      (err) => {
        if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota exceeded')) {
          console.debug('[StrawCRM] Firestore quota reached. Using Backend API as primary store.');
          return;
        }
        onError?.(err);
      }
    );

    return () => {
      _listeners.delete(localListener);
      clearInterval(pollTimer);
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', onFocus);
      }
      unsubFs();
    };
  } catch (err) {
    return () => {
      _listeners.delete(localListener);
      clearInterval(pollTimer);
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', onFocus);
      }
    };
  }
}

/**
 * Client-side filter helper
 */
function filterTickets(tickets, { status, search, customer_id, timeRange }) {
  let res = [...tickets];

  if (customer_id && customer_id.trim()) {
    const cid = customer_id.trim().replace(/^#/, '').toUpperCase();
    res = res.filter(
      (t) => (t.customer_id || '').toUpperCase() === cid || (t.customer_email || '').toLowerCase() === customer_id.toLowerCase()
    );
  }

  if (status && status !== 'All' && status !== 'All Status') {
    res = res.filter((t) => (t.status || '').toLowerCase() === status.toLowerCase());
  }

  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    res = res.filter(
      (t) =>
        (t.ticket_id || '').toLowerCase().includes(q) ||
        (t.customer_id || '').toLowerCase().includes(q) ||
        (t.customer_name || '').toLowerCase().includes(q) ||
        (t.customer_email || '').toLowerCase().includes(q) ||
        (t.subject || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q)
    );
  }

  if (timeRange && timeRange !== 'All Time') {
    const now = Date.now();
    res = res.filter((t) => {
      if (!t.created_at) return true;
      const created = new Date(t.created_at).getTime();
      const diffDays = (now - created) / (1000 * 60 * 60 * 24);
      if (timeRange === 'Today') return diffDays <= 1;
      if (timeRange === 'Last 7 days') return diffDays <= 7;
      if (timeRange === 'Last 30 days') return diffDays <= 30;
      if (timeRange === 'Last 3 months') return diffDays <= 90;
      return true;
    });
  }

  return res;
}

/**
 * Deduplicate notes by id, client_mutation_id, and content fingerprint (author + text + 15s time bucket).
 */
export function dedupNotes(notes) {
  if (!Array.isArray(notes)) return [];
  const seenIds = new Set();
  const seenFingerprints = new Set();
  const deduped = [];

  for (const n of notes) {
    if (!n || !n.note_text) continue;
    const text = String(n.note_text).trim();
    if (!text) continue;

    const strId = n.id != null ? String(n.id) : null;
    if (strId && !strId.startsWith('temp_')) {
      if (seenIds.has(strId)) continue;
      seenIds.add(strId);
    }

    const author = (n.author_name || n.author_email || '').toLowerCase().trim();
    const timeMs = n.created_at ? new Date(n.created_at).getTime() : 0;
    const timeBucket = timeMs ? Math.floor(timeMs / 15000) : 0;
    const fingerprint = `${author}:::${text.toLowerCase()}:::${timeBucket}`;

    if (timeBucket > 0 && seenFingerprints.has(fingerprint)) {
      continue;
    }
    if (timeBucket > 0) {
      seenFingerprints.add(fingerprint);
    }

    deduped.push({
      ...n,
      id: n.id || `note_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      note_text: text,
      author_name: n.author_name || 'Team Member',
      created_at: n.created_at || new Date().toISOString(),
    });
  }

  return deduped.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
}

/**
 * Subscribe to realtime detail of a single ticket.
 * Multi-ID enabled: supports Ticket ID, Customer ID, numeric digits, and email.
 */
export function subscribeTicketDetail(ticketId, onUpdate, onError) {
  if (!ticketId) return () => { };

  const rawId = String(ticketId).trim();
  const cleanId = rawId.replace(/^#/, '').trim();
  const upperCleanId = cleanId.toUpperCase();

  // Register in _detailListeners so mutations (notes/status) immediately notify this subscriber
  if (!_detailListeners.has(upperCleanId)) {
    _detailListeners.set(upperCleanId, new Set());
  }
  _detailListeners.get(upperCleanId).add(onUpdate);

  // Instant local emission with multi-ID matching
  const emitLocal = () => {
    const local = _localTickets.find((t) => {
      const tid = (t.ticket_id || '').replace(/^#/, '').toUpperCase();
      const cid = (t.customer_id || '').replace(/^#/, '').toUpperCase();
      if (tid === upperCleanId || cid === upperCleanId) return true;

      const digits = cleanId.match(/\d+/);
      if (digits) {
        const num = parseInt(digits[0], 10);
        if (tid === `TKT-${String(num).padStart(3, '0')}`) return true;
        if (cid === `CUST-${String(num).padStart(3, '0')}`) return true;
      }
      if ((t.customer_email || '').toLowerCase() === rawId.toLowerCase()) return true;
      return false;
    });
    if (local) {
      onUpdate({ ...local, notes: local.notes || [], attachments: local.attachments || [] });
    }
  };
  emitLocal();

  // 1. Fetch from Backend REST API to guarantee fresh notes, attachments, and status for ANY ID
  getAuthHeaders().then((headers) => {
    fetch(`${API_BASE_URL}/api/tickets/${encodeURIComponent(cleanId)}`, {
      headers: { Authorization: headers.Authorization, Accept: 'application/json' },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((backendTicket) => {
        if (backendTicket && backendTicket.ticket_id) {
          const idx = _localTickets.findIndex(
            (t) => (t.ticket_id || '').toUpperCase() === backendTicket.ticket_id.toUpperCase()
          );
          const fullMerged = {
            ...(idx !== -1 ? _localTickets[idx] : {}),
            ...backendTicket,
            notes: (backendTicket.notes && backendTicket.notes.length > 0)
              ? backendTicket.notes
              : (idx !== -1 ? _localTickets[idx].notes || [] : []),
            attachments: (backendTicket.attachments && backendTicket.attachments.length > 0)
              ? backendTicket.attachments
              : (idx !== -1 ? _localTickets[idx].attachments || [] : []),
          };
          if (idx !== -1) {
            _localTickets[idx] = fullMerged;
          } else {
            _localTickets.unshift(fullMerged);
          }
          notifyDetailListeners(upperCleanId, fullMerged);
          onUpdate(fullMerged);
        }
      })
      .catch(() => { });
  });

  if (!db) {
    return () => {
      _detailListeners.get(upperCleanId)?.delete(onUpdate);
      if (_detailListeners.get(upperCleanId)?.size === 0) {
        _detailListeners.delete(upperCleanId);
      }
    };
  }

  try {
    let ticketData = null;

    const emit = () => {
      const currentLocal = _localTickets.find(
        (t) => (t.ticket_id || '').toUpperCase() === upperCleanId
      );

      const base = healTicket(currentLocal || { ticket_id: cleanId });

      // Combine notes from live Firestore doc and local/backend base, deduping rock-solidly
      let rawNotes = [];
      if (ticketData?.notes && ticketData.notes.length > 0) {
        rawNotes = [...rawNotes, ...ticketData.notes];
      }
      if (base?.notes && base.notes.length > 0) {
        rawNotes = [...rawNotes, ...base.notes];
      }
      const finalNotes = dedupNotes(rawNotes);

      const localTime = new Date(base?.updated_at || 0).getTime();
      const fsTime = new Date(ticketData?.updated_at || 0).getTime();
      const statusToUse = (fsTime > localTime && ticketData?.status)
        ? ticketData.status
        : (base?.status || ticketData?.status || 'Open');

      const merged = healTicket({
        ...base,
        ticket_id: base.ticket_id || cleanId,
        customer_id: base.customer_id || '',
        customer_name: base.customer_name || '',
        customer_email: base.customer_email || '',
        subject: base.subject || '',
        description: base.description || '',
        raised_by_name: base.raised_by_name || base.customer_name || '',
        raised_by_user_id: base.raised_by_user_id || '',
        assigned_to_name: ticketData?.assigned_to_name !== undefined ? ticketData.assigned_to_name : (base.assigned_to_name || ''),
        assigned_to_email: ticketData?.assigned_to_email !== undefined ? ticketData.assigned_to_email : (base.assigned_to_email || ''),
        assigned_to_id: ticketData?.assigned_to_id !== undefined ? ticketData.assigned_to_id : (base.assigned_to_id || ''),
        priority: ticketData?.priority || base.priority || 'Normal',
        created_at: base.created_at || new Date().toISOString(),
        updated_at: ticketData?.updated_at || base.updated_at || new Date().toISOString(),
        status: statusToUse,
        notes: finalNotes,
        attachments: (ticketData?.attachments && ticketData.attachments.length > 0)
          ? ticketData.attachments
          : (base.attachments || []),
      });

      // Update local ticket cache with merged data
      const idx = _localTickets.findIndex(
        (t) => (t.ticket_id || '').toUpperCase() === upperCleanId
      );
      if (idx !== -1) {
        _localTickets[idx] = merged;
      } else {
        _localTickets.unshift(merged);
      }

      onUpdate(merged);
    };

    const ticketRef = doc(db, TICKETS_COLLECTION, cleanId);
    const unsubTicket = onSnapshot(
      ticketRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          ticketData = {
            ...data,
            id: docSnap.id,
            ticket_id: data.ticket_id || docSnap.id,
            customer_id: data.customer_id,
            raised_by_user_id: data.raised_by_user_id,
            raised_by_name: data.raised_by_name,
            customer_name: data.customer_name,
            customer_email: data.customer_email,
            subject: data.subject,
            description: data.description,
            status: data.status,
            priority: data.priority || 'Normal',
            assigned_to_name: data.assigned_to_name !== undefined ? data.assigned_to_name : '',
            assigned_to_email: data.assigned_to_email !== undefined ? data.assigned_to_email : '',
            assigned_to_id: data.assigned_to_id !== undefined ? data.assigned_to_id : '',
            attachments: data.attachments || [],
            created_at: data.created_at,
            updated_at: data.updated_at,
            notes: data.notes || [],
          };
          emit();
        } else {
          emitLocal();
        }
      },
      () => emitLocal()
    );

    return () => {
      _detailListeners.get(upperCleanId)?.delete(onUpdate);
      if (_detailListeners.get(upperCleanId)?.size === 0) {
        _detailListeners.delete(upperCleanId);
      }
      unsubTicket();
    };
  } catch (err) {
    return () => {
      _detailListeners.get(upperCleanId)?.delete(onUpdate);
      if (_detailListeners.get(upperCleanId)?.size === 0) {
        _detailListeners.delete(upperCleanId);
      }
    };
  }
}

/**
 * Create a new ticket directly in Backend REST API and Firestore.
 */
export async function createTicket(ticketData) {
  const ticketId = ticketData.ticket_id || generateTicketId(_localTickets);
  const nowIso = new Date().toISOString();

  const customerId = ticketData.customer_id || `CUST-${String(_localTickets.length + 1).padStart(3, '0')}`;
  const raisedBy = ticketData.raised_by_user_id || auth?.currentUser?.uid || 'usr_agent_01';
  const raisedByName = ticketData.raised_by_name || ticketData.customer_name || 'Customer';

  const newTicket = {
    ticket_id: ticketId,
    customer_id: customerId,
    raised_by_user_id: raisedBy,
    raised_by_name: raisedByName,
    customer_name: ticketData.customer_name,
    customer_email: ticketData.customer_email,
    subject: ticketData.subject,
    description: ticketData.description,
    category: ticketData.category || 'General Inquiry',
    status: ticketData.status || 'Open',
    priority: ticketData.priority || 'Normal',
    assigned_to_name: ticketData.assigned_to_name || '',
    assigned_to_email: ticketData.assigned_to_email || '',
    assigned_to_id: ticketData.assigned_to_id || '',
    attachments: ticketData.attachments || [],
    created_at: nowIso,
    updated_at: nowIso,
    notes: ticketData.notes || [],
  };

  // Immediate optimistic addition (<1ms)
  _localTickets = [newTicket, ..._localTickets.filter((t) => t.ticket_id !== ticketId)];
  notifyLocalListeners();

  // 1. Sync to Backend REST API so any user ID, browser, or curl can immediately access it
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/api/tickets`, {
      method: 'POST',
      headers,
      body: JSON.stringify(newTicket),
    });
    if (res.ok) {
      const created = await res.json();
      if (created && created.ticket_id) {
        newTicket.ticket_id = created.ticket_id;
        const idx = _localTickets.findIndex((t) => t.ticket_id === ticketId || t.ticket_id === created.ticket_id);
        if (idx !== -1) {
          _localTickets[idx] = { ..._localTickets[idx], ...created };
        } else {
          _localTickets = [{ ...newTicket, ...created }, ..._localTickets];
        }
        notifyLocalListeners();
      }
    } else {
      const errData = await res.json().catch(() => ({}));
      if (res.status === 422 && errData.detail) {
        const msg = Array.isArray(errData.detail)
          ? errData.detail.map((d) => d.msg || d.message).join(', ')
          : errData.detail;
        throw new Error(msg);
      }
    }
  } catch (err) {
    console.debug('[StrawCRM] Background backend sync:', err?.message);
    if (err.message && !err.message.includes('fetch')) {
      throw err;
    }
  }

  // 2. Sync to Firestore in background (gracefully catches quota errors)
  if (db) {
    try {
      const ticketRef = doc(db, TICKETS_COLLECTION, newTicket.ticket_id);
      setDoc(ticketRef, newTicket).catch(() => { });
    } catch { }
  }

  return {
    ticket_id: newTicket.ticket_id,
    created_at: nowIso,
  };
}

/**
 * Delete a customer and remove all associated tickets locally and on Backend.
 */
export async function deleteCustomer(customerId) {
  if (!customerId) return { success: false };
  const cleanId = String(customerId).trim().replace(/^#/, '').toUpperCase();
  const rawId = String(customerId).trim().toLowerCase();

  _deletedCustomerIds.add(cleanId);
  _deletedCustomerIds.add(rawId.toUpperCase());
  persistDeletedCustomers();

  // 1. Mark tickets as tombstoned so they don't resurrect
  const ticketsToDelete = _localTickets.filter((t) => {
    const cid = (t.customer_id || '').replace(/^#/, '').toUpperCase();
    const email = (t.customer_email || '').toLowerCase();
    return cid === cleanId || email === customerId.toLowerCase();
  });
  ticketsToDelete.forEach((t) => {
    _deletedIds.add((t.ticket_id || '').replace(/^#/, '').toUpperCase());
  });

  // 2. Remove from local tickets cache
  _localTickets = _localTickets.filter((t) => {
    const cid = (t.customer_id || '').replace(/^#/, '').toUpperCase();
    const email = (t.customer_email || '').toLowerCase();
    return cid !== cleanId && email !== customerId.toLowerCase();
  });
  notifyLocalListeners();

  // 3. Send DELETE request to Backend REST API
  try {
    const headers = await getAuthHeaders();
    await fetch(`${API_BASE_URL}/api/customers/${encodeURIComponent(customerId)}`, {
      method: 'DELETE',
      headers,
    });
  } catch (err) {
    console.warn('[StrawCRM] Backend deleteCustomer notice:', err);
  }

  // 4. Also delete from Firestore if active
  if (db) {
    try {
      deleteDoc(doc(db, CUSTOMERS_COLLECTION, customerId)).catch(() => { });
      if (cleanId) {
        deleteDoc(doc(db, CUSTOMERS_COLLECTION, cleanId)).catch(() => { });
      }
      ticketsToDelete.forEach((t) => {
        if (t.ticket_id) {
          deleteDoc(doc(db, TICKETS_COLLECTION, t.ticket_id)).catch(() => { });
        }
      });
    } catch { }
  }

  return { success: true, customer_id: customerId, deleted_tickets: ticketsToDelete.length };
}

/**
 * Add an attachment to a ticket.
 */
export async function addTicketAttachment(ticketId, attachment) {
  const nowIso = new Date().toISOString();
  let updatedAttachments = [];

  const t = _localTickets.find((t) => (t.ticket_id || '').toUpperCase() === String(ticketId).toUpperCase());
  if (t) {
    if (!t.attachments) t.attachments = [];
    t.attachments.push(attachment);
    t.updated_at = nowIso;
    updatedAttachments = t.attachments;
    notifyLocalListeners();
  }

  // 1. Send update to Backend REST API
  try {
    const headers = await getAuthHeaders();
    await fetch(`${API_BASE_URL}/api/tickets/${encodeURIComponent(ticketId)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ attachments: updatedAttachments }),
    });
  } catch { }

  // 2. Sync to Firestore
  if (db) {
    try {
      const ticketRef = doc(db, TICKETS_COLLECTION, ticketId);
      updateDoc(ticketRef, {
        attachments: arrayUnion(attachment),
        updated_at: nowIso,
      }).catch(() => { });
    } catch { }
  }

  return attachment;
}

/**
 * Add multiple attachments to a ticket in a single batch (atomic update).
 */
export async function addTicketAttachmentsBatch(ticketId, newAttachments) {
  if (!newAttachments || !newAttachments.length) return [];
  const nowIso = new Date().toISOString();
  let updatedAttachments = [];

  const t = _localTickets.find((t) => (t.ticket_id || '').toUpperCase() === String(ticketId).toUpperCase());
  if (t) {
    if (!t.attachments) t.attachments = [];
    t.attachments.push(...newAttachments);
    t.updated_at = nowIso;
    updatedAttachments = t.attachments;
    notifyLocalListeners();
  }

  // 1. Send update to Backend REST API
  try {
    const headers = await getAuthHeaders();
    await fetch(`${API_BASE_URL}/api/tickets/${encodeURIComponent(ticketId)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ attachments: updatedAttachments }),
    });
  } catch { }

  // 2. Sync to Firestore
  if (db) {
    try {
      const ticketRef = doc(db, TICKETS_COLLECTION, ticketId);
      updateDoc(ticketRef, {
        attachments: arrayUnion(...newAttachments),
        updated_at: nowIso,
      }).catch(() => { });
    } catch { }
  }

  return newAttachments;
}

/**
 * Remove an attachment from a ticket.
 */
export async function removeTicketAttachment(ticketId, attachmentId) {
  const nowIso = new Date().toISOString();
  let updatedAttachments = [];
  let removedAttachment = null;

  const t = _localTickets.find((t) => (t.ticket_id || '').toUpperCase() === String(ticketId).toUpperCase());
  if (t && t.attachments) {
    removedAttachment = t.attachments.find((a) => a.id === attachmentId || a.url === attachmentId);
    t.attachments = t.attachments.filter((a) => a.id !== attachmentId && a.url !== attachmentId);
    t.updated_at = nowIso;
    updatedAttachments = t.attachments;
    notifyLocalListeners();
  }

  // 1. Sync to Backend REST API
  try {
    const headers = await getAuthHeaders();
    await fetch(`${API_BASE_URL}/api/tickets/${encodeURIComponent(ticketId)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ attachments: updatedAttachments }),
    });
  } catch { }

  // 2. Sync to Firestore — use arrayRemove so snapshot can't resurrect the attachment
  if (db && removedAttachment) {
    try {
      const ticketRef = doc(db, TICKETS_COLLECTION, String(ticketId).replace(/^#/, ''));
      updateDoc(ticketRef, {
        attachments: arrayRemove(removedAttachment),
        updated_at: nowIso,
      }).catch(() => { });
    } catch { }
  }
}


/**
 * Update ticket status and append notes.
 * Works across ALL ticket IDs.
 */
export async function updateTicket(ticketId, updateData) {
  const nowIso = new Date().toISOString();
  const cleanId = String(ticketId).trim().replace(/^#/, '');
  const upperCleanId = cleanId.toUpperCase();

  let updatedTicket = null;

  // Optimistic local update (<1ms)
  const idx = _localTickets.findIndex(
    (t) => (t.ticket_id || '').replace(/^#/, '').toUpperCase() === upperCleanId
  );
  if (idx !== -1) {
    _localTickets[idx] = {
      ..._localTickets[idx],
      ...updateData,
      status: updateData.status || _localTickets[idx].status,
      assigned_to_name: updateData.assigned_to_name !== undefined ? updateData.assigned_to_name : _localTickets[idx].assigned_to_name,
      assigned_to_email: updateData.assigned_to_email !== undefined ? updateData.assigned_to_email : _localTickets[idx].assigned_to_email,
      assigned_to_id: updateData.assigned_to_id !== undefined ? updateData.assigned_to_id : _localTickets[idx].assigned_to_id,
      priority: updateData.priority || _localTickets[idx].priority,
      updated_at: nowIso,
    };
    if (updateData.attachments) {
      _localTickets[idx].attachments = updateData.attachments;
    }
    if (updateData.notes && updateData.notes.trim()) {
      if (!_localTickets[idx].notes) _localTickets[idx].notes = [];
      _localTickets[idx].notes.push({
        id: `note_${Date.now()}`,
        note_text: updateData.notes.trim(),
        author_name: updateData.author_name || 'Support Agent',
        created_at: nowIso,
      });
    }
    updatedTicket = { ..._localTickets[idx] };
    notifyLocalListeners();
    notifyDetailListeners(upperCleanId, updatedTicket);
  }

  // 1. Sync to Backend REST API (PUT /api/tickets/{ticket_id})
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/api/tickets/${encodeURIComponent(cleanId)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updateData),
    });
    if (res.ok) {
      const serverTicket = await res.json();
      if (serverTicket && serverTicket.ticket_id) {
        const uIdx = _localTickets.findIndex(
          (t) => (t.ticket_id || '').replace(/^#/, '').toUpperCase() === (serverTicket.ticket_id || '').replace(/^#/, '').toUpperCase()
        );
        if (uIdx !== -1) {
          _localTickets[uIdx] = { ..._localTickets[uIdx], ...serverTicket };
          updatedTicket = { ..._localTickets[uIdx] };
        } else {
          _localTickets.unshift(serverTicket);
          updatedTicket = serverTicket;
        }
        notifyLocalListeners();
        notifyDetailListeners(upperCleanId, updatedTicket);
      }
    }
  } catch (err) {
    console.warn('[firestoreService] updateTicket backend sync warning:', err);
  }

  // 2. Sync to Firestore with merge: true (include full ticket fields so Firestore doc remains complete)
  if (db) {
    try {
      const ticketRef = doc(db, TICKETS_COLLECTION, cleanId);
      const hashTicketRef = doc(db, TICKETS_COLLECTION, `#${cleanId}`);
      const localT = _localTickets.find(
        (t) => (t.ticket_id || '').replace(/^#/, '').toUpperCase() === upperCleanId
      ) || {};
      const updates = {
        ...localT,
        ...updateData,
        status: updateData.status || localT.status || 'Open',
        updated_at: nowIso,
      };
      if (updateData.assigned_to_name !== undefined) updates.assigned_to_name = updateData.assigned_to_name;
      if (updateData.assigned_to_email !== undefined) updates.assigned_to_email = updateData.assigned_to_email;
      if (updateData.assigned_to_id !== undefined) updates.assigned_to_id = updateData.assigned_to_id;
      if (updateData.priority) updates.priority = updateData.priority;
      if (updateData.attachments) updates.attachments = updateData.attachments;

      setDoc(ticketRef, updates, { merge: true }).catch((err) => {
        console.warn('[firestoreService] Firestore setDoc error:', err);
      });
      setDoc(hashTicketRef, updates, { merge: true }).catch(() => { });

      if (updateData.notes && updateData.notes.trim()) {
        const noteItem = {
          note_text: updateData.notes.trim(),
          author_name: updateData.author_name || 'Support Agent',
          created_at: nowIso,
        };
        setDoc(ticketRef, { notes: arrayUnion(noteItem) }, { merge: true }).catch(() => { });
        const notesRef = collection(db, TICKETS_COLLECTION, cleanId, NOTES_SUBCOLLECTION);
        addDoc(notesRef, noteItem).catch(() => { });
      }
    } catch (fsErr) {
      console.warn('[firestoreService] Firestore sync error:', fsErr);
    }
  }

  return updatedTicket || { ticket_id: cleanId, status: updateData.status };
}

/**
 * Delete a single ticket permanently.
 * Instant optimistic UI removal (<1ms) + sync to Backend & Firestore.
 */
export async function deleteTicket(ticketId) {
  if (!ticketId) return false;
  const cleanId = String(ticketId).trim().replace(/^#/, '');
  const upperCleanId = cleanId.toUpperCase();

  // 0. Mark as deleted so sync/snapshot can never resurrect it
  _deletedIds.add(upperCleanId);
  persistDeletedTicketIds();

  // 1. Optimistic removal from _localTickets
  const initialCount = _localTickets.length;
  _localTickets = _localTickets.filter(
    (t) => (t.ticket_id || '').replace(/^#/, '').toUpperCase() !== upperCleanId
  );
  if (_localTickets.length !== initialCount) {
    notifyLocalListeners();
  }

  // 2. Sync to Backend REST API (DELETE /api/tickets/{ticket_id})
  try {
    const headers = await getAuthHeaders();
    await fetch(`${API_BASE_URL}/api/tickets/${encodeURIComponent(cleanId)}`, {
      method: 'DELETE',
      headers,
    });
  } catch (err) {
    console.warn('[firestoreService] Delete backend warning:', err);
  }

  // 3. Sync to Firestore (delete both with and without leading '#')
  if (db) {
    try {
      deleteDoc(doc(db, TICKETS_COLLECTION, cleanId)).catch(() => { });
      deleteDoc(doc(db, TICKETS_COLLECTION, `#${cleanId}`)).catch(() => { });
      if (ticketId && ticketId !== cleanId && ticketId !== `#${cleanId}`) {
        deleteDoc(doc(db, TICKETS_COLLECTION, ticketId)).catch(() => { });
      }
    } catch { }
  }

  return true;
}

/**
 * Bulk delete multiple tickets permanently.
 * Instant optimistic UI removal (<1ms) + sync to Backend & Firestore.
 */
export async function deleteTicketsBulk(ticketIds = []) {
  if (!ticketIds || ticketIds.length === 0) return { deleted_count: 0 };
  const cleanIds = ticketIds.map((id) => String(id).trim().replace(/^#/, ''));
  const targetUpperSet = new Set(cleanIds.map((id) => id.toUpperCase()));

  // 0. Mark all as deleted so sync/snapshot can never resurrect them
  targetUpperSet.forEach((id) => {
    _deletedIds.add(id);
    _deletedIds.add(`#${id}`);
  });
  persistDeletedTicketIds();

  // 1. Optimistic removal from _localTickets
  _localTickets = _localTickets.filter(
    (t) => !targetUpperSet.has((t.ticket_id || '').replace(/^#/, '').toUpperCase())
  );
  notifyLocalListeners();

  // 2. Sync to Backend REST API (POST /api/tickets/bulk-delete)
  try {
    const headers = await getAuthHeaders();
    await fetch(`${API_BASE_URL}/api/tickets/bulk-delete`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ticket_ids: cleanIds }),
    });
  } catch (err) {
    console.warn('[firestoreService] Bulk delete backend warning:', err);
  }

  // 3. Sync to Firestore
  if (db) {
    cleanIds.forEach((cleanId) => {
      try {
        deleteDoc(doc(db, TICKETS_COLLECTION, cleanId)).catch(() => { });
        deleteDoc(doc(db, TICKETS_COLLECTION, `#${cleanId}`)).catch(() => { });
      } catch { }
    });
  }

  return { deleted_count: cleanIds.length };
}


/**
 * Add a note to a ticket.
 * Works across ALL ticket IDs.
 */
export async function addNote(ticketId, noteText, author = 'Support Agent', authorEmail = '') {
  const nowIso = new Date().toISOString();
  const cleanId = String(ticketId).trim().replace(/^#/, '');
  const cleanText = String(noteText || '').trim();
  if (!cleanText) return null;

  // Single deterministic ID shared across optimistic client state, Backend REST API, and Firestore
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const newNoteItem = {
    id: messageId,
    note_text: cleanText,
    author_name: author,
    author_email: authorEmail || null,
    created_at: nowIso,
  };

  let serverTicket = null;

  // 1. Sync to Backend REST API with client mutation ID for idempotent deduplication
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/api/tickets/${encodeURIComponent(cleanId)}/notes`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'X-Client-Mutation-Id': messageId,
      },
      body: JSON.stringify({
        note_text: cleanText,
        author_name: author,
        author_email: authorEmail || null,
        client_mutation_id: messageId,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.ticket_id) {
        serverTicket = data;
        const idx = _localTickets.findIndex(
          (t) => (t.ticket_id || '').toUpperCase() === data.ticket_id.toUpperCase()
        );
        const dedupedNotes = dedupNotes(data.notes || [newNoteItem]);
        const updatedTicket = {
          ...(idx !== -1 ? _localTickets[idx] : {}),
          ...data,
          notes: dedupedNotes,
        };
        if (idx !== -1) {
          _localTickets[idx] = updatedTicket;
        } else {
          _localTickets.unshift(updatedTicket);
        }
      }
    }
  } catch (err) {
    console.warn('[firestoreService] addNote backend sync warning:', err);
  }

  // 2. Sync to Firestore using the exact same messageId
  if (db) {
    try {
      const ticketRef = doc(db, TICKETS_COLLECTION, cleanId);
      await updateDoc(ticketRef, {
        notes: arrayUnion(newNoteItem),
        updated_at: nowIso,
      });
    } catch (err) {
      try {
        const ticketRef = doc(db, TICKETS_COLLECTION, cleanId);
        await setDoc(
          ticketRef,
          { notes: [newNoteItem], updated_at: nowIso },
          { merge: true }
        );
      } catch { }
    }
  }

  return serverTicket || { ticket_id: cleanId, notes: [newNoteItem] };
}

/**
 * Subscribe to realtime customer accounts list.
 * Source priority:
 *   1. Firestore `customers` collection (onSnapshot)
 *   2. Backend REST API `/api/customers`
 *   3. Derived from live tickets (fallback)
 */
export function subscribeCustomers(onUpdate, onError) {
  // Helper: aggregate customers from tickets array
  function aggregateFromTickets(allTickets) {
    const customerMap = {};
    (allTickets || []).forEach((t) => {
      const cid = t.customer_id || '';
      const email = (t.customer_email || '').toLowerCase().trim();
      const key = cid || email;
      if (!key) return;
      if (!customerMap[key]) {
        customerMap[key] = {
          customer_id: cid,
          customer_name: t.customer_name || '',
          customer_email: email,
          ticket_count: 0,
          latest_ticket_id: t.ticket_id,
          latest_ticket_date: t.created_at,
          latest_subject: t.subject,
          tickets: [],
        };
      }
      customerMap[key].ticket_count += 1;
      customerMap[key].tickets.push(t);
      if (new Date(t.created_at) > new Date(customerMap[key].latest_ticket_date)) {
        customerMap[key].latest_ticket_id = t.ticket_id;
        customerMap[key].latest_ticket_date = t.created_at;
        customerMap[key].latest_subject = t.subject;
      }
    });
    const list = Object.values(customerMap);
    list.sort((a, b) => new Date(b.latest_ticket_date) - new Date(a.latest_ticket_date));
    return list;
  }

  function filterCleanCustomers(list) {
    return (list || []).filter((c) => {
      const cid = (c.customer_id || '').replace(/^#/, '').toUpperCase().trim();
      const email = (c.customer_email || '').toLowerCase().trim();
      const name = (c.customer_name || '').toLowerCase().trim();
      const subj = (c.latest_subject || '').toLowerCase().trim();
      if (_deletedCustomerIds.has(cid) || _deletedCustomerIds.has(email.toUpperCase())) return false;
      if (DUMMY_CUSTOMER_IDS.has(cid)) return false;
      if (DUMMY_CUSTOMER_EMAILS.has(email)) return false;
      if (DUMMY_CUSTOMER_SUBJECTS.has(subj)) return false;
      if (name.includes('browsertest') || subj.includes('browser test') || subj.includes('testing extra fields')) return false;
      return true;
    });
  }

  let latestCustomers = [];
  let unsubTickets = () => { };
  let unsubFirestore = () => { };

  // 1. Try Firestore customers collection
  if (db) {
    try {
      const colRef = collection(db, CUSTOMERS_COLLECTION);
      unsubFirestore = onSnapshot(
        colRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const customers = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data();
              customers.push({
                customer_id: data.customer_id || docSnap.id,
                customer_name: data.customer_name || '',
                customer_email: data.customer_email || '',
                ticket_count: data.ticket_count || 0,
                latest_ticket_id: data.latest_ticket_id || null,
                latest_ticket_date: data.latest_ticket_date || null,
                latest_subject: data.latest_subject || '',
                tickets: data.tickets || [],
              });
            });
            const cleaned = filterCleanCustomers(customers);
            cleaned.sort((a, b) => new Date(b.latest_ticket_date || 0) - new Date(a.latest_ticket_date || 0));
            latestCustomers = cleaned;
            onUpdate(cleaned);
          }
        },
        () => { } // Firestore collection may not exist yet — silent fail
      );
    } catch { }
  }

  // 2. Fetch from backend REST API
  getAuthHeaders().then((headers) => {
    fetch(`${API_BASE_URL}/api/customers`, {
      headers: { Authorization: headers.Authorization, Accept: 'application/json' },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((serverCustomers) => {
        if (Array.isArray(serverCustomers) && serverCustomers.length > 0) {
          // Merge with any Firestore data (backend is more complete for ticket counts)
          const map = new Map();
          latestCustomers.forEach((c) => map.set(c.customer_id || c.customer_email, c));
          serverCustomers.forEach((c) => {
            const k = c.customer_id || c.customer_email;
            map.set(k, { ...map.get(k), ...c });
          });
          const merged = filterCleanCustomers(Array.from(map.values()));
          merged.sort((a, b) => new Date(b.latest_ticket_date || 0) - new Date(a.latest_ticket_date || 0));
          latestCustomers = merged;
          onUpdate(merged);
        }
      })
      .catch(() => { });
  });

  // 3. Subscribe to tickets as real-time fallback (ensures live updates)
  unsubTickets = subscribeTickets(
    {},
    (allTickets) => {
      // Always re-derive from live tickets to keep customers in sync with actual ticket data.
      // This ensures that when all tickets for a customer are deleted, the customer disappears.
      const derived = filterCleanCustomers(aggregateFromTickets(allTickets));

      if (latestCustomers.length === 0 || derived.length === 0) {
        // Pure ticket-derived data
        latestCustomers = derived;
        onUpdate(derived);
      } else {
        // Merge: keep extra metadata from backend/Firestore but use ticket-derived counts
        const derivedMap = new Map();
        derived.forEach((c) => derivedMap.set(c.customer_id || c.customer_email, c));

        // Only keep customers that still have live tickets
        const merged = [];
        derivedMap.forEach((ticketDerived, key) => {
          // Find matching backend customer for richer metadata
          const existing = latestCustomers.find(
            (c) => (c.customer_id || c.customer_email) === key
          );
          merged.push({
            ...(existing || {}),
            ...ticketDerived,
          });
        });

        const cleaned = filterCleanCustomers(merged);
        cleaned.sort((a, b) => new Date(b.latest_ticket_date || 0) - new Date(a.latest_ticket_date || 0));
        latestCustomers = cleaned;
        onUpdate(cleaned);
      }
    },
    onError
  );

  return () => {
    unsubFirestore();
    unsubTickets();
  };
}

/**
 * Fetch a customer by customer_id (e.g. CUST-001, cust-001, 1, or email).
 */
export function getCustomerById(customerId) {
  if (!customerId) return null;
  const cleanId = String(customerId).trim().replace(/^#/, '').toUpperCase();
  const all = _localTickets;
  const match = all.filter((t) => {
    const cid = (t.customer_id || '').toUpperCase();
    if (cid === cleanId) return true;
    const digits = cleanId.match(/\d+/);
    if (digits) {
      const num = parseInt(digits[0], 10);
      if (cid === `CUST-${String(num).padStart(3, '0')}`) return true;
    }
    if ((t.customer_email || '').toLowerCase() === customerId.toLowerCase()) return true;
    return false;
  });

  if (match.length === 0) return null;
  const first = match[0];
  return {
    customer_id: first.customer_id || 'CUST-001',
    customer_name: first.customer_name,
    customer_email: first.customer_email,
    ticket_count: match.length,
    latest_ticket_id: first.ticket_id,
    latest_ticket_date: first.created_at,
    latest_subject: first.subject,
    tickets: match,
  };
}

/**
 * Team Chat Real-time Messaging
 */
const TEAM_MESSAGES_STORAGE_KEY = 'strawcrm_team_messages';

let _localTeamMessages = (() => {
  try {
    const raw = localStorage.getItem(TEAM_MESSAGES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { }
  return [];
})();

const _teamMessageListeners = new Set();

function notifyTeamMessageListeners() {
  try {
    localStorage.setItem(TEAM_MESSAGES_STORAGE_KEY, JSON.stringify(_localTeamMessages));
  } catch { }
  _teamMessageListeners.forEach((cb) => {
    try {
      cb([..._localTeamMessages]);
    } catch { }
  });
}

export function subscribeTeamMessages(onUpdate, onError) {
  _teamMessageListeners.add(onUpdate);
  onUpdate([..._localTeamMessages]);

  let unsubFs = () => { };
  if (db) {
    try {
      const q = collection(db, 'team_messages');
      unsubFs = onSnapshot(
        q,
        (snap) => {
          const remote = [];
          snap.forEach((d) => remote.push({ id: d.id, ...d.data() }));
          if (remote.length > 0) {
            const map = new Map();
            _localTeamMessages.forEach((m) => map.set(m.id, m));
            remote.forEach((m) => map.set(m.id, m));
            _localTeamMessages = Array.from(map.values()).sort(
              (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)
            );
            notifyTeamMessageListeners();
          }
        },
        (err) => {
          console.debug('[firestoreService] Team messages listener notice:', err);
          if (onError) onError(err);
        }
      );
    } catch { }
  }

  return () => {
    _teamMessageListeners.delete(onUpdate);
    unsubFs();
  };
}

export async function sendTeamMessage({ text, authorName, authorEmail, mentions = [] }) {
  const newId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const newMsg = {
    id: newId,
    text: text.trim(),
    author_name: authorName || 'Support Staff',
    author_email: authorEmail || '',
    created_at: new Date().toISOString(),
    mentions: mentions,
  };

  _localTeamMessages.push(newMsg);
  notifyTeamMessageListeners();

  // If mentions any ticket (e.g. TKT-001), also post note to that ticket!
  if (mentions && mentions.length > 0) {
    mentions.forEach((tId) => {
      const cleanId = String(tId).replace(/^#/, '').toUpperCase();
      addNote(cleanId, `[Team Chat Mention] ${text.trim()}`, authorName, authorEmail).catch(() => { });
    });
  }

  if (db) {
    try {
      const docRef = doc(db, 'team_messages', newId);
      setDoc(docRef, newMsg).catch(() => { });
    } catch { }
  }

  return newMsg;
}


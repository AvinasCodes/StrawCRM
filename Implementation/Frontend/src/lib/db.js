/**
 * StrawCRM IndexedDB Layer
 *
 * Provides durable client-side persistence for tickets, ticket details, notes,
 * and a sync queue for offline mutations.
 *
 * FastAPI backend & Firestore are the authoritative sources of truth.
 * IndexedDB is a local cache layer that makes the app feel instant and resilient.
 *
 * Database: "strawcrm-db", version 1
 * Stores:
 *   - tickets        : list-view ticket summaries (ticket_id as keyPath)
 *   - ticketDetails  : full ticket objects with notes (ticket_id as keyPath)
 *   - syncQueue      : pending offline mutations (mutationId as keyPath)
 */

import { openDB } from 'idb';

const DB_NAME = 'strawcrm-db';
const DB_VERSION = 1;

let _db = null;

/**
 * Opens (or returns cached) the IndexedDB connection.
 * Idempotent — safe to call many times.
 */
async function getDB() {
  if (_db) return _db;

  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Ticket list summaries
      if (!db.objectStoreNames.contains('tickets')) {
        const ticketStore = db.createObjectStore('tickets', { keyPath: 'ticket_id' });
        ticketStore.createIndex('status', 'status');
        ticketStore.createIndex('created_at', 'created_at');
      }

      // Full ticket detail objects (includes notes array)
      if (!db.objectStoreNames.contains('ticketDetails')) {
        db.createObjectStore('ticketDetails', { keyPath: 'ticket_id' });
      }

      // Sync queue for offline mutations
      if (!db.objectStoreNames.contains('syncQueue')) {
        const syncStore = db.createObjectStore('syncQueue', { keyPath: 'mutationId' });
        syncStore.createIndex('status', 'status');
        syncStore.createIndex('createdAt', 'createdAt');
      }
    },

    blocked() {
      console.warn('[StrawCRM DB] IndexedDB upgrade blocked by an older tab. Please close other tabs.');
    },

    blocking() {
      // A newer version wants to open — close our connection gracefully
      _db?.close();
      _db = null;
    },

    terminated() {
      _db = null;
    },
  });

  return _db;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ticket List Store
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Persist ticket list summaries to IndexedDB.
 * @param {Array} tickets - Array of ticket list-view objects
 */
export async function putTickets(tickets) {
  if (!Array.isArray(tickets) || tickets.length === 0) return;
  try {
    const db = await getDB();
    const tx = db.transaction('tickets', 'readwrite');
    await Promise.all(tickets.map((t) => tx.store.put(t)));
    await tx.done;
  } catch (err) {
    console.warn('[StrawCRM DB] putTickets failed:', err);
  }
}

/**
 * Get all cached ticket list summaries.
 * @returns {Promise<Array>}
 */
export async function getAllTickets() {
  try {
    const db = await getDB();
    const tickets = await db.getAll('tickets');
    // Sort by created_at descending (newest first) to match server order
    return tickets.sort((a, b) => {
      const dateA = new Date(a.created_at || 0);
      const dateB = new Date(b.created_at || 0);
      return dateB - dateA;
    });
  } catch (err) {
    console.warn('[StrawCRM DB] getAllTickets failed:', err);
    return [];
  }
}

/**
 * Add or update a single ticket in the list store.
 * @param {Object} ticket - Ticket list-view object
 */
export async function putTicket(ticket) {
  if (!ticket?.ticket_id) return;
  try {
    const db = await getDB();
    await db.put('tickets', ticket);
  } catch (err) {
    console.warn('[StrawCRM DB] putTicket failed:', err);
  }
}

/**
 * Remove a ticket from the list store (e.g. on rollback of optimistic create).
 * @param {string} ticketId
 */
export async function deleteTicket(ticketId) {
  try {
    const db = await getDB();
    await db.delete('tickets', ticketId);
  } catch (err) {
    console.warn('[StrawCRM DB] deleteTicket failed:', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Ticket Detail Store
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Persist full ticket detail (including notes) to IndexedDB.
 * @param {Object} ticket - Full ticket object with notes array
 */
export async function putTicketDetail(ticket) {
  if (!ticket?.ticket_id) return;
  try {
    const db = await getDB();
    await db.put('ticketDetails', ticket);
  } catch (err) {
    console.warn('[StrawCRM DB] putTicketDetail failed:', err);
  }
}

/**
 * Get a cached full ticket detail from IndexedDB.
 * @param {string} ticketId
 * @returns {Promise<Object|null>}
 */
export async function getTicketDetail(ticketId) {
  try {
    const db = await getDB();
    return (await db.get('ticketDetails', ticketId)) || null;
  } catch (err) {
    console.warn('[StrawCRM DB] getTicketDetail failed:', err);
    return null;
  }
}

/**
 * Delete a ticket detail from the cache.
 * @param {string} ticketId
 */
export async function deleteTicketDetail(ticketId) {
  try {
    const db = await getDB();
    await db.delete('ticketDetails', ticketId);
  } catch (err) {
    console.warn('[StrawCRM DB] deleteTicketDetail failed:', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sync Queue Store
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sync operation status values
 */
export const SYNC_STATUS = {
  PENDING: 'pending',
  IN_FLIGHT: 'in_flight',
  SYNCED: 'synced',
  FAILED: 'failed',
};

/**
 * Sync operation types
 */
export const SYNC_TYPE = {
  CREATE_TICKET: 'CREATE_TICKET',
  UPDATE_TICKET: 'UPDATE_TICKET',
  ADD_NOTE: 'ADD_NOTE',
};

/**
 * Enqueue a mutation to the sync queue.
 * The mutationId is a client-generated UUID used for idempotency.
 *
 * @param {Object} operation
 * @param {string} operation.mutationId - UUID for idempotency
 * @param {string} operation.type - SYNC_TYPE value
 * @param {Object} operation.payload - The data to send to the server
 * @param {string} [operation.tempId] - Temporary client-side ID (for creates)
 */
export async function enqueueSync(operation) {
  try {
    const db = await getDB();
    await db.put('syncQueue', {
      ...operation,
      status: SYNC_STATUS.PENDING,
      retryCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[StrawCRM DB] enqueueSync failed:', err);
  }
}

/**
 * Get all pending/failed sync operations ordered by creation time.
 * @returns {Promise<Array>}
 */
export async function getPendingSyncOperations() {
  try {
    const db = await getDB();
    const all = await db.getAll('syncQueue');
    return all
      .filter((op) => op.status === SYNC_STATUS.PENDING || op.status === SYNC_STATUS.FAILED)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  } catch (err) {
    console.warn('[StrawCRM DB] getPendingSyncOperations failed:', err);
    return [];
  }
}

/**
 * Get ALL sync operations (for sync status display).
 * @returns {Promise<Array>}
 */
export async function getAllSyncOperations() {
  try {
    const db = await getDB();
    return await db.getAll('syncQueue');
  } catch (err) {
    return [];
  }
}

/**
 * Update the status of a sync operation.
 * @param {string} mutationId
 * @param {string} status - SYNC_STATUS value
 * @param {Object} [extra] - Additional fields to merge
 */
export async function updateSyncOperation(mutationId, status, extra = {}) {
  try {
    const db = await getDB();
    const existing = await db.get('syncQueue', mutationId);
    if (existing) {
      await db.put('syncQueue', {
        ...existing,
        ...extra,
        status,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn('[StrawCRM DB] updateSyncOperation failed:', err);
  }
}

/**
 * Remove a completed sync operation from the queue.
 * @param {string} mutationId
 */
export async function removeSyncOperation(mutationId) {
  try {
    const db = await getDB();
    await db.delete('syncQueue', mutationId);
  } catch (err) {
    console.warn('[StrawCRM DB] removeSyncOperation failed:', err);
  }
}

/**
 * Count how many mutations are pending/failed (for UI indicators).
 * @returns {Promise<number>}
 */
export async function getPendingSyncCount() {
  try {
    const db = await getDB();
    const all = await db.getAll('syncQueue');
    return all.filter(
      (op) => op.status === SYNC_STATUS.PENDING || op.status === SYNC_STATUS.IN_FLIGHT
    ).length;
  } catch (err) {
    return 0;
  }
}

/**
 * Check if any sync operations failed.
 * @returns {Promise<boolean>}
 */
export async function hasSyncErrors() {
  try {
    const db = await getDB();
    const all = await db.getAll('syncQueue');
    return all.some((op) => op.status === SYNC_STATUS.FAILED);
  } catch (err) {
    return false;
  }
}

/**
 * Generate a UUID for client mutation IDs.
 * Uses crypto.randomUUID() when available, falls back to a polyfill.
 * @returns {string}
 */
export function generateMutationId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback UUID v4 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

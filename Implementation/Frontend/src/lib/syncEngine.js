/**
 * StrawCRM Sync Engine
 *
 * Processes the offline sync queue in order.
 * Called on app startup and whenever the browser comes back online.
 *
 * Lifecycle per operation:
 *   PENDING → IN_FLIGHT → SYNCED (removed from queue)
 *              ↓ on error
 *           FAILED (retried up to MAX_RETRIES times, then stays FAILED)
 *
 * Key design decisions:
 * - Uses X-Client-Mutation-Id header so the server can detect duplicate submissions
 * - Replaces temp client IDs with authoritative server IDs in IndexedDB
 * - Never silently drops data
 * - Emits events that the SyncStatusBar subscribes to
 */

import {
  getPendingSyncOperations,
  updateSyncOperation,
  removeSyncOperation,
  putTicket,
  putTicketDetail,
  deleteTicket,
  deleteTicketDetail,
  SYNC_STATUS,
  SYNC_TYPE,
} from './db';
import { getAuthToken } from '../services/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const MAX_RETRIES = 3;

// ─────────────────────────────────────────────────────────────────────────────
// Event emitter for sync state changes
// SyncStatusBar subscribes to these to update its UI
// ─────────────────────────────────────────────────────────────────────────────
const syncListeners = new Set();

export function onSyncStateChange(callback) {
  syncListeners.add(callback);
  return () => syncListeners.delete(callback);
}

function emitSyncState(state) {
  syncListeners.forEach((cb) => {
    try {
      cb(state);
    } catch (_) {}
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// In-flight deduplication guard
// Prevents the same mutation being sent twice if sync is triggered concurrently
// ─────────────────────────────────────────────────────────────────────────────
const _inFlight = new Set();

// ─────────────────────────────────────────────────────────────────────────────
// HTTP helper for sync operations
// ─────────────────────────────────────────────────────────────────────────────
async function syncRequest(method, path, body, mutationId, timeoutMs = 10000) {
  const token = await getAuthToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'X-Client-Mutation-Id': mutationId,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const errBody = await response.json();
        detail = errBody.detail || detail;
      } catch (_) {}
      throw new Error(detail);
    }

    return await response.json();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Process a single sync operation
// ─────────────────────────────────────────────────────────────────────────────
async function processOperation(operation) {
  const { mutationId, type, payload, tempId, retryCount = 0 } = operation;

  if (_inFlight.has(mutationId)) return; // Already being processed
  _inFlight.add(mutationId);

  await updateSyncOperation(mutationId, SYNC_STATUS.IN_FLIGHT);
  emitSyncState({ type: 'syncing', mutationId });

  try {
    let serverResponse = null;

    switch (type) {
      case SYNC_TYPE.CREATE_TICKET: {
        serverResponse = await syncRequest('POST', '/api/tickets', payload, mutationId);

        // Server returned authoritative ticket_id — replace temp ID in IndexedDB
        if (serverResponse?.ticket_id && tempId && serverResponse.ticket_id !== tempId) {
          // Delete the temp entry and insert the server-reconciled one
          await deleteTicket(tempId);
          await deleteTicketDetail(tempId);

          const reconciled = {
            ticket_id: serverResponse.ticket_id,
            customer_name: payload.customer_name,
            customer_email: payload.customer_email,
            subject: payload.subject,
            description: payload.description,
            status: 'Open',
            created_at: serverResponse.created_at || new Date().toISOString(),
            updated_at: serverResponse.created_at || new Date().toISOString(),
            notes: [],
            _synced: true,
          };

          await putTicket(reconciled);
          await putTicketDetail(reconciled);

          // Notify the app to reconcile this temp-to-real ID replacement
          emitSyncState({
            type: 'ticket_id_reconciled',
            tempId,
            serverId: serverResponse.ticket_id,
            serverResponse: reconciled,
          });
        }
        break;
      }

      case SYNC_TYPE.UPDATE_TICKET: {
        serverResponse = await syncRequest(
          'PUT',
          `/api/tickets/${encodeURIComponent(payload.ticket_id)}`,
          { status: payload.status },
          mutationId
        );

        if (serverResponse) {
          // Update the detail cache with reconciled server state (excludes notes from this op)
          await putTicket({
            ticket_id: serverResponse.ticket_id,
            customer_name: serverResponse.customer_name,
            subject: serverResponse.subject,
            status: serverResponse.status,
            created_at: serverResponse.created_at,
            _synced: true,
          });
          await putTicketDetail({ ...serverResponse, _synced: true });
        }
        break;
      }

      case SYNC_TYPE.ADD_NOTE: {
        serverResponse = await syncRequest(
          'POST',
          `/api/tickets/${encodeURIComponent(payload.ticket_id)}/notes`,
          { note_text: payload.note_text },
          mutationId
        );

        if (serverResponse) {
          // Update cached ticket detail with server-confirmed note
          await putTicketDetail({ ...serverResponse, _synced: true });
        }
        break;
      }

      default:
        console.warn('[SyncEngine] Unknown operation type:', type);
    }

    // Mark as synced and remove from queue
    await removeSyncOperation(mutationId);
    emitSyncState({ type: 'synced', mutationId, serverResponse });
  } catch (err) {
    const isNetworkError = err.name === 'AbortError' || err.message?.includes('fetch');
    const newRetryCount = (retryCount || 0) + 1;

    if (isNetworkError || newRetryCount < MAX_RETRIES) {
      // Will retry on next sync cycle
      await updateSyncOperation(mutationId, SYNC_STATUS.PENDING, {
        retryCount: newRetryCount,
        lastError: err.message,
      });
      emitSyncState({ type: 'retry_scheduled', mutationId, retryCount: newRetryCount });
    } else {
      // Exceeded retries — mark as permanently failed but keep data
      await updateSyncOperation(mutationId, SYNC_STATUS.FAILED, {
        retryCount: newRetryCount,
        lastError: err.message,
      });
      emitSyncState({ type: 'sync_failed', mutationId, error: err.message });
      console.error('[SyncEngine] Mutation permanently failed:', mutationId, err.message);
    }
  } finally {
    _inFlight.delete(mutationId);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main sync loop — drain the queue sequentially
// ─────────────────────────────────────────────────────────────────────────────
let _syncRunning = false;

/**
 * Drain the sync queue.
 * Safe to call multiple times — only one run at a time.
 */
export async function drainSyncQueue() {
  if (_syncRunning) return;
  if (!navigator.onLine) {
    emitSyncState({ type: 'offline' });
    return;
  }

  _syncRunning = true;
  emitSyncState({ type: 'syncing_start' });

  try {
    const pending = await getPendingSyncOperations();

    if (pending.length === 0) {
      emitSyncState({ type: 'all_synced' });
      return;
    }

    // Process sequentially to maintain order (important for create-then-update)
    for (const operation of pending) {
      if (!navigator.onLine) {
        emitSyncState({ type: 'offline' });
        break;
      }
      await processOperation(operation);
    }

    // Check if anything is still pending after processing
    const remaining = await getPendingSyncOperations();
    if (remaining.length === 0) {
      emitSyncState({ type: 'all_synced' });
    }
  } catch (err) {
    console.error('[SyncEngine] Sync cycle error:', err);
    emitSyncState({ type: 'sync_error', error: err.message });
  } finally {
    _syncRunning = false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// App initialization
// ─────────────────────────────────────────────────────────────────────────────

let _initialized = false;

/**
 * Initialize the sync engine.
 * Call once on app startup (in App.jsx useEffect).
 */
export function initSyncEngine() {
  if (_initialized) return;
  _initialized = true;

  // Drain queue on startup (handles mutations from previous session)
  drainSyncQueue();

  // Re-sync when network comes back online
  window.addEventListener('online', () => {
    emitSyncState({ type: 'online' });
    // Small delay to let network stabilize
    setTimeout(() => drainSyncQueue(), 1000);
  });

  window.addEventListener('offline', () => {
    emitSyncState({ type: 'offline' });
  });

  // Periodic sync every 30s as a safety net
  setInterval(() => {
    if (navigator.onLine) {
      drainSyncQueue();
    }
  }, 30000);
}

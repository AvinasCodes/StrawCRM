/**
 * useCreateTicket — Realtime Firestore mutation hook for creating tickets.
 *
 * Module-level lock (_inflight) ensures only one ticket creation runs at a time,
 * even across double-clicks, React StrictMode double-invokes, or rapid re-renders.
 */

import { useState, useRef } from 'react';
import { createTicket } from '../services/firestoreService';

// Module-level in-flight guard: prevents concurrent duplicate ticket submissions
let _inflight = false;

export function useCreateTicket() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(null);
  const pendingRef = useRef(false);

  const mutateAsync = async ({ ticketData }) => {
    // Double-click / concurrent call guard
    if (_inflight || pendingRef.current) {
      throw new Error('A ticket is already being created. Please wait.');
    }
    _inflight = true;
    pendingRef.current = true;
    setIsPending(true);
    setError(null);
    try {
      const result = await createTicket(ticketData);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      _inflight = false;
      pendingRef.current = false;
      setIsPending(false);
    }
  };

  return {
    mutateAsync,
    mutate: (vars, options) => {
      mutateAsync(vars)
        .then((res) => options?.onSuccess?.(res))
        .catch((err) => options?.onError?.(err));
    },
    isPending,
    isError: Boolean(error),
    error,
    reset: () => {
      setError(null);
      _inflight = false;
    },
  };
}

export function generateTempTicketId() {
  return 'TKT-' + Math.random().toString(36).substring(2, 6).toUpperCase();
}

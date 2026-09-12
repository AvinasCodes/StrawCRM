/**
 * useTicketDetail — Realtime Firestore subscription hook for full ticket detail (with live notes).
 */

import { useState, useEffect } from 'react';
import { subscribeTicketDetail } from '../services/firestoreService';

export function ticketDetailQueryKey(ticketId) {
  return ['ticket', ticketId];
}

/**
 * @param {string|null} ticketId
 * @returns {{ ticket, loading, error, refetch }}
 */
export function useTicketDetail(ticketId) {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(Boolean(ticketId));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!ticketId) {
      setTicket(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeTicketDetail(
      ticketId,
      (liveDetail) => {
        setTicket(liveDetail);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.warn('[useTicketDetail] Realtime subscription notice:', err);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [ticketId]);

  return {
    ticket,
    loading: loading && !ticket,
    error,
    refetch: () => {},
  };
}

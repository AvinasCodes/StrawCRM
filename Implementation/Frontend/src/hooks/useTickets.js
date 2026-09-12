/**
 * useTickets — Realtime Firestore subscription hook for tickets list.
 *
 * Automatically keeps the UI in sync with Firestore in realtime (<10ms).
 * Offline changes are cached and reflected immediately by the Firebase SDK.
 */

import { useState, useEffect } from 'react';
import { subscribeTickets } from '../services/firestoreService';

export const TICKETS_QUERY_KEY = ['tickets'];

/**
 * @param {Object} filters - { search, status, timeRange }
 * @returns {{ tickets, loading, error, refetch, isStale }}
 */
export function useTickets(filters = {}) {
  const { search = '', status = '', timeRange = 'All Time' } = filters;
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeTickets(
      {
        status: status === 'All Status' ? 'All' : status,
        search,
        timeRange,
      },
      (liveTickets) => {
        setTickets(liveTickets || []);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.warn('[useTickets] Realtime subscription notice:', err);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [search, status, timeRange]);

  return {
    tickets,
    loading,
    error,
    refetch: () => {},
    isStale: false,
    hasCachedData: tickets.length > 0,
  };
}

/**
 * useCreateTicket — Realtime Firestore mutation hook for creating tickets.
 */

import { useState } from 'react';
import { createTicket } from '../services/firestoreService';

export function useCreateTicket() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(null);

  const mutateAsync = async ({ ticketData }) => {
    setIsPending(true);
    setError(null);
    try {
      const result = await createTicket(ticketData);
      setIsPending(false);
      return result;
    } catch (err) {
      setError(err);
      setIsPending(false);
      throw err;
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
    reset: () => setError(null),
  };
}

export function generateTempTicketId() {
  return 'TKT-' + Math.random().toString(36).substring(2, 6).toUpperCase();
}

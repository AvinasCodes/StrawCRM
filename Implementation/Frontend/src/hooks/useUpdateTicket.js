/**
 * useUpdateTicket & useAddNote — Realtime Firestore mutations.
 */

import { useState } from 'react';
import { updateTicket as fsUpdateTicket, addNote as fsAddNote } from '../services/firestoreService';

export function useUpdateTicket() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(null);

  const mutateAsync = async ({ ticketId, ...updateFields }) => {
    setIsPending(true);
    setError(null);
    try {
      const result = await fsUpdateTicket(ticketId, updateFields);
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
    error,
  };
}

export function useAddNote() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(null);

  const mutateAsync = async ({ ticketId, noteText, authorName, authorEmail }) => {
    setIsPending(true);
    setError(null);
    try {
      const result = await fsAddNote(ticketId, noteText, authorName, authorEmail);
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
    error,
  };
}

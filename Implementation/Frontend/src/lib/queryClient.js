/**
 * StrawCRM TanStack Query Client Configuration
 *
 * - staleTime: 30s — data is fresh for 30s, avoid redundant refetches
 * - gcTime: 10min — keep inactive queries in memory for 10 minutes
 * - retry: 1 attempt on non-4xx errors
 * - refetchOnWindowFocus: true — sync state when user returns to tab
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,        // 30 seconds
      gcTime: 10 * 60 * 1000,      // 10 minutes
      retry: (failureCount, error) => {
        // Do not retry 4xx client errors
        if (error?.status >= 400 && error?.status < 500) return false;
        return failureCount < 1;
      },
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false, // Mutations are retried by the sync engine, not TanStack Query
    },
  },
});

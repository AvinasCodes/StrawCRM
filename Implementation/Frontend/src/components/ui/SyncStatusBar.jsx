/**
 * SyncStatusBar — Subtle, non-intrusive sync state indicator.
 *
 * Shows in the bottom-right corner of the screen.
 * Transitions between states smoothly without interrupting the user.
 *
 * States:
 * - "All changes synced ✓" (green, fades out after 3s)
 * - "Syncing..." (blue, pulsing dot)
 * - "Offline — changes will sync automatically" (amber, persistent)
 * - "Sync failed — retrying" (red, persistent with retry count)
 *
 * Design: subtle, small text — never blocks UI or demands attention.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { onSyncStateChange } from '../../lib/syncEngine';
import { getPendingSyncCount, hasSyncErrors } from '../../lib/db';

const SYNC_STATE = {
  IDLE: 'idle',        // Fully synced — show briefly then hide
  SYNCING: 'syncing',
  OFFLINE: 'offline',
  FAILED: 'failed',
  ONLINE: 'online',    // Transitional: "Back online, syncing..."
};

export default function SyncStatusBar() {
  const [syncState, setSyncState] = useState(SYNC_STATE.IDLE);
  const [pendingCount, setPendingCount] = useState(0);
  const [visible, setVisible] = useState(false);
  const hideTimerRef = React.useRef(null);

  const checkPending = useCallback(async () => {
    const count = await getPendingSyncCount();
    const hasFailed = await hasSyncErrors();
    setPendingCount(count);

    if (!navigator.onLine) {
      setSyncState(SYNC_STATE.OFFLINE);
      setVisible(true);
    } else if (hasFailed) {
      setSyncState(SYNC_STATE.FAILED);
      setVisible(true);
    } else if (count > 0) {
      setSyncState(SYNC_STATE.SYNCING);
      setVisible(true);
    }
  }, []);

  useEffect(() => {
    // Initialize
    checkPending();

    // Subscribe to sync engine events
    const unsubscribe = onSyncStateChange((event) => {
      clearTimeout(hideTimerRef.current);

      switch (event.type) {
        case 'offline':
          setSyncState(SYNC_STATE.OFFLINE);
          setVisible(true);
          break;

        case 'online':
          setSyncState(SYNC_STATE.ONLINE);
          setVisible(true);
          break;

        case 'syncing':
        case 'syncing_start':
          setSyncState(SYNC_STATE.SYNCING);
          setVisible(true);
          checkPending();
          break;

        case 'synced':
        case 'all_synced':
          setSyncState(SYNC_STATE.IDLE);
          setPendingCount(0);
          setVisible(true);
          // Auto-hide after 3 seconds when fully synced
          hideTimerRef.current = setTimeout(() => setVisible(false), 3000);
          break;

        case 'sync_failed':
          setSyncState(SYNC_STATE.FAILED);
          setVisible(true);
          break;

        case 'retry_scheduled':
          setSyncState(SYNC_STATE.SYNCING);
          setVisible(true);
          break;

        default:
          break;
      }
    });

    // Listen to browser online/offline events
    const handleOnline = () => {
      setSyncState(SYNC_STATE.ONLINE);
      setVisible(true);
    };
    const handleOffline = () => {
      setSyncState(SYNC_STATE.OFFLINE);
      setVisible(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearTimeout(hideTimerRef.current);
    };
  }, [checkPending]);

  if (!visible) return null;

  const config = {
    [SYNC_STATE.IDLE]: {
      bg: 'bg-emerald-50 border-emerald-200',
      dot: 'bg-emerald-500',
      text: 'text-emerald-700',
      pulse: false,
      label: 'All changes synced',
      icon: '✓',
    },
    [SYNC_STATE.SYNCING]: {
      bg: 'bg-blue-50 border-blue-200',
      dot: 'bg-blue-500',
      text: 'text-blue-700',
      pulse: true,
      label: pendingCount > 0 ? `Syncing ${pendingCount} change${pendingCount !== 1 ? 's' : ''}...` : 'Syncing...',
      icon: null,
    },
    [SYNC_STATE.ONLINE]: {
      bg: 'bg-blue-50 border-blue-200',
      dot: 'bg-blue-500',
      text: 'text-blue-700',
      pulse: true,
      label: 'Back online — syncing changes...',
      icon: null,
    },
    [SYNC_STATE.OFFLINE]: {
      bg: 'bg-amber-50 border-amber-200',
      dot: 'bg-amber-500',
      text: 'text-amber-700',
      pulse: false,
      label: 'Offline — changes will sync automatically',
      icon: null,
    },
    [SYNC_STATE.FAILED]: {
      bg: 'bg-rose-50 border-rose-200',
      dot: 'bg-rose-500',
      text: 'text-rose-700',
      pulse: false,
      label: 'Sync failed — will retry automatically',
      icon: null,
    },
  };

  const c = config[syncState] || config[SYNC_STATE.IDLE];

  return (
    <div
      className={`
        fixed bottom-4 right-4 z-50
        flex items-center gap-2
        px-3 py-2 rounded-full
        border text-[11px] font-medium
        shadow-sm backdrop-blur-sm
        transition-all duration-300 ease-in-out
        animate-in slide-in-from-bottom-2
        ${c.bg} ${c.text}
      `}
      role="status"
      aria-live="polite"
      aria-label={c.label}
    >
      {/* Status dot */}
      <span
        className={`
          w-2 h-2 rounded-full shrink-0
          ${c.dot}
          ${c.pulse ? 'animate-pulse' : ''}
        `}
      />

      {/* Label */}
      <span>{c.label}</span>

      {/* Checkmark icon for synced state */}
      {c.icon && (
        <span className="font-bold">{c.icon}</span>
      )}
    </div>
  );
}

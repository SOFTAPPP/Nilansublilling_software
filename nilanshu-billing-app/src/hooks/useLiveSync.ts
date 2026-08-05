import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';

const POLL_INTERVAL_MS = 15000; // 15 seconds

/**
 * useLiveSync — Keeps the app data in sync with the database in real-time.
 * 
 * Polls the PostgreSQL database every 5 seconds for changes to:
 * products, parties, transporters, bills, and settings.
 * 
 * Pauses when the browser tab / window is hidden (minimized).
 * Resumes instantly when focus returns.
 */
export const useLiveSync = () => {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSyncingRef = useRef(false);

  const syncAll = useCallback(async () => {
    // Prevent overlapping syncs
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;

    try {
      const { fetchProducts, fetchParties, fetchTransporters, fetchBills, fetchSettings } = useStore.getState();
      
      // Run fetches sequentially to prevent exhausting the remote database connection pool
      await fetchProducts();
      await fetchParties();
      await fetchTransporters();
      await fetchBills();
      await fetchSettings();
    } catch (err) {
      console.error('[LiveSync] Sync failed:', err);
    } finally {
      isSyncingRef.current = false;
    }
  }, []);

  const startPolling = useCallback(() => {
    if (intervalRef.current) return; // Already running
    intervalRef.current = setInterval(syncAll, POLL_INTERVAL_MS);
  }, [syncAll]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Start polling immediately
    startPolling();

    // Handle visibility changes (pause when minimized/hidden)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        // Sync immediately on focus, then resume polling
        syncAll();
        startPolling();
      }
    };

    // Also sync immediately when the window regains focus
    const handleFocus = () => {
      syncAll();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [startPolling, stopPolling, syncAll]);

  // Return the manual sync function so it can be called from a Refresh button
  return { syncAll };
};

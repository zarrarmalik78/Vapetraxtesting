import { useState, useEffect, useCallback, useRef } from 'react';
import { onSnapshotsInSync } from 'firebase/firestore';
import { db } from '../firebase';

export type ConnectivityStatus = 'online' | 'offline' | 'syncing';

export function useConnectivity() {
  const [browserOnline, setBrowserOnline] = useState(navigator.onLine);
  const [hasPendingWrites, setHasPendingWrites] = useState(false);
  const pendingCountRef = useRef(0);

  useEffect(() => {
    const handleOnline = () => setBrowserOnline(true);
    const handleOffline = () => setBrowserOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Track Firestore sync status
  useEffect(() => {
    const unsubscribe = onSnapshotsInSync(db, () => {
      // When all snapshots are in sync, no pending writes remain
      setHasPendingWrites(false);
    });
    return unsubscribe;
  }, []);

  const reportPendingWrite = useCallback((pending: boolean) => {
    pendingCountRef.current += pending ? 1 : -1;
    if (pendingCountRef.current < 0) pendingCountRef.current = 0;
    setHasPendingWrites(pendingCountRef.current > 0);
  }, []);

  let status: ConnectivityStatus;
  if (!browserOnline) {
    status = 'offline';
  } else if (hasPendingWrites) {
    status = 'syncing';
  } else {
    status = 'online';
  }

  return { status, reportPendingWrite };
}

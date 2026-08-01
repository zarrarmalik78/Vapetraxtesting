import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, getDocs, getDoc, doc, query, QueryConstraint, DocumentData } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * One-time Firestore fetch hook.
 *
 * Unlike useFirestore (which uses onSnapshot and keeps a permanent live listener),
 * this hook uses getDocs to fetch data exactly once when the component mounts.
 * It does NOT receive automatic updates from Firestore — call refetch() after
 * any write operation to get fresh data.
 *
 * WHY: onSnapshot charges a Firestore read for EVERY document in the result set
 * every time ANY document in the matched set changes. For a POS app with 500+
 * sales, one new sale = 500+ reads just from listeners. For pages that don't
 * need real-time sync (i.e., only one person uses the app at a time), getDocs
 * is orders of magnitude cheaper and equally functional.
 */
export function useFirestoreOnce<T = DocumentData>(
  collectionName: string | null | false,
  ...queryConstraints: QueryConstraint[]
) {
  const [documents, setDocuments] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(!!collectionName);
  const [error, setError] = useState<Error | null>(null);
  const [fetchTrigger, setFetchTrigger] = useState(0);

  // Stable key from the constraints so we can detect real changes.
  // We intentionally do NOT include queryConstraints in the useEffect deps
  // because they are new object references on every render. Instead we use
  // this string-serialised key as the dependency.
  const constraintsKey = queryConstraints
    .map(c => JSON.stringify(c, (_, v) => (typeof v === 'function' ? '[fn]' : v)))
    .join('|');

  // Keep a ref to the latest constraints so the effect closure can access them
  // without needing them as a dependency (avoids infinite re-fetch loops).
  const constraintsRef = useRef(queryConstraints);
  constraintsRef.current = queryConstraints;

  useEffect(() => {
    if (!collectionName) {
      setDocuments([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const q = query(collection(db, collectionName), ...constraintsRef.current);
    getDocs(q)
      .then(snapshot => {
        if (cancelled) return;
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as T[];
        setDocuments(docs);
      })
      .catch(err => {
        if (cancelled) return;
        console.error(`[useFirestoreOnce] Error on collection "${collectionName}":`, err);
        setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, constraintsKey, fetchTrigger]);

  /**
   * Call this after any write operation (add/edit/delete) on this collection
   * to re-fetch fresh data from Firestore.
   */
  const refetch = useCallback(() => {
    setFetchTrigger(t => t + 1);
  }, []);

  return { documents, loading, error, refetch };
}

const globalQueryCache = new Map<string, any[]>();

/**
 * Cached one-time Firestore fetch hook.
 * Functions exactly like useFirestoreOnce, but stores the result in an in-memory
 * global cache. If the exact same query is requested again in the session (e.g. 
 * navigating back to the Dashboard), it instantly returns the cached data (0 reads).
 * 
 * Call refetch() to bypass cache and fetch fresh data from Firebase.
 */
export function useCachedFirestoreOnce<T = DocumentData>(
  collectionName: string | null | false,
  ...queryConstraints: QueryConstraint[]
) {
  const [documents, setDocuments] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(!!collectionName);
  const [error, setError] = useState<Error | null>(null);
  const [fetchTrigger, setFetchTrigger] = useState(0);

  const constraintsKey = queryConstraints
    .map(c => JSON.stringify(c, (_, v) => (typeof v === 'function' ? '[fn]' : v)))
    .join('|');
  const cacheKey = `${collectionName}|${constraintsKey}`;

  const constraintsRef = useRef(queryConstraints);
  constraintsRef.current = queryConstraints;

  useEffect(() => {
    if (!collectionName) {
      setDocuments([]);
      setLoading(false);
      return;
    }

    if (fetchTrigger === 0 && globalQueryCache.has(cacheKey)) {
      setDocuments(globalQueryCache.get(cacheKey)! as T[]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const q = query(collection(db, collectionName), ...constraintsRef.current);
    getDocs(q)
      .then(snapshot => {
        if (cancelled) return;
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as T[];
        globalQueryCache.set(cacheKey, docs);
        setDocuments(docs);
      })
      .catch(err => {
        if (cancelled) return;
        console.error(`[useCachedFirestoreOnce] Error on collection "${collectionName}":`, err);
        setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, constraintsKey, fetchTrigger]);

  const refetch = useCallback(() => {
    setFetchTrigger(t => t + 1);
  }, []);

  return { documents, loading, error, refetch };
}

/**
 * One-time single-document fetch hook.
 *
 * Replaces useDocument (which uses onSnapshot) with a single getDoc call.
 * Call refetch() after write operations to get fresh data.
 */
export function useDocumentOnce<T = DocumentData>(
  collectionName: string | null | false,
  docId: string | null | false
) {
  const [document, setDocument] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(!!collectionName && !!docId);
  const [error, setError] = useState<Error | null>(null);
  const [fetchTrigger, setFetchTrigger] = useState(0);

  useEffect(() => {
    if (!collectionName || !docId) {
      setDocument(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getDoc(doc(db, collectionName, docId))
      .then(snapshot => {
        if (cancelled) return;
        if (snapshot.exists()) {
          setDocument({ id: snapshot.id, ...snapshot.data() } as T);
        } else {
          setDocument(null);
        }
      })
      .catch(err => {
        if (cancelled) return;
        console.error(`[useDocumentOnce] Error on "${collectionName}/${docId}":`, err);
        setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [collectionName, docId, fetchTrigger]);

  const refetch = useCallback(() => {
    setFetchTrigger(t => t + 1);
  }, []);

  return { document, loading, error, refetch };
}

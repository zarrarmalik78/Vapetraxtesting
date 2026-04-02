import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, QueryConstraint, DocumentData, doc } from 'firebase/firestore';
import { db } from '../firebase';
import toast from 'react-hot-toast';

export function useFirestore<T = DocumentData>(collectionName: string | null | false, ...queryConstraints: QueryConstraint[]) {
  const [documents, setDocuments] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [hasPendingWrites, setHasPendingWrites] = useState(false);

  // Stable ref to avoid re-subscribing on every render when constraints are created inline.
  const constraintsKey = queryConstraints
    .map(c => JSON.stringify(c, (_, v) => (typeof v === 'function' ? '[fn]' : v)))
    .join('|');

  useEffect(() => {
    if (!collectionName) {
      setDocuments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(collection(db, collectionName), ...queryConstraints);
    const unsubscribe = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as T[];
        setDocuments(docs);
        setFromCache(snapshot.metadata.fromCache);
        setHasPendingWrites(snapshot.metadata.hasPendingWrites);
        setLoading(false);
      },
      (err) => {
        console.error(`[useFirestore] Error on collection "${collectionName}":`, err);
        setError(err);
        setLoading(false);
        if (err.code === 'permission-denied') {
           toast.error(`Permission Denied: Cannot access ${collectionName}. Check your shop access.`);
        } else {
           toast.error(`Firebase error: ${err.message}`);
        }
      }
    );

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, constraintsKey]);

  return { documents, loading, error, fromCache, hasPendingWrites };
}

export function useDocument<T = DocumentData>(collectionName: string | null | false, docId: string | null | false) {
  const [document, setDocument] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    if (!collectionName || !docId) {
      setDocument(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      doc(db, collectionName, docId),
      { includeMetadataChanges: true },
      (snapshot) => {
        if (snapshot.exists()) {
          setDocument({ id: snapshot.id, ...snapshot.data() } as T);
        } else {
          setDocument(null);
        }
        setFromCache(snapshot.metadata.fromCache);
        setLoading(false);
      },
      (err) => {
        console.error(`[useDocument] Error on "${collectionName}/${docId}":`, err);
        setError(err);
        setLoading(false);
        if (err.code === 'permission-denied') {
           toast.error(`Permission Denied: Cannot access document ${docId}.`);
        } else {
           toast.error(`Firebase error: ${err.message}`);
        }
      }
    );

    return () => unsubscribe();
  }, [collectionName, docId]);

  return { document, loading, error, fromCache };
}

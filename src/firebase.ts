import { initializeApp } from 'firebase/app';
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Secondary app instance — used ONLY for creating cashier accounts
// so the admin's own session isn't disrupted.
const secondaryApp = initializeApp(firebaseConfig, 'secondary');
export const secondaryAuth = getAuth(secondaryApp);

// Auth with persistent local sessions (survives browser restart)
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);

// Firestore with durable offline persistence + multi-tab support.
// If persistence cannot be enabled (e.g. restrictive browser mode), gracefully fall back to memory cache.
let dbInstance;
try {
  dbInstance = initializeFirestore(
    app,
    {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    },
    firebaseConfig.firestoreDatabaseId
  );
} catch (err) {
  console.warn('[firebase] Persistent Firestore cache unavailable, using memory cache.', err);
  dbInstance = initializeFirestore(
    app,
    {
      localCache: memoryLocalCache(),
    },
    firebaseConfig.firestoreDatabaseId
  );
}

export const db = dbInstance;

export default app;

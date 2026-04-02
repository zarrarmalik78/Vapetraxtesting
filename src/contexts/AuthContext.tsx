import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User, 
  signInWithEmailAndPassword, 
  signOut, 
  GoogleAuthProvider, 
  signInWithPopup,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { auth, secondaryAuth, db } from '../firebase';
import toast from 'react-hot-toast';

interface AuthContextType {
  currentUser: User | null;
  userRole: string | null;
  shopId: string | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  signup: (email: string, pass: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  createCashier: (email: string, password: string, name: string) => Promise<void>;
  deleteCashier: (cashierUid: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CACHE_KEY = 'vapetrax_user_profile';

function cacheUserProfile(uid: string, role: string, shopId: string) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ uid, role, shopId }));
  } catch { /* quota exceeded or private browsing */ }
}

function getCachedProfile(uid: string): { role: string; shopId: string } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.uid === uid) return { role: parsed.role, shopId: parsed.shopId };
  } catch { /* parse error */ }
  return null;
}

function clearCachedProfile() {
  try { localStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [shopId, setShopId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        setCurrentUser(user);
        // Optimistically load cached profile (works offline)
        const cached = getCachedProfile(user.uid);
        if (cached) {
          setUserRole(cached.role);
          setShopId(cached.shopId);
          // Fast unblock when cache is available.
          setLoading(false);
        }

        // Then try to fetch fresh data from Firestore
        let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
        if (!cached) {
          // Prevent long login freezes on slow networks.
          fallbackTimer = setTimeout(() => setLoading(false), 1500);
        }
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserRole(data.role);
            setShopId(data.shopId || user.uid);
            cacheUserProfile(user.uid, data.role, data.shopId || user.uid);
          } else {
            // First-time user — create their profile
            // Every shop owner is an admin; shopId is always their uid
            const role = 'admin';
            const sId = user.uid;
            
            await setDoc(doc(db, 'users', user.uid), {
              username: user.displayName || 'User',
              email: user.email,
              role,
              shopId: sId,
              createdAt: serverTimestamp(),
            });
            setUserRole(role);
            setShopId(sId);
            cacheUserProfile(user.uid, role, sId);
          }
        } catch (error) {
          console.warn("Auth sync (may be offline):", error);
          // If we already set from cache, keep going; otherwise clear
          if (!cached) {
            // Keep the authenticated user, but let UI continue; data listeners will recover once online.
            setShopId(user.uid);
          }
        } finally {
          if (fallbackTimer) clearTimeout(fallbackTimer);
        }
      } else {
        setCurrentUser(null);
        setUserRole(null);
        setShopId(null);
        clearCachedProfile();
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      toast.success('Logged in successfully');
    } catch (error: any) {
      // Map Firebase error codes to friendly messages
      const msg =
        error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password'
          ? 'Invalid email or password.'
          : error.code === 'auth/user-not-found'
          ? 'No account found with this email.'
          : error.code === 'auth/too-many-requests'
          ? 'Too many failed attempts. Try again later.'
          : error.message;
      toast.error(msg);
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast.success('Logged in with Google');
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    }
  };

  const signup = async (email: string, pass: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, pass);
      toast.success('Account created successfully');
    } catch (error: any) {
      const msg = error.code === 'auth/email-already-in-use' 
        ? 'Email is already taken.' 
        : error.message;
      toast.error(msg);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset email sent');
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      clearCachedProfile();
      toast.success('Logged out successfully');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const createCashier = async (email: string, password: string, name: string) => {
    if (!shopId) throw new Error('Shop not loaded');
    try {
      // Use secondary auth so our admin session stays intact
      const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      // Sign out from secondary immediately
      await signOut(secondaryAuth);

      // Create Firestore user profile for cashier
      await setDoc(doc(db, 'users', cred.user.uid), {
        username: name,
        email,
        role: 'cashier',
        shopId,          // points to admin's uid
        createdAt: serverTimestamp(),
      });
      toast.success(`Cashier "${name}" created successfully`);
    } catch (error: any) {
      const msg = error.code === 'auth/email-already-in-use'
        ? 'This email is already registered.'
        : error.message;
      toast.error(msg);
      throw error;
    }
  };

  const deleteCashier = async (cashierUid: string) => {
    try {
      await deleteDoc(doc(db, 'users', cashierUid));
      toast.success('Cashier removed successfully');
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, userRole, shopId, loading, login, loginWithGoogle, signup, resetPassword, logout, createCashier, deleteCashier }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

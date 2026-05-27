import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';

export interface StockAlert {
  id: string;
  productId: string;
  productName: string;
  currentStock: number;
  minStockLevel: number;
  status: 'active' | 'resolved';
  shopId: string;
}

interface NotificationContextType {
  alerts: StockAlert[];
  activeAlerts: StockAlert[];
  unreadCount: number;
  loading: boolean;
}

const NotificationContext = createContext<NotificationContextType>({
  alerts: [],
  activeAlerts: [],
  unreadCount: 0,
  loading: true,
});

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { shopId, currentUser } = useAuth();
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shopId || !currentUser) {
      setAlerts([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'stockAlerts'),
      where('shopId', '==', shopId),
      where('status', '==', 'active')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
      })) as StockAlert[];
      setAlerts(docs);
      setLoading(false);
    }, (err) => {
      console.error('Stock alerts listener error:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [shopId, currentUser]);

  const activeAlerts = alerts.filter(a => a.status === 'active');

  return (
    <NotificationContext.Provider value={{ 
      alerts, 
      activeAlerts, 
      unreadCount: activeAlerts.length, 
      loading 
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);

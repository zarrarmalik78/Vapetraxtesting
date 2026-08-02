import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getAggregateFromServer, sum, count } from 'firebase/firestore';
import { db } from '../firebase';

interface DashboardAggregations {
  weeklyRevenue: number;
  weeklyProfit: number;
  monthlyRevenue: number;
  monthlyProfit: number;
  trendData: Array<{ date: string; revenue: number; transactions: number }>;
}

export function useDashboardAggregations(
  shopId: string | null | undefined,
  currentBusinessDay: Date,
  thisWeekBusiness: Date,
  thisMonthBusiness: Date
) {
  const [data, setData] = useState<DashboardAggregations>({
    weeklyRevenue: 0,
    weeklyProfit: 0,
    monthlyRevenue: 0,
    monthlyProfit: 0,
    trendData: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [fetchTrigger, setFetchTrigger] = useState(0);

  useEffect(() => {
    if (!shopId) return;

    let cancelled = false;
    setLoading(true);

    const fetchAggregations = async () => {
      try {
        const salesRef = collection(db, 'sales');
        
        // 1. Fetch Weekly Aggregates
        const weeklyQ = query(salesRef, where('shopId', '==', shopId), where('saleDateClient', '>=', thisWeekBusiness));
        const weeklySnap = await getAggregateFromServer(weeklyQ, {
          revenue: sum('totalAmount'),
          profit: sum('totalProfit')
        });

        // 2. Fetch Monthly Aggregates
        const monthlyQ = query(salesRef, where('shopId', '==', shopId), where('saleDateClient', '>=', thisMonthBusiness));
        const monthlySnap = await getAggregateFromServer(monthlyQ, {
          revenue: sum('totalAmount'),
          profit: sum('totalProfit')
        });

        // 3. Fetch 30-Day Trend Data
        const last30Days = Array.from({ length: 30 }, (_, i) => {
          const d = new Date(currentBusinessDay);
          d.setDate(d.getDate() - (29 - i));
          return d;
        });

        const trendPromises = last30Days.map(async (date) => {
          const startOfDay = new Date(date);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(date);
          endOfDay.setHours(23, 59, 59, 999);

          const dayQ = query(
            salesRef, 
            where('shopId', '==', shopId), 
            where('saleDateClient', '>=', startOfDay),
            where('saleDateClient', '<=', endOfDay)
          );

          const snap = await getAggregateFromServer(dayQ, {
            revenue: sum('totalAmount'),
            transactions: count()
          });

          return {
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            revenue: snap.data().revenue,
            transactions: snap.data().transactions
          };
        });

        const trendData = await Promise.all(trendPromises);

        if (!cancelled) {
          setData({
            weeklyRevenue: weeklySnap.data().revenue,
            weeklyProfit: weeklySnap.data().profit,
            monthlyRevenue: monthlySnap.data().revenue,
            monthlyProfit: monthlySnap.data().profit,
            trendData
          });
          setLoading(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('Failed to fetch dashboard aggregations:', err);
          setError(err);
          setLoading(false);
        }
      }
    };

    fetchAggregations();

    return () => { cancelled = true; };
  }, [shopId, fetchTrigger, currentBusinessDay.getTime(), thisWeekBusiness.getTime(), thisMonthBusiness.getTime()]);

  const refetch = useCallback(() => setFetchTrigger(t => t + 1), []);

  return { ...data, loading, error, refetch };
}

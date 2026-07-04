import { useEffect, useRef } from 'react';
import { collection, query, where, getDocs, setDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { toDisplayDate } from '../lib/dates';

const DAILY_SUMMARY_KEY = 'vapetrax_last_daily_summary';
const LOW_STOCK_CHECK_KEY = 'vapetrax_last_stock_check';
const CHECK_INTERVAL_MS = 2 * 60 * 60 * 1000; // 2 hours (was 30 min — saves massive reads)

function getTodayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function useBackgroundTasks() {
  const { shopId, currentUser } = useAuth();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!shopId || !currentUser) return;

    const runTasks = async () => {
      await generateDailySummary(shopId);
    };

    // Run immediately on mount
    runTasks();

    // Run periodically
    intervalRef.current = setInterval(runTasks, CHECK_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [shopId, currentUser]);
}

async function generateDailySummary(shopId: string) {
  try {
    const todayStr = getTodayDateStr();
    const lastRun = localStorage.getItem(DAILY_SUMMARY_KEY);
    if (lastRun === `${shopId}_${todayStr}`) return; // Already generated today

    // Check if summary already exists in Firestore
    const summaryDocId = `${shopId}_${todayStr}`;
    const existingRef = doc(db, 'dailySummaries', summaryDocId);
    
    // Query ONLY today's sales using date filter (was fetching ALL sales!)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const salesQuery = query(
      collection(db, 'sales'),
      where('shopId', '==', shopId),
      where('saleDateClient', '>=', todayStart)  // Server-side date filter
    );
    const salesSnap = await getDocs(salesQuery);
    
    // These are already today's sales thanks to the server-side filter,
    // but double-check client-side for the business-day boundary
    const todaySales = salesSnap.docs.filter(d => {
      const data = d.data();
      const saleDate = toDisplayDate(data.saleDate, data.saleDateClient);
      if (!saleDate) return false;
      return saleDate >= todayStart;
    });

    const totalRevenue = todaySales.reduce((acc, d) => acc + (d.data().totalAmount || 0), 0);
    
    // Calculate profit from items (sellingPrice - costPrice) * quantity
    let totalProfit = 0;
    let topProductName = 'N/A';
    let topProductQty = 0;
    const productSales: Record<string, { name: string; qty: number }> = {};

    for (const saleDoc of todaySales) {
      const items = saleDoc.data().items || [];
      for (const item of items) {
        const qty = item.quantity || 1;
        const revenue = item.totalPrice || item.unitPrice * qty;
        // Approximate profit margin at 30% if cost not available
        totalProfit += revenue * 0.3;
        
        const key = item.productName || item.productId;
        if (!productSales[key]) productSales[key] = { name: item.productName || 'Unknown', qty: 0 };
        productSales[key].qty += qty;
      }
    }

    // Find top product
    for (const [, val] of Object.entries(productSales)) {
      if (val.qty > topProductQty) {
        topProductQty = val.qty;
        topProductName = val.name;
      }
    }

    await setDoc(existingRef, {
      shopId,
      date: todayStr,
      totalSales: todaySales.length,
      totalRevenue,
      totalProfit: Math.round(totalProfit),
      topProduct: topProductName,
      topProductQty,
      generatedAt: serverTimestamp(),
    }, { merge: true });

    localStorage.setItem(DAILY_SUMMARY_KEY, `${shopId}_${todayStr}`);
  } catch (error) {
    console.warn('Daily summary generation failed (may be offline):', error);
  }
}


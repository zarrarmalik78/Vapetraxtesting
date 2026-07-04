# Firebase Quota Exhaustion — Root Cause Analysis

> [!CAUTION]
> Your app is burning through **50,000 reads/day** with only 3 stores because of 7 compounding issues. The single worst offender is `useBackgroundTasks.ts` which **fetches ALL sales every 30 minutes** using `getDocs` (not a listener), completely bypassing the offline cache.

---

## Executive Summary: Where the Reads Go

| # | Issue | Est. Reads per Session | Severity |
|---|-------|----------------------|----------|
| 1 | `useBackgroundTasks` fetches ALL sales + ALL products every 30 min via `getDocs` | **2,000–10,000+/day** per store | 🔴 Critical |
| 2 | `includeMetadataChanges: true` doubles every listener callback | **2× multiplier on ALL listeners** | 🔴 Critical |
| 3 | Dashboard loads ALL sales, expenses, credits (unbounded) | **1,000–5,000** per page load | 🔴 Critical |
| 4 | Analytics loads ALL sales, expenses, customers, products (unbounded) | **1,000–5,000** per page load | 🔴 Critical |
| 5 | DetailedReports loads ALL sales, expenses, products (unbounded) | **1,000–3,000** per page load | 🟡 High |
| 6 | InventoryLogs loads ALL logs (unbounded, no limit) | **500–2,000** per page load | 🟡 High |
| 7 | Security rules `isValidCashier()` does a `get()` on every doc read for cashiers | **1 extra read per doc** for cashier users | 🟡 High |

**With 3 stores × multiple sessions/day, this easily exceeds 50,000 reads.**

---

## Issue 1: `useBackgroundTasks.ts` — Fetches ALL Sales Every 30 Minutes

**File:** [useBackgroundTasks.ts](file:///D:/Apps/VapeTrax-Web-2.0/src/hooks/useBackgroundTasks.ts)
**Mounted in:** [App.tsx:30](file:///D:/Apps/VapeTrax-Web-2.0/src/App.tsx#L30) — runs inside `<Layout>` on EVERY page

This is the **#1 quota killer**. Every 30 minutes, for every active browser tab:

### `generateDailySummary()` (line 40–112)
```typescript
// Line 54-58: Fetches ALL sales, just to filter for today client-side!
const salesQuery = query(
  collection(db, 'sales'),
  where('shopId', '==', shopId)
  // ❌ NO date filter! NO limit! Downloads EVERY sale ever made.
);
const salesSnap = await getDocs(salesQuery);  // ❌ getDocs bypasses cache
```

This fetches every single sale document from the entire history. If a shop has 500 sales, that's **500 reads every 30 minutes, per tab**. Using `getDocs` (not `onSnapshot`) means it **always hits the server**, ignoring the offline cache.

### `checkLowStock()` (line 114–160)
```typescript
// Line 120-124: Fetches ALL products
const productsQuery = query(
  collection(db, 'products'),
  where('shopId', '==', shopId)
  // ❌ No limit, and then WRITES a stockAlerts doc for EVERY product
);
const productsSnap = await getDocs(productsQuery);

// Line 126-153: For EACH product, writes to stockAlerts
for (const productDoc of productsSnap.docs) {
  await setDoc(doc(db, 'stockAlerts', alertDocId), { ... }, { merge: true });
  // ❌ One WRITE per product, every 30 minutes
}
```

If a shop has 50 products, this causes **50 reads + 50 writes** every 30 minutes, per tab.

> [!WARNING]
> The `localStorage` guard (`LOW_STOCK_CHECK_KEY`) only prevents runs within the same 30-min window. But `generateDailySummary` has a weaker guard (`DAILY_SUMMARY_KEY`) that only skips if the exact `shopId_date` string matches — it still runs the full `getDocs` query to compute the summary before writing.

---

## Issue 2: `includeMetadataChanges: true` Doubles Every Listener

**File:** [useFirestore.ts:31](file:///D:/Apps/VapeTrax-Web-2.0/src/hooks/useFirestore.ts#L31) and [line 78](file:///D:/Apps/VapeTrax-Web-2.0/src/hooks/useFirestore.ts#L78)

```typescript
const unsubscribe = onSnapshot(
  q,
  { includeMetadataChanges: true },  // ❌ This doubles callbacks
  (snapshot) => { ... }
);
```

With `includeMetadataChanges: true`, `onSnapshot` fires **twice** for each change:
1. Once when the data arrives from cache (with `fromCache: true`)
2. Once when the server confirms (with `fromCache: false`)

You track `fromCache` and `hasPendingWrites` state but **never use them in the UI** (no "offline indicator" on data cards, no "syncing..." badge). This means you're paying double the callbacks — and double the React re-renders — for zero benefit.

**Impact**: Every single `useFirestore` and `useDocument` call across the entire app fires its callback 2× instead of 1×. While each metadata callback doesn't count as a fresh Firestore read, it does cause unnecessary re-renders which can cascade into other effects.

---

## Issue 3: Dashboard Loads ALL Historical Data

**File:** [Dashboard.tsx:47-50](file:///D:/Apps/VapeTrax-Web-2.0/src/pages/Dashboard.tsx#L47)

```typescript
const { documents: products } = useFirestore('products', where('shopId', '==', shopId));
const { documents: sales }    = useFirestore('sales', where('shopId', '==', shopId));
const { documents: expenses } = useFirestore('expenses', where('shopId', '==', shopId));
const { documents: credits }  = useFirestore('credits', where('shopId', '==', shopId));
// ❌ 4 unbounded listeners! No date filter, no limit.
```

The Dashboard downloads **every sale, every expense, every credit, and every product** ever created — just to compute today's revenue and weekly profit. All filtering is done client-side.

**Scenario**: A shop with 1,000 sales + 200 expenses + 100 credits + 50 products = **1,350 reads** just to open the Dashboard. And this is a realtime listener, so it stays active.

---

## Issue 4: Analytics Also Loads Everything

**File:** [Analytics.tsx:43-46](file:///D:/Apps/VapeTrax-Web-2.0/src/pages/Analytics.tsx#L43)

```typescript
const { documents: sales }     = useFirestore('sales', where('shopId', '==', shopId));
const { documents: expenses }  = useFirestore('expenses', where('shopId', '==', shopId));
const { documents: customers } = useFirestore('customers', where('shopId', '==', shopId));
const { documents: products }  = useFirestore('products', where('shopId', '==', shopId));
// ❌ 4 more unbounded listeners — identical to Dashboard
```

If the user navigates from Dashboard → Analytics, the Dashboard listeners unmount and the Analytics listeners mount, re-fetching the same data. There's no shared data layer or context cache.

---

## Issue 5: DetailedReports — Triple Unbounded

**File:** [DetailedReports.tsx:26-28](file:///D:/Apps/VapeTrax-Web-2.0/src/pages/DetailedReports.tsx#L26)

```typescript
const { documents: sales }    = useFirestore('sales', where('shopId', '==', shopId));
const { documents: expenses } = useFirestore('expenses', where('shopId', '==', shopId));
const { documents: products } = useFirestore('products', where('shopId', '==', shopId));
// ❌ 3 more unbounded listeners
```

---

## Issue 6: InventoryLogs — All Logs, No Limit

**File:** [InventoryLogs.tsx:25-29](file:///D:/Apps/VapeTrax-Web-2.0/src/pages/InventoryLogs.tsx#L25)

```typescript
const { documents: logs } = useFirestore(
  'inventoryLogs',
  where('shopId', '==', shopId),
  firestoreOrderBy('createdAt', 'desc')
  // ❌ No limit! Every sale generates 1-5 log entries.
  //    After 500 sales, this could be 1,000+ documents.
);
```

Every sale, stock adjustment, refill, and deletion creates inventory log entries. This collection grows the fastest and has **no limit whatsoever**.

---

## Issue 7: Security Rules — `isValidCashier()` Cross-Read

**File:** [firestore.rules:35-38](file:///D:/Apps/VapeTrax-Web-2.0/firestore.rules#L35)

```
function isValidCashier(targetShopId) {
  let userDoc = get(/databases/$(database)/documents/users/$(request.auth.uid));
  return userDoc != null && userDoc.data.role == 'cashier' && userDoc.data.shopId == targetShopId;
}
```

This `get()` call is invoked by `canAccessDoc()` which is used for **every read rule** on products, sales, customers, expenses, credits, inventoryLogs, etc. 

The short-circuit logic `(docShopId == request.auth.uid || isValidCashier(docShopId))` means:
- **Admin users**: The first condition passes, `isValidCashier` is never called. ✅ No extra reads.
- **Cashier users**: The first condition fails (cashier UID ≠ shopId), so `isValidCashier` is called for **every document** in the query result. If a cashier opens the products page with 50 products, that's **50 extra `get()` reads** just for security rules.

> [!NOTE]
> Firestore caches security rule `get()` calls within a single request, so a query returning 50 docs only costs 1 extra read, not 50. However, each **new query** or **new snapshot** triggers a fresh evaluation, so with multiple listeners and the 30-minute background tasks, this adds up.

---

## Other Observations

### ✅ Offline Persistence is Correctly Configured
[firebase.ts:21-27](file:///D:/Apps/VapeTrax-Web-2.0/src/firebase.ts#L21) — Uses `persistentLocalCache` with `persistentMultipleTabManager`. This is correct.

### ✅ `useFirestore` Dependency Array is Stable
[useFirestore.ts:14-16](file:///D:/Apps/VapeTrax-Web-2.0/src/hooks/useFirestore.ts#L14) — The `constraintsKey` serialization approach is a reasonable attempt at stability. Firebase v9 `QueryConstraint` objects serialize deterministically enough that `JSON.stringify` produces the same key when the same `where()` and `orderBy()` calls are used. This is **not causing infinite loops**.

### ⚠️ Sales Page Loads ALL Sales + ALL Customers
[Sales.tsx:42-48](file:///D:/Apps/VapeTrax-Web-2.0/src/pages/Sales.tsx#L42) — Two unbounded listeners. Could benefit from pagination.

### ⚠️ Duplicate Data Fetching Across Pages
The same collections (sales, products, expenses) are independently listened to by Dashboard, Analytics, DetailedReports, and Sales. There's no shared React context or global store, so navigating between pages causes full re-fetches.

---

## Prioritized Fix Plan

### 🔴 Priority 1: Fix `useBackgroundTasks.ts` (Biggest Savings)

**Option A (Recommended):** Replace `getDocs` queries with date-bounded queries and add the date filter server-side:
```typescript
// Instead of fetching ALL sales:
const todayStart = new Date();
todayStart.setHours(0, 0, 0, 0);
const salesQuery = query(
  collection(db, 'sales'),
  where('shopId', '==', shopId),
  where('saleDateClient', '>=', todayStart)  // ✅ Only today's sales
);
```

**Option B:** Remove `useBackgroundTasks` entirely and compute daily summaries lazily (on Dashboard load) or via a Firebase Cloud Function (server-side, free from read quotas in Spark plan context).

### 🔴 Priority 2: Remove `includeMetadataChanges: true`

In both `useFirestore` and `useDocument`, remove the option:
```diff
- { includeMetadataChanges: true },
+ // No options needed
```

### 🔴 Priority 3: Add Date Bounds to Dashboard/Analytics/Reports

Add a `where('saleDateClient', '>=', thirtyDaysAgo)` constraint to all sales/expenses/credits queries on Dashboard, Analytics, and DetailedReports. Calculate lifetime totals using `getCountFromServer` / `getAggregateFromServer` (1 read each).

### 🟡 Priority 4: Add `limit()` to InventoryLogs and Sales

```typescript
// InventoryLogs: limit to most recent 200
useFirestore('inventoryLogs', where('shopId','==',shopId), orderBy('createdAt','desc'), limit(200))

// Sales: limit to most recent 100, add "Load More"
useFirestore('sales', where('shopId','==',shopId), orderBy('saleDate','desc'), limit(100))
```

### 🟡 Priority 5: Optimize Security Rules for Cashiers

Replace the `get()` call with a custom claim approach:
```
// In rules, use custom claims instead of get():
function isCashierFor(targetShopId) {
  return request.auth.token.role == 'cashier' && request.auth.token.shopId == targetShopId;
}
```
This requires setting custom claims via Firebase Admin SDK (a one-time backend change) but eliminates all security-rule reads for cashiers.

### 🟢 Priority 6: Share Data Across Pages

Create a `DataProvider` context that holds products, sales (last 30 days), and customers so that navigating between Dashboard → Analytics → Reports doesn't re-fetch.

---

## Estimated Impact

| Fix | Est. Reads Saved/Day (3 stores) |
|-----|-------------------------------|
| Fix background tasks | **5,000–15,000** |
| Remove `includeMetadataChanges` | ~20% reduction in re-renders |
| Bound Dashboard/Analytics queries | **3,000–10,000** |
| Limit InventoryLogs/Sales | **1,000–3,000** |
| Optimize security rules | **500–2,000** (cashier sessions) |
| **Total estimated savings** | **~10,000–30,000 reads/day** |

This should bring your daily usage well under the 50,000 Spark limit.

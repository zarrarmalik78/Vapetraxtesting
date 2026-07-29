---
tags:
  - concept
  - performance
  - firestore
  - optimization
---

# Firestore Read Quota Optimization

## Overview
Firebase Firestore charges based on document read operations. Real-time listeners (`onSnapshot`) on large collections across multiple POS terminals can quickly trigger tens of thousands of daily reads. VapeTrax implements a **One-Time Fetch Optimization Pattern** to dramatically reduce Firestore read quota usage.

---

## ⚡ The Strategy

1. **`useFirestoreOnce` Hook**: Instead of persistent `onSnapshot` subscriptions, [[useFirestoreOnce Hook]] uses `getDocs()` to fetch data once on page load or on explicit user action (e.g. searching, refreshing, or completing a sale).
2. **Explicit Refetching**: Data refetches occur only after mutation operations (e.g., calling `refetchProducts()` after completing a sale in [[New Sale POS Page]]).
3. **Session Caching**: Context-level caching prevents redundant re-queries during navigation between tabs.

---

## 📉 Impact
- Reduced Firestore daily read operations by over 80%.
- Prevents unexpected Firebase quota exhaustion on free/pay-as-you-go tiers.

---

## 🔗 Related Graph Links
- **Primary Hook**: [[useFirestoreOnce Hook]]
- **Alternative Hook**: [[useFirestore Hook]]
- **Decision Record**: [[ADR-002 Firestore Read Reduction Strategy]]
- **Screens**: [[Stock Inventory Page]], [[New Sale POS Page]], [[Sales History Page]], [[Customers Page]]

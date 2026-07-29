---
tags:
  - api
  - hook
  - firestore
---

# useFirestoreOnce Hook

## Overview
- **File**: `src/hooks/useFirestoreOnce.ts`
- **Scope**: Data Retrieval Hook

---

## 🎯 Purpose
Performs one-time `getDocs()` collection queries filtered by `shopId`. Provides refetch triggers to sync local state on-demand after mutations.

---

## 🔗 Related Graph Links
- **Concept**: [[Firestore Read Quota Optimization]], [[Multi-Store Isolation]]
- **Alternative Hook**: [[useFirestore Hook]]
- **Screens**: Used across all data screens

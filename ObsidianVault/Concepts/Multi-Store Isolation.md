---
tags:
  - concept
  - architecture
  - security
  - multi-tenant
---

# Multi-Store Isolation

## Overview
Multi-Store Isolation is the architectural mechanism in VapeTrax Web POS that enables multiple physical retail store locations to share a single Firebase Firestore project while remaining completely isolated from one another.

---

## 🔑 Key Mechanism: `shopId` Field

Every root collection document in Firestore (products, sales, customers, expenses, suppliers, inventory logs, credits) includes an indexed `shopId` field.

```typescript
// Example Firestore Document Structure
{
  id: "prod_12345",
  name: "Vaporesso XROS 3",
  shopId: "store_lodhran_01",
  stockQuantity: 15,
  sellingPrice: 7500
}
```

---

## 🛠️ Implementation

1. **Session Scope**: When a user logs in via [[Auth Context]], their document is fetched from [[Users Collection]]. The user profile contains their assigned `shopId`.
2. **Global Filtering**: All custom hooks like [[useFirestoreOnce Hook]] and [[useFirestore Hook]] append `.where('shopId', '==', user.shopId)` to queries.
3. **Database Rules**: Enforcement occurs at the database layer in [[Security Rules]], preventing users from querying documents belonging to other stores.

---

## 🔗 Related Graph Links
- **Enforced By**: [[Auth Context]], [[Security Rules]]
- **Data Collections**: [[Products Collection]], [[Sales Collection]], [[Customers Collection]], [[Expenses Collection]], [[Credits Collection]]
- **Decision Record**: [[ADR-003 shopId Based Data Isolation]]
- **Screens**: [[Dashboard Page]], [[New Sale POS Page]], [[Stock Inventory Page]]

---
tags:
  - screen
  - page
  - pos
---

# New Sale POS Page

## Overview
- **File**: `src/pages/NewSale.tsx`
- **Route**: `/pos` or `/new-sale`
- **Role Requirement**: Admin & Cashier

---

## 🎯 Purpose
The high-speed Point of Sale terminal. Cashiers search products, scan barcodes, select customer profiles, handle e-liquid refills, pick payment methods, and complete transactions.

---

## 🔗 Related Components & Hooks
- **Components**: [[Customer Modal Component]], [[Connectivity Badge Component]]
- **Hooks**: [[useFirestoreOnce Hook]]
- **Modules**: [[Bottles Helper Module]], [[Finance System Helper Module]], [[Actor Helper Module]]
- **Collections**: [[Sales Collection]], [[Products Collection]], [[Customers Collection]], [[Bottles Subcollection]], [[Inventory Logs Collection]]
- **Concepts**: [[POS Checkout & Billing]], [[E-Liquid Bottle Tracking Logic]], [[Atomic Batch Writes]]

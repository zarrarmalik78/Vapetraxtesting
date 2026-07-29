---
tags:
  - screen
  - page
  - stock
  - inventory
---

# Stock Inventory Page

## Overview
- **File**: `src/pages/Stock.tsx`
- **Route**: `/stock`
- **Role Requirement**: Admin & Cashier (Cashier has restricted cost price views)

---

## 🎯 Purpose
Comprehensive product catalog management. Add/edit products, track sealed vs unsealed juice bottles, search inventory, manage min stock levels, and delete items.

---

## 🔗 Related Components & Hooks
- **Components**: [[Confirm Bulk Delete Modal Component]]
- **Hooks**: [[useFirestoreOnce Hook]]
- **Modules**: [[Bottles Helper Module]], [[Actor Helper Module]], [[Secure Action Helper Module]]
- **Collections**: [[Products Collection]], [[Bottles Subcollection]], [[Inventory Logs Collection]]
- **Concepts**: [[Stock & Inventory Management]], [[E-Liquid Bottle Tracking Logic]]

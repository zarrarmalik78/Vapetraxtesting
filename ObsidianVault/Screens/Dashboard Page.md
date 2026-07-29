---
tags:
  - screen
  - page
  - dashboard
---

# Dashboard Page

## Overview
- **File**: `src/pages/Dashboard.tsx`
- **Route**: `/` or `/dashboard`
- **Role Requirement**: Admin (Full view) / Cashier (Limited KPI view)

---

## 🎯 Purpose
The main control center showing daily revenue, net profit, total transactions, low stock alerts, and quick POS action shortcuts.

---

## 🔗 Related Components & Hooks
- **Components**: [[Sidebar Component]], [[Connectivity Badge Component]], [[Eid Banner Component]]
- **Hooks**: [[useFirestoreOnce Hook]]
- **Modules**: [[Finance Helper Module]], [[Finance System Helper Module]]
- **Collections**: [[Sales Collection]], [[Expenses Collection]], [[Products Collection]]
- **Concepts**: [[Cost of Goods Sold & Profit Calculation]], [[Multi-Store Isolation]]

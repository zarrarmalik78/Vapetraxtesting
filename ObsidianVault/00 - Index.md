---
tags:
  - index
  - dashboard
  - overview
---

# VapeTrax Web POS - Obsidian Knowledge Graph

Welcome to the **VapeTrax Web POS** knowledge vault. This vault maps out every architectural concept, feature, screen, component, database schema, API module, and design decision powering the application.

---

## 🗺️ Navigation Map

### 🧠 Core Concepts
- [[Multi-Store Isolation]] — Tenant data separation via `shopId`
- [[User Roles & Permissions]] — Admin vs Cashier security model
- [[Atomic Batch Writes]] — ACID transactions across collections
- [[Single Page Application Architecture]] — React 18 + Vite SPA design
- [[E-Liquid Bottle Tracking Logic]] — ML volume & bottle refill management
- [[Cost of Goods Sold & Profit Calculation]] — Real-time profitability math
- [[Sales Reversal & Refund Logic]] — Atomic rollback of stock, ledger, and sales
- [[Offline & PWA Support]] — Progressive Web App offline capabilities
- [[Firestore Read Quota Optimization]] — One-time fetch strategies to minimize costs

---

### 🚀 Key Features
- [[POS Checkout & Billing]] — Instant point-of-sale checkout engine
- [[Stock & Inventory Management]] — Multi-unit inventory tracking
- [[Customer Credit & Ledger Management]] — Udhar / debt balance tracking
- [[Shop & Personal Expense Tracking]] — Dual-scope expense management
- [[Double-Entry Financial Accounting System]] — Cash & Bank accounts with ledger entries
- [[Analytics & Performance Dashboard]] — Charts and KPI analytics
- [[Exportable & Printable Detailed Reports]] — Sales & profit reports
- [[Inventory Audit Trail & Logs]] — Stock movement logging
- [[Database Backup & Restore]] — JSON import/export vault backups
- [[Shop Branding & Receipt Customization]] — Custom thermal print receipts
- [[Multi-User Account Management]] — Cashier account provisioning

---

### 🖥️ Screens & Pages
- [[Dashboard Page]] (`src/pages/Dashboard.tsx`)
- [[New Sale POS Page]] (`src/pages/NewSale.tsx`)
- [[Sales History Page]] (`src/pages/Sales.tsx`)
- [[Stock Inventory Page]] (`src/pages/Stock.tsx`)
- [[Customers Page]] (`src/pages/Customers.tsx`)
- [[Expenses Page]] (`src/pages/Expenses.tsx`)
- [[Personal Expenses Page]] (`src/pages/PersonalExpenses.tsx`)
- [[Analytics Page]] (`src/pages/Analytics.tsx`)
- [[Detailed Reports Page]] (`src/pages/DetailedReports.tsx`)
- [[Inventory Logs Page]] (`src/pages/InventoryLogs.tsx`)
- [[Settings Page]] (`src/pages/Settings.tsx`)
- [[Login Page]] (`src/pages/Login.tsx`)

---

### 🧩 UI Components
- [[Sidebar Component]] — Navigation layout sidebar
- [[Protected Route Component]] — Auth guard wrapper
- [[Add Credit Modal Component]] — Manual debt adjustment modal
- [[Customer Credit History Modal Component]] — Customer debt breakdown modal
- [[Customer Modal Component]] — Add/edit customer details
- [[Account List Component]] — Financial account cards overview
- [[Manual Transaction Modal Component]] — Financial ledger entry modal
- [[Transaction Ledger Component]] — Financial transaction history table
- [[Backup Restore Tab Component]] — Database backup/restore interface
- [[Confirm Bulk Delete Modal Component]] — Protected bulk deletion modal
- [[Connectivity Badge Component]] — Network online/offline status pill
- [[Eid Banner Component]] — Seasonal festive alert banner
- [[Loading Spinner Component]] — Central loading state UI
- [[PWA Update Prompt Component]] — App service worker update modal

---

### 🗄️ Database Schemas & Security
- [[Users Collection]] — `/users/{uid}`
- [[Products Collection]] — `/products/{productId}`
- [[Bottles Subcollection]] — `/products/{productId}/bottles/{bottleId}`
- [[Customers Collection]] — `/customers/{customerId}`
- [[Suppliers Collection]] — `/suppliers/{supplierId}`
- [[Purchases Collection]] — `/purchases/{purchaseId}`
- [[Sales Collection]] — `/sales/{saleId}`
- [[Expenses Collection]] — `/expenses/{expenseId}`
- [[Credits Collection]] — `/credits/{creditId}`
- [[Inventory Logs Collection]] — `/inventoryLogs/{logId}`
- [[Settings Collection]] — `/settings/branding`
- [[Financial Accounts Collection]] — `/accounts/{accountId}`
- [[Financial Transactions Collection]] — `/transactions/{transactionId}`
- [[Security Rules]] — `firestore.rules` security logic

---

### ⚡ APIs, Hooks & Utility Modules
- [[Auth Context]] (`src/contexts/AuthContext.tsx`)
- [[Data Context]] (`src/contexts/DataContext.tsx`)
- [[useFirestoreOnce Hook]] (`src/hooks/useFirestoreOnce.ts`)
- [[useFirestore Hook]] (`src/hooks/useFirestore.ts`)
- [[useBackgroundTasks Hook]] (`src/hooks/useBackgroundTasks.ts`)
- [[useConnectivity Hook]] (`src/hooks/useConnectivity.ts`)
- [[usePWA Hook]] (`src/hooks/usePWA.ts`)
- [[Bottles Helper Module]] (`src/lib/bottles.ts`)
- [[Finance Helper Module]] (`src/lib/finance.ts`)
- [[Finance System Helper Module]] (`src/lib/finance-system.ts`)
- [[Sales Reversal Helper Module]] (`src/lib/salesReversal.ts`)
- [[Backup Helper Module]] (`src/lib/backup.ts`)
- [[Credits Helper Module]] (`src/lib/credits.ts`)
- [[Actor Helper Module]] (`src/lib/actor.ts`)
- [[Secure Action Helper Module]] (`src/lib/secureAction.ts`)
- [[Seed Data Helper Module]] (`src/lib/seedData.ts`)
- [[Utils Module]] (`src/lib/utils.ts`)

---

### 📐 Architectural Decision Records (ADRs)
- [[ADR-001 NoSQL Document Database Choice]]
- [[ADR-002 Firestore Read Reduction Strategy]]
- [[ADR-003 shopId Based Data Isolation]]
- [[ADR-004 React SPA & Vite Stack]]
- [[ADR-005 Client-Side Double-Entry Finance System]]
- [[ADR-006 Liquid E-Juice Partial Refill Tracking]]

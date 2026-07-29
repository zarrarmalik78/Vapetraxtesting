---
tags:
  - concept
  - security
  - permissions
---

# User Roles & Permissions

## Overview
VapeTrax Web POS implements Role-Based Access Control (RBAC) to ensure operational security in vape retail environments. The application distinguishes between store owners/managers (**Admin**) and sales staff (**Cashier**).

---

## 👥 Role Hierarchy

### 1. Admin Role
- **Full Operational Access**: Create, edit, and delete inventory, products, expenses, and customer credit limits.
- **Financial Analytics Visibility**: Access total revenue, gross profits, cost prices (COGS), and personal budgeting.
- **System Administration**: Provision new cashier accounts, view audit logs, perform system data backups, and configure shop receipt branding.

### 2. Cashier Role
- **POS Checkout**: Process sales on [[New Sale POS Page]], issue receipts, and manage customer queues.
- **Stock Inspection**: View available stock quantities without seeing purchase cost prices.
- **Expense Entry**: Record daily operating expenses on [[Expenses Page]].
- **Restricted Actions**: Sensitive actions like deleting products, bulk clearing records, viewing profit margins, or downloading database backups are blocked or protected via [[Secure Action Helper Module]].

---

## 🛠️ Enforcement in Code

1. **Client Guard**:[[Protected Route Component]] restricts admin-only routes like `/analytics`, `/reports`, `/logs`, and `/settings`.
2. **UI Scoping**: Buttons and financial summary cards conditionally render using `user.role === 'admin'`.
3. **Database Guard**: [[Security Rules]] restrict delete operations to authenticated admins.

---

## 🔗 Related Graph Links
- **Auth Provider**: [[Auth Context]]
- **Route Guard**: [[Protected Route Component]]
- **Helper Module**: [[Secure Action Helper Module]]
- **Screens**: [[Settings Page]], [[Dashboard Page]], [[New Sale POS Page]]
- **Database**: [[Users Collection]], [[Security Rules]]

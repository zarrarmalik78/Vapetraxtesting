---
tags:
  - feature
  - credit
  - customers
  - ledger
---

# Customer Credit & Ledger Management

## Overview
Customer Credit Management (also known as Udhar or Debt Tracking) handles deferred payments, partial payments, credit limits, and historical credit transactions for regular customers.

---

## ⚙️ Core Functionality

1. **Credit Balance Tracking**: Maintains active debt balance per customer document (`creditBalance`).
2. **Checkout Integration**: Allows credit sales on [[POS Checkout & Billing]], increasing customer debt.
3. **Debt Repayment**: Record debt payments using [[Add Credit Modal Component]], which updates customer debt and deposits funds into the shop cash/bank account via [[Finance System Helper Module]].
4. **Transaction History**: View full audit history of credit issued vs payments received in [[Customer Credit History Modal Component]].

---

## 🔗 Related Graph Links
- **Screen**: [[Customers Page]]
- **Modals**: [[Customer Modal Component]], [[Add Credit Modal Component]], [[Customer Credit History Modal Component]]
- **Modules**: [[Credits Helper Module]], [[Finance System Helper Module]]
- **Collections**: [[Customers Collection]], [[Credits Collection]], [[Financial Transactions Collection]]

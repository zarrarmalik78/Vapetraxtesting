---
tags:
  - api
  - module
  - accounting
---

# Finance System Helper Module

## Overview
- **File**: `src/lib/finance-system.ts`
- **Scope**: Double-Entry Account Engine

---

## 🎯 Functions & Logic
- `recordTransaction()`: Atomic double-entry balancing debit/credit entries.
- `updateAccountBalance()`: Updates Cash/Bank balance.
- `getAccountLedger()`: Fetches account transaction history.

---

## 🔗 Related Graph Links
- **Components**: [[Account List Component]], [[Manual Transaction Modal Component]], [[Transaction Ledger Component]]
- **Collections**: [[Financial Accounts Collection]], [[Financial Transactions Collection]]
- **Feature**: [[Double-Entry Financial Accounting System]]
- **Decision Record**: [[ADR-005 Client-Side Double-Entry Finance System]]

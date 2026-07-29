---
tags:
  - feature
  - accounting
  - finance
---

# Double-Entry Financial Accounting System

## Overview
The Double-Entry Financial Accounting System maintains multi-account ledgers (Cash Drawer, Bank Account, EasyPaisa/JazzCash) with complete debit and credit transaction history.

---

## ⚙️ Core Architecture

Implemented in [[Finance System Helper Module]] (`src/lib/finance-system.ts`):

1. **Account Entities**: Managed in [[Financial Accounts Collection]]. Accounts maintain a live `balance`.
2. **Double-Entry Ledgers**: Recorded in [[Financial Transactions Collection]]. Every sale, expense, credit payment, or manual transfer creates balancing debit/credit entries.
3. **Manual Adjustment**: [[Manual Transaction Modal Component]] allows admins to log manual deposits, withdrawals, or account-to-account transfers.
4. **Audit View**: [[Transaction Ledger Component]] renders searchable transaction logs per account.

---

## 🔗 Related Graph Links
- **Module**: [[Finance System Helper Module]]
- **Components**: [[Account List Component]], [[Manual Transaction Modal Component]], [[Transaction Ledger Component]]
- **Collections**: [[Financial Accounts Collection]], [[Financial Transactions Collection]]
- **Decision Record**: [[ADR-005 Client-Side Double-Entry Finance System]]

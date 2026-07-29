---
tags:
  - adr
  - decision
  - finance
  - accounting
---

# ADR-005: Client-Side Double-Entry Finance System

## Status
**ACCEPTED**

---

## Context
Retail cash management requires tracking cash drawer vs bank account vs digital wallet balances to prevent accounting discrepancies.

---

## Decision
Implement a client-side Double-Entry Financial Accounting System in [[Finance System Helper Module]] that records balancing debit/credit transactions whenever sales, expenses, or debt payments occur.

---

## Consequences
- Complete transparency over cash vs bank account balances.
- Audit history for every financial transaction.
- Requires atomic batch writes to sync account balances alongside sales documents.

---

## 🔗 Related Graph Links
- **Module**: [[Finance System Helper Module]]
- **Feature**: [[Double-Entry Financial Accounting System]]
- **Collections**: [[Financial Accounts Collection]], [[Financial Transactions Collection]]

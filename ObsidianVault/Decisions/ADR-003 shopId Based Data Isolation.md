---
tags:
  - adr
  - decision
  - security
  - multi-tenant
---

# ADR-003: shopId Based Data Isolation

## Status
**ACCEPTED**

---

## Context
The business needed a way to operate multiple store branches from a unified cloud backend without exposing one store's stock, revenue, or customer data to another store branch.

---

## Decision
Implement a single-database multi-tenant architecture using an indexed `shopId` string property on all root collection documents, combined with user session binding in [[Auth Context]] and database enforcement in [[Security Rules]].

---

## Consequences
- Single database instance to manage and maintain.
- Complete logical isolation across store branches.
- Requires every custom hook and Firestore rule to consistently check `shopId`.

---

## 🔗 Related Graph Links
- **Concept**: [[Multi-Store Isolation]]
- **Security**: [[Security Rules]], [[Auth Context]]
- **Hooks**: [[useFirestoreOnce Hook]]

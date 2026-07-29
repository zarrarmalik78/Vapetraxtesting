---
tags:
  - adr
  - decision
  - architecture
---

# ADR-001: NoSQL Document Database Choice

## Status
**ACCEPTED**

---

## Context
Vape retail requires flexible product attributes (devices vs coils vs liquid bottle sizes) and real-time offline availability across POS terminals without complex SQL migrations.

---

## Decision
Adopt **Firebase Firestore** as the core NoSQL document database. Firestore provides built-in offline IndexedDB persistence, atomic batch writes, and global CDN access.

---

## Consequences
- Flexible schema per product type.
- Atomic multi-collection transactions via [[Atomic Batch Writes]].
- Requires query optimization to manage read quotas ([[ADR-002 Firestore Read Reduction Strategy]]).

---

## 🔗 Related Graph Links
- **Concept**: [[Atomic Batch Writes]]
- **Decision**: [[ADR-002 Firestore Read Reduction Strategy]]
- **Collections**: All Firestore collections

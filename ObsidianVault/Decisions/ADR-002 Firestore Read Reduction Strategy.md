---
tags:
  - adr
  - decision
  - firestore
  - quota
---

# ADR-002: Firestore Read Reduction Strategy

## Status
**ACCEPTED**

---

## Context
Persistent real-time listeners (`onSnapshot`) on high-traffic POS terminals were generating thousands of unneeded document reads per hour, risking Firebase quota exhaustion.

---

## Decision
Replace global real-time listeners with a custom one-time query pattern (**`useFirestoreOnce`**) that performs explicit `getDocs()` on page load and provides targeted `refetch()` triggers following user-initiated data mutations.

---

## Consequences
- Over 80% reduction in daily Firestore read quota consumption.
- Highly predictable database billing costs.
- Minor trade-off: terminals do not automatically receive live updates unless user triggers a refresh or completes an action.

---

## 🔗 Related Graph Links
- **Hook**: [[useFirestoreOnce Hook]]
- **Concept**: [[Firestore Read Quota Optimization]]
- **Decision**: [[ADR-001 NoSQL Document Database Choice]]

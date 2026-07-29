---
tags:
  - adr
  - decision
  - inventory
  - e-liquid
---

# ADR-006: Liquid E-Juice Partial Refill Tracking

## Status
**ACCEPTED**

---

## Context
Vape shops sell e-liquids both as sealed bottle units and as custom per-ML liquid refill amounts filled directly into customer device tanks.

---

## Decision
Model e-liquid inventory using a subcollection of individual bottle documents (`/products/{id}/bottles/{bottleId}`) tracking bottle states (`closed`, `opened`, `empty`). [[Bottles Helper Module]] handles automatic unsealing and milliliter deductions during checkout.

---

## Consequences
- Accurate inventory valuation for partial bottles.
- Automated unsealing of new factory bottles when open bottle ML is depleted.
- Eliminates inventory leakage from untracked refills.

---

## 🔗 Related Graph Links
- **Module**: [[Bottles Helper Module]]
- **Concept**: [[E-Liquid Bottle Tracking Logic]]
- **Subcollection**: [[Bottles Subcollection]]
- **Screen**: [[New Sale POS Page]]

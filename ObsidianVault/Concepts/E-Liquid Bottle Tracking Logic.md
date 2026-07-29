---
tags:
  - concept
  - domain
  - inventory
  - e-liquid
---

# E-Liquid Bottle Tracking Logic

## Overview
Vape retail requires specialized inventory tracking for e-liquid juice bottles. Juice can be sold either as whole sealed bottles or as partial liquid refills per milliliter (ML). VapeTrax models this using dedicated bottle tracking logic.

---

## 🧮 Bottle States & Lifecycle

Each e-liquid product tracks individual bottle documents in the [[Bottles Subcollection]] (`/products/{productId}/bottles/{bottleId}`).

```
[ Closed Bottle ] ──(Dispense ML)──> [ Opened Bottle ] ──(0 ML remaining)──> [ Empty Bottle ]
```

1. **Closed**: Full factory sealed bottle (e.g. 60ml or 120ml).
2. **Opened**: Currently active bottle being used to dispense per-ML refills at the POS counter.
3. **Empty**: Bottle has 0ml left and is retired from active refill selection.
4. **Sold**: Sealed bottle sold as a whole unit to a customer.

---

## ⚙️ Refill Calculation Algorithm

Implemented in [[Bottles Helper Module]] (`src/lib/bottles.ts`):

1. **Check Active Bottle**: Find an existing `opened` bottle for the selected product.
2. **Deduct ML**: Subtract requested sale volume (e.g. 10ml) from `remainingMl`.
3. **Auto-Unseal**: If no opened bottle exists or remaining ML is insufficient, automatically transition a `closed` bottle to `opened`.
4. **Batch Sync**: Atomically update total product stock and bottle document in Firestore during checkout on [[New Sale POS Page]].

---

## 🔗 Related Graph Links
- **Helper Module**: [[Bottles Helper Module]]
- **Database Subcollection**: [[Bottles Subcollection]], [[Products Collection]]
- **Screens**: [[New Sale POS Page]], [[Stock Inventory Page]]
- **Decision Record**: [[ADR-006 Liquid E-Juice Partial Refill Tracking]]

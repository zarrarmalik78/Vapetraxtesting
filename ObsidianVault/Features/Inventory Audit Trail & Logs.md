---
tags:
  - feature
  - audit
  - logs
---

# Inventory Audit Trail & Logs

## Overview
The Inventory Audit Trail tracks every stock addition, deduction, price change, or manual adjustment with timestamp and actor details.

---

## ⚙️ Tracking Schema

Stored in [[Inventory Logs Collection]]:
- `productId`: ID of product changed.
- `action`: E.g., `sale`, `restock`, `manual_deduction`, `reversal`.
- `quantityChange`: Amount adjusted (+/-).
- `previousStock` & `newStock`: Snapshot of inventory numbers.
- `actorName`: Identified via [[Actor Helper Module]].

---

## 🔗 Related Graph Links
- **Screen**: [[Inventory Logs Page]]
- **Module**: [[Actor Helper Module]]
- **Collection**: [[Inventory Logs Collection]]
- **Concepts**: [[Atomic Batch Writes]]

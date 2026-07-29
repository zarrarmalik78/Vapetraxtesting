---
tags:
  - api
  - module
  - bottles
  - e-liquid
---

# Bottles Helper Module

## Overview
- **File**: `src/lib/bottles.ts`
- **Scope**: E-Liquid Volume & Refill Math

---

## 🎯 Functions & Logic
- `calculateRefillStock()`: Deducts ML volume from active open bottle or transitions sealed bottle to opened state.
- `getBottleStatus()`: Calculates bottle remaining capacity and status tags.

---

## 🔗 Related Graph Links
- **Screen**: [[New Sale POS Page]], [[Stock Inventory Page]]
- **Subcollection**: [[Bottles Subcollection]]
- **Concept**: [[E-Liquid Bottle Tracking Logic]]
- **Decision Record**: [[ADR-006 Liquid E-Juice Partial Refill Tracking]]

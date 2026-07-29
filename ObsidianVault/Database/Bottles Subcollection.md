---
tags:
  - database
  - subcollection
  - bottles
  - e-liquid
---

# Bottles Subcollection

## Overview
- **Path**: `/products/{productId}/bottles/{bottleId}`
- **Entity**: `Bottle`

---

## 📋 Schema Definition

```json
{
  "bottleSize": "number (Required)",
  "remainingMl": "number (Required)",
  "status": "string ['closed' | 'opened' | 'empty' | 'sold'] (Required)",
  "openedDate": "string [date-time]",
  "createdAt": "string [date-time]",
  "updatedAt": "string [date-time]"
}
```

---

## 🔗 Related Graph Links
- **Parent Collection**: [[Products Collection]]
- **Module**: [[Bottles Helper Module]]
- **Concept**: [[E-Liquid Bottle Tracking Logic]]
- **Screen**: [[New Sale POS Page]], [[Stock Inventory Page]]

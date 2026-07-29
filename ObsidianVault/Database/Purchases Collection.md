---
tags:
  - database
  - collection
  - purchases
---

# Purchases Collection

## Overview
- **Path**: `/purchases/{purchaseId}`
- **Entity**: `Purchase`

---

## 📋 Schema Definition

```json
{
  "supplierId": "string (Required)",
  "productId": "string (Required)",
  "quantity": "number (Required)",
  "purchasePrice": "number (Required)",
  "purchaseDate": "string [date-time] (Required)",
  "shopId": "string (Required)",
  "createdAt": "string [date-time]"
}
```

---

## 🔗 Related Graph Links
- **Collections**: [[Suppliers Collection]], [[Products Collection]]
- **Feature**: [[Stock & Inventory Management]]

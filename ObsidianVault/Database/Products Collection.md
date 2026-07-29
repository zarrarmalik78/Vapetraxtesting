---
tags:
  - database
  - collection
  - products
  - inventory
---

# Products Collection

## Overview
- **Path**: `/products/{productId}`
- **Entity**: `Product`

---

## 📋 Schema Definition

```json
{
  "name": "string (Required)",
  "category": "string ['device' | 'coil' | 'e-liquid' | 'pod' | 'accessory'] (Required)",
  "brand": "string",
  "costPrice": "number (Required)",
  "sellingPrice": "number (Required)",
  "stockQuantity": "number (Required)",
  "minStockLevel": "number",
  "unit": "string",
  "bottleSize": "string",
  "nicotineLevel": "number",
  "shopId": "string (Required)",
  "createdAt": "string [date-time]",
  "updatedAt": "string [date-time]"
}
```

---

## 🔗 Related Graph Links
- **Subcollection**: [[Bottles Subcollection]]
- **Screens**: [[Stock Inventory Page]], [[New Sale POS Page]]
- **Feature**: [[Stock & Inventory Management]]
- **Concepts**: [[E-Liquid Bottle Tracking Logic]], [[Cost of Goods Sold & Profit Calculation]]

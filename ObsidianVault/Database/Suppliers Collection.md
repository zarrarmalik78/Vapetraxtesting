---
tags:
  - database
  - collection
  - suppliers
---

# Suppliers Collection

## Overview
- **Path**: `/suppliers/{supplierId}`
- **Entity**: `Supplier`

---

## 📋 Schema Definition

```json
{
  "name": "string (Required)",
  "city": "string",
  "contactNumber": "string",
  "email": "string [email]",
  "shopId": "string (Required)",
  "createdAt": "string [date-time]"
}
```

---

## 🔗 Related Graph Links
- **Screen**: [[Stock Inventory Page]]
- **Collection**: [[Purchases Collection]]
- **Feature**: [[Stock & Inventory Management]]

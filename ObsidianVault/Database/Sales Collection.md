---
tags:
  - database
  - collection
  - sales
---

# Sales Collection

## Overview
- **Path**: `/sales/{saleId}`
- **Entity**: `Sale`

---

## 📋 Schema Definition

```json
{
  "customerId": "string",
  "totalAmount": "number (Required)",
  "paymentMethod": "string ['cash' | 'online' | 'credit' | 'return'] (Required)",
  "saleDate": "string [date-time] (Required)",
  "items": "array [SaleItem] (Required)",
  "shopId": "string (Required)",
  "cashierName": "string"
}
```

---

## 🔗 Related Graph Links
- **Screens**: [[New Sale POS Page]], [[Sales History Page]], [[Dashboard Page]]
- **Concepts**: [[POS Checkout & Billing]], [[Atomic Batch Writes]], [[Sales Reversal & Refund Logic]]
- **Collections**: [[Products Collection]], [[Customers Collection]], [[Inventory Logs Collection]]

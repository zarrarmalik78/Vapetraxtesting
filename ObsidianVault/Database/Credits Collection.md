---
tags:
  - database
  - collection
  - credits
---

# Credits Collection

## Overview
- **Path**: `/credits/{creditId}`
- **Entity**: `Credit`

---

## 📋 Schema Definition

```json
{
  "creditType": "string ['customer' | 'supplier' | 'others'] (Required)",
  "customerId": "string",
  "supplierId": "string",
  "entityName": "string",
  "entityContact": "string",
  "amount": "number (Required)",
  "description": "string",
  "transactionType": "string ['given' | 'taken'] (Required)",
  "createdBy": "string (Required)",
  "shopId": "string (Required)",
  "createdAt": "string [date-time]"
}
```

---

## 🔗 Related Graph Links
- **Screen**: [[Customers Page]]
- **Modals**: [[Add Credit Modal Component]], [[Customer Credit History Modal Component]]
- **Feature**: [[Customer Credit & Ledger Management]]
- **Module**: [[Credits Helper Module]]

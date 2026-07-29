---
tags:
  - database
  - collection
  - customers
---

# Customers Collection

## Overview
- **Path**: `/customers/{customerId}`
- **Entity**: `Customer`

---

## 📋 Schema Definition

```json
{
  "name": "string (Required)",
  "phone": "string (Required)",
  "email": "string [email]",
  "creditBalance": "number (Required)",
  "shopId": "string (Required)",
  "createdAt": "string [date-time]"
}
```

---

## 🔗 Related Graph Links
- **Screen**: [[Customers Page]], [[New Sale POS Page]]
- **Modals**: [[Customer Modal Component]], [[Add Credit Modal Component]]
- **Feature**: [[Customer Credit & Ledger Management]]
- **Collection**: [[Credits Collection]]

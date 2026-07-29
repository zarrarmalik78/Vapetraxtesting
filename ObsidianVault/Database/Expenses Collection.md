---
tags:
  - database
  - collection
  - expenses
---

# Expenses Collection

## Overview
- **Path**: `/expenses/{expenseId}`
- **Entity**: `Expense`

---

## 📋 Schema Definition

```json
{
  "category": "string (Required)",
  "description": "string",
  "amount": "number (Required)",
  "expenseDate": "string [date-time] (Required)",
  "scope": "string ['shop' | 'personal']",
  "shopId": "string (Required)",
  "createdAt": "string [date-time]"
}
```

---

## 🔗 Related Graph Links
- **Screens**: [[Expenses Page]], [[Personal Expenses Page]]
- **Feature**: [[Shop & Personal Expense Tracking]]
- **Module**: [[Finance System Helper Module]]
- **Concept**: [[Cost of Goods Sold & Profit Calculation]]

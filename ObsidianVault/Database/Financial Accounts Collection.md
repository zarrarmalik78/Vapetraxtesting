---
tags:
  - database
  - collection
  - finance
  - accounts
---

# Financial Accounts Collection

## Overview
- **Path**: `/accounts/{accountId}`
- **Entity**: `Account`

---

## 📋 Schema Definition

```json
{
  "name": "string (Required)",
  "type": "string ['cash' | 'bank' | 'wallet'] (Required)",
  "balance": "number (Required)",
  "accountNumber": "string",
  "shopId": "string (Required)",
  "updatedAt": "string [date-time]"
}
```

---

## 🔗 Related Graph Links
- **Components**: [[Account List Component]], [[Manual Transaction Modal Component]]
- **Module**: [[Finance System Helper Module]]
- **Feature**: [[Double-Entry Financial Accounting System]]
- **Collection**: [[Financial Transactions Collection]]

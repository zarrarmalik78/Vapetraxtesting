---
tags:
  - database
  - collection
  - finance
  - transactions
---

# Financial Transactions Collection

## Overview
- **Path**: `/transactions/{transactionId}`
- **Entity**: `Transaction`

---

## 📋 Schema Definition

```json
{
  "accountId": "string (Required)",
  "type": "string ['debit' | 'credit'] (Required)",
  "amount": "number (Required)",
  "category": "string (Required)",
  "description": "string",
  "referenceId": "string",
  "shopId": "string (Required)",
  "createdAt": "string [date-time]"
}
```

---

## 🔗 Related Graph Links
- **Components**: [[Transaction Ledger Component]], [[Manual Transaction Modal Component]]
- **Module**: [[Finance System Helper Module]]
- **Feature**: [[Double-Entry Financial Accounting System]]
- **Collection**: [[Financial Accounts Collection]]

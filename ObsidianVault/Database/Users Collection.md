---
tags:
  - database
  - collection
  - users
---

# Users Collection

## Overview
- **Path**: `/users/{uid}`
- **Entity**: `User`

---

## 📋 Schema Definition

```json
{
  "username": "string (Required)",
  "email": "string [email] (Required)",
  "role": "string ['admin' | 'cashier'] (Required)",
  "shopId": "string (Required)",
  "createdAt": "string [date-time]"
}
```

---

## 🔗 Related Graph Links
- **Context**: [[Auth Context]]
- **Screen**: [[Login Page]], [[Settings Page]]
- **Concepts**: [[User Roles & Permissions]], [[Multi-Store Isolation]]

---
tags:
  - feature
  - users
  - accounts
---

# Multi-User Account Management

## Overview
Multi-User Account Management enables store owners to create secondary cashier accounts, manage access credentials, and assign roles without exposing root administrative functions.

---

## ⚙️ Functionality
1. **Create Cashiers**: Owner creates cashier login credentials bound to the store's `shopId`.
2. **Role Assignment**: Assign `cashier` or `admin` permissions.
3. **Activity Association**: All sales, stock changes, and expense logs automatically link to the active user's username via [[Actor Helper Module]].

---

## 🔗 Related Graph Links
- **Screen**: [[Settings Page]]
- **Collection**: [[Users Collection]]
- **Concept**: [[User Roles & Permissions]], [[Multi-Store Isolation]]
- **Module**: [[Actor Helper Module]]

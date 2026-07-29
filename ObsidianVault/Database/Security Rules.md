---
tags:
  - database
  - security
  - rules
  - firestore
---

# Security Rules

## Overview
- **File**: `firestore.rules`
- **Scope**: Database Access Enforcement

---

## 🔒 Key Rule Checks

1. **Authentication**: All requests require `request.auth != null`.
2. **Tenant Isolation**: Read/write queries check `request.resource.data.shopId == resource.data.shopId`.
3. **Role Restrictions**: Delete operations on products, customers, or sales require `getUserRole() == 'admin'`.

---

## 🔗 Related Graph Links
- **Context**: [[Auth Context]]
- **Concepts**: [[User Roles & Permissions]], [[Multi-Store Isolation]]
- **Collections**: All Firestore collections

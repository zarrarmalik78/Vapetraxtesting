---
tags:
  - api
  - context
  - auth
---

# Auth Context

## Overview
- **File**: `src/contexts/AuthContext.tsx`
- **Scope**: Global Authentication & Tenant State Provider

---

## 🎯 Functions & State
- `user`: Active Firebase User object enriched with role (`admin` | `cashier`) and `shopId`.
- `loading`: Session initialization state.
- `login()`, `logout()`: Authentication triggers.

---

## 🔗 Related Graph Links
- **Screen**: [[Login Page]]
- **Guard**: [[Protected Route Component]]
- **Concepts**: [[User Roles & Permissions]], [[Multi-Store Isolation]]
- **Collection**: [[Users Collection]]

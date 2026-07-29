---
tags:
  - screen
  - page
  - auth
  - login
---

# Login Page

## Overview
- **File**: `src/pages/Login.tsx`
- **Route**: `/login`
- **Role Requirement**: Public / Unauthenticated

---

## 🎯 Purpose
Authentication screen supporting username/email and password authentication. Authenticates credentials against Firebase Auth and retrieves user role and `shopId` binding via [[Auth Context]].

---

## 🔗 Related Components & Hooks
- **Context**: [[Auth Context]]
- **Collections**: [[Users Collection]]
- **Concepts**: [[User Roles & Permissions]], [[Multi-Store Isolation]]

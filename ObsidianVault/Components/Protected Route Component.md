---
tags:
  - component
  - security
  - auth
---

# Protected Route Component

## Overview
- **File**: `src/components/layout/ProtectedRoute.tsx`
- **Scope**: Routing Guard

---

## 🎯 Purpose
Wrapper component for client routes in `App.tsx`. Verifies session state in [[Auth Context]]; redirects unauthenticated visitors to [[Login Page]] and non-admin cashiers away from restricted routes.

---

## 🔗 Related Graph Links
- **Context**: [[Auth Context]]
- **Screen**: [[Login Page]]
- **Concepts**: [[User Roles & Permissions]], [[Single Page Application Architecture]]

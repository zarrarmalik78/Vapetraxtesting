---
tags:
  - api
  - context
  - data
---

# Data Context

## Overview
- **File**: `src/contexts/DataContext.tsx`
- **Scope**: App-Wide In-Memory Cache Provider

---

## 🎯 Purpose
Caches high-frequency store collections across route navigation to avoid unnecessary Firestore network reads.

---

## 🔗 Related Graph Links
- **Hook**: [[useFirestoreOnce Hook]]
- **Concept**: [[Firestore Read Quota Optimization]]

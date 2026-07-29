---
tags:
  - api
  - module
  - backup
---

# Backup Helper Module

## Overview
- **File**: `src/lib/backup.ts`
- **Scope**: Vault Exporter & Importer

---

## 🎯 Functions & Logic
- `exportBackupJSON()`: Serializes products, sales, customers, expenses, and settings into JSON.
- `restoreBackupJSON()`: Validates and imports JSON backup data into Firestore using batch writes.

---

## 🔗 Related Graph Links
- **Component**: [[Backup Restore Tab Component]]
- **Feature**: [[Database Backup & Restore]]
- **Concept**: [[Atomic Batch Writes]]

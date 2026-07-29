---
tags:
  - feature
  - backup
  - restore
---

# Database Backup & Restore

## Overview
Database Backup & Restore provides offline data safety by serializing entire store collections into JSON backup archives and enabling full or selective restoration.

---

## ⚙️ How It Works

Implemented in [[Backup Helper Module]] (`src/lib/backup.ts`):

1. **Backup**: Iterates through store collections (products, sales, customers, expenses, settings) and builds a timestamped JSON file.
2. **Restore**: Parses JSON backup file, validates schemas, and uses [[Atomic Batch Writes]] to write documents into Firestore.

---

## 🔗 Related Graph Links
- **Module**: [[Backup Helper Module]]
- **Component**: [[Backup Restore Tab Component]]
- **Screen**: [[Settings Page]]
- **Concept**: [[Atomic Batch Writes]]

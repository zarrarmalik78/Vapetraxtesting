---
tags:
  - database
  - collection
  - audit
  - logs
---

# Inventory Logs Collection

## Overview
- **Path**: `/inventoryLogs/{logId}`
- **Entity**: `InventoryLog`

---

## 📋 Schema Definition

```json
{
  "productId": "string (Required)",
  "action": "string (Required)",
  "quantityChange": "number (Required)",
  "previousStock": "number (Required)",
  "newStock": "number (Required)",
  "notes": "string",
  "actorName": "string",
  "shopId": "string (Required)",
  "createdAt": "string [date-time]"
}
```

---

## 🔗 Related Graph Links
- **Screen**: [[Inventory Logs Page]]
- **Feature**: [[Inventory Audit Trail & Logs]]
- **Module**: [[Actor Helper Module]]
- **Concepts**: [[Atomic Batch Writes]]

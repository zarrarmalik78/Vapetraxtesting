---
tags:
  - database
  - collection
  - settings
---

# Settings Collection

## Overview
- **Path**: `/settings/branding`
- **Entity**: `Settings`

---

## 📋 Schema Definition

```json
{
  "shopName": "string",
  "logoUrl": "string",
  "shopAddress": "string",
  "shopPhone": "string",
  "shopEmail": "string",
  "showShopAddress": "boolean",
  "showShopPhone": "boolean",
  "showShopEmail": "boolean",
  "showCustomerDetails": "boolean",
  "showPaymentMethod": "boolean",
  "showTaxDetails": "boolean",
  "taxRate": "number",
  "footerMessage": "string",
  "shopId": "string",
  "updatedAt": "string [date-time]"
}
```

---

## 🔗 Related Graph Links
- **Screen**: [[Settings Page]]
- **Feature**: [[Shop Branding & Receipt Customization]]
- **Screen Integration**: [[New Sale POS Page]] thermal receipts

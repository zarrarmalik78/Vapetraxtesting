---
tags:
  - feature
  - pos
  - checkout
---

# POS Checkout & Billing

## Overview
The Point of Sale (POS) Checkout module powers daily retail transactions. It allows cashiers to search inventory, scan barcodes, manage shopping cart items, select payment methods, track e-liquid refills, and generate thermal receipts.

---

## ⚙️ Core Functionality

1. **Product Search & Barcode Scan**: Real-time filtering by product name, category, or barcode.
2. **Cart Management**: Add/remove items, adjust quantities, apply custom discounts.
3. **E-Liquid ML Refills**: Deduct exact ML amounts from open juice bottles using [[Bottles Helper Module]].
4. **Payment Options**: Support Cash, Online/Card Transfer, Customer Credit (Udhar), and Split Payments.
5. **Receipt Generation**: Instant thermal printing and digital receipt formatting customized via [[Shop Branding & Receipt Customization]].

---

## 🔗 Related Graph Links
- **Screen**: [[New Sale POS Page]]
- **Modules & Helpers**: [[Bottles Helper Module]], [[Finance System Helper Module]]
- **Concepts**: [[Atomic Batch Writes]], [[E-Liquid Bottle Tracking Logic]], [[Customer Credit & Ledger Management]]
- **Collections**: [[Sales Collection]], [[Products Collection]], [[Customers Collection]], [[Inventory Logs Collection]]

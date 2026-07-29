---
tags:
  - concept
  - sales
  - transactions
  - reversal
---

# Sales Reversal & Refund Logic

## Overview
When a customer returns a product or a cashier voids an erroneous transaction on [[Sales History Page]], the system executes a full **Sales Reversal**.

---

## 🔄 Reversal Execution Sequence

Implemented in [[Sales Reversal Helper Module]] (`src/lib/salesReversal.ts`):

1. **Fetch Original Sale**: Retrieve the sale document from [[Sales Collection]].
2. **Stock Restoration**: For each item in the sale, restore the inventory quantity in [[Products Collection]].
3. **Customer Credit Adjustment**: If the sale was on credit (`paymentMethod === 'credit'`), reduce the customer's `creditBalance` in [[Customers Collection]].
4. **Financial Ledger Reversal**: Create a reversing entry in [[Financial Transactions Collection]] to deduct cash/bank balance via [[Finance System Helper Module]].
5. **Audit Logging**: Create a cancellation log in [[Inventory Logs Collection]].
6. **Mark Sale Void**: Update sale document status to `returned` / `reversed`.

---

## 🔒 Security
Reversals alter financial accounts and stock balances. Therefore, reversals require Admin credentials or verification via [[Secure Action Helper Module]].

---

## 🔗 Related Graph Links
- **Helper Module**: [[Sales Reversal Helper Module]], [[Finance System Helper Module]], [[Secure Action Helper Module]]
- **Screen**: [[Sales History Page]]
- **Collections**: [[Sales Collection]], [[Products Collection]], [[Customers Collection]], [[Financial Transactions Collection]]
- **Concept**: [[Atomic Batch Writes]]

---
tags:
  - concept
  - database
  - firestore
  - transactions
---

# Atomic Batch Writes

## Overview
Atomic Batch Writes guarantee data integrity across multiple Firestore collections during operations like checkout, sales reversals, or debt payments. If any single document update fails, the entire transaction rolls back cleanly.

---

## ⚡ Use Case: POS Checkout Transaction

When a cashier completes a sale on [[New Sale POS Page]], an atomic batch write (`writeBatch()`) executes up to 5 operations in a single network round-trip:

```typescript
const batch = writeBatch(db);

// 1. Create Sale Document
batch.set(doc(collection(db, 'sales')), saleData);

// 2. Decrement Product Stock
batch.update(doc(db, 'products', item.id), {
  stockQuantity: increment(-item.quantity)
});

// 3. Log Audit Trail
batch.set(doc(collection(db, 'inventoryLogs')), logData);

// 4. Update Customer Credit Balance (If Udhar / Credit sale)
if (paymentMethod === 'credit') {
  batch.update(doc(db, 'customers', customerId), {
    creditBalance: increment(totalAmount)
  });
}

// Commit atomically
await batch.commit();
```

---

## 🔒 Benefiting Features
- [[POS Checkout & Billing]]: Synchronizes sales history, inventory deductions, customer credit, and audit logs.
- [[Sales Reversal & Refund Logic]]: Reverses stock levels, updates double-entry account ledgers, and cancels sales atomically via [[Sales Reversal Helper Module]].
- [[Customer Credit & Ledger Management]]: Ensures credit payments adjust both customer balance and financial cash accounts.

---

## 🔗 Related Graph Links
- **Features**: [[POS Checkout & Billing]], [[Sales Reversal & Refund Logic]], [[Customer Credit & Ledger Management]]
- **Modules**: [[Sales Reversal Helper Module]], [[Finance System Helper Module]]
- **Collections**: [[Sales Collection]], [[Products Collection]], [[Customers Collection]], [[Inventory Logs Collection]]
- **Decision Record**: [[ADR-001 NoSQL Document Database Choice]]

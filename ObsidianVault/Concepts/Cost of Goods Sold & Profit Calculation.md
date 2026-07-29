---
tags:
  - concept
  - finance
  - calculations
---

# Cost of Goods Sold & Profit Calculation

## Overview
Accurate financial reporting requires computing **Cost of Goods Sold (COGS)**, **Gross Profit**, and **Net Profit** across daily sales, date ranges, and individual item transactions.

---

## 🧮 Mathematical Formulas

All financial formulas are centralized in [[Finance Helper Module]] (`src/lib/finance.ts`):

1. **Revenue**:
   $$\text{Revenue} = \sum (\text{Selling Price} \times \text{Quantity Sold})$$

2. **Cost of Goods Sold (COGS)**:
   $$\text{COGS} = \sum (\text{Cost Price at Time of Purchase} \times \text{Quantity Sold})$$

3. **Gross Profit**:
   $$\text{Gross Profit} = \text{Revenue} - \text{COGS}$$

4. **Gross Profit Margin (%)**:
   $$\text{Profit Margin} = \left( \frac{\text{Gross Profit}}{\text{Revenue}} \right) \times 100$$

5. **Net Profit**:
   $$\text{Net Profit} = \text{Gross Profit} - \text{Total Shop Operating Expenses}$$

---

## 📊 Integration Across Screens

- [[Dashboard Page]]: Displays daily gross profit, net profit, revenue cards, and COGS totals for admins.
- [[Analytics Page]]: Displays profit trends, margin percentages, and product profitability charts.
- [[Detailed Reports Page]]: Generates exportable financial income statements and profit breakdowns.

---

## 🔗 Related Graph Links
- **Helper Module**: [[Finance Helper Module]], [[Finance System Helper Module]]
- **Screens**: [[Dashboard Page]], [[Analytics Page]], [[Detailed Reports Page]], [[Expenses Page]]
- **Collections**: [[Sales Collection]], [[Expenses Collection]], [[Products Collection]]

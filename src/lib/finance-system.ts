import { collection, doc, getDocs, query, orderBy, Timestamp, addDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { FinanceAccount, FinanceTransaction, AccountCategory } from '../types/finance';

const defaultDates = { createdAt: new Date(), updatedAt: new Date() };

const SYS_ACCOUNTS: FinanceAccount[] = [
  { id: 'SYS_CASH', shopId: 'system', name: 'Cash Drawer', category: 'ASSET', balance: 0, ...defaultDates },
  { id: 'SYS_BANK', shopId: 'system', name: 'Bank Account', category: 'ASSET', balance: 0, ...defaultDates },
  { id: 'SYS_REV', shopId: 'system', name: 'Sales Revenue', category: 'REVENUE', balance: 0, ...defaultDates },
  { id: 'SYS_EXP', shopId: 'system', name: 'Shop Expenses', category: 'EXPENSE', balance: 0, ...defaultDates },
  { id: 'SYS_REC', shopId: 'system', name: 'Accounts Receivable', category: 'ASSET', balance: 0, ...defaultDates }
];

export const getAggregatedFinancialData = async (shopId: string) => {
  // 1. Fetch Manual Accounts
  const accQuery = query(collection(db, 'finance_accounts'), where('shopId', '==', shopId));
  const accSnap = await getDocs(accQuery);
  const manualAccounts = accSnap.docs.map(d => ({ id: d.id, ...d.data() } as FinanceAccount));
  
  const allAccounts = [...SYS_ACCOUNTS.map(a => ({...a, shopId})), ...manualAccounts];
  const balances: Record<string, number> = {};
  allAccounts.forEach(a => balances[a.id] = 0);

  // 2. Fetch Sales
  const salesQuery = query(collection(db, 'sales'), where('shopId', '==', shopId));
  const salesSnap = await getDocs(salesQuery);
  
  // 3. Fetch App Expenses
  const expQuery = query(collection(db, 'expenses'), where('shopId', '==', shopId));
  const expSnap = await getDocs(expQuery);

  // 4. Fetch Manual Finance Transactions
  const txQuery = query(collection(db, 'finance_transactions'), where('shopId', '==', shopId));
  const txSnap = await getDocs(txQuery);

  const allTransactions: FinanceTransaction[] = [];

  // Generate Virtual TX for Sales
  salesSnap.forEach(d => {
    const sale = d.data();
    const id = d.id;
    const date = sale.saleDate;
    
    if (sale.paymentMethod === 'split') {
       const split = sale.splitAmounts;
       if (split.cash > 0) allTransactions.push({ id: `vt_s_cash_${id}`, shopId, date, description: `Split Sale (Cash)`, type: 'SALE', amount: split.cash, fromAccountId: 'SYS_REV', toAccountId: 'SYS_CASH', createdAt: date });
       if (split.online > 0) allTransactions.push({ id: `vt_s_bank_${id}`, shopId, date, description: `Split Sale (Online)`, type: 'SALE', amount: split.online, fromAccountId: 'SYS_REV', toAccountId: 'SYS_BANK', createdAt: date });
       if (split.credit > 0) allTransactions.push({ id: `vt_s_cred_${id}`, shopId, date, description: `Split Sale (Credit)`, type: 'SALE', amount: split.credit, fromAccountId: 'SYS_REV', toAccountId: 'SYS_REC', createdAt: date });
    } else {
       let toId = 'SYS_CASH';
       if (sale.paymentMethod === 'online') toId = 'SYS_BANK';
       if (sale.paymentMethod === 'credit') toId = 'SYS_REC';
       allTransactions.push({
         id: `vt_s_${id}`, shopId, date,
         description: `Sale #${id.slice(-6).toUpperCase()}`,
         type: 'SALE', amount: sale.totalAmount || 0,
         fromAccountId: 'SYS_REV', toAccountId: toId, createdAt: date
       });
    }
  });

  // Generate Virtual TX for App Expenses
  expSnap.forEach(d => {
    const exp = d.data();
    const id = d.id;
    allTransactions.push({
      id: `vt_e_${id}`, shopId, date: exp.expenseDate,
      description: exp.description || `App Expense`,
      type: 'EXPENSE', amount: exp.amount || 0,
      fromAccountId: 'SYS_CASH', toAccountId: 'SYS_EXP', createdAt: exp.expenseDate
    });
  });

  // Add Manual Transactions (Vendors, Loans, etc.)
  txSnap.forEach(d => {
    allTransactions.push({ id: d.id, ...d.data() } as FinanceTransaction);
  });

  // Compute Balances
  allTransactions.forEach(tx => {
    const fromAcc = allAccounts.find(a => a.id === tx.fromAccountId);
    const toAcc = allAccounts.find(a => a.id === tx.toAccountId);

    if (fromAcc) {
      // 'from' is Credited
      if (fromAcc.category === 'ASSET' || fromAcc.category === 'EXPENSE') {
        balances[fromAcc.id] -= tx.amount; // Credit decreases Assets/Expenses
      } else {
        balances[fromAcc.id] += tx.amount; // Credit increases Liabilities/Revenue/Equity
      }
    }

    if (toAcc) {
      // 'to' is Debited
      if (toAcc.category === 'ASSET' || toAcc.category === 'EXPENSE') {
        balances[toAcc.id] += tx.amount; // Debit increases Assets/Expenses
      } else {
        balances[toAcc.id] -= tx.amount; // Debit decreases Liabilities/Revenue/Equity
      }
    }
  });

  allAccounts.forEach(a => {
    a.balance = balances[a.id] || 0;
  });

  // Sort transactions (newest first)
  allTransactions.sort((a, b) => {
    const timeA = (a.date as any)?.toMillis ? (a.date as any).toMillis() : new Date(a.date as any).getTime();
    const timeB = (b.date as any)?.toMillis ? (b.date as any).toMillis() : new Date(b.date as any).getTime();
    return timeB - timeA;
  });

  return { accounts: allAccounts, transactions: allTransactions };
};

export const createAccount = async (account: Omit<FinanceAccount, 'id' | 'createdAt' | 'updatedAt'>) => {
  const accRef = await addDoc(collection(db, 'finance_accounts'), {
    ...account,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return accRef.id;
};

export const createFinanceTransaction = async (
  tx: Omit<FinanceTransaction, 'id' | 'createdAt'>
) => {
  // Since balances are now computed dynamically at read time,
  // we no longer need a runTransaction to update balance fields. We just record the movement.
  const txRef = await addDoc(collection(db, 'finance_transactions'), {
    ...tx,
    createdAt: Timestamp.now()
  });
  return txRef.id;
};

import { Timestamp } from 'firebase/firestore';

export type AccountCategory = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

export interface FinanceAccount {
  id: string;
  shopId: string;
  name: string;
  category: AccountCategory;
  balance: number; // Normal balance (positive means expected balance type)
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export type TransactionType = 
  | 'SALE' 
  | 'EXPENSE' 
  | 'TRANSFER' 
  | 'VENDOR_PURCHASE' 
  | 'VENDOR_PAYMENT' 
  | 'LOAN_BORROW' 
  | 'LOAN_REPAYMENT'
  | 'OTHER';

export interface FinanceTransaction {
  id: string;
  shopId: string;
  date: Timestamp | Date;
  description: string;
  type: TransactionType;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  createdAt: Timestamp | Date;
  createdBy?: string;
}

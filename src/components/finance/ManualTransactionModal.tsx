import React, { useState } from 'react';
import { FinanceAccount, TransactionType } from '../../types/finance';
import { createFinanceTransaction, createAccount } from '../../lib/finance-system';
import { useAuth } from '../../contexts/AuthContext';
import { Timestamp } from 'firebase/firestore';
import { X, Plus, Save } from 'lucide-react';
import toast from 'react-hot-toast';

interface ManualTransactionModalProps {
  accounts: FinanceAccount[];
  onSuccess: () => void;
  onClose: () => void;
}

export default function ManualTransactionModal({ accounts, onSuccess, onClose }: ManualTransactionModalProps) {
  const { shopId } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showNewAccount, setShowNewAccount] = useState(false);
  
  // Transaction Form
  const [amount, setAmount] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [txType, setTxType] = useState<TransactionType>('VENDOR_PAYMENT');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);

  // New Account Form
  const [newAccName, setNewAccName] = useState('');
  const [newAccCat, setNewAccCat] = useState<'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'>('LIABILITY');

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId) return;
    if (!newAccName.trim()) {
      toast.error('Account name is required');
      return;
    }

    try {
      setIsProcessing(true);
      const id = await createAccount({
        shopId,
        name: newAccName.trim(),
        category: newAccCat,
        balance: 0
      });
      toast.success('Account created successfully');
      
      // Auto-select the new account based on context (if they were trying to fill 'to' or 'from')
      // Default to 'from' if empty, else 'to'
      if (!fromAccountId) setFromAccountId(id);
      else if (!toAccountId) setToAccountId(id);
      
      setShowNewAccount(false);
      onSuccess(); // Refresh accounts list in parent
    } catch (err: any) {
      toast.error('Failed to create account: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRecordTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId) return;
    
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!fromAccountId || !toAccountId) {
      toast.error('Please select both From and To accounts');
      return;
    }
    if (fromAccountId === toAccountId) {
      toast.error('From and To accounts cannot be the same');
      return;
    }

    try {
      setIsProcessing(true);
      await createFinanceTransaction({
        shopId,
        date: new Date(txDate),
        description: description.trim() || 'Manual Entry',
        type: txType,
        amount: Number(amount),
        fromAccountId,
        toAccountId
      });
      
      toast.success('Transaction recorded successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Failed to record transaction: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in duration-300 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <h2 className="text-xl font-bold text-slate-900">Record Transaction</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-6 custom-scrollbar">
          {showNewAccount ? (
            <form onSubmit={handleCreateAccount} className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-100 mb-6">
              <h3 className="font-bold text-slate-700 text-sm mb-3">Create New Account</h3>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Account Name</label>
                <input 
                  type="text" 
                  required
                  value={newAccName}
                  onChange={e => setNewAccName(e.target.value)}
                  placeholder="e.g. Vendor: Smok"
                  className="w-full mt-1 px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500/20"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Category</label>
                <select 
                  value={newAccCat}
                  onChange={e => setNewAccCat(e.target.value as any)}
                  className="w-full mt-1 px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500/20"
                >
                  <option value="LIABILITY">Liability (Vendors, Loans)</option>
                  <option value="ASSET">Asset (Petty Cash)</option>
                  <option value="EXPENSE">Expense</option>
                  <option value="REVENUE">Revenue</option>
                  <option value="EQUITY">Equity (Capital)</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowNewAccount(false)} className="flex-1 py-3 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold text-sm">Cancel</button>
                <button type="submit" disabled={isProcessing} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm">Save Account</button>
              </div>
            </form>
          ) : (
            <button 
              type="button" 
              onClick={() => setShowNewAccount(true)}
              className="w-full py-3 mb-6 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 font-bold text-sm hover:border-violet-300 hover:text-violet-600 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Add Missing Account
            </button>
          )}

          <form onSubmit={handleRecordTransaction} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Date</label>
                <input 
                  type="date" 
                  required
                  value={txDate}
                  onChange={e => setTxDate(e.target.value)}
                  className="w-full mt-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Type</label>
                <select 
                  value={txType}
                  onChange={e => setTxType(e.target.value as any)}
                  className="w-full mt-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="VENDOR_PAYMENT">Vendor Payment</option>
                  <option value="VENDOR_PURCHASE">Vendor Purchase</option>
                  <option value="LOAN_BORROW">Borrow Loan</option>
                  <option value="LOAN_REPAYMENT">Repay Loan</option>
                  <option value="TRANSFER">Internal Transfer</option>
                  <option value="EXPENSE">Expense</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Description</label>
              <input 
                type="text" 
                required
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="e.g. Paid Ali for June stock"
                className="w-full mt-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Amount (Rs)</label>
              <input 
                type="number" 
                required
                min="0"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0.00"
                className="w-full mt-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div className="p-4 bg-violet-50 rounded-2xl border border-violet-100 space-y-4">
              <div>
                <label className="text-xs font-bold text-violet-600 uppercase tracking-widest ml-1">Credit (Money From)</label>
                <select 
                  required
                  value={fromAccountId}
                  onChange={e => setFromAccountId(e.target.value)}
                  className="w-full mt-1 px-4 py-3 bg-white border border-violet-200 rounded-xl text-slate-900"
                >
                  <option value="">Select Account...</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.category})</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-violet-600 uppercase tracking-widest ml-1">Debit (Money To)</label>
                <select 
                  required
                  value={toAccountId}
                  onChange={e => setToAccountId(e.target.value)}
                  className="w-full mt-1 px-4 py-3 bg-white border border-violet-200 rounded-xl text-slate-900"
                >
                  <option value="">Select Account...</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.category})</option>)}
                </select>
              </div>
            </div>

            <div className="pt-2">
              <button 
                type="submit" 
                disabled={isProcessing}
                className="w-full py-4 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl shadow-lg shadow-violet-600/20 transition-all flex items-center justify-center gap-2"
              >
                <Save size={20} />
                {isProcessing ? 'Saving...' : 'Record Transaction'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

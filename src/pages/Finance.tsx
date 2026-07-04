import React, { useState, useEffect } from 'react';
import { getAggregatedFinancialData } from '../lib/finance-system';
import { useAuth } from '../contexts/AuthContext';
import { FinanceAccount, FinanceTransaction } from '../types/finance';
import AccountList from '../components/finance/AccountList';
import TransactionLedger from '../components/finance/TransactionLedger';
import ManualTransactionModal from '../components/finance/ManualTransactionModal';
import { RefreshCw, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Finance() {
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const { shopId } = useAuth();

  const loadData = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const data = await getAggregatedFinancialData(shopId);
      setAccounts(data.accounts);
      setTransactions(data.transactions);
    } catch (err: any) {
      toast.error('Failed to load financial data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [shopId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance & Accounting</h1>
          <p className="text-gray-500 mt-1">Manage accounts, double-entry ledgers, and cashflow.</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors font-bold shadow-sm"
          >
            <Plus size={18} />
            Record Transaction
          </button>
          <button
            onClick={loadData}
            className="p-2 text-gray-500 hover:text-indigo-600 transition-colors bg-white rounded-lg shadow-sm border border-gray-200"
            title="Refresh Data"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="animate-spin mx-auto text-indigo-600 mb-4" size={32} />
          <p className="text-gray-500">Loading financial records...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <AccountList accounts={accounts} />
          </div>
          <div className="lg:col-span-2">
            <TransactionLedger transactions={transactions} accounts={accounts} />
          </div>
        </div>
      )}

      {showModal && (
        <ManualTransactionModal 
          accounts={accounts} 
          onClose={() => setShowModal(false)} 
          onSuccess={() => {
            setShowModal(false);
            loadData();
          }} 
        />
      )}
    </div>
  );
}

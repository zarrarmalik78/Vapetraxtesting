import React from 'react';
import { FinanceAccount } from '../../types/finance';
import { Wallet, Landmark, Users, HandCoins, FileText } from 'lucide-react';

interface AccountListProps {
  accounts: FinanceAccount[];
}

export default function AccountList({ accounts }: AccountListProps) {
  const getIcon = (category: string) => {
    switch (category) {
      case 'ASSET': return <Wallet className="text-emerald-500" size={20} />;
      case 'LIABILITY': return <HandCoins className="text-rose-500" size={20} />;
      case 'EQUITY': return <Landmark className="text-blue-500" size={20} />;
      case 'REVENUE': return <FileText className="text-indigo-500" size={20} />;
      case 'EXPENSE': return <Users className="text-orange-500" size={20} />;
      default: return <Wallet className="text-gray-500" size={20} />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(amount);
  };

  const grouped = accounts.reduce((acc, account) => {
    if (!acc[account.category]) acc[account.category] = [];
    acc[account.category].push(account);
    return acc;
  }, {} as Record<string, FinanceAccount[]>);

  return (
    <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Chart of Accounts</h2>
      
      {Object.keys(grouped).length === 0 ? (
        <p className="text-gray-500 text-sm">No accounts found.</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, accs]) => (
            <div key={category}>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                {category}
              </h3>
              <div className="space-y-3">
                {accs.map(account => (
                  <div key={account.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-white rounded-md shadow-sm">
                        {getIcon(account.category)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{account.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${
                        account.balance >= 0 ? 'text-gray-900' : 'text-red-600'
                      }`}>
                        {formatCurrency(account.balance)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

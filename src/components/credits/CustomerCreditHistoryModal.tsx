import React, { useMemo } from 'react';
import { X, CreditCard, ArrowUpRight, ArrowDownRight, User } from 'lucide-react';
import { useFirestore } from '../../hooks/useFirestore';
import { formatCurrency, cn } from '../../lib/utils';
import { orderBy, where } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../ui/LoadingSpinner';
import { toDisplayDate } from '../../lib/dates';
import { getCreditTotals } from '../../lib/credits';

interface CustomerCreditHistoryModalProps {
  customerId: string;
  customerName: string;
  onClose: () => void;
}

const CustomerCreditHistoryModal: React.FC<CustomerCreditHistoryModalProps> = ({ customerId, customerName, onClose }) => {
  const { shopId } = useAuth();
  
  const { documents: manualCredits, loading: creditsLoading } = useFirestore<any>(
    shopId ? 'credits' : null, 
    where('shopId', '==', shopId),
    where('customerId', '==', customerId),
    orderBy('createdAt', 'desc')
  );

  const { documents: sales, loading: salesLoading } = useFirestore<any>(
    shopId ? 'sales' : null, 
    where('shopId', '==', shopId),
    where('customerId', '==', customerId),
    where('paymentMethod', 'in', ['credit', 'split'])
  );

  const combinedCredits = useMemo(() => {
    const manual = manualCredits.map(c => ({
      ...c,
      source: 'manual',
      date: toDisplayDate(c.createdAt, c.createdAtClient) || new Date()
    }));

    const saleCredits = sales.map(s => {
      // Fix for split payments: Only show the credit portion
      let amount = s.totalAmount;
      if (s.paymentMethod === 'split') {
        amount = s.splitAmounts?.credit || 0;
      }

      return {
        id: s.id,
        creditType: 'customer',
        customerId: s.customerId,
        entityName: customerName,
        amount: amount,
        description: `Sale #${s.id?.slice(-6).toUpperCase()}`,
        transactionType: 'given',
        source: 'sale',
        date: toDisplayDate(s.saleDate, s.saleDateClient) || new Date(),
        createdBy: s.createdBy || null,
        actorRole: s.actorRole || null,
        actorName: s.actorName || null
      };
    });

    return [...manual, ...saleCredits].sort((a, b) => b.date - a.date);
  }, [manualCredits, sales, customerName]);

  const totals = useMemo(
    () => getCreditTotals(combinedCredits as Array<{ transactionType: 'given' | 'taken'; amount: number }>),
    [combinedCredits]
  );

  const isLoading = creditsLoading || salesLoading;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl animate-in zoom-in duration-300 overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-600 flex items-center justify-center text-white shadow-lg shadow-violet-600/20">
              <CreditCard size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Credit History</h2>
              <p className="text-slate-500 text-sm">Viewing records for <span className="font-bold text-violet-600">{customerName}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto style-scrollbar flex-1 bg-slate-50/30">
          {isLoading ? (
            <div className="flex justify-center py-12"><LoadingSpinner /></div>
          ) : (
            <div className="space-y-6">
              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-emerald-500 rounded-2xl p-5 shadow-lg shadow-emerald-500/20 relative overflow-hidden group">
                  <div className="absolute top-4 right-4 p-2 bg-white/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <ArrowUpRight size={20} className="text-white" />
                  </div>
                  <div className="relative z-10">
                    <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest mb-1">Total Credit Given</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(totals.totalGiven)}
                    </p>
                  </div>
                </div>
                <div className="bg-orange-500 rounded-2xl p-5 shadow-lg shadow-orange-500/20 relative overflow-hidden group">
                  <div className="absolute top-4 right-4 p-2 bg-white/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <ArrowDownRight size={20} className="text-white" />
                  </div>
                  <div className="relative z-10">
                    <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest mb-1">Total Credit Taken</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(totals.totalTaken)}
                    </p>
                  </div>
                </div>
                <div className="bg-cyan-500 rounded-2xl p-5 shadow-lg shadow-cyan-500/20 relative overflow-hidden group">
                  <div className="absolute top-4 right-4 p-2 bg-white/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <CreditCard size={20} className="text-white" />
                  </div>
                  <div className="relative z-10">
                    <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest mb-1">Net Balance</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(totals.netBalance)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100">
                        <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Type</th>
                        <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount</th>
                        <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</th>
                        <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                        <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {combinedCredits.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                            No credit history found for this customer.
                          </td>
                        </tr>
                      ) : (
                        combinedCredits.map((credit) => (
                          <tr key={credit.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-5 py-4">
                              <div className={cn(
                                "inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                credit.transactionType === 'given' ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"
                              )}>
                                {credit.transactionType === 'given' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                                {credit.transactionType === 'given' ? 'Given' : 'Taken'}
                              </div>
                            </td>
                            <td className="px-5 py-4 text-sm font-bold text-slate-900">{formatCurrency(credit.amount)}</td>
                            <td className="px-5 py-4">
                              <div className="flex flex-col">
                                <span className="text-sm text-slate-600">{credit.description}</span>
                                {credit.source === 'sale' && (
                                  <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wider mt-0.5">Credit Sale</span>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="text-sm text-slate-900 font-medium">
                                {credit.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </div>
                              <div className="text-xs text-slate-400">
                                {credit.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                  <User size={12} />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-slate-900">{credit.actorName || 'System'}</span>
                                  {credit.actorRole && (
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{credit.actorRole}</span>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerCreditHistoryModal;

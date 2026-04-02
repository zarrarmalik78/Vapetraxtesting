import React, { useState, useMemo } from 'react';
import { 
  CreditCard, 
  Search, 
  Trash2, 
  ArrowUpRight, 
  ArrowDownRight, 
  User, 
  MoreHorizontal
} from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import { formatCurrency, cn } from '../lib/utils';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { deleteDoc, doc, updateDoc, increment, orderBy, where, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { getCreditBalanceDelta, getCreditTotals } from '../lib/credits';
import { toDisplayDate } from '../lib/dates';
import ConfirmBulkDeleteModal from '../components/ui/ConfirmBulkDeleteModal';
import { reauthenticateForSensitiveAction, requiresPasswordReauth } from '../lib/secureAction';

const Credits: React.FC = () => {
  const { shopId, currentUser } = useAuth();
  const needsPassword = requiresPasswordReauth(currentUser);
  const { documents: credits, loading: creditsLoading } = useFirestore<any>(
    shopId ? 'credits' : null, 
    where('shopId', '==', shopId),
    orderBy('createdAt', 'desc')
  );
  const { documents: customers } = useFirestore<any>(shopId ? 'customers' : null, where('shopId', '==', shopId));

  const { documents: sales } = useFirestore<any>(
    shopId ? 'sales' : null, 
    where('shopId', '==', shopId),
    where('paymentMethod', '==', 'credit')
  );
  
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [deleteTyped, setDeleteTyped] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const allCombinedCredits = useMemo(() => {
    const manual = credits.map(c => ({
      ...c,
      source: 'manual',
      date: toDisplayDate(c.createdAt, c.createdAtClient) || new Date()
    }));

    const saleCredits = sales.map(s => {
      const customer = customers.find(c => c.id === s.customerId);
      return {
        id: s.id,
        creditType: 'customer',
        customerId: s.customerId,
        entityName: customer?.name || 'Walk-in',
        amount: s.totalAmount,
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
  }, [credits, sales, customers]);

  const combinedCredits = useMemo(() => {
    return allCombinedCredits.filter(c => {
      const name = c.entityName || customers.find(cust => cust.id === c.customerId)?.name || '';
      return (
        (name.toLowerCase().includes(searchTerm.toLowerCase()) || 
         c.description?.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (typeFilter === 'all' || c.creditType === typeFilter)
      );
    });
  }, [allCombinedCredits, customers, searchTerm, typeFilter]);

  const totals = useMemo(
    () => getCreditTotals(allCombinedCredits as Array<{ transactionType: 'given' | 'taken'; amount: number }>),
    [allCombinedCredits]
  );

  const handleDelete = async (credit: any) => {
    if (credit.source === 'sale') {
      toast.error('Credit sales must be deleted from Sales History');
      return;
    }

    if (window.confirm('Are you sure you want to delete this credit transaction?')) {
      try {
        // Reverse customer balance if applicable
        if (credit.creditType === 'customer' && credit.customerId) {
          const customerRef = doc(db, 'customers', credit.customerId);
          const reverseDelta = -getCreditBalanceDelta(credit.transactionType, Number(credit.amount) || 0);
          await updateDoc(customerRef, {
            creditBalance: increment(reverseDelta)
          });
        }

        await deleteDoc(doc(db, 'credits', credit.id));
        toast.success('Credit transaction deleted');
      } catch (error: any) {
        console.error('Delete credit error:', error);
        const code = error?.code ? ` (${error.code})` : '';
        toast.error((error?.message || 'Failed to delete transaction') + code);
      }
    }
  };

  const manualRows = combinedCredits.filter((c) => c.source === 'manual');
  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? manualRows.map((c) => c.id) : []);
  };
  const toggleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => checked ? [...new Set([...prev, id])] : prev.filter((x) => x !== id));
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    setBulkDeleting(true);
    try {
      if (needsPassword && currentUser) {
        await reauthenticateForSensitiveAction(currentUser, deletePassword);
      }
      const selected = manualRows.filter((r) => selectedIds.includes(r.id));
      const batch = writeBatch(db);
      selected.forEach((credit) => {
        if (credit.creditType === 'customer' && credit.customerId) {
          const customerRef = doc(db, 'customers', credit.customerId);
          const reverseDelta = -getCreditBalanceDelta(credit.transactionType, Number(credit.amount) || 0);
          batch.update(customerRef, { creditBalance: increment(reverseDelta) });
        }
        batch.delete(doc(db, 'credits', credit.id));
      });
      await batch.commit();
      toast.success(`Deleted ${selected.length} credit record(s)`);
      setSelectedIds([]);
      setShowBulkDeleteModal(false);
      setDeleteTyped('');
      setDeletePassword('');
    } catch (error: any) {
      const code = error?.code || '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') toast.error('Incorrect password.');
      else toast.error(error?.message || 'Bulk delete failed');
    } finally {
      setBulkDeleting(false);
    }
  };

  if (creditsLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-600 flex items-center justify-center text-white shadow-lg shadow-violet-600/20">
            <CreditCard size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Credits History</h1>
            <p className="text-slate-500 text-sm">View customer and other credit transactions across manual entries and credit sales.</p>
          </div>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="metric-card-emerald rounded-2xl p-6 shadow-lg shadow-emerald-500/20 relative overflow-hidden group">
          <div className="absolute top-4 right-4 p-3 bg-white/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
            <ArrowUpRight size={24} className="text-white" />
          </div>
          <div className="relative z-10">
            <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-1">Total Credit Given</p>
            <p className="text-3xl font-bold text-white">
              {formatCurrency(totals.totalGiven)}
            </p>
          </div>
        </div>
        <div className="metric-card-orange rounded-2xl p-6 shadow-lg shadow-orange-500/20 relative overflow-hidden group">
          <div className="absolute top-4 right-4 p-3 bg-white/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
            <ArrowDownRight size={24} className="text-white" />
          </div>
          <div className="relative z-10">
            <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-1">Total Credit Taken</p>
            <p className="text-3xl font-bold text-white">
              {formatCurrency(totals.totalTaken)}
            </p>
          </div>
        </div>
        <div className="metric-card-cyan rounded-2xl p-6 shadow-lg shadow-cyan-500/20 relative overflow-hidden group">
          <div className="absolute top-4 right-4 p-3 bg-white/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
            <CreditCard size={24} className="text-white" />
          </div>
          <div className="relative z-10">
            <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-1">Net Credit Balance</p>
            <p className="text-3xl font-bold text-white">
              {formatCurrency(totals.netBalance)}
            </p>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="glass-card p-4 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all shadow-sm"
          />
        </div>
        <div className="flex gap-2">
          <select 
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all shadow-sm"
          >
            <option value="all">All Types</option>
            <option value="customer">Customers</option>
            <option value="others">Others</option>
          </select>

        </div>
        {selectedIds.length > 0 && (
          <button
            onClick={() => setShowBulkDeleteModal(true)}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold"
          >
            Delete Selected ({selectedIds.length})
          </button>
        )}
      </div>

      {/* Credits Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Entity</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Type</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">By</th>
                <th className="px-3 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">
                  <input
                    type="checkbox"
                    checked={manualRows.length > 0 && selectedIds.length === manualRows.length}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                  />
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {combinedCredits.map((credit) => {
                const customer = customers.find(c => c.id === credit.customerId);
                const entityName = credit.entityName || customer?.name || 'Unknown';

                return (
                  <tr key={credit.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
                          credit.creditType === 'customer' ? "bg-violet-100 text-violet-600" :
                          "bg-slate-100 text-slate-600"
                        )}>
                          {credit.creditType === 'customer' ? <User size={18} /> : 
                           <MoreHorizontal size={18} />}
                        </div>
                        <span className="text-slate-900 font-bold">{entityName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={cn(
                        "inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        credit.transactionType === 'given' ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"
                      )}>
                        {credit.transactionType === 'given' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                        {credit.transactionType}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">{formatCurrency(credit.amount)}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-600">{credit.description}</span>
                        {credit.source === 'sale' && (
                          <span className="text-[10px] text-violet-600 font-bold uppercase tracking-widest mt-0.5">Sale Record</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {credit.date.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                          credit.actorRole === 'cashier' ? "bg-blue-100 text-blue-700" : "bg-violet-100 text-violet-700"
                        )}>
                          {credit.actorRole === 'cashier' ? 'Cashier' : 'Admin'}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">{credit.actorName || 'System'}</span>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-right">
                      <input
                        type="checkbox"
                        disabled={credit.source !== 'manual'}
                        checked={selectedIds.includes(credit.id)}
                        onChange={(e) => toggleSelectOne(credit.id, e.target.checked)}
                      />
                    </td>
                    <td className="px-6 py-4 text-right">
                      {credit.source === 'manual' && (
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleDelete(credit)}
                            className="p-2 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-all" 
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {combinedCredits.length === 0 && (
          <div className="py-20 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="text-slate-300" size={40} />
            </div>
            <p className="text-slate-400 font-medium">No credit transactions found.</p>
          </div>
        )}
      </div>
      <ConfirmBulkDeleteModal
        open={showBulkDeleteModal}
        count={selectedIds.length}
        title="Delete selected credits?"
        busy={bulkDeleting}
        typedConfirm={deleteTyped}
        onTypedConfirmChange={setDeleteTyped}
        requirePassword={needsPassword}
        password={deletePassword}
        onPasswordChange={setDeletePassword}
        onClose={() => {
          if (bulkDeleting) return;
          setShowBulkDeleteModal(false);
          setDeleteTyped('');
          setDeletePassword('');
        }}
        onConfirm={handleBulkDelete}
      />
    </div>
  );
};

export default Credits;

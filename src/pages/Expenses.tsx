import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  Search, 
  Plus, 
  Edit2,
  Filter, 
  Trash2, 
  Calendar, 
  Tag, 
  ArrowUpDown,
  X,
  Clock,
  TrendingDown,
  Wallet
} from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import { formatCurrency, cn } from '../lib/utils';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { deleteDoc, doc, updateDoc, addDoc, collection, serverTimestamp, orderBy, where, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { buildActorMeta } from '../lib/actor';
import { toDisplayDate } from '../lib/dates';
import ConfirmBulkDeleteModal from '../components/ui/ConfirmBulkDeleteModal';
import { reauthenticateForSensitiveAction, requiresPasswordReauth } from '../lib/secureAction';

const Expenses: React.FC = () => {
  const { shopId, userRole, currentUser } = useAuth();
  const isCashier = userRole === 'cashier';
  const needsPassword = requiresPasswordReauth(currentUser);
  const { documents: expenses, loading } = useFirestore<any>(
    shopId ? 'expenses' : null, 
    where('shopId', '==', shopId),
    orderBy('expenseDate', 'desc')
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [deleteTyped, setDeleteTyped] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => 
      (e.description?.toLowerCase().includes(searchTerm.toLowerCase()) || 
       e.category?.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (categoryFilter === 'all' || e.category === categoryFilter)
    );
  }, [expenses, searchTerm, categoryFilter]);

  const handleDelete = async (id: string) => {
    if (isCashier) {
      toast.error('Cashiers are not allowed to delete expenses');
      return;
    }
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await deleteDoc(doc(db, 'expenses', id));
        toast.success('Expense deleted successfully');
      } catch (error) {
        toast.error('Failed to delete expense');
      }
    }
  };

  const categories = ['Rent', 'Electricity', 'Salary', 'Miscellaneous', 'Utilities', 'Maintenance'];
  const toggleSelectAll = (checked: boolean) => setSelectedIds(checked ? filteredExpenses.map((e) => e.id) : []);
  const toggleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => checked ? [...new Set([...prev, id])] : prev.filter((x) => x !== id));
  };

  const handleBulkDelete = async () => {
    if (isCashier) return;
    if (!selectedIds.length) return;
    setBulkDeleting(true);
    try {
      if (needsPassword && currentUser) {
        await reauthenticateForSensitiveAction(currentUser, deletePassword);
      }
      const batch = writeBatch(db);
      selectedIds.forEach((id) => batch.delete(doc(db, 'expenses', id)));
      await batch.commit();
      toast.success(`Deleted ${selectedIds.length} expense(s)`);
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

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-600 flex items-center justify-center text-white shadow-lg shadow-violet-600/20">
            <DollarSign size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Expense Management</h1>
            <p className="text-slate-500 text-sm">Track your operating costs and miscellaneous shop expenses</p>
          </div>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-violet-600/20 uppercase tracking-wider text-sm"
        >
          <Plus size={20} />
          Add Expense
        </button>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="metric-card-orange rounded-2xl p-6 shadow-lg shadow-orange-500/20 relative overflow-hidden group">
          <div className="absolute top-4 right-4 p-3 bg-white/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
            <TrendingDown size={24} className="text-white" />
          </div>
          <div className="relative z-10">
            <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-1">Total Expenses</p>
            <p className="text-3xl font-bold text-white">{expenses.length}</p>
          </div>
        </div>
        <div className="metric-card-red rounded-2xl p-6 shadow-lg shadow-rose-500/20 relative overflow-hidden group">
          <div className="absolute top-4 right-4 p-3 bg-white/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
            <Wallet size={24} className="text-white" />
          </div>
          <div className="relative z-10">
            <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-1">Total Procurement Cost</p>
            <p className="text-3xl font-bold text-white">
              {formatCurrency(expenses.reduce((acc, e) => acc + (e.amount || 0), 0))}
            </p>
          </div>
        </div>
        <div className="metric-card-pink rounded-2xl p-6 shadow-lg shadow-fuchsia-500/20 relative overflow-hidden group">
          <div className="absolute top-4 right-4 p-3 bg-white/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
            <Tag size={24} className="text-white" />
          </div>
          <div className="relative z-10">
            <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-1">Highest Category</p>
            <p className="text-3xl font-bold text-white">
              {categories[0]}
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
            placeholder="Search by description or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all"
          />
        </div>
        <div className="flex gap-2">
          <select 
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>

        </div>
        {!isCashier && selectedIds.length > 0 && (
          <button
            onClick={() => setShowBulkDeleteModal(true)}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold"
          >
            Delete Selected ({selectedIds.length})
          </button>
        )}
      </div>

      {/* Expenses Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">By</th>
                {!isCashier && (
                  <th className="px-3 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">
                    <input
                      type="checkbox"
                      checked={filteredExpenses.length > 0 && selectedIds.length === filteredExpenses.length}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                    />
                  </th>
                )}
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Tag size={14} className="text-slate-400" />
                      <span className="text-slate-900 font-bold">{expense.category}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{expense.description}</td>
                  <td className="px-6 py-4 text-sm text-red-600 font-bold">{formatCurrency(expense.amount)}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    <div className="flex items-center gap-1">
                      <Clock size={14} className="text-slate-400" />
                      {(toDisplayDate(expense.expenseDate, expense.createdAtClient) || new Date()).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                        expense.actorRole === 'cashier' ? "bg-blue-100 text-blue-700" : "bg-violet-100 text-violet-700"
                      )}>
                        {expense.actorRole === 'cashier' ? 'Cashier' : 'Admin'}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">{expense.actorName || 'System'}</span>
                    </div>
                  </td>
                  {!isCashier && (
                    <td className="px-3 py-4 text-right">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(expense.id)}
                        onChange={(e) => toggleSelectOne(expense.id, e.target.checked)}
                      />
                    </td>
                  )}
                  <td className="px-6 py-4 text-right">
                    {!isCashier && (
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setEditingExpense(expense)}
                          className="p-2 hover:bg-violet-50 rounded-lg text-slate-400 hover:text-violet-600 transition-all" 
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(expense.id)}
                          className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-all" 
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredExpenses.length === 0 && (
          <div className="py-20 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="text-slate-300" size={40} />
            </div>
            <p className="text-slate-400 font-medium">No expenses found matching your search.</p>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {(showAddModal || (!isCashier && editingExpense)) && (
        <AddExpenseModal
          categories={categories}
          expense={isCashier ? undefined : editingExpense}
          onClose={() => {
            setShowAddModal(false);
            setEditingExpense(null);
          }}
        />
      )}
      {!isCashier && (
        <ConfirmBulkDeleteModal
          open={showBulkDeleteModal}
          count={selectedIds.length}
          title="Delete selected expenses?"
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
      )}
    </div>
  );
};

const AddExpenseModal: React.FC<{ categories: string[], expense?: any, onClose: () => void }> = ({ categories, expense, onClose }) => {
  const { shopId, currentUser, userRole } = useAuth();
  const isEditing = !!expense;
  const [formData, setFormData] = useState({
    category: expense?.category || 'Miscellaneous',
    description: expense?.description || '',
    amount: isEditing ? (expense?.amount || 0) : '' as number | string,
    expenseDate: expense?.expenseDate?.toDate
      ? expense.expenseDate.toDate().toISOString().split('T')[0]
      : expense?.expenseDate
        ? new Date(expense.expenseDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Guard: shopId must be resolved before writing
    if (!shopId) {
      toast.error('Shop not loaded yet. Please wait a moment and try again.');
      return;
    }
    if (formData.amount <= 0) {
      toast.error('Expense amount must be greater than 0');
      return;
    }
    setSaving(true);
    try {
      const actorMeta = buildActorMeta({ currentUser, userRole });
      if (isEditing) {
        await updateDoc(doc(db, 'expenses', expense.id), {
          ...formData,
          amount: Number(formData.amount),
          shopId,
          expenseDate: new Date(formData.expenseDate),
          ...actorMeta,
          updatedAt: serverTimestamp()
        });
        toast.success('Expense updated successfully');
      } else {
        await addDoc(collection(db, 'expenses'), {
          ...formData,
          amount: Number(formData.amount),
          shopId,
          expenseDate: new Date(formData.expenseDate),
          ...actorMeta,
          createdAt: serverTimestamp(),
          createdAtClient: new Date()
        });
        toast.success('Expense recorded successfully');
      }
      onClose();
    } catch (error: any) {
      console.error('Expense save error:', error);
      const code = error?.code ? ` (${error.code})` : '';
      toast.error((error?.message || 'Failed to record expense') + code);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in duration-300 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-900">{isEditing ? 'Edit Expense' : 'Record New Expense'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Category</label>
            <select 
              required
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all"
            >
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Amount (Rs)</label>
            <input 
              required
              type="number" 
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: e.target.value === '' ? '' : parseFloat(e.target.value)})}
              onFocus={(e) => e.target.select()}
              placeholder="0"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Description</label>
            <textarea 
              required
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all h-24 resize-none"
              placeholder="What was this expense for?"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Expense Date</label>
            <input 
              required
              type="date" 
              value={formData.expenseDate}
              onChange={(e) => setFormData({...formData, expenseDate: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-4 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all uppercase tracking-widest text-xs"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={saving || !shopId}
              className="flex-1 py-4 px-4 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl shadow-lg shadow-violet-600/20 transition-all uppercase tracking-widest text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : isEditing ? 'Update Expense' : 'Record Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Expenses;

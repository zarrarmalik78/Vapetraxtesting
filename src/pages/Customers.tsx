import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Phone, 
  Mail, 
  CreditCard, 
  ArrowUpDown,
  X,
  UserPlus
} from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import { formatCurrency, cn } from '../lib/utils';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { deleteDoc, doc, updateDoc, addDoc, collection, serverTimestamp, orderBy, where, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { reauthenticateForSensitiveAction, requiresPasswordReauth } from '../lib/secureAction';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import AddCreditModal from '../components/credits/AddCreditModal';
import { toDisplayDate } from '../lib/dates';
import ConfirmBulkDeleteModal from '../components/ui/ConfirmBulkDeleteModal';

const Customers: React.FC = () => {
  const { shopId, currentUser } = useAuth();
  const { documents: customers, loading } = useFirestore<any>(
    shopId ? 'customers' : null, 
    where('shopId', '==', shopId),
    orderBy('createdAt', 'desc')
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);
  const [showAddCreditModal, setShowAddCreditModal] = useState(false);
  const [creditCustomerId, setCreditCustomerId] = useState<string | undefined>(undefined);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [deleteTyped, setDeleteTyped] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const needsPassword = requiresPasswordReauth(currentUser);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.phone?.includes(searchTerm) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [customers, searchTerm]);

  const handleDelete = async (id: string) => {
    const customer = customers.find(c => c.id === id);
    if (customer && (customer.creditBalance || 0) > 0) {
      toast.error('Cannot delete: Customer has an outstanding credit balance.');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        await deleteDoc(doc(db, 'customers', id));
        toast.success('Customer deleted successfully');
      } catch (error) {
        toast.error('Failed to delete customer');
      }
    }
  };

  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? filteredCustomers.map((c) => c.id) : []);
  };

  const toggleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => checked ? [...new Set([...prev, id])] : prev.filter((x) => x !== id));
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    
    // Check if any selected customer has outstanding credit
    const hasCredit = selectedIds.some(id => {
      const c = customers.find(x => x.id === id);
      return c && (c.creditBalance || 0) > 0;
    });
    
    if (hasCredit) {
      toast.error('Cannot delete: One or more selected customers have an outstanding credit balance.');
      return;
    }

    setBulkDeleting(true);
    try {
      if (needsPassword && currentUser) {
        await reauthenticateForSensitiveAction(currentUser, deletePassword);
      }
      const batch = writeBatch(db);
      selectedIds.forEach((id) => batch.delete(doc(db, 'customers', id)));
      await batch.commit();
      toast.success(`Deleted ${selectedIds.length} customer(s)`);
      setSelectedIds([]);
      setShowBulkDeleteModal(false);
      setDeleteTyped('');
      setDeletePassword('');
    } catch (error: any) {
      const code = error?.code || '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        toast.error('Incorrect password.');
      } else {
        toast.error(error?.message || 'Failed to delete selected customers');
      }
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
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Customer Directory</h1>
            <p className="text-slate-500 text-sm">Manage your client relationships and credit balances</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setCreditCustomerId(undefined);
              setShowAddCreditModal(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-amber-500/20 uppercase tracking-wider text-sm"
          >
            <CreditCard size={18} />
            Add Credit
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-violet-600/20 uppercase tracking-wider text-sm"
          >
            <Plus size={20} />
            Add Customer
          </button>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="metric-card-cyan rounded-2xl p-6 shadow-lg shadow-cyan-500/20 relative overflow-hidden group">
          <div className="absolute top-4 right-4 p-3 bg-white/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
            <Users size={24} className="text-white" />
          </div>
          <div className="relative z-10">
            <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-1">Total Customers</p>
            <p className="text-3xl font-bold text-white">{customers.length}</p>
          </div>
        </div>
        <div className="metric-card-orange rounded-2xl p-6 shadow-lg shadow-orange-500/20 relative overflow-hidden group">
          <div className="absolute top-4 right-4 p-3 bg-white/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
            <CreditCard size={24} className="text-white" />
          </div>
          <div className="relative z-10">
            <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-1">Total Credit Outstanding</p>
            <p className="text-3xl font-bold text-white">
              {formatCurrency(customers.reduce((acc, c) => acc + (c.creditBalance || 0), 0))}
            </p>
          </div>
        </div>
        <div className="metric-card-emerald rounded-2xl p-6 shadow-lg shadow-emerald-500/20 relative overflow-hidden group">
          <div className="absolute top-4 right-4 p-3 bg-white/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
            <UserPlus size={24} className="text-white" />
          </div>
          <div className="relative z-10">
            <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-1">Active Customers (30d)</p>
            <p className="text-3xl font-bold text-white">{customers.length}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="glass-card p-4 bg-slate-50/50 flex items-center justify-between gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by name, phone, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all shadow-sm"
          />
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

      {/* Customer Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Customer</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contact</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Credit Balance</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Joined</th>
                <th className="px-3 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">
                  <input
                    type="checkbox"
                    checked={filteredCustomers.length > 0 && selectedIds.length === filteredCustomers.length}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                  />
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center font-bold">
                        {customer.name?.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-slate-900 font-bold group-hover:text-violet-600 transition-colors">{customer.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-slate-900 font-medium">
                        <Phone size={12} className="text-slate-400" />
                        {customer.phone}
                      </div>
                      {customer.email && (
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Mail size={10} />
                          {customer.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "font-bold text-sm px-3 py-1 rounded-full",
                      (customer.creditBalance || 0) > 0 ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"
                    )}>
                      {formatCurrency(customer.creditBalance || 0)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 font-medium">
                    {(toDisplayDate(customer.createdAt, customer.createdAtClient) || new Date()).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-4 text-right">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(customer.id)}
                      onChange={(e) => toggleSelectOne(customer.id, e.target.checked)}
                    />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setCreditCustomerId(customer.id);
                          setShowAddCreditModal(true);
                        }}
                        className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                        title="Add Credit"
                      >
                        <CreditCard size={18} />
                      </button>
                      <button 
                        onClick={() => setEditingCustomer(customer)}
                        className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all" 
                        title="Edit"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(customer.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" 
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredCustomers.length === 0 && (
          <div className="py-20 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="text-slate-300" size={40} />
            </div>
            <p className="text-slate-400 font-medium">No customers found matching your search.</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingCustomer) && (
        <CustomerModal 
          customer={editingCustomer} 
          onClose={() => {
            setShowAddModal(false);
            setEditingCustomer(null);
          }} 
        />
      )}
      {showAddCreditModal && (
        <AddCreditModal
          customers={customers}
          initialCustomerId={creditCustomerId}
          onClose={() => {
            setShowAddCreditModal(false);
            setCreditCustomerId(undefined);
          }}
        />
      )}
      <ConfirmBulkDeleteModal
        open={showBulkDeleteModal}
        count={selectedIds.length}
        title="Delete selected customers?"
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

const CustomerModal: React.FC<{ customer?: any, onClose: () => void }> = ({ customer, onClose }) => {
  const { shopId } = useAuth();
  const isEditing = !!customer;
  const [formData, setFormData] = useState({
    name: customer?.name || '',
    phone: customer?.phone || '',
    email: customer?.email || '',
    creditBalance: isEditing ? (customer?.creditBalance || 0) : '' as number | string
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Guard: shopId must be resolved before any write
    if (!shopId) {
      toast.error('Shop not loaded yet. Please wait a moment and try again.');
      return;
    }
    setSaving(true);
    try {
      if (customer) {
        // FIX: include shopId in update payload so Firestore's isNewDocShopMember() rule passes
        await updateDoc(doc(db, 'customers', customer.id), {
          ...formData,
          shopId,
        });
        toast.success('Customer updated successfully');
      } else {
        await addDoc(collection(db, 'customers'), {
          ...formData,
          shopId,
          createdAt: serverTimestamp(),
          createdAtClient: new Date()
        });
        toast.success('Customer added successfully');
      }
      onClose();
    } catch (error: any) {
      console.error('Customer save error:', error);
      const code = error?.code ? ` (${error.code})` : '';
      toast.error((error?.message || 'Failed to save customer') + code);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in duration-300">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
          <h2 className="text-xl font-bold text-slate-900">{customer ? 'Edit Customer' : 'Add New Customer'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Name</label>
              <input 
                required
                type="text" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone Number</label>
              <input 
                required
                type="text" 
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Address (Optional)</label>
              <input 
                type="email" 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Initial Credit Balance (Rs)</label>
              <input 
                type="number" 
                value={formData.creditBalance}
                onChange={(e) => setFormData({...formData, creditBalance: e.target.value === '' ? '' : parseFloat(e.target.value)})}
                onFocus={(e) => e.target.select()}
                placeholder="0"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all uppercase tracking-widest text-xs"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={saving || !shopId}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold rounded-xl shadow-lg shadow-violet-600/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-xs"
            >
              {saving ? 'Saving...' : customer ? 'Update Customer' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Customers;

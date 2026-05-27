import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { addDoc, collection, doc, increment, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { getCreditBalanceDelta, type CreditTransactionType } from '../../lib/credits';
import { buildActorMeta } from '../../lib/actor';

interface AddCreditModalProps {
  customers: any[];
  onClose: () => void;
  initialCustomerId?: string;
}

const AddCreditModal: React.FC<AddCreditModalProps> = ({ customers, onClose, initialCustomerId }) => {
  const { shopId, currentUser, userRole } = useAuth();
  const [formData, setFormData] = useState({
    creditType: initialCustomerId ? 'customer' : 'customer',
    customerId: initialCustomerId || '',
    entityName: '',
    entityContact: '',
    amount: '' as number | string,
    description: '',
    transactionType: 'given' as CreditTransactionType
  });
  const [saving, setSaving] = useState(false);

  const transactionHint = useMemo(
    () =>
      formData.transactionType === 'given'
        ? 'Given increases customer credit balance.'
        : 'Taken decreases customer credit balance.',
    [formData.transactionType]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId) {
      toast.error('Shop not loaded yet. Please wait a moment and try again.');
      return;
    }
    if (formData.amount <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }
    if (formData.creditType === 'customer' && !formData.customerId) {
      toast.error('Please select a customer');
      return;
    }

    setSaving(true);
    try {
      const normalizedAmount = Math.abs(Number(formData.amount) || 0);
      const actorMeta = buildActorMeta({ currentUser, userRole });

      await addDoc(collection(db, 'credits'), {
        ...formData,
        amount: normalizedAmount,
        shopId,
        ...actorMeta,
        createdAt: serverTimestamp(),
        createdAtClient: new Date()
      });

      if (formData.creditType === 'customer' && formData.customerId) {
        const customerRef = doc(db, 'customers', formData.customerId);
        await updateDoc(customerRef, {
          creditBalance: increment(getCreditBalanceDelta(formData.transactionType, normalizedAmount))
        });
      }

      toast.success('Credit transaction added successfully');
      onClose();
    } catch (error: any) {
      console.error('Credit save error:', error);
      const code = error?.code ? ` (${error.code})` : '';
      toast.error((error?.message || 'Failed to add transaction') + code);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in duration-300 overflow-hidden border border-slate-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-900">Add Credit Transaction</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Credit Type</label>
            <select
              value={formData.creditType}
              onChange={(e) => setFormData({ ...formData, creditType: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all"
            >
              <option value="customer">Customer</option>
              <option value="others">Others</option>
            </select>
          </div>

          {formData.creditType === 'customer' && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select Customer</label>
              <select
                required
                value={formData.customerId}
                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all"
              >
                <option value="">Choose a customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {formData.creditType === 'others' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Entity Name</label>
                <input
                  required
                  type="text"
                  value={formData.entityName}
                  onChange={(e) => setFormData({ ...formData, entityName: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Contact</label>
                <input
                  type="text"
                  value={formData.entityContact}
                  onChange={(e) => setFormData({ ...formData, entityContact: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Amount (Rs)</label>
              <input
                required
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value === '' ? '' : (parseFloat(e.target.value) || 0) })}
                onFocus={(e) => e.target.select()}
                placeholder="0"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Transaction Type</label>
              <select
                value={formData.transactionType}
                onChange={(e) => setFormData({ ...formData, transactionType: e.target.value as CreditTransactionType })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all"
              >
                <option value="given">Given (Credit)</option>
                <option value="taken">Taken (Payment Received)</option>
              </select>
            </div>
          </div>

          <p className="text-xs text-violet-600 font-semibold">{transactionHint}</p>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all h-24 resize-none"
              placeholder="Reason for credit..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all uppercase tracking-wider text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !shopId}
              className="flex-1 py-4 px-4 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-2xl shadow-lg shadow-violet-600/20 transition-all active:scale-[0.98] uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCreditModal;


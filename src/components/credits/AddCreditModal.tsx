import React, { useMemo, useState, useEffect } from 'react';
import { X, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { addDoc, collection, doc, increment, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { getCreditBalanceDelta, type CreditTransactionType } from '../../lib/credits';
import { buildActorMeta } from '../../lib/actor';
import { cn } from '../../lib/utils';

interface AddCreditModalProps {
  customers: any[];
  onClose: () => void;
  initialCustomerId?: string;
}

const AddCreditModal: React.FC<AddCreditModalProps> = ({ customers, onClose, initialCustomerId }) => {
  const { shopId, currentUser, userRole } = useAuth();
  
  // Tab state: 'taken' means receive payment, 'given' means add credit
  const [activeTab, setActiveTab] = useState<CreditTransactionType>('taken');
  
  const [formData, setFormData] = useState({
    creditType: initialCustomerId ? 'customer' : 'customer',
    customerId: initialCustomerId || '',
    entityName: '',
    entityContact: '',
    amount: '' as number | string,
    description: '',
  });
  
  const [saving, setSaving] = useState(false);

  // Sync tab with formData logic conceptually, but we can just use activeTab for transactionType
  const transactionType = activeTab;

  const transactionHint = useMemo(
    () =>
      transactionType === 'given'
        ? 'Increases customer credit balance.'
        : 'Decreases customer credit balance.',
    [transactionType]
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
        transactionType,
        amount: normalizedAmount,
        shopId,
        ...actorMeta,
        createdAt: serverTimestamp(),
        createdAtClient: new Date()
      });

      if (formData.creditType === 'customer' && formData.customerId) {
        const customerRef = doc(db, 'customers', formData.customerId);
        await updateDoc(customerRef, {
          creditBalance: increment(getCreditBalanceDelta(transactionType, normalizedAmount))
        });
      }

      toast.success(transactionType === 'taken' ? 'Payment received successfully' : 'Credit added successfully');
      onClose();
    } catch (error: any) {
      console.error('Credit save error:', error);
      const code = error?.code ? ` (${error.code})` : '';
      toast.error((error?.message || 'Failed to process transaction') + code);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl animate-in zoom-in duration-300 overflow-hidden border border-slate-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Manage Credit</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-2xl text-slate-400 transition-colors">
            <X size={24} strokeWidth={2.5} />
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex p-4 gap-2 bg-slate-50/50">
          <button
            type="button"
            onClick={() => setActiveTab('taken')}
            className={cn(
              "flex-1 flex flex-col items-center justify-center py-4 rounded-2xl transition-all font-bold border-2",
              activeTab === 'taken' 
                ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm" 
                : "bg-white border-transparent text-slate-500 hover:bg-slate-100"
            )}
          >
            <ArrowDownRight size={24} className={activeTab === 'taken' ? "text-emerald-500 mb-1" : "text-slate-400 mb-1"} />
            Receive Payment
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('given')}
            className={cn(
              "flex-1 flex flex-col items-center justify-center py-4 rounded-2xl transition-all font-bold border-2",
              activeTab === 'given' 
                ? "bg-orange-50 border-orange-500 text-orange-700 shadow-sm" 
                : "bg-white border-transparent text-slate-500 hover:bg-slate-100"
            )}
          >
            <ArrowUpRight size={24} className={activeTab === 'given' ? "text-orange-500 mb-1" : "text-slate-400 mb-1"} />
            Add Credit
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Credit Type</label>
            <select
              value={formData.creditType}
              onChange={(e) => setFormData({ ...formData, creditType: e.target.value })}
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-300 transition-all"
            >
              <option value="customer">Customer</option>
              <option value="others">Others</option>
            </select>
          </div>

          {formData.creditType === 'customer' && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Customer</label>
              <select
                required
                value={formData.customerId}
                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-300 transition-all"
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
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entity Name</label>
                <input
                  required
                  type="text"
                  value={formData.entityName}
                  onChange={(e) => setFormData({ ...formData, entityName: e.target.value })}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-300 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact</label>
                <input
                  type="text"
                  value={formData.entityContact}
                  onChange={(e) => setFormData({ ...formData, entityContact: e.target.value })}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-300 transition-all"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount (Rs)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Rs.</span>
              <input
                required
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value === '' ? '' : (parseFloat(e.target.value) || 0) })}
                onFocus={(e) => e.target.select()}
                placeholder="0"
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-300 transition-all text-lg"
              />
            </div>
            <p className={cn(
              "text-xs font-bold mt-2",
              activeTab === 'taken' ? "text-emerald-600" : "text-orange-600"
            )}>
              {transactionHint}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-medium focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-300 transition-all h-24 resize-none"
              placeholder="Reason for transaction..."
            />
          </div>

          <button
            type="submit"
            disabled={saving || !shopId}
            className={cn(
              "w-full py-4 px-4 text-white font-black rounded-2xl shadow-lg transition-all active:scale-95 uppercase tracking-wider text-sm",
              activeTab === 'taken' 
                ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20" 
                : "bg-orange-500 hover:bg-orange-600 shadow-orange-500/20",
              (saving || !shopId) && "opacity-50 cursor-not-allowed"
            )}
          >
            {saving ? 'Processing...' : (activeTab === 'taken' ? 'Confirm Payment' : 'Confirm Credit')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddCreditModal;

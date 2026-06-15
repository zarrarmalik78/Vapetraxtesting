import React, { useState } from 'react';
import { X } from 'lucide-react';
import { doc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface CustomerModalProps {
  customer?: any;
  onClose: () => void;
  onSuccess?: (customerId: string) => void;
}

const CustomerModal: React.FC<CustomerModalProps> = ({ customer, onClose, onSuccess }) => {
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
        // include shopId in update payload so Firestore's isNewDocShopMember() rule passes
        await updateDoc(doc(db, 'customers', customer.id), {
          ...formData,
          shopId,
        });
        toast.success('Customer updated successfully');
        if (onSuccess) {
          onSuccess(customer.id);
        }
      } else {
        const docRef = await addDoc(collection(db, 'customers'), {
          ...formData,
          shopId,
          createdAt: serverTimestamp(),
          createdAtClient: new Date()
        });
        toast.success('Customer added successfully');
        if (onSuccess) {
          onSuccess(docRef.id);
        }
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
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone Number (Optional)</label>
              <input 
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

export default CustomerModal;

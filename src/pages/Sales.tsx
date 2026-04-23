import React, { useState, useMemo } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  Eye, 
  Trash2, 
  Calendar, 
  Download, 
  Clock, 
  User, 
  CreditCard, 
  Banknote, 
  RefreshCw,
  X,
  FileText,
  Printer,
  TrendingUp,
  RotateCcw,
  ShoppingCart
} from 'lucide-react';
import { useFirestore, useDocument } from '../hooks/useFirestore';
import { formatCurrency, cn } from '../lib/utils';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { doc, increment, collection, serverTimestamp, orderBy, where, writeBatch, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { parseBottleSizeMl } from '../lib/bottles';
import { buildActorMeta } from '../lib/actor';
import { toDisplayDate } from '../lib/dates';
import ConfirmBulkDeleteModal from '../components/ui/ConfirmBulkDeleteModal';
import { reauthenticateForSensitiveAction, requiresPasswordReauth } from '../lib/secureAction';

const Sales: React.FC = () => {
  const { shopId, currentUser, userRole } = useAuth();
  const { documents: sales, loading } = useFirestore<any>(
    shopId ? 'sales' : null, 
    where('shopId', '==', shopId),
    orderBy('saleDate', 'desc')
  );
  const { documents: customers } = useFirestore<any>(
    shopId ? 'customers' : null,
    where('shopId', '==', shopId)
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [showInvoiceModal, setShowInvoiceModal] = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [deleteTyped, setDeleteTyped] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const needsPassword = requiresPasswordReauth(currentUser);
  const actorMeta = useMemo(() => buildActorMeta({ currentUser, userRole }), [currentUser, userRole]);

  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const customer = customers.find(c => c.id === s.customerId);
      const customerName = customer?.name || 'Walk-in';
      return (
        (customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
         s.id?.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (paymentFilter === 'all' || s.paymentMethod === paymentFilter)
      );
    });
  }, [sales, customers, searchTerm, paymentFilter]);

  const deleteSaleWithReversal = async (sale: any) => {
    if (!shopId) throw new Error('Shop not loaded');
    const batch = writeBatch(db);

    // Reverse inventory changes
    for (const item of sale.items) {
      const productRef = doc(db, 'products', item.productId);
      const productSnap = await getDoc(productRef);

      const isELiquidLine = item.saleType === 'refill' || item.saleType === 'full_bottle';
      if (isELiquidLine) {
        const bottleSizeMl = parseBottleSizeMl(item.bottleSize, 30);
        const mlToRestore =
          item.saleType === 'refill'
            ? (Number(item.refillAmount) || 0) * (Number(item.quantity) || 0)
            : bottleSizeMl * (Number(item.quantity) || 0);

        if (mlToRestore > 0 && productSnap.exists()) {
          batch.update(productRef, { stockQuantity: increment(mlToRestore) });
        }

        const bottleChanges: any[] = Array.isArray(item.bottleChanges) ? item.bottleChanges : [];
        for (const bc of bottleChanges) {
          if (!bc?.bottleId) continue;
          const bottleRef = doc(db, `products/${item.productId}/bottles`, bc.bottleId);
          const bottleSnap = await getDoc(bottleRef);
          if (bottleSnap.exists()) {
            batch.update(bottleRef, {
              remainingMl: Number(bc.beforeRemainingMl) || 0,
              status: bc.beforeStatus || 'closed',
              openedDate: bc.beforeOpenedDate || null,
              updatedAt: serverTimestamp()
            });
          }
        }

        const logRef = doc(collection(db, 'inventoryLogs'));
        batch.set(logRef, {
          productId: item.productId,
          productName: item.productName || 'Unknown Product',
          shopId,
          action: 'return',
          type: 'return',
          mlChange: mlToRestore,
          change: mlToRestore,
          quantityChange: item.saleType === 'full_bottle' ? Number(item.quantity) || 0 : 0,
          reason: `Sale deleted (restored): ${(sale.id ? sale.id.slice(-6).toUpperCase() : '') || sale.id}`,
          notes: productSnap.exists() ? `Inventory restored from deleted sale` : `Sale deleted, but product was missing`,
          ...actorMeta,
          createdAt: serverTimestamp(),
          createdAtClient: new Date()
        });
      } else {
        if (productSnap.exists()) {
          batch.update(productRef, { stockQuantity: increment(item.quantity) });
        }

        const logRef = doc(collection(db, 'inventoryLogs'));
        batch.set(logRef, {
          productId: item.productId,
          productName: item.productName || 'Unknown Product',
          shopId,
          action: 'return',
          type: 'return',
          change: Number(item.quantity) || 0,
          quantityChange: item.quantity,
          reason: `Sale deleted (restored): ${(sale.id ? sale.id.slice(-6).toUpperCase() : '') || sale.id}`,
          notes: productSnap.exists() ? `Inventory restored from deleted sale` : `Sale deleted, but product was missing`,
          ...actorMeta,
          createdAt: serverTimestamp(),
          createdAtClient: new Date()
        });
      }
    }

    // Reverse credit if applicable
    if (sale.paymentMethod === 'credit' && sale.customerId) {
      const customerRef = doc(db, 'customers', sale.customerId);
      const customerSnap = await getDoc(customerRef);
      if (customerSnap.exists()) {
        batch.update(customerRef, { creditBalance: increment(-sale.totalAmount) });
      }
    }

    batch.delete(doc(db, 'sales', sale.id));
    await batch.commit();
  };

  const handleDelete = async (sale: any) => {
    if (window.confirm('Are you sure you want to delete this sale? This will reverse all inventory and credit changes.')) {
      try {
        await deleteSaleWithReversal(sale);
        toast.success('Sale deleted and inventory restored');
      } catch (error) {
        console.error(error);
        toast.error('Failed to delete sale');
      }
    }
  };

  const handleRemoveItemFromSale = async (sale: any, itemIndex: number) => {
    if (!shopId) return;
    if (sale.items.length <= 1) {
      // Removing the only item deletes the sale entirely
      if (window.confirm('This is the last item in the sale. Removing it will delete the entire sale. Continue?')) {
        try {
          await deleteSaleWithReversal(sale);
          toast.success('Sale deleted and inventory restored');
          if (showInvoiceModal?.id === sale.id) {
            setShowInvoiceModal(null);
          }
        } catch (error) {
          console.error(error);
          toast.error('Failed to delete sale');
        }
      }
      return;
    }

    if (!window.confirm('Are you sure you want to remove this item? Inventory and totals will be updated.')) return;

    try {
      const batch = writeBatch(db);
      const item = sale.items[itemIndex];

      const productRef = doc(db, 'products', item.productId);
      const productSnap = await getDoc(productRef);

      const isELiquidLine = item.saleType === 'refill' || item.saleType === 'full_bottle';
      if (isELiquidLine) {
        const bottleSizeMl = parseBottleSizeMl(item.bottleSize, 30);
        const mlToRestore =
          item.saleType === 'refill'
            ? (Number(item.refillAmount) || 0) * (Number(item.quantity) || 0)
            : bottleSizeMl * (Number(item.quantity) || 0);

        if (mlToRestore > 0 && productSnap.exists()) {
          batch.update(productRef, { stockQuantity: increment(mlToRestore) });
        }

        const bottleChanges: any[] = Array.isArray(item.bottleChanges) ? item.bottleChanges : [];
        for (const bc of bottleChanges) {
          if (!bc?.bottleId) continue;
          const bottleRef = doc(db, `products/${item.productId}/bottles`, bc.bottleId);
          const bottleSnap = await getDoc(bottleRef);
          if (bottleSnap.exists()) {
            batch.update(bottleRef, {
              remainingMl: Number(bc.beforeRemainingMl) || 0,
              status: bc.beforeStatus || 'closed',
              openedDate: bc.beforeOpenedDate || null,
              updatedAt: serverTimestamp()
            });
          }
        }

        const logRef = doc(collection(db, 'inventoryLogs'));
        batch.set(logRef, {
          productId: item.productId,
          productName: item.productName || 'Unknown Product',
          shopId,
          action: 'return',
          type: 'return',
          mlChange: mlToRestore,
          change: mlToRestore,
          quantityChange: item.saleType === 'full_bottle' ? Number(item.quantity) || 0 : 0,
          reason: `Item removed from sale: ${(sale.id ? sale.id.slice(-6).toUpperCase() : '') || sale.id}`,
          notes: productSnap.exists() ? `Inventory restored` : `Product was missing`,
          ...actorMeta,
          createdAt: serverTimestamp(),
          createdAtClient: new Date()
        });
      } else {
        if (productSnap.exists()) {
          batch.update(productRef, { stockQuantity: increment(item.quantity) });
        }

        const logRef = doc(collection(db, 'inventoryLogs'));
        batch.set(logRef, {
          productId: item.productId,
          productName: item.productName || 'Unknown Product',
          shopId,
          action: 'return',
          type: 'return',
          change: Number(item.quantity) || 0,
          quantityChange: item.quantity,
          reason: `Item removed from sale: ${(sale.id ? sale.id.slice(-6).toUpperCase() : '') || sale.id}`,
          notes: productSnap.exists() ? `Inventory restored` : `Product was missing`,
          ...actorMeta,
          createdAt: serverTimestamp(),
          createdAtClient: new Date()
        });
      }

      // Reverse credit if applicable
      if (sale.paymentMethod === 'credit' && sale.customerId) {
        const customerRef = doc(db, 'customers', sale.customerId);
        const customerSnap = await getDoc(customerRef);
        if (customerSnap.exists()) {
          batch.update(customerRef, { creditBalance: increment(-item.totalPrice) });
        }
      }

      // Modify the sale document
      const newItems = [...sale.items];
      newItems.splice(itemIndex, 1);
      
      const newTotalAmount = sale.totalAmount - (item.totalPrice || 0);
      const newTotalCOGS = sale.totalCOGS - (item.totalCost || 0);
      const newTotalProfit = sale.totalProfit - (item.profit || 0);

      const saleRef = doc(db, 'sales', sale.id);
      batch.update(saleRef, {
        items: newItems,
        totalAmount: newTotalAmount,
        totalCOGS: newTotalCOGS,
        totalProfit: newTotalProfit,
        updatedAt: serverTimestamp()
      });

      await batch.commit();

      if (showInvoiceModal?.id === sale.id) {
        setShowInvoiceModal({
          ...sale,
          items: newItems,
          totalAmount: newTotalAmount,
          totalCOGS: newTotalCOGS,
          totalProfit: newTotalProfit
        });
      }

      toast.success('Item removed and inventory restored');
    } catch (error) {
      console.error(error);
      toast.error('Failed to remove item');
    }
  };

  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? filteredSales.map((s) => s.id) : []);
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
      const selectedSales = sales.filter((s) => selectedIds.includes(s.id));
      for (const sale of selectedSales) await deleteSaleWithReversal(sale);
      toast.success(`Deleted ${selectedSales.length} sale(s) with inventory reversal`);
      setSelectedIds([]);
      setShowBulkDeleteModal(false);
      setDeleteTyped('');
      setDeletePassword('');
    } catch (error: any) {
      const code = error?.code || '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        toast.error('Incorrect password.');
      } else {
        toast.error(error?.message || 'Bulk delete failed');
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
            <History size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sales History</h1>
            <p className="text-slate-500 text-sm">View and manage all your past sales and transactions</p>
          </div>
        </div>

      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="metric-card-cyan rounded-2xl p-6 shadow-lg shadow-cyan-500/20 relative overflow-hidden group">
          <div className="absolute top-4 right-4 p-3 bg-white/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
            <ShoppingCart size={24} className="text-white" />
          </div>
          <div className="relative z-10">
            <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-1">Total Sales</p>
            <p className="text-3xl font-bold text-white">{sales.length}</p>
          </div>
        </div>
        <div className="metric-card-violet rounded-2xl p-6 shadow-lg shadow-violet-500/20 relative overflow-hidden group">
          <div className="absolute top-4 right-4 p-3 bg-white/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
            <TrendingUp size={24} className="text-white" />
          </div>
          <div className="relative z-10">
            <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-1">Total Revenue</p>
            <p className="text-3xl font-bold text-white">
              {formatCurrency(sales.reduce((acc, s) => acc + (s.totalAmount || 0), 0))}
            </p>
          </div>
        </div>
        <div className="metric-card-orange rounded-2xl p-6 shadow-lg shadow-orange-500/20 relative overflow-hidden group">
          <div className="absolute top-4 right-4 p-3 bg-white/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
            <CreditCard size={24} className="text-white" />
          </div>
          <div className="relative z-10">
            <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-1">Credit Sales</p>
            <p className="text-3xl font-bold text-white">{sales.filter(s => s.paymentMethod === 'credit').length}</p>
          </div>
        </div>
        <div className="metric-card-red rounded-2xl p-6 shadow-lg shadow-rose-500/20 relative overflow-hidden group">
          <div className="absolute top-4 right-4 p-3 bg-white/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
            <RotateCcw size={24} className="text-white" />
          </div>
          <div className="relative z-10">
            <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-1">Returns</p>
            <p className="text-3xl font-bold text-white">{sales.filter(s => s.paymentMethod === 'return').length}</p>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="glass-card p-4 flex flex-col md:flex-row gap-4 bg-slate-50/50">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by customer name or sale ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all shadow-sm"
          />
        </div>
        <div className="flex gap-3">
          <select 
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20 shadow-sm"
          >
            <option value="all">All Payments</option>
            <option value="cash">Cash</option>
            <option value="online">Online</option>
            <option value="credit">Credit</option>
            <option value="return">Return</option>
          </select>

        </div>
        {userRole === 'admin' && selectedIds.length > 0 && (
          <button
            onClick={() => setShowBulkDeleteModal(true)}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold"
          >
            Delete Selected ({selectedIds.length})
          </button>
        )}
      </div>

      {/* Sales Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sale ID</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Customer</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Method</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">By</th>
                {userRole === 'admin' && (
                  <th className="px-3 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">
                    <input
                      type="checkbox"
                      checked={filteredSales.length > 0 && selectedIds.length === filteredSales.length}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                    />
                  </th>
                )}
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.map((sale) => {
                const customer = customers.find(c => c.id === sale.customerId);
                return (
                  <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold font-mono text-slate-400 group-hover:text-violet-600 transition-colors">
                        #{sale.id?.slice(-6).toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                          <User size={14} />
                        </div>
                        <span className="text-slate-900 font-bold">{customer?.name || 'Walk-in'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-emerald-600 font-bold">{formatCurrency(sale.totalAmount)}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 w-fit",
                        sale.paymentMethod === 'cash' ? "bg-violet-100 text-violet-600" :
                        sale.paymentMethod === 'online' ? "bg-blue-100 text-blue-600" :
                        sale.paymentMethod === 'credit' ? "bg-amber-100 text-amber-600" :
                        "bg-rose-100 text-rose-600"
                      )}>
                        {sale.paymentMethod === 'cash' && <Banknote size={12} />}
                        {sale.paymentMethod === 'online' && <RefreshCw size={12} />}
                        {sale.paymentMethod === 'credit' && <CreditCard size={12} />}
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-500 font-medium text-sm">
                        <Clock size={14} className="text-slate-400" />
                        {(toDisplayDate(sale.saleDate, sale.saleDateClient) || new Date()).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                          sale.actorRole === 'cashier' ? "bg-blue-100 text-blue-700" : "bg-violet-100 text-violet-700"
                        )}>
                          {sale.actorRole === 'cashier' ? 'Cashier' : 'Admin'}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">{sale.actorName || 'System'}</span>
                      </div>
                    </td>
                    {userRole === 'admin' && (
                      <td className="px-3 py-4 text-right">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(sale.id)}
                          onChange={(e) => toggleSelectOne(sale.id, e.target.checked)}
                        />
                      </td>
                    )}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setShowInvoiceModal(sale)}
                          className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all" 
                          title="View Invoice"
                        >
                          <FileText size={18} />
                        </button>
                        {userRole === 'admin' && (
                          <button 
                            onClick={() => handleDelete(sale)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" 
                            title="Delete Sale"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredSales.length === 0 && (
          <div className="py-20 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <History className="text-slate-300" size={40} />
            </div>
            <p className="text-slate-400 font-medium">No sales found matching your search.</p>
          </div>
        )}
      </div>

      {/* Invoice Modal */}
      {showInvoiceModal && (
        <InvoiceModal 
          sale={showInvoiceModal} 
          customer={customers.find(c => c.id === showInvoiceModal.customerId)}
          onClose={() => setShowInvoiceModal(null)} 
          onRemoveItem={userRole === 'admin' ? (idx) => handleRemoveItemFromSale(showInvoiceModal, idx) : undefined}
        />
      )}
      <ConfirmBulkDeleteModal
        open={showBulkDeleteModal}
        count={selectedIds.length}
        title="Delete selected sales?"
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

const InvoiceModal: React.FC<{ sale: any, customer: any, onClose: () => void, onRemoveItem?: (idx: number) => void }> = ({ sale, customer, onClose, onRemoveItem }) => {
  const { shopId } = useAuth();
  const { document: settings } = useDocument<any>(shopId ? 'settings' : null, shopId ? (shopId || 'shop_settings') : null);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:p-0">
      <div className="bg-white text-black rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in duration-300 print:shadow-none print:rounded-none print:max-h-none print:w-full">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10 print:hidden">
          <h2 className="text-xl font-bold text-gray-800">Invoice #{sale.id?.slice(-6).toUpperCase()}</h2>
          <div className="flex gap-2">
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-all"
            >
              <Printer size={18} />
              Print
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"><X size={20} /></button>
          </div>
        </div>

        <div className="p-8 space-y-8" id="printable-invoice">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-black text-violet-600 uppercase tracking-tighter">{settings?.shopName || 'VapeTrax'}</h1>
              {settings?.showShopAddress && <p className="text-sm text-gray-500 mt-1">{settings.shopAddress}</p>}
              {settings?.showShopPhone && <p className="text-sm text-gray-500">{settings.shopPhone}</p>}
            </div>
            <div className="text-right">
              <h2 className="text-4xl font-black text-gray-200 uppercase">Invoice</h2>
              <p className="text-sm font-bold text-gray-800 mt-2">#{sale.id?.toUpperCase()}</p>
              <p className="text-sm text-gray-500">
                {(toDisplayDate(sale.saleDate, sale.saleDateClient) || new Date()).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 border-y border-gray-100 py-8">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Bill To</p>
              <p className="text-lg font-bold text-gray-800">{customer?.name || 'Walk-in Customer'}</p>
              {customer?.phone && <p className="text-sm text-gray-500">{customer.phone}</p>}
              {customer?.email && <p className="text-sm text-gray-500">{customer.email}</p>}
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Payment Info</p>
              <p className="text-lg font-bold text-gray-800 uppercase">{sale.paymentMethod}</p>
              <p className="text-sm text-gray-500">Status: Paid</p>
            </div>
          </div>

          {/* Items */}
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-800 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">
                <th className="py-4">Description</th>
                <th className="py-4 text-center">Qty/ML</th>
                <th className="py-4 text-right">Price</th>
                <th className="py-4 text-right">Total</th>
                {onRemoveItem && <th className="py-4 text-right print:hidden">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sale.items?.map((item: any, idx: number) => (
                <tr key={idx} className="group/row">
                  <td className="py-4">
                    <p className="font-bold text-gray-800">{item.productName}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold">{item.saleType.replace('_', ' ')}</p>
                  </td>
                  <td className="py-4 text-center font-bold text-gray-600">
                    {item.saleType === 'refill' ? `${item.refillAmount}ml x ${item.quantity}` : item.quantity}
                  </td>
                  <td className="py-4 text-right text-gray-600">{formatCurrency(item.unitPrice)}</td>
                  <td className="py-4 text-right font-bold text-gray-800">{formatCurrency(item.totalPrice)}</td>
                  {onRemoveItem && (
                    <td className="py-4 text-right print:hidden">
                      <button
                        onClick={() => onRemoveItem(idx)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        title="Remove item & restore stock"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end pt-8">
            <div className="w-64 space-y-3">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span>
                <span>{formatCurrency(sale.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Tax (0%)</span>
                <span>Rs 0</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t-2 border-gray-800">
                <span className="text-lg font-black uppercase">Total</span>
                <span className="text-2xl font-black text-violet-600">{formatCurrency(sale.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-12 text-center border-t border-gray-100">
            <p className="text-sm font-bold text-gray-800">{settings?.footerMessage || 'Thank you for your business!'}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-2">Generated by {settings?.shopName || 'VapeTrax'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sales;

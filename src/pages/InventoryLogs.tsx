import React, { useState, useMemo } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  ArrowUpDown, 
  ArrowUpRight, 
  ArrowDownRight,
  Package,
  Clock,
  User,
  Tag,
  RefreshCw
} from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import { formatCurrency, cn } from '../lib/utils';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { format } from 'date-fns';
import { orderBy as firestoreOrderBy, where } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { toDisplayDate } from '../lib/dates';

const InventoryLogs: React.FC = () => {
  const { shopId } = useAuth();
  const { documents: logs, loading } = useFirestore<any>(
    shopId ? 'inventoryLogs' : null, 
    where('shopId', '==', shopId),
    firestoreOrderBy('createdAt', 'desc')
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const filteredLogs = useMemo(() => {
    return logs.filter(log => 
      (log.productName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
       log.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       log.notes?.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (typeFilter === 'all' || log.type === typeFilter)
    );
  }, [logs, searchTerm, typeFilter]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-600 flex items-center justify-center text-white shadow-lg shadow-violet-600/20">
            <History size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Inventory Logs</h1>
            <p className="text-slate-500 text-sm">Audit trail of all stock movements and adjustments</p>
          </div>
        </div>

      </header>

      {/* Filters & Search */}
      <div className="glass-card p-4 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by product or reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-900 font-medium focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
          />
        </div>
        <div className="flex gap-2">
          <select 
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-100 rounded-xl px-6 py-3 text-sm font-bold text-slate-600 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all appearance-none cursor-pointer"
          >
            <option value="all">All Movements</option>
            <option value="addition">Stock Addition</option>
            <option value="reduction">Stock Reduction</option>
            <option value="sale">Sales</option>
            <option value="return">Returns</option>
            <option value="purchase">Purchases</option>
            <option value="adjustment">Manual Adjustment</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[10px] uppercase tracking-widest">
                <th className="px-8 py-4 font-bold">Timestamp</th>
                <th className="px-8 py-4 font-bold">Product</th>
                <th className="px-8 py-4 font-bold">Type</th>
                <th className="px-8 py-4 font-bold">Change</th>
                <th className="px-8 py-4 font-bold">New Stock</th>
                <th className="px-8 py-4 font-bold">Reason</th>
                <th className="px-8 py-4 font-bold">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => {
                const delta = Number(log.change ?? log.quantityChange ?? log.mlChange ?? 0);
                const reasonText = log.reason || log.notes || '-';
                const stockText = log.newStockMl ?? log.newStock ?? '-';
                const actorName = log.actorName || log.userName || 'System';
                const actorRole = log.actorRole || 'admin';

                return (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5 text-xs font-medium text-slate-500">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-slate-300" />
                      {(toDisplayDate(log.createdAt, log.createdAtClient) || new Date()).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-violet-50 group-hover:text-violet-600 transition-colors">
                        <Package size={14} />
                      </div>
                      <span className="text-sm font-bold text-slate-900">{log.productName}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                      log.type === 'addition' || log.type === 'purchase' ? "bg-emerald-50 text-emerald-600" :
                        log.type === 'reduction' || log.type === 'sale' ? "bg-red-50 text-red-600" :
                        log.type === 'return' ? "bg-amber-50 text-amber-700" :
                      "bg-blue-50 text-blue-600"
                    )}>
                      {log.type}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className={cn(
                      "flex items-center gap-1 font-bold text-sm",
                      delta > 0 ? "text-emerald-600" : "text-red-600"
                    )}>
                      {delta > 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                      {Math.abs(delta)}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-sm font-bold text-slate-900">{stockText}</td>
                  <td className="px-8 py-5 text-xs text-slate-500 italic font-medium">"{reasonText}"</td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <User size={12} className="text-slate-300" />
                      {actorName}
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9px]",
                        actorRole === 'cashier' ? "bg-blue-100 text-blue-700" : "bg-violet-100 text-violet-700"
                      )}>
                        {actorRole === 'cashier' ? 'Cashier' : 'Admin'}
                      </span>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredLogs.length === 0 && (
          <div className="p-16 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
              <History className="text-slate-300" size={32} />
            </div>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No inventory logs found matching your search</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryLogs;

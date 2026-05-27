import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Download, 
  Search, 
  Calendar, 
  Filter, 
  ArrowUpDown,
  ChevronRight,
  Printer,
  Share2,
  Table as TableIcon
} from 'lucide-react';
import { useFirestore, useDocument } from '../hooks/useFirestore';
import { formatCurrency, cn } from '../lib/utils';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { format, startOfDay, endOfDay, isWithinInterval, subDays } from 'date-fns';
import { where, orderBy } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import * as XLSX from 'xlsx';
import { toDisplayDate } from '../lib/dates';
import { getSalesCogs } from '../lib/finance';

const DetailedReports: React.FC = () => {
  const { shopId } = useAuth();
  const { documents: sales, loading: salesLoading } = useFirestore<any>(shopId ? 'sales' : null, where('shopId', '==', shopId));
  const { documents: expenses, loading: expensesLoading } = useFirestore<any>(shopId ? 'expenses' : null, where('shopId', '==', shopId));
  const { documents: products } = useFirestore<any>(shopId ? 'products' : null, where('shopId', '==', shopId));


  const [reportType, setReportType] = useState('sales');
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  const filteredData = useMemo(() => {
    const start = startOfDay(new Date(dateRange.start));
    const end = endOfDay(new Date(dateRange.end));

    let data: any[] = [];
    if (reportType === 'sales') data = sales;
    else if (reportType === 'expenses') data = expenses;

    return data.filter(item => {
      const date = toDisplayDate(item.saleDate || item.expenseDate, item.saleDateClient || item.createdAtClient);
      if (!date) return false;
      return isWithinInterval(date, { start, end });
    });
  }, [sales, expenses, reportType, dateRange]);

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredData.map(item => ({
      ID: item.id,
      Date: format(toDisplayDate(item.saleDate || item.expenseDate, item.saleDateClient || item.createdAtClient) || new Date(), 'yyyy-MM-dd'),
      Amount: item.totalAmount || item.amount,
      Description: item.description || (item.items ? item.items.map((i: any) => i.name).join(', ') : ''),
      Payment: item.paymentMethod || '-'
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    const filename = `VapeTrax_${reportType}_Report_${dateRange.start}_to_${dateRange.end}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  if (salesLoading || expensesLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-600 flex items-center justify-center text-white shadow-lg shadow-violet-600/20">
            <FileText size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Detailed Reports</h1>
            <p className="text-slate-500 text-sm">Generate and export comprehensive reports for auditing and accounting</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-sm"
          >
            <Download size={18} />
            Export Excel
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-violet-600/20 transition-all active:scale-[0.98]">
            <Printer size={18} />
            Print PDF
          </button>
        </div>
      </header>

      {/* Report Configuration */}
      <div className="glass-card p-8 flex flex-col md:flex-row gap-8">
        <div className="flex-1 space-y-3">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Report Type</label>
          <div className="flex bg-slate-50 border border-slate-100 rounded-xl p-1">
            {['profit', 'sales', 'expenses'].map((type) => (
              <button
                key={type}
                onClick={() => setReportType(type)}
                className={cn(
                  "flex-1 px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                  reportType === type 
                    ? "bg-white text-violet-600 shadow-sm" 
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 space-y-3">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date Range</label>
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <input 
                type="date" 
                value={dateRange.start}
                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-900 font-medium focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
              />
            </div>
            <span className="text-slate-300 font-bold uppercase tracking-widest text-[10px]">to</span>
            <div className="flex-1 relative">
              <input 
                type="date" 
                value={dateRange.end}
                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-900 font-medium focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Profit Summary Panel */}
      {reportType === 'profit' && (() => {
        const startDate = startOfDay(new Date(dateRange.start));
        const endDate = endOfDay(new Date(dateRange.end));

        const filteredSales = sales.filter(s => {
          const d = toDisplayDate(s.saleDate, s.saleDateClient);
          if (!d) return false;
          return isWithinInterval(d, { start: startDate, end: endDate });
        });
        const filteredExpenses = expenses.filter(e => {
          const d = e.expenseDate?.toDate ? e.expenseDate.toDate() : new Date(e.expenseDate);
          return isWithinInterval(d, { start: startDate, end: endDate });
        });

        const totalRevenue = filteredSales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);

        const totalCOGS = filteredSales.reduce((acc, s) => {
          return acc + (s.totalCOGS ?? getSalesCogs([s], products));
        }, 0);

        const totalExpensesAmt = filteredExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
        const netProfit = totalRevenue - totalCOGS - totalExpensesAmt;
        const margin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100) : 0;

        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="glass-card p-6 border-l-4 border-l-emerald-500">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalRevenue)}</p>
                <p className="text-slate-400 text-xs mt-1">{filteredSales.length} sales</p>
              </div>
              <div className="glass-card p-6 border-l-4 border-l-orange-500">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Cost of Goods Sold</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalCOGS)}</p>
                <p className="text-slate-400 text-xs mt-1">Product costs</p>
              </div>
              <div className="glass-card p-6 border-l-4 border-l-red-500">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Operating Expenses</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpensesAmt)}</p>
                <p className="text-slate-400 text-xs mt-1">{filteredExpenses.length} entries</p>
              </div>
              <div className={cn("glass-card p-6 border-l-4", netProfit >= 0 ? "border-l-violet-500" : "border-l-red-500")}>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Net Profit</p>
                <p className={cn("text-2xl font-bold", netProfit >= 0 ? "text-violet-600" : "text-red-600")}>
                  {formatCurrency(netProfit)}
                </p>
                <p className="text-slate-400 text-xs mt-1">{margin.toFixed(1)}% margin</p>
              </div>
            </div>

            {/* Profit Breakdown */}
            <div className="glass-card p-8">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Profit Breakdown</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="text-sm font-medium text-slate-600">Revenue from Sales</span>
                  <span className="text-sm font-bold text-emerald-600">+ {formatCurrency(totalRevenue)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="text-sm font-medium text-slate-600">Cost of Goods Sold (COGS)</span>
                  <span className="text-sm font-bold text-orange-600">- {formatCurrency(totalCOGS)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="text-sm font-medium text-slate-600">Gross Profit</span>
                  <span className="text-sm font-bold text-slate-900">{formatCurrency(totalRevenue - totalCOGS)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="text-sm font-medium text-slate-600">Operating Expenses</span>
                  <span className="text-sm font-bold text-red-600">- {formatCurrency(totalExpensesAmt)}</span>
                </div>
                <div className="flex justify-between items-center py-4 bg-slate-50 rounded-xl px-4 -mx-4">
                  <span className="text-base font-bold text-slate-900">Net Profit</span>
                  <span className={cn("text-xl font-black", netProfit >= 0 ? "text-violet-600" : "text-red-600")}>
                    {formatCurrency(netProfit)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Report Summary Cards */}
      {reportType !== 'profit' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-6">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Total Entries</p>
            <p className="text-2xl font-bold text-slate-900">{filteredData.length}</p>
          </div>
          <div className="glass-card p-6">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Total Amount</p>
            <p className="text-2xl font-bold text-emerald-600">
              {formatCurrency(filteredData.reduce((acc, item) => acc + (item.totalAmount || item.amount || 0), 0))}
            </p>
          </div>
          <div className="glass-card p-6">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Average per Entry</p>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(filteredData.length > 0 ? filteredData.reduce((acc, item) => acc + (item.totalAmount || item.amount || 0), 0) / filteredData.length : 0)}
            </p>
          </div>
        </div>
      )}

      {/* Report Table */}
      {reportType !== 'profit' && (
        <div className="glass-card overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <TableIcon size={20} className="text-violet-600" />
              Report Data
            </h3>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Showing {filteredData.length} results
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-[10px] uppercase tracking-widest">
                  <th className="px-8 py-4 font-bold">Date</th>
                  <th className="px-8 py-4 font-bold">ID</th>
                  <th className="px-8 py-4 font-bold">Description / Items</th>
                  <th className="px-8 py-4 font-bold">Amount</th>
                  <th className="px-8 py-4 font-bold">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5 text-sm font-medium text-slate-600">
                      {format(toDisplayDate(item.saleDate || item.expenseDate, item.saleDateClient || item.createdAtClient) || new Date(), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-8 py-5 text-[10px] font-bold font-mono text-slate-400 tracking-widest">#{item.id.slice(-6).toUpperCase()}</td>
                    <td className="px-8 py-5">
                      <div className="max-w-xs truncate text-sm font-bold text-slate-900">
                        {item.description || (item.items ? item.items.map((i: any) => i.name).join(', ') : '-')}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-sm font-bold text-slate-900">{formatCurrency(item.totalAmount || item.amount)}</td>
                    <td className="px-8 py-5">
                      <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-bold uppercase tracking-widest">
                        {item.paymentMethod || '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredData.length === 0 && (
            <div className="p-16 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
                <FileText className="text-slate-300" size={32} />
              </div>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No data found for the selected criteria</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DetailedReports;

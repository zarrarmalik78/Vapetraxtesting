import React from 'react';
import {
  Package,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Activity,
  Clock,
  Database,
  RefreshCw,
  Banknote,
  TrendingDown,
  AlertTriangle,
  FileDown,
  Calendar
} from 'lucide-react';
import { getSalesCogs, getSaleItemCogs } from '../lib/finance';
import { seedSampleData } from '../lib/seedData';
import toast from 'react-hot-toast';
import { useFirestoreOnce, useCachedFirestoreOnce } from '../hooks/useFirestoreOnce';
import { useData } from '../contexts/DataContext';

import { formatCurrency, cn } from '../lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { where } from 'firebase/firestore';
// useDocument kept for future single-doc needs
import { toDisplayDate } from '../lib/dates';
import { parseBottleSizeMl } from '../lib/bottles';

// Use aggregations for historical trends
import { useDashboardAggregations } from '../hooks/useDashboardAggregations';

const todayStart = new Date();
todayStart.setHours(0, 0, 0, 0);

// Calculate business day (3 AM offset for late night shops)
const getBusinessDay = (date: Date) => {
  const d = new Date(date);
  if (d.getHours() < 3) d.setDate(d.getDate() - 1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const Dashboard: React.FC = () => {
  const { shopId } = useAuth();
  
  // Products from global memory cache (0 reads)
  const { products, productsLoading } = useData();

  const [seeding, setSeeding] = React.useState(false);
  const [startDateStr, setStartDateStr] = React.useState('');
  const [endDateStr, setEndDateStr] = React.useState('');

  const { currentBusinessDay, currentDay } = React.useMemo(() => {
    const bDay = getBusinessDay(new Date());
    return { currentBusinessDay: bDay, currentDay: bDay.getDay() || 7 };
  }, []);

  const thisWeekBusiness = React.useMemo(() => {
    const d = new Date(currentBusinessDay);
    d.setDate(d.getDate() - currentDay + 1);
    return d;
  }, [currentBusinessDay, currentDay]);

  const thisMonthBusiness = React.useMemo(() => {
    const d = new Date(currentBusinessDay);
    d.setDate(1);
    return d;
  }, [currentBusinessDay]);

  const targetStartDate = startDateStr ? new Date(startDateStr) : new Date(currentBusinessDay);
  const targetEndDate = endDateStr ? new Date(endDateStr) : new Date(currentBusinessDay);
  targetStartDate.setHours(0, 0, 0, 0);
  targetEndDate.setHours(23, 59, 59, 999);

  // 1. Aggregations for historical charts/KPIs (Costs ~32 reads total!)
  const { 
    weeklyRevenue, 
    weeklyProfit, 
    monthlyRevenue, 
    monthlyProfit, 
    trendData, 
    loading: aggsLoading,
    refetch: refetchAggs
  } = useDashboardAggregations(shopId, currentBusinessDay, thisWeekBusiness, thisMonthBusiness);

  // 2. Raw documents for detailed breakdown of the SELECTED date range (Default: Today only)
  // This bypasses cache so the selected date metrics are always live.
  const { documents: periodSales, loading: tSalesLoading, refetch: refetchTSales } = useFirestoreOnce<any>(shopId ? 'sales' : null, where('shopId', '==', shopId), where('saleDateClient', '>=', targetStartDate), where('saleDateClient', '<=', targetEndDate));
  const { documents: periodExpense, loading: tExpensesLoading, refetch: refetchTExpenses } = useFirestoreOnce<any>(shopId ? 'expenses' : null, where('shopId', '==', shopId), where('createdAtClient', '>=', targetStartDate), where('createdAtClient', '<=', targetEndDate));
  const { documents: periodCredits, loading: tCreditsLoading, refetch: refetchTCredits } = useFirestoreOnce<any>(shopId ? 'credits' : null, where('shopId', '==', shopId), where('createdAtClient', '>=', targetStartDate), where('createdAtClient', '<=', targetEndDate));

  const salesLoading = aggsLoading || tSalesLoading;
  const expensesLoading = tExpensesLoading;
  const creditsLoading = tCreditsLoading;

  const handleRefreshAll = React.useCallback(() => {
    refetchAggs();
    refetchTSales(); refetchTExpenses(); refetchTCredits();
  }, [refetchAggs, refetchTSales, refetchTExpenses, refetchTCredits]);

  const handleSeedData = async () => {
    if (seeding) return;
    // Guard: don't call seed if shopId hasn't resolved yet
    if (!shopId) {
      toast.error('Shop ID not ready yet. Please wait a moment and try again.');
      return;
    }
    setSeeding(true);
    const toastId = toast.loading('Seeding sample data...');
    try {
      await seedSampleData(shopId);
      toast.success('Shop seeded with sample data!', { id: toastId });
    } catch (error: any) {
      console.error('Seed error:', error);
      toast.error(error?.message || 'Failed to seed data', { id: toastId });
    } finally {
      setSeeding(false);
      handleRefreshAll();
    }
  };

  // Today's Date String
  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  if (productsLoading || salesLoading || expensesLoading || creditsLoading) {
    return <LoadingSpinner />;
  }

  const isCustomDate = startDateStr || endDateStr;
  const cardPrefix = isCustomDate ? "SELECTED" : "TODAY'S";

  // Sales filtering by business day
  const periodRevenue = periodSales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
  
  let periodProfit = periodSales.reduce((acc, s) => acc + (s.totalProfit || 0), 0);
  if (periodProfit === 0 && periodRevenue > 0) {
    // Fallback for older sales that might not have totalProfit saved
    periodProfit = periodRevenue - getSalesCogs(periodSales, products);
  }

  const periodCash = periodSales.filter(s => s.paymentMethod === 'cash').reduce((acc, s) => acc + (s.totalAmount || 0), 0) + 
                     periodSales.filter(s => s.paymentMethod === 'split').reduce((acc, s) => acc + (s.splitAmounts?.cash || 0), 0);
  const periodOnline = periodSales.filter(s => (s.paymentMethod === 'online' || s.paymentMethod === 'credit')).reduce((acc, s) => acc + (s.totalAmount || 0), 0) + 
                       periodSales.filter(s => s.paymentMethod === 'split').reduce((acc, s) => acc + (s.splitAmounts?.online || 0) + (s.splitAmounts?.credit || 0), 0);
  
  const periodRecoveredCredit = periodCredits.filter(c => c.transactionType === 'taken').reduce((acc, c) => acc + (c.amount || 0), 0);

  const periodExpenseTotal = periodExpense.reduce((acc, e) => acc + (e.amount || 0), 0);

  // Sales Trend Data (Last 30 business days) is now provided by useDashboardAggregations
  const salesTrendData = trendData;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-600 flex items-center justify-center text-white shadow-lg shadow-violet-600/20">
            <Activity size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Business Overview</h1>
            <p className="text-slate-500 text-sm">Business analytics for your shop (last 90 days)</p>
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={handleRefreshAll}
                className="bg-violet-100 hover:bg-violet-200 text-violet-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw size={10} />
                Refresh Data
              </button>
              <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1.5">
                <Clock size={10} />
                PKT (UTC+5)
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1 shadow-sm">
            <Calendar size={14} className="text-slate-400" />
            <input 
              type="date" 
              value={startDateStr}
              onChange={(e) => setStartDateStr(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-600 focus:outline-none"
            />
            <span className="text-slate-300">-</span>
            <input 
              type="date" 
              value={endDateStr}
              onChange={(e) => setEndDateStr(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-600 focus:outline-none"
            />
          </div>
          {(startDateStr || endDateStr) && (
            <button 
              onClick={() => { setStartDateStr(''); setEndDateStr(''); }}
              className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-rose-500 transition-colors"
            >
              Clear
            </button>
          )}
        </div>


      </header>



      {/* KPI Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <TrendingUp className="text-violet-600" size={24} />
          <h2 className="text-xl font-bold text-slate-900">Key Performance Indicators</h2>
          <span className="text-slate-400 text-sm ml-auto">Real-time business metrics at a glance</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title={`${cardPrefix} PROFIT`}
            value={formatCurrency(periodProfit)}
            icon={<TrendingUp size={24} className="text-white" />}
            colorClass="metric-card-orange shadow-orange-500/20"
          />
          <MetricCard
            title={`${cardPrefix} REVENUE`}
            value={formatCurrency(periodRevenue)}
            icon={<DollarSign size={24} className="text-white" />}
            colorClass="metric-card-violet shadow-violet-500/20"
          />
          <MetricCard
            title={`${cardPrefix} CASH`}
            value={formatCurrency(periodCash)}
            icon={<Banknote size={24} className="text-white" />}
            colorClass="metric-card-emerald shadow-emerald-500/20"
            extra={`+ ${formatCurrency(periodRecoveredCredit)} Recovered Credit`}
          />
          <MetricCard
            title={`${cardPrefix} ONLINE/CREDIT`}
            value={formatCurrency(periodOnline)}
            icon={<RefreshCw size={24} className="text-white" />}
            colorClass="metric-card-cyan shadow-cyan-500/20"
          />
        </div>

        {/* Row 2 Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">

          <MetricCard
            title="WEEKLY PROFIT"
            value={formatCurrency(weeklyProfit)}
            icon={<TrendingUp size={24} className="text-white" />}
            colorClass="metric-card-pink shadow-fuchsia-500/20"
          />
          <MetricCard
            title="MONTHLY PROFIT"
            value={formatCurrency(monthlyProfit)}
            icon={<TrendingUp size={24} className="text-white" />}
            colorClass="metric-card-violet shadow-violet-500/20"
          />
          <MetricCard
            title="MONTHLY REVENUE"
            value={formatCurrency(monthlyRevenue)}
            icon={<DollarSign size={24} className="text-white" />}
            colorClass="metric-card-cyan shadow-cyan-500/20"
          />
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-8">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Activity className="text-blue-600" size={20} />
              <h3 className="text-lg font-bold text-slate-900">Sales Trend (Last 30 Days)</h3>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-1 bg-blue-500 rounded-full"></div>
                <span className="text-slate-500">Revenue (Rs)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-1 bg-fuchsia-400 rounded-full"></div>
                <span className="text-slate-500">Transactions</span>
              </div>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%" minHeight={0} minWidth={0}>
              <AreaChart data={salesTrendData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value / 1000}k`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
                <Area
                  type="monotone"
                  dataKey="transactions"
                  stroke="#e879f9"
                  strokeWidth={3}
                  fill="none"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>



      {/* Footer Badge */}
      </div>
      <div className="flex justify-center pt-4">
        <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 p-[1px] rounded-full shadow-lg shadow-violet-600/20">
          <div className="bg-white/90 backdrop-blur-sm px-6 py-1.5 rounded-full text-[10px] font-bold text-violet-700 uppercase tracking-widest">
            Powered by Zynta Tech
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard: React.FC<{ title: string, value: string | number, icon: React.ReactNode, colorClass: string, extra?: string }> = ({ title, value, icon, colorClass, extra }) => (
  <div className={cn(colorClass, "rounded-2xl p-6 shadow-lg relative overflow-hidden group")}>
    <div className="absolute top-4 right-4 p-3 bg-white/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
      {icon}
    </div>
    <div className="relative z-10">
      <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-1">{title}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
      {extra && <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest mt-2">{extra}</p>}
    </div>
  </div>
);

export default Dashboard;

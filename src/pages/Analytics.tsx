import React, { useState, useMemo } from 'react';
import { 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingBag, 
  Users, 
  Calendar,
  Filter,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  BarChart
} from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import { formatCurrency, cn } from '../lib/utils';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { startOfMonth, endOfMonth, subMonths, format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { where } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { getSalesCogs } from '../lib/finance';
import { toDisplayDate } from '../lib/dates';

const Analytics: React.FC = () => {
  const { shopId } = useAuth();
  const { documents: sales, loading: salesLoading } = useFirestore<any>(shopId ? 'sales' : null, where('shopId', '==', shopId));
  const { documents: expenses, loading: expensesLoading } = useFirestore<any>(shopId ? 'expenses' : null, where('shopId', '==', shopId));
  const { documents: customers, loading: customersLoading } = useFirestore<any>(shopId ? 'customers' : null, where('shopId', '==', shopId));
  const { documents: products, loading: productsLoading } = useFirestore<any>(shopId ? 'products' : null, where('shopId', '==', shopId));

  const [timeRange, setTimeRange] = useState('thisMonth');

  const stats = useMemo(() => {
    if (salesLoading || expensesLoading) return null;

    const now = new Date();
    let startDate: Date;
    let endDate = endOfDay(now);

    switch (timeRange) {
      case 'today':
        startDate = startOfDay(now);
        break;
      case 'thisMonth':
        startDate = startOfMonth(now);
        break;
      case 'lastMonth':
        startDate = startOfMonth(subMonths(now, 1));
        endDate = endOfMonth(subMonths(now, 1));
        break;
      case 'last3Months':
        startDate = startOfMonth(subMonths(now, 3));
        break;
      default:
        startDate = startOfMonth(now);
    }

    const filteredSales = sales.filter(s => {
      const date = toDisplayDate(s.saleDate, s.saleDateClient);
      if (!date) return false;
      return isWithinInterval(date, { start: startDate, end: endDate });
    });

    const filteredExpenses = expenses.filter(e => {
      const date = e.expenseDate?.toDate ? e.expenseDate.toDate() : new Date(e.expenseDate);
      return isWithinInterval(date, { start: startDate, end: endDate });
    });

    const totalRevenue = filteredSales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
    const totalExpenses = filteredExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
    const totalCOGS = filteredSales.reduce((acc, s) => acc + (s.totalCOGS ?? getSalesCogs([s], products)), 0);
    const totalProfit = filteredSales.reduce((acc, s) => acc + (s.totalProfit ?? (s.totalAmount - (s.totalCOGS ?? getSalesCogs([s], products)))), 0) - totalExpenses;

    // Daily Sales Data for Chart
    const dailyData: any = {};
    filteredSales.forEach(s => {
      const date = toDisplayDate(s.saleDate, s.saleDateClient);
      if (!date) return;
      const day = format(date, 'MMM dd');
      dailyData[day] = (dailyData[day] || 0) + s.totalAmount;
    });

    const chartData = Object.keys(dailyData).map(day => ({
      name: day,
      revenue: dailyData[day]
    })).sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());

    // Payment Method Data
    const paymentData: any = {};
    filteredSales.forEach(s => {
      paymentData[s.paymentMethod] = (paymentData[s.paymentMethod] || 0) + 1;
    });

    const pieData = Object.keys(paymentData).map(method => ({
      name: method,
      value: paymentData[method]
    }));

    return {
      totalRevenue,
      totalCOGS,
      totalExpenses,
      totalProfit,
      chartData,
      pieData,
      salesCount: filteredSales.length
    };
  }, [sales, expenses, products, salesLoading, expensesLoading, timeRange]);

  const COLORS = ['#8b5cf6', '#d946ef', '#3b82f6', '#10b981', '#f59e0b'];

  if (salesLoading || expensesLoading || customersLoading || productsLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-600 flex items-center justify-center text-white shadow-lg shadow-violet-600/20">
            <BarChart size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Business Analytics</h1>
            <p className="text-slate-500 text-sm">Deep dive into your shop's performance and financial health</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            {['today', 'thisMonth', 'lastMonth', 'last3Months'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  "px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                  timeRange === range 
                    ? "bg-violet-600 text-white shadow-md" 
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                )}
              >
                {range.replace(/([A-Z])/g, ' $1').trim()}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Total Revenue" 
          value={formatCurrency(stats?.totalRevenue || 0)} 
          icon={<DollarSign className="text-violet-600" />}
          trend="+12.5%"
          isUp={true}
        />
        <MetricCard 
          title="Total Expenses" 
          value={formatCurrency(stats?.totalExpenses || 0)} 
          icon={<ShoppingBag className="text-fuchsia-600" />}
          trend="-2.4%"
          isUp={false}
        />
        <MetricCard 
          title="Net Profit" 
          value={formatCurrency(stats?.totalProfit || 0)} 
          icon={<TrendingUp className="text-emerald-600" />}
          trend="+18.2%"
          isUp={true}
        />
        <MetricCard 
          title="COGS" 
          value={formatCurrency(stats?.totalCOGS || 0)} 
          icon={<Users className="text-blue-600" />}
          trend="+0.0%"
          isUp={false}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 glass-card p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <TrendingUp size={20} className="text-violet-600" />
              Revenue Over Time
            </h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-violet-600"></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Revenue</span>
              </div>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%" minHeight={0} minWidth={0}>
              <AreaChart data={stats?.chartData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  fontWeight={600}
                  tickLine={false} 
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  fontWeight={600}
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(value) => `Rs${value/1000}k`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: 'none',
                    borderRadius: '16px',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    padding: '12px'
                  }}
                  itemStyle={{ color: '#7c3aed', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#7c3aed" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorRev)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Pie Chart */}
        <div className="glass-card p-8">
          <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-8 flex items-center gap-2">
            <Filter size={20} className="text-fuchsia-600" />
            Payment Methods
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%" minHeight={0} minWidth={0}>
              <PieChart>
                <Pie
                  data={stats?.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {stats?.pieData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: 'none',
                    borderRadius: '16px',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    padding: '12px'
                  }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  iconType="circle"
                  formatter={(value) => <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-8 space-y-4">
            {stats?.pieData.map((item: any, index: number) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{item.name}</span>
                </div>
                <span className="text-sm font-bold text-slate-900">{item.value} sales</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Products */}
        <div className="glass-card p-8">
          <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-8">Top Selling Products</h3>
          <div className="space-y-6">
            {(() => {
              // Compute real product sale counts
              const productSales: Record<string, { name: string, brand: string, count: number, revenue: number }> = {};
              sales.forEach((s: any) => {
                s.items?.forEach((item: any) => {
                  const pid = item.productId;
                  if (!productSales[pid]) {
                    productSales[pid] = { name: item.productName || 'Unknown', brand: '', count: 0, revenue: 0 };
                    const prod = products.find((p: any) => p.id === pid);
                    if (prod) productSales[pid].brand = prod.brand;
                  }
                  productSales[pid].count += item.quantity || 1;
                  productSales[pid].revenue += item.totalPrice || 0;
                });
              });
              return Object.values(productSales)
                .sort((a, b) => b.count - a.count)
                .slice(0, 5)
                .map((product, index) => (
                  <div key={index} className="flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 font-bold text-xs group-hover:bg-violet-50 group-hover:text-violet-600 transition-colors">
                        0{index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{product.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{product.brand}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">{product.count} Sold</p>
                      <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{formatCurrency(product.revenue)}</p>
                    </div>
                  </div>
                ));
            })()}
            {sales.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">No sales data yet</p>
            )}
          </div>
        </div>

        {/* Customer Insights */}
        <div className="glass-card p-8">
          <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-8">Customer Insights</h3>
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Customers</p>
              <p className="text-2xl font-bold text-slate-900">{customers.length}</p>
            </div>
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">With Credit Balance</p>
              <p className="text-2xl font-bold text-violet-600">{customers.filter((c: any) => (c.creditBalance || 0) > 0).length}</p>
            </div>
          </div>
          <div className="space-y-6">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Top Customers by Credit</h4>
            {customers
              .filter((c: any) => (c.creditBalance || 0) > 0)
              .sort((a: any, b: any) => (b.creditBalance || 0) - (a.creditBalance || 0))
              .slice(0, 3)
              .map((customer: any) => (
              <div key={customer.id} className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-violet-600/20">
                    {customer.name.charAt(0)}
                  </div>
                  <span className="text-sm font-bold text-slate-900">{customer.name}</span>
                </div>
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">{formatCurrency(customer.creditBalance || 0)}</span>
              </div>
            ))}
            {customers.filter((c: any) => (c.creditBalance || 0) > 0).length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">No credit balances</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard: React.FC<{ title: string, value: string, icon: React.ReactNode, trend: string, isUp: boolean }> = ({ title, value, icon, trend, isUp }) => (
  <div className="glass-card p-6 hover:translate-y-[-4px] transition-all group">
    <div className="flex items-center justify-between mb-4">
      <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-violet-50 transition-colors">
        {icon}
      </div>
      <div className={cn(
        "flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
        isUp ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
      )}>
        {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        {trend}
      </div>
    </div>
    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">{title}</p>
    <p className="text-3xl font-bold text-slate-900">{value}</p>
  </div>
);

export default Analytics;

import React from 'react';
import { 
  Package, 
  ShoppingCart, 
  DollarSign, 
  TrendingUp,
  Activity,
  Clock,
  AlertTriangle,
  FileDown,
  Database,
  RefreshCw
} from 'lucide-react';
import { seedSampleData } from '../lib/seedData';
import toast from 'react-hot-toast';
import { useFirestore } from '../hooks/useFirestore';
import { useNotifications } from '../contexts/NotificationContext';
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
  Area
} from 'recharts';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { where } from 'firebase/firestore';
import { useDocument } from '../hooks/useFirestore';
import { toDisplayDate } from '../lib/dates';

const Dashboard: React.FC = () => {
  const { shopId } = useAuth();
  const { documents: products, loading: productsLoading } = useFirestore<any>(shopId ? 'products' : null, where('shopId', '==', shopId));
  const { documents: sales, loading: salesLoading } = useFirestore<any>(shopId ? 'sales' : null, where('shopId', '==', shopId));
  const { activeAlerts } = useNotifications();
  const [seeding, setSeeding] = React.useState(false);

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
      toast.error(error?.message || 'Failed to seed data. Try again.', { id: toastId });
    } finally {
      setSeeding(false);
    }
  };

  // Today's Date String
  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  if (productsLoading || salesLoading) {
    return <LoadingSpinner />;
  }

  // Calculate stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todaySales = sales.filter(s => {
    const saleDate = toDisplayDate(s.saleDate, s.saleDateClient);
    if (!saleDate) return false;
    return saleDate >= today;
  });

  const todayRevenue = todaySales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
  
  // Monthly revenue
  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);
  const monthlyRevenue = sales
    .filter(s => {
      const d = toDisplayDate(s.saleDate, s.saleDateClient);
      return d ? d >= thisMonth : false;
    })
    .reduce((acc, s) => acc + (s.totalAmount || 0), 0);

  // Sales Trend Data (Last 30 days)
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const salesTrendData = last30Days.map(date => {
    const daySales = sales.filter(s => {
      const sDate = toDisplayDate(s.saleDate, s.saleDateClient);
      if (!sDate) return false;
      sDate.setHours(0, 0, 0, 0);
      return sDate.getTime() === date.getTime();
    });
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: daySales.reduce((acc, s) => acc + (s.totalAmount || 0), 0),
      transactions: daySales.length
    };
  });

  // Category Performance Data from real products
  const categoryMap: Record<string, number> = {};
  products.forEach((p: any) => {
    const cat = p.category || 'other';
    categoryMap[cat] = (categoryMap[cat] || 0) + (p.sellingPrice * p.stockQuantity);
  });
  const categoryColors: Record<string, string> = {
    device: '#6366f1', coil: '#f472b6', 'e-liquid': '#38bdf8', accessory: '#22c55e', other: '#94a3b8'
  };
  const categoryData = Object.entries(categoryMap).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: categoryColors[name] || '#94a3b8'
  }));

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
            <p className="text-slate-500 text-sm">Real-time performance analytics for your shop</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                Live Data
              </span>
              <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1.5">
                <Clock size={10} />
                PKT (UTC+5)
              </span>
            </div>
          </div>
        </div>
        
        {products.length === 0 && (
          <button 
            onClick={handleSeedData}
            disabled={seeding}
            className="flex items-center gap-2 px-6 py-3 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-fuchsia-600/20 uppercase tracking-widest text-xs"
          >
            {seeding ? <RefreshCw className="animate-spin" size={18} /> : <Database size={18} />}
            Seed Sample Data
          </button>
        )}
      </header>

      {/* Low Stock Alerts */}
      {activeAlerts.length > 0 && (
        <div className="glass-card p-6 border-l-4 border-l-amber-500">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="text-amber-600" size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Low Stock Alerts</h3>
              <p className="text-slate-500 text-xs">{activeAlerts.length} product{activeAlerts.length !== 1 ? 's' : ''} below minimum stock level</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeAlerts.map((alert) => (
              <div key={alert.id} className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl p-3 transition-all hover:shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-amber-200 flex items-center justify-center flex-shrink-0">
                  <Package size={16} className="text-amber-700" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-800 truncate">{alert.productName}</p>
                  <p className="text-xs text-amber-700 font-medium">
                    Stock: <span className="font-bold text-red-600">{alert.currentStock}</span> / Min: {alert.minStockLevel}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPIs and Charts section follows... */}

      {/* KPI Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <TrendingUp className="text-violet-600" size={24} />
          <h2 className="text-xl font-bold text-slate-900">Key Performance Indicators</h2>
          <span className="text-slate-400 text-sm ml-auto">Real-time business metrics at a glance</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard 
            title="MONTHLY REVENUE" 
            value={formatCurrency(monthlyRevenue)} 
            icon={<TrendingUp size={24} className="text-white" />} 
            colorClass="metric-card-violet shadow-violet-500/20"
          />
          <MetricCard 
            title="TODAY'S SALES" 
            value={todaySales.length} 
            icon={<ShoppingCart size={24} className="text-white" />} 
            colorClass="metric-card-cyan shadow-cyan-500/20"
          />
          <MetricCard 
            title="TODAY'S REVENUE" 
            value={formatCurrency(todayRevenue)} 
            icon={<DollarSign size={24} className="text-white" />} 
            colorClass="metric-card-emerald shadow-emerald-500/20"
          />
          <MetricCard 
            title="TOTAL PRODUCTS" 
            value={products.length} 
            icon={<Package size={24} className="text-white" />} 
            colorClass="metric-card-orange shadow-orange-500/20"
          />
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-card p-6">
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
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
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
                  tickFormatter={(value) => `${value/1000}k`}
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

        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-slate-900">Category Performance</h3>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%" minHeight={0} minWidth={0}>
              <BarChart data={categoryData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={40}>
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-wrap gap-4 justify-center">
            {categoryData.map((item) => (
              <div key={item.name} className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                {item.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Badge */}
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

const MetricCard: React.FC<{ title: string, value: string | number, icon: React.ReactNode, colorClass: string }> = ({ title, value, icon, colorClass }) => (
  <div className={cn(colorClass, "rounded-2xl p-6 shadow-lg relative overflow-hidden group")}>
    <div className="absolute top-4 right-4 p-3 bg-white/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
      {icon}
    </div>
    <div className="relative z-10">
      <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-1">{title}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
    </div>
  </div>
);

export default Dashboard;

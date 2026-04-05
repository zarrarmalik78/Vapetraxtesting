import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  History,
  Users,
  CreditCard,
  Factory,
  Download,
  DollarSign,
  BarChart3,
  FileText,
  ClipboardList,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Plus
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useConnectivity } from '../../hooks/useConnectivity';
import { useDocument } from '../../hooks/useFirestore';
import { cn } from '../../lib/utils';

const Sidebar: React.FC = () => {
  const { currentUser, userRole, shopId, logout } = useAuth();
  const { status: connectivityStatus } = useConnectivity();
  const { document: settings } = useDocument<any>('settings', shopId || 'shop_settings');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const shopName = settings?.shopName || 'VapeTrax';
  const shopLogo = settings?.shopLogo;

  const connectivityConfig = {
    online: { dot: 'bg-emerald-500', label: 'Online', bg: 'bg-emerald-100 text-emerald-700' },
    offline: { dot: 'bg-red-500', label: 'Offline', bg: 'bg-red-100 text-red-700' },
    syncing: { dot: 'bg-amber-500 animate-pulse', label: 'Syncing', bg: 'bg-amber-100 text-amber-700' },
  };

  const connConfig = connectivityConfig[connectivityStatus];

  const topNavItems = [
    { name: 'New Sale', path: '/', icon: ShoppingCart, roles: ['admin', 'cashier'] },
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['admin'] },
    { name: 'Products', path: '/stock', icon: Package, roles: ['admin', 'cashier'] },
    { name: 'Expenses', path: '/expenses', icon: DollarSign, roles: ['admin', 'cashier'] },
    { name: 'Customers', path: '/customers', icon: Users, roles: ['admin', 'cashier'] },
    { name: 'Credits History', path: '/credits', icon: CreditCard, roles: ['admin'] },
    { name: 'Inventory Logs', path: '/inventory-logs', icon: ClipboardList, roles: ['admin', 'cashier'] },
  ];

  const bottomNavItems = [
    { name: 'Sales History', path: '/sales', icon: History, roles: ['admin', 'cashier'] },
    { name: 'Analytics', path: '/analytics', icon: BarChart3, roles: ['admin'] },
    { name: 'Detailed Reports', path: '/reports/detailed', icon: FileText, roles: ['admin'] },
  ];

  const filteredTopNav = topNavItems.filter(item => item.roles.includes(userRole || ''));
  const filteredBottomNav = bottomNavItems.filter(item => item.roles.includes(userRole || ''));

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-violet-600 rounded-lg text-white"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-full bg-white border-r border-slate-200 z-40 transition-all duration-300 flex flex-col",
        collapsed ? "w-20" : "w-64",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Logo Section */}
        <div className="p-6 flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-6">
            {!collapsed && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 flex items-center justify-center bg-violet-600 rounded-lg shadow-lg shadow-violet-600/20 overflow-hidden">
                  {shopLogo ? (
                    <img src={shopLogo} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <img src="/icon.png" alt="VapeTrax" className="w-full h-full object-contain" />
                  )}
                </div>
                <span className="text-lg font-bold text-slate-900 tracking-tight">{shopName}</span>
              </div>
            )}
            <button
              className="hidden lg:block p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
          </div>

          {!collapsed && (
            <div className="w-full flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 p-0.5 mb-3 shadow-lg shadow-violet-500/20 overflow-hidden">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center font-bold text-violet-600 text-xl overflow-hidden">
                  {shopLogo ? (
                    <img src={shopLogo} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <img src="/icon.png" alt="VapeTrax" className="w-full h-full object-contain" />
                  )}
                </div>
              </div>
              <h3 className="text-slate-900 font-bold text-lg leading-tight">{shopName}</h3>
              <p className="text-slate-500 text-xs mb-3 font-medium uppercase tracking-wider">Premium Management</p>
              <div className={cn("px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5", connConfig.bg)}>
                <div className={cn("w-1.5 h-1.5 rounded-full", connConfig.dot)}></div>
                {connConfig.label}
                <span className="opacity-60 capitalize">{userRole || 'User'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1 scrollbar-none">
          {filteredTopNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group",
                isActive
                  ? "bg-violet-600 text-white shadow-lg shadow-violet-600/20"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
              onClick={() => setMobileOpen(false)}
            >
              <item.icon size={20} className={cn(
                "min-w-[20px]",
                collapsed ? "mx-auto" : ""
              )} />
              {!collapsed && <span className="text-sm font-bold uppercase tracking-wider">{item.name}</span>}
            </NavLink>
          ))}

          <div className="pt-4 pb-2">
            <div className="h-px bg-slate-100 mx-2"></div>
          </div>

          {filteredBottomNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group",
                isActive
                  ? "bg-violet-600 text-white shadow-lg shadow-violet-600/20"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
              onClick={() => setMobileOpen(false)}
            >
              <item.icon size={20} className={cn(
                "min-w-[20px]",
                collapsed ? "mx-auto" : ""
              )} />
              {!collapsed && <span className="text-sm font-bold uppercase tracking-wider">{item.name}</span>}
            </NavLink>
          ))}

          <div className="pt-4 pb-2">
            <div className="h-px bg-slate-100 mx-2"></div>
          </div>

          {/* Settings */}
          {(userRole === 'admin') && (
            <NavLink
              to="/settings"
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group",
                isActive
                  ? "bg-violet-600 text-white shadow-lg shadow-violet-600/20"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
              onClick={() => setMobileOpen(false)}
            >
              <Settings size={20} className={cn(
                "min-w-[20px]",
                collapsed ? "mx-auto" : ""
              )} />
              {!collapsed && <span className="text-sm font-bold uppercase tracking-wider">Settings</span>}
            </NavLink>
          )}

          <button
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-slate-500 hover:bg-rose-50 hover:text-rose-600 group",
              collapsed ? "justify-center" : ""
            )}
          >
            <LogOut size={20} className="min-w-[20px]" />
            {!collapsed && <span className="text-sm font-bold uppercase tracking-wider">Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

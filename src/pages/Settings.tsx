import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Store, 
  Palette, 
  FileText, 
  Shield, 
  Save, 
  Upload, 
  Trash2, 
  Plus, 
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  Image as ImageIcon,
  UserPlus,
  Lock,
  Eye,
  EyeOff,
  Smartphone,
  CheckCircle2,
  Info,
  Download
} from 'lucide-react';
import { useFirestore, useDocument } from '../hooks/useFirestore';
import { usePWA } from '../hooks/usePWA';
import { db } from '../firebase';
import { doc, setDoc, updateDoc, serverTimestamp, where } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { formatCurrency, cn } from '../lib/utils';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const Settings: React.FC = () => {
  const { shopId, currentUser, createCashier, deleteCashier, resetPassword } = useAuth();
  const { document: settings, loading } = useDocument<any>(shopId ? 'settings' : null, shopId ? (shopId || 'shop_settings') : null);
  const { document: adminUser } = useDocument<any>('users', currentUser?.uid || '___none___');
  const { canInstall, isStandalone, promptInstall } = usePWA();
  const [activeTab, setActiveTab] = useState('shop');
  const [formData, setFormData] = useState<any>(null);
  const [adminForm, setAdminForm] = useState({ name: '', email: '' });
  const [adminSaving, setAdminSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    } else {
      setFormData({
        shopName: 'My Shop',
        shopLogo: '',
        shopAddress: '',
        shopPhone: '',
        shopEmail: '',
        shopWebsite: '',
        currency: 'Rs',
        invoicePrefix: 'INV-',
        invoiceFooter: 'Thank you for your business!',
        lowStockThreshold: 5,
        themeColor: '#8b5cf6',
        accentColor: '#d946ef'
      });
    }
  }, [settings]);

  useEffect(() => {
    if (adminUser) {
      setAdminForm({
        name: adminUser.username || currentUser?.displayName || '',
        email: adminUser.email || currentUser?.email || ''
      });
    } else {
      setAdminForm({
        name: currentUser?.displayName || '',
        email: currentUser?.email || ''
      });
    }
  }, [adminUser, currentUser]);

  const handleSave = async () => {
    if (!shopId) {
      toast.error('Shop not loaded yet. Please wait a moment and try again.');
      return;
    }
    try {
      await setDoc(doc(db, 'settings', shopId), {
        ...formData,
        shopId,
        updatedAt: serverTimestamp()
      });
      toast.success('Settings updated successfully');
    } catch (error: any) {
      console.error('Settings save error:', error);
      const code = error?.code ? ` (${error.code})` : '';
      toast.error((error?.message || 'Failed to update settings') + code);
    }
  };

  const handleAdminSave = async () => {
    if (!currentUser?.uid) return;
    if (!adminForm.name.trim()) {
      toast.error('Admin name is required');
      return;
    }
    setAdminSaving(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        username: adminForm.name.trim(),
        email: adminForm.email.trim(),
        updatedAt: serverTimestamp()
      });
      toast.success('Admin profile updated');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update admin profile');
    } finally {
      setAdminSaving(false);
    }
  };

  if (loading || !formData) return <LoadingSpinner />;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-600 flex items-center justify-center text-white shadow-lg shadow-violet-600/20">
            <SettingsIcon size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Settings</h1>
            <p className="text-slate-500 text-sm">Configure your shop details, branding, and system preferences</p>
          </div>
        </div>
        {activeTab !== 'security' && (
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-violet-600/20 transition-all active:scale-[0.98]"
          >
            <Save size={20} />
            Save Changes
          </button>
        )}
      </header>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Settings Navigation */}
        <div className="lg:w-72 space-y-2">
          <SettingsNavButton 
            active={activeTab === 'shop'} 
            onClick={() => setActiveTab('shop')} 
            icon={<Store size={18} />} 
            label="Shop Profile" 
          />
          <SettingsNavButton 
            active={activeTab === 'branding'} 
            onClick={() => setActiveTab('branding')} 
            icon={<Palette size={18} />} 
            label="Branding" 
          />
          <SettingsNavButton 
            active={activeTab === 'invoice'} 
            onClick={() => setActiveTab('invoice')} 
            icon={<FileText size={18} />} 
            label="Invoice Template" 
          />
          <SettingsNavButton 
            active={activeTab === 'system'} 
            onClick={() => setActiveTab('system')} 
            icon={<SettingsIcon size={18} />} 
            label="System Config" 
          />
          <SettingsNavButton 
            active={activeTab === 'security'} 
            onClick={() => setActiveTab('security')} 
            icon={<Shield size={18} />} 
            label="User Management" 
          />
          <SettingsNavButton 
            active={activeTab === 'mobile'} 
            onClick={() => setActiveTab('mobile')} 
            icon={<Smartphone size={18} />} 
            label="Mobile App" 
          />
        </div>

        {/* Settings Content */}
        <div className="flex-1 glass-card p-8 min-h-[600px]">
          {activeTab === 'shop' && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-6">
                <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600">
                  <Store size={20} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Shop Profile</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Store size={14} className="text-violet-600" />
                    Shop Name
                  </label>
                  <input 
                    type="text" 
                    value={formData.shopName}
                    onChange={(e) => setFormData({...formData, shopName: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-900 font-medium focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Phone size={14} className="text-violet-600" />
                    Phone Number
                  </label>
                  <input 
                    type="text" 
                    value={formData.shopPhone}
                    onChange={(e) => setFormData({...formData, shopPhone: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-900 font-medium focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Mail size={14} className="text-violet-600" />
                    Email Address
                  </label>
                  <input 
                    type="email" 
                    value={formData.shopEmail}
                    onChange={(e) => setFormData({...formData, shopEmail: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-900 font-medium focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Globe size={14} className="text-violet-600" />
                    Website
                  </label>
                  <input 
                    type="text" 
                    value={formData.shopWebsite}
                    onChange={(e) => setFormData({...formData, shopWebsite: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-900 font-medium focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
                  />
                </div>
                <div className="md:col-span-2 space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <MapPin size={14} className="text-violet-600" />
                    Physical Address
                  </label>
                  <textarea 
                    value={formData.shopAddress}
                    onChange={(e) => setFormData({...formData, shopAddress: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-900 font-medium focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all h-32 resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'branding' && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-6">
                <div className="w-10 h-10 rounded-xl bg-fuchsia-50 flex items-center justify-center text-fuchsia-600">
                  <Palette size={20} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Branding & Visuals</h3>
              </div>
              <div className="space-y-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <ImageIcon size={14} className="text-fuchsia-600" />
                    Shop Logo URL
                  </label>
                  <div className="flex items-center gap-6">
                    <div className="w-32 h-32 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shadow-inner">
                      {formData.shopLogo ? (
                        <img src={formData.shopLogo} alt="Logo" className="w-full h-full object-contain p-2" />
                      ) : (
                        <Store size={40} className="text-slate-200" />
                      )}
                    </div>
                    <div className="flex-1 space-y-3">
                      <input 
                        type="text" 
                        placeholder="https://example.com/logo.png"
                        value={formData.shopLogo}
                        onChange={(e) => setFormData({...formData, shopLogo: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-900 font-medium focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
                      />
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Provide a direct URL to your shop's logo image</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Theme Primary Color</label>
                    <div className="flex items-center gap-3">
                      <input 
                        type="color" 
                        value={formData.themeColor}
                        onChange={(e) => setFormData({...formData, themeColor: e.target.value})}
                        className="w-12 h-12 rounded-xl bg-transparent border-none cursor-pointer shadow-sm"
                      />
                      <input 
                        type="text" 
                        value={formData.themeColor}
                        onChange={(e) => setFormData({...formData, themeColor: e.target.value})}
                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-900 font-mono font-bold focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Accent Color</label>
                    <div className="flex items-center gap-3">
                      <input 
                        type="color" 
                        value={formData.accentColor}
                        onChange={(e) => setFormData({...formData, accentColor: e.target.value})}
                        className="w-12 h-12 rounded-xl bg-transparent border-none cursor-pointer shadow-sm"
                      />
                      <input 
                        type="text" 
                        value={formData.accentColor}
                        onChange={(e) => setFormData({...formData, accentColor: e.target.value})}
                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-900 font-mono font-bold focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'invoice' && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <FileText size={20} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Invoice Template</h3>
              </div>
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Invoice Number Prefix</label>
                    <input 
                      type="text" 
                      value={formData.invoicePrefix}
                      onChange={(e) => setFormData({...formData, invoicePrefix: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-900 font-medium focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
                      placeholder="e.g., INV-"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Currency Symbol</label>
                    <input 
                      type="text" 
                      value={formData.currency}
                      onChange={(e) => setFormData({...formData, currency: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-900 font-medium focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
                      placeholder="e.g., Rs"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Invoice Footer Note</label>
                  <textarea 
                    value={formData.invoiceFooter}
                    onChange={(e) => setFormData({...formData, invoiceFooter: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-900 font-medium focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all h-32 resize-none"
                    placeholder="e.g., Thank you for your business!"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-6">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                  <SettingsIcon size={20} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">System Configuration</h3>
              </div>
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Low Stock Alert Threshold</label>
                  <input 
                    type="number" 
                    value={formData.lowStockThreshold}
                    onChange={(e) => setFormData({...formData, lowStockThreshold: parseInt(e.target.value)})}
                    className="w-full max-w-xs px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-900 font-medium focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
                  />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Products with stock below this number will trigger a dashboard alert</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <CashierManagement
              shopId={shopId}
              createCashier={createCashier}
              deleteCashier={deleteCashier}
              adminForm={adminForm}
              setAdminForm={setAdminForm}
              adminSaving={adminSaving}
              onSaveAdmin={handleAdminSave}
              onResetPassword={resetPassword}
            />
          )}

          {activeTab === 'mobile' && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-6">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Smartphone size={20} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Mobile Application</h3>
              </div>

              <div className="bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-2xl p-8 text-white shadow-xl shadow-violet-600/20 relative overflow-hidden">
                <div className="relative z-10 space-y-4 max-w-lg">
                  <h4 className="text-2xl font-bold">Install VapeTrax on your phone</h4>
                  <p className="text-violet-50 text-sm leading-relaxed">
                    Access your shop management system directly from your home screen just like a native app.
                    Loads faster, works offline for basic tasks, and provides a full-screen experience.
                  </p>
                  
                  {isStandalone ? (
                    <div className="flex items-center gap-2 py-2 px-4 bg-white/20 backdrop-blur-md rounded-xl w-fit">
                      <CheckCircle2 size={20} />
                      <span className="font-bold text-sm">Already Installed</span>
                    </div>
                  ) : canInstall ? (
                    <button 
                      onClick={promptInstall}
                      className="flex items-center gap-2 px-6 py-3 bg-white text-violet-600 font-bold text-sm uppercase tracking-widest rounded-xl shadow-lg hover:bg-violet-50 transition-all active:scale-[0.98]"
                    >
                      <Download size={20} />
                      Install Now
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 py-2 px-4 bg-white/10 backdrop-blur-md rounded-xl text-xs">
                      <Info size={16} />
                      <span>Follow instructions below to install manually</span>
                    </div>
                  )}
                </div>
                <Smartphone className="absolute -right-8 -bottom-8 w-48 h-48 opacity-20 transform rotate-12" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                <div className="space-y-4">
                  <h5 className="font-bold text-slate-900 flex items-center gap-2 uppercase text-xs tracking-widest text-slate-400">
                    Android Instructions
                  </h5>
                  <ol className="space-y-3">
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">1</span>
                      <p className="text-sm text-slate-600">Open Chrome and navigate to this URL</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">2</span>
                      <p className="text-sm text-slate-600">Tap the three dots (⋮) in the top right</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">3</span>
                      <p className="text-sm text-slate-600">Select "Install App" or "Add to Home Screen"</p>
                    </li>
                  </ol>
                </div>

                <div className="space-y-4">
                  <h5 className="font-bold text-slate-900 flex items-center gap-2 uppercase text-xs tracking-widest text-slate-400">
                    iOS (iPhone/iPad) Instructions
                  </h5>
                  <ol className="space-y-3">
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">1</span>
                      <p className="text-sm text-slate-600">Open Safari and navigate to this URL</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">2</span>
                      <p className="text-sm text-slate-600">Tap the Share button 􀈂 at the bottom</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">3</span>
                      <p className="text-sm text-slate-600">Scroll down and tap "Add to Home Screen"</p>
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* â”€â”€â”€â”€â”€â”€â”€â”€ Cashier Management Panel â”€â”€â”€â”€â”€â”€â”€â”€ */
const CashierManagement: React.FC<{
  shopId: string | null;
  createCashier: (email: string, password: string, name: string) => Promise<void>;
  deleteCashier: (uid: string) => Promise<void>;
  adminForm: { name: string; email: string };
  setAdminForm: React.Dispatch<React.SetStateAction<{ name: string; email: string }>>;
  adminSaving: boolean;
  onSaveAdmin: () => Promise<void>;
  onResetPassword: (email: string) => Promise<void>;
}> = ({ shopId, createCashier, deleteCashier, adminForm, setAdminForm, adminSaving, onSaveAdmin, onResetPassword }) => {
  const { documents: cashiers, loading } = useFirestore<any>(
    shopId ? 'users' : null,
    where('shopId', '==', shopId),
    where('role', '==', 'cashier')
  );

  const [showForm, setShowForm] = useState(false);
  const [newCashier, setNewCashier] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingCashierId, setEditingCashierId] = useState<string | null>(null);
  const [cashierEditForm, setCashierEditForm] = useState({ name: '', email: '' });
  const [savingCashierId, setSavingCashierId] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCashier.name.trim() || !newCashier.email.trim() || !newCashier.password.trim()) {
      toast.error('All fields are required');
      return;
    }
    if (newCashier.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setSaving(true);
    try {
      await createCashier(newCashier.email, newCashier.password, newCashier.name);
      setNewCashier({ name: '', email: '', password: '' });
      setShowForm(false);
    } catch { /* error handled in context */ }
    finally { setSaving(false); }
  };

  const handleDelete = async (cashier: any) => {
    if (!window.confirm(`Remove cashier "${cashier.username}"? They will no longer be able to access the system.`)) return;
    try {
      await deleteCashier(cashier.id);
    } catch { /* error handled in context */ }
  };

  const startCashierEdit = (cashier: any) => {
    setEditingCashierId(cashier.id);
    setCashierEditForm({
      name: cashier.username || '',
      email: cashier.email || ''
    });
  };

  const saveCashierEdit = async (cashierId: string) => {
    if (!cashierEditForm.name.trim()) {
      toast.error('Cashier name is required');
      return;
    }
    setSavingCashierId(cashierId);
    try {
      await updateDoc(doc(db, 'users', cashierId), {
        username: cashierEditForm.name.trim(),
        email: cashierEditForm.email.trim(),
        updatedAt: serverTimestamp()
      });
      toast.success('Cashier profile updated');
      setEditingCashierId(null);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update cashier');
    } finally {
      setSavingCashierId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
      <div className="flex items-center justify-between border-b border-slate-100 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
            <Shield size={20} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">User Management</h3>
            <p className="text-slate-400 text-xs mt-1">Create and manage cashier accounts for your shop</p>
          </div>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-violet-600/20 transition-all active:scale-[0.98]"
          >
            <UserPlus size={18} />
            Add Cashier
          </button>
        )}
      </div>

      {/* Role Info Banner */}
      <div className="bg-gradient-to-r from-violet-50 to-fuchsia-50 border border-violet-100 rounded-2xl p-6 space-y-4">
        <h4 className="font-bold text-slate-900 text-sm">Role Permissions</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-violet-600 text-white rounded-full text-[10px] font-bold uppercase tracking-widest">Admin</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Full access: Dashboard, Analytics, Reports, Settings, Expenses, Product cost prices, User management
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-slate-600 text-white rounded-full text-[10px] font-bold uppercase tracking-widest">Cashier</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Limited access: New Sale (POS), Product list (no cost prices), Customer list, Inventory Logs, Add Expense
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h4 className="font-bold text-slate-900 text-sm">Admin Account</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Name</label>
            <input
              type="text"
              value={adminForm.name}
              onChange={(e) => setAdminForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-900 font-medium focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</label>
            <input
              type="email"
              value={adminForm.email}
              onChange={(e) => setAdminForm((prev) => ({ ...prev, email: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-900 font-medium focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-3 justify-end">
          <button
            type="button"
            onClick={() => onResetPassword(adminForm.email)}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-widest rounded-xl transition-all"
          >
            Reset Password Email
          </button>
          <button
            type="button"
            onClick={onSaveAdmin}
            disabled={adminSaving}
            className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-violet-600/20 transition-all disabled:opacity-50"
          >
            {adminSaving ? 'Saving...' : 'Save Admin'}
          </button>
        </div>
      </div>

      {/* Create Cashier Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-sm animate-in zoom-in duration-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <UserPlus size={18} className="text-violet-600" />
              New Cashier Account
            </h4>
            <button type="button" onClick={() => setShowForm(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <User size={12} /> Full Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ali Khan"
                value={newCashier.name}
                onChange={(e) => setNewCashier({ ...newCashier, name: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-900 font-medium focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Mail size={12} /> Email Address
              </label>
              <input
                type="email"
                required
                placeholder="cashier@example.com"
                value={newCashier.email}
                onChange={(e) => setNewCashier({ ...newCashier, email: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-900 font-medium focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Lock size={12} /> Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Min 6 characters"
                  value={newCashier.password}
                  onChange={(e) => setNewCashier({ ...newCashier, password: e.target.value })}
                  className="w-full px-4 py-3 pr-10 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-900 font-medium focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-widest rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-violet-600/20 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Cashier'}
            </button>
          </div>
        </form>
      )}

      {/* Cashier List */}
      {loading ? (
        <LoadingSpinner />
      ) : cashiers.length === 0 ? (
        <div className="p-16 text-center border-2 border-dashed border-slate-100 rounded-3xl">
          <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-6">
            <User className="text-slate-200" size={40} />
          </div>
          <p className="text-slate-500 font-bold text-sm">No cashier accounts yet</p>
          <p className="text-slate-400 text-xs mt-2">Create a cashier to allow limited POS access</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Cashiers ({cashiers.length})</h4>
          {cashiers.map((cashier) => (
            <div key={cashier.id} className="flex items-center gap-4 bg-white border border-slate-100 rounded-2xl p-5 hover:border-violet-200 transition-all group shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                {cashier.username?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                {editingCashierId === cashier.id ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={cashierEditForm.name}
                      onChange={(e) => setCashierEditForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                    <input
                      type="email"
                      value={cashierEditForm.email}
                      onChange={(e) => setCashierEditForm((prev) => ({ ...prev, email: e.target.value }))}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-bold text-slate-900 truncate">{cashier.username}</p>
                    <p className="text-xs text-slate-400 truncate">{cashier.email}</p>
                  </>
                )}
              </div>
              <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-bold uppercase tracking-widest">
                Cashier
              </span>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {editingCashierId === cashier.id ? (
                  <>
                    <button
                      onClick={() => saveCashierEdit(cashier.id)}
                      disabled={savingCashierId === cashier.id}
                      className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
                    >
                      {savingCashierId === cashier.id ? 'Saving' : 'Save'}
                    </button>
                    <button
                      onClick={() => setEditingCashierId(null)}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-widest"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => startCashierEdit(cashier)}
                      className="p-2 hover:bg-violet-50 rounded-lg text-slate-300 hover:text-violet-600 transition-all"
                      title="Edit cashier"
                    >
                      <User size={16} />
                    </button>
                    <button
                      onClick={() => onResetPassword(cashier.email)}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest"
                      title="Send reset password email"
                    >
                      Reset PW
                    </button>
                    <button
                      onClick={() => handleDelete(cashier)}
                      className="p-2 hover:bg-rose-50 rounded-lg text-slate-300 hover:text-rose-500 transition-all"
                      title="Remove cashier"
                    >
                      <Trash2 size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const SettingsNavButton: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold text-sm uppercase tracking-widest transition-all",
      active 
        ? "bg-violet-600 text-white shadow-lg shadow-violet-600/20" 
        : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
    )}
  >
    {icon}
    {label}
  </button>
);

export default Settings;

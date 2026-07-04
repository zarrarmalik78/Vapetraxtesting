import React, { useState, useRef } from 'react';
import { Save, Upload, AlertTriangle, Lock, Download } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { exportBackup, restoreBackup } from '../../lib/backup';
import { reauthenticateForSensitiveAction, requiresPasswordReauth } from '../../lib/secureAction';
import toast from 'react-hot-toast';

export const BackupRestoreTab: React.FC = () => {
  const { shopId, currentUser } = useAuth();
  const [password, setPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const needsPassword = requiresPasswordReauth(currentUser);

  const handleExport = async () => {
    if (!shopId) return;
    if (needsPassword && !password) {
      toast.error('Please enter your password to authorize backup');
      return;
    }

    setIsProcessing(true);
    try {
      if (needsPassword && currentUser) {
        await reauthenticateForSensitiveAction(currentUser, password);
      }
      await exportBackup(shopId);
      toast.success('Backup downloaded successfully');
      setPassword('');
    } catch (error: any) {
      const code = error?.code || '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        toast.error('Incorrect password.');
      } else {
        toast.error(error?.message || 'Failed to export backup');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportClick = () => {
    if (needsPassword && !password) {
      toast.error('Please enter your password to authorize restore');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !shopId) return;

    if (!window.confirm('WARNING: Restoring will completely overwrite your current database. All data added since this backup will be permanently lost. Are you absolutely sure?')) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsProcessing(true);
    try {
      if (needsPassword && currentUser) {
        await reauthenticateForSensitiveAction(currentUser, password);
      }
      await restoreBackup(shopId, file);
      toast.success('Database restored successfully! Please refresh the page to see changes.');
      setPassword('');
    } catch (error: any) {
      const code = error?.code || '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        toast.error('Incorrect password.');
      } else {
        toast.error(error?.message || 'Failed to restore backup');
      }
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-6">
        <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600">
          <Save size={20} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">System Backup & Restore</h3>
          <p className="text-slate-500 text-sm">Download a full database backup or restore from a previous JSON file.</p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
        <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
        <div>
          <h4 className="font-bold text-amber-800 text-sm">Destructive Action Warning</h4>
          <p className="text-amber-700 text-xs mt-1 leading-relaxed">
            Restoring from a backup will completely wipe out your current shop data and replace it with the data from the backup file. Always make sure you are restoring the correct file.
          </p>
        </div>
      </div>

      {needsPassword && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-3">
            <Lock size={14} className="text-violet-600" />
            Security Verification Required
          </label>
          <input
            type="password"
            placeholder="Enter your account password to authorize"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full max-w-md px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 font-medium focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all shadow-sm"
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-violet-300 transition-all flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-violet-50 flex items-center justify-center text-violet-600">
            <Download size={32} />
          </div>
          <div>
            <h4 className="font-bold text-slate-900">Download Backup</h4>
            <p className="text-xs text-slate-500 mt-1">Export your entire database to a secure JSON file.</p>
          </div>
          <button
            onClick={handleExport}
            disabled={isProcessing}
            className="w-full mt-auto py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl shadow-lg shadow-violet-600/20 transition-all disabled:opacity-50"
          >
            {isProcessing ? 'Processing...' : 'Export JSON Backup'}
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-rose-300 transition-all flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
            <Upload size={32} />
          </div>
          <div>
            <h4 className="font-bold text-slate-900">Restore System</h4>
            <p className="text-xs text-slate-500 mt-1">Overwrite current data with a previous JSON backup.</p>
          </div>
          <input 
            type="file" 
            accept=".json" 
            ref={fileInputRef} 
            onChange={handleFileSelected} 
            className="hidden" 
          />
          <button
            onClick={handleImportClick}
            disabled={isProcessing}
            className="w-full mt-auto py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-lg shadow-rose-600/20 transition-all disabled:opacity-50"
          >
            {isProcessing ? 'Processing...' : 'Import & Restore JSON'}
          </button>
        </div>
      </div>
    </div>
  );
};

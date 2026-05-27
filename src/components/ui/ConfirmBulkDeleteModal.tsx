import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { BULK_DELETE_CONFIRM_WORD } from '../../lib/secureAction';

interface ConfirmBulkDeleteModalProps {
  open: boolean;
  count: number;
  title: string;
  busy?: boolean;
  typedConfirm: string;
  onTypedConfirmChange: (v: string) => void;
  requirePassword: boolean;
  password: string;
  onPasswordChange: (v: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

const ConfirmBulkDeleteModal: React.FC<ConfirmBulkDeleteModalProps> = ({
  open,
  count,
  title,
  busy = false,
  typedConfirm,
  onTypedConfirmChange,
  requirePassword,
  password,
  onPasswordChange,
  onClose,
  onConfirm
}) => {
  if (!open) return null;
  const canConfirm =
    !busy &&
    typedConfirm === BULK_DELETE_CONFIRM_WORD &&
    (!requirePassword || !!password.trim());

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-600 mt-1">
              This will permanently delete {count} selected record(s). This action cannot be undone.
            </p>
            <p className="text-xs font-semibold text-rose-700 mt-2">
              Type <span className="font-mono">{BULK_DELETE_CONFIRM_WORD}</span> to continue.
            </p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Confirmation</label>
            <input
              type="text"
              autoComplete="off"
              value={typedConfirm}
              onChange={(e) => onTypedConfirmChange(e.target.value)}
              placeholder={BULK_DELETE_CONFIRM_WORD}
              disabled={busy}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
            />
          </div>
          {requirePassword && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Account Password</label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                placeholder="Your login password"
                disabled={busy}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
              />
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canConfirm}
              onClick={onConfirm}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? 'Deleting...' : 'Confirm Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmBulkDeleteModal;


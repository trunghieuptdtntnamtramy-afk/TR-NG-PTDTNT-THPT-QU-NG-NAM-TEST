import React, { useState } from 'react';
import { AlertTriangle, ShieldCheck, X } from 'lucide-react';
import { PendingConfirmation } from '../lib/types';

interface ConfirmWorkspaceModalProps {
  pending: PendingConfirmation | null;
  onClose: () => void;
}

export const ConfirmWorkspaceModal: React.FC<ConfirmWorkspaceModalProps> = ({
  pending,
  onClose,
}) => {
  const [submitting, setSubmitting] = useState(false);

  if (!pending) return null;

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await pending.onConfirm();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="workspace-confirm-title"
    >
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                pending.danger ? 'bg-red-50 text-red-600' : 'bg-sky-50 text-sky-600'
              }`}
            >
              {pending.danger ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <ShieldCheck className="w-5 h-5" />
              )}
            </div>
            <h3 id="workspace-confirm-title" className="text-base font-bold text-slate-900">
              {pending.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="mt-4 text-sm text-slate-600 leading-relaxed">{pending.description}</p>

        {pending.details && pending.details.length > 0 && (
          <ul className="mt-4 space-y-1.5 bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700">
            {pending.details.map((item, idx) => (
              <li key={idx} className="truncate">
                • {item}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              pending.danger
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-sky-600 hover:bg-sky-700'
            } disabled:opacity-60`}
          >
            {submitting ? 'Đang thực hiện...' : pending.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

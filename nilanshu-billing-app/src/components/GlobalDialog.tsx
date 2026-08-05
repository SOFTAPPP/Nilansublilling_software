import React from 'react';
import { useStore } from '../store/useStore';
import { AlertTriangle, CheckCircle, X } from 'lucide-react';

export default function GlobalDialog() {
  const { dialog, closeDialog } = useStore();

  if (!dialog.isOpen) return null;

  const handleConfirm = () => {
    if (dialog.onConfirm) dialog.onConfirm();
    closeDialog();
  };

  const handleCancel = () => {
    if (dialog.onCancel) dialog.onCancel();
    closeDialog();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-md mx-4 rounded-xl shadow-2xl overflow-hidden border border-border zoom-in-95 animate-in duration-200">
        <div className="p-6">
          <div className="flex gap-4 items-start">
            <div className={`p-3 rounded-full ${dialog.type === 'confirm' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
              {dialog.type === 'confirm' ? <AlertTriangle size={24} /> : <CheckCircle size={24} />}
            </div>
            <div className="flex-1 mt-1">
              <h2 className="text-xl font-bold mb-2 text-foreground">{dialog.title}</h2>
              <p className="text-muted-foreground text-sm">{dialog.message}</p>
            </div>
            <button onClick={handleCancel} className="text-muted-foreground hover:text-foreground transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>
        
        <div className="bg-muted/50 p-4 px-6 flex justify-end gap-3 border-t border-border">
          {dialog.type === 'confirm' && (
            <button
              onClick={handleCancel}
              className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors text-foreground"
            >
              Cancel
            </button>
          )}
          <button
            autoFocus
            onClick={handleConfirm}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white shadow-sm transition-colors ${dialog.type === 'confirm' ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-primary/90'}`}
          >
            {dialog.type === 'confirm' ? 'Yes, I am sure' : 'Okay'}
          </button>
        </div>
      </div>
    </div>
  );
}

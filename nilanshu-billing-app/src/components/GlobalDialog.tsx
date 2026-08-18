import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { AlertTriangle, CheckCircle, X, Loader2, MessageSquare } from 'lucide-react';

export default function GlobalDialog() {
  const { dialog, closeDialog } = useStore();
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (dialog.isOpen && dialog.type === 'prompt') {
      setInputValue(dialog.defaultValue || '');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [dialog.isOpen, dialog.type, dialog.defaultValue]);

  if (!dialog.isOpen) return null;

  const handleConfirm = () => {
    const onConfirmCb = dialog.onConfirm;
    closeDialog();
    if (onConfirmCb) {
      if (dialog.type === 'prompt') {
        onConfirmCb(inputValue);
      } else {
        onConfirmCb();
      }
    }
  };

  const handleCancel = () => {
    const onCancelCb = dialog.onCancel;
    closeDialog();
    if (onCancelCb) onCancelCb();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-md mx-4 rounded-xl shadow-2xl overflow-hidden border border-border zoom-in-95 animate-in duration-200">
        <div className="p-6">
          <div className="flex gap-4 items-start">
            <div className={`p-3 rounded-full ${dialog.hideAllButtons ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : dialog.type === 'confirm' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : dialog.type === 'prompt' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
              {dialog.hideAllButtons ? (
                <Loader2 size={24} className="animate-spin" />
              ) : dialog.type === 'confirm' ? (
                <AlertTriangle size={24} />
              ) : dialog.type === 'prompt' ? (
                <MessageSquare size={24} />
              ) : (
                <CheckCircle size={24} />
              )}
            </div>
            <div className="flex-1 mt-1">
              <h2 className="text-xl font-bold mb-2 text-foreground">{dialog.title}</h2>
              <p className="text-muted-foreground text-sm">{dialog.message}</p>
              {dialog.type === 'prompt' && (
                <div className="mt-4">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full border border-border p-3 rounded-xl bg-background focus:ring-2 focus:ring-primary/50 outline-none transition-all text-sm font-medium"
                    placeholder="Enter value here..."
                  />
                </div>
              )}
            </div>
            {!dialog.hideCancel && !dialog.hideAllButtons && (
              <button onClick={handleCancel} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={20} />
              </button>
            )}
          </div>
        </div>
        
        {!dialog.hideAllButtons && (
          <div className="bg-muted/50 p-4 px-6 flex justify-end gap-3 border-t border-border">
            {['confirm', 'prompt'].includes(dialog.type) && !dialog.hideCancel && (
              <button
                onClick={handleCancel}
                className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors text-foreground"
              >
                {dialog.cancelText || 'Cancel'}
              </button>
            )}
            <button
              autoFocus={dialog.type !== 'prompt'}
              onClick={handleConfirm}
              className={`px-4 py-2 rounded-lg text-sm font-medium text-white shadow-sm transition-colors ${dialog.type === 'confirm' ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-primary/90'}`}
            >
              {dialog.confirmText || (dialog.type === 'confirm' ? 'Yes, I am sure' : 'Okay')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';

interface ToastMessage {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

const typeStyles: Record<ToastMessage['type'], string> = {
  info: 'bg-white/10 border-white/20 text-white',
  success: 'bg-success-dim border-success/30 text-success',
  warning: 'bg-accent-dim border-accent/30 text-accent',
  error: 'bg-error-dim border-error/30 text-error',
};

const typeIcons: Record<ToastMessage['type'], string> = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  error: '❌',
};

let addToast: ((msg: Omit<ToastMessage, 'id'>) => void) | null = null;

export function toast(message: string, type: ToastMessage['type'] = 'info') {
  addToast?.({ message, type });
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    addToast = (msg) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { ...msg, id }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    };
    return () => { addToast = null; };
  }, []);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-xs w-full">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium shadow-lg backdrop-blur-md animate-fade-in ${typeStyles[t.type]}`}
        >
          <span>{typeIcons[t.type]}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

import { useEffect, useState, useCallback, createContext, useContext, useRef } from 'react';

const ToastContext = createContext(null);

let toastIdCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', options = {}) => {
    const id = ++toastIdCounter;
    const toast = {
      id,
      message,
      type, // 'info' | 'success' | 'error' | 'warning'
      duration: options.duration ?? 3500,
      undoLabel: options.undoLabel ?? null,
      onUndo: options.onUndo ?? null,
    };
    setToasts(prev => [...prev.slice(-3), toast]); // keep at most 4 toasts
    if (toast.duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, toast.duration);
    }
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Graceful fallback if used outside provider
    return {
      addToast: (msg, type) => {
        if (type === 'error') console.error(msg);
        else console.log(msg);
      },
      removeToast: () => {}
    };
  }
  return ctx;
}

const typeStyles = {
  success: {
    bg: 'bg-emerald-600',
    icon: (
      <svg className="w-5 h-5 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  error: {
    bg: 'bg-red-600',
    icon: (
      <svg className="w-5 h-5 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  },
  warning: {
    bg: 'bg-amber-500',
    icon: (
      <svg className="w-5 h-5 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    ),
  },
  info: {
    bg: 'bg-blue-600',
    icon: (
      <svg className="w-5 h-5 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
};

function ToastItem({ toast, onRemove }) {
  const style = typeStyles[toast.type] || typeStyles.info;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation on next frame
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => onRemove(toast.id), 240);
  };

  return (
    <div
      className={`flex items-center gap-3 ${style.bg} text-white rounded-2xl shadow-xl px-4 py-3 min-h-[52px] max-w-[92vw] transition-all duration-240 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      role="status"
      aria-live="polite"
    >
      {style.icon}
      <span className="text-sm font-semibold flex-1 leading-snug">{toast.message}</span>
      {toast.undoLabel && toast.onUndo && (
        <button
          onClick={() => {
            toast.onUndo();
            handleDismiss();
          }}
          className="text-white/80 hover:text-white font-bold text-sm underline ml-1 shrink-0"
        >
          {toast.undoLabel}
        </button>
      )}
      <button
        onClick={handleDismiss}
        className="text-white/60 hover:text-white ml-1 shrink-0 p-1"
        aria-label="Dismiss notification"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

function ToastContainer({ toasts, onRemove }) {
  if (toasts.length === 0) return null;
  return (
    // Position above the bottom nav bar on mobile, bottom-right on desktop
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-6 left-1/2 md:left-auto md:right-6 -translate-x-1/2 md:translate-x-0 z-[9998] flex flex-col gap-2 items-center md:items-end pointer-events-none">
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onRemove={onRemove} />
        </div>
      ))}
    </div>
  );
}

export default function MobileToast() {
  return null; // Used via ToastProvider + useToast hook
}

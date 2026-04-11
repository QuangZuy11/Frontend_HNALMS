import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import './Toast.css';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  showToast: (type: ToastType, title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

/* ── Individual Toast Item ── */
interface ToastItemProps {
  toast: ToastMessage;
  onRemove: (id: string) => void;
}

const ICONS: Record<ToastType, ReactNode> = {
  success: <CheckCircle2 size={20} />,
  error: <XCircle size={20} />,
  warning: <AlertTriangle size={20} />,
  info: <Info size={20} />,
};

function ToastItem({ toast, onRemove, duration }: ToastItemProps & { duration: number }) {
  useEffect(() => {
    if (duration <= 0) return;
    const timer = setTimeout(() => onRemove(toast.id), duration);
    return () => clearTimeout(timer);
  }, [toast.id, duration, onRemove]);

  return (
    <div className={`app-toast app-toast--${toast.type}`} role="alert" style={{ '--toast-duration': `${duration}ms` } as React.CSSProperties}>
      <div className="app-toast-icon">{ICONS[toast.type]}</div>
      <div className="app-toast-content">
        <p className="app-toast-title">{toast.title}</p>
        {toast.message && <p className="app-toast-message">{toast.message}</p>}
      </div>
      <button
        type="button"
        className="app-toast-close"
        onClick={() => onRemove(toast.id)}
        aria-label="Đóng"
      >
        <X size={16} />
      </button>
      <div className="app-toast-progress">
        <div className="app-toast-progress-bar" />
      </div>
    </div>
  );
}

/* ── Provider ── */
interface ToastProviderProps {
  children: ReactNode;
  duration?: number;
}

export function ToastProvider({ children, duration = 10000 }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [...prev, { id, type, title, message }]);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <div className="app-toast-container" aria-live="polite">
            {toasts.map(toast => (
              <ToastItem key={toast.id} toast={toast} onRemove={removeToast} duration={duration} />
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

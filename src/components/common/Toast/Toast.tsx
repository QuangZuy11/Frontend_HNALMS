import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
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
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remainingRef = useRef(duration);
  const startTimeRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = () => {
    clearTimer();
    startTimeRef.current = Date.now();
    timerRef.current = setTimeout(() => onRemove(toast.id), remainingRef.current);
  };

  useEffect(() => {
    remainingRef.current = duration;
    startTimer();
    return clearTimer;
  }, [toast.id]);

  const handleMouseEnter = () => {
    if (isPaused) return;
    setIsPaused(true);
    clearTimer();
    if (startTimeRef.current) {
      remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - startTimeRef.current));
    }
  };

  const handleMouseLeave = () => {
    if (!isPaused) return;
    setIsPaused(false);
    startTimer();
  };

  return (
    <div
      className={`app-toast app-toast--${toast.type}${isPaused ? ' app-toast--paused' : ''}`}
      role="alert"
      style={{ '--toast-duration': `${remainingRef.current}ms` } as React.CSSProperties}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
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

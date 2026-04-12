import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import "./AppModal.css";

export type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

export interface AppModalProps {
  /** Hiển thị modal */
  open: boolean;
  /** Đóng modal */
  onClose: () => void;
  /** Tiêu đề modal */
  title?: string;
  /** Icon header (truyền component, ví dụ: <User /> từ lucide-react hoặc @mui/icons-material) */
  icon?: ReactNode;
  /** Màu chủ đạo cho header — hỗ trợ CSS color keyword hoặc hex */
  color?: string;
  /** Kích thước modal */
  size?: ModalSize;
  /** Nội dung body */
  children: ReactNode;
  /** Slot footer — truyền buttons hoặc ReactNode tùy ý */
  footer?: ReactNode;
  /** Ẩn nút đóng (X) ở header */
  hideClose?: boolean;
  /** Tắt click outside để đóng */
  closeOnOverlayClick?: boolean;
  /** Tắt phím Escape để đóng */
  closeOnEsc?: boolean;
  /** Class tùy chỉnh cho overlay */
  overlayClassName?: string;
  /** Class tùy chỉnh cho modal container */
  className?: string;
  /** Class tùy chỉnh cho header */
  headerClassName?: string;
  /** Class tùy chỉnh cho body */
  bodyClassName?: string;
  /** Class tùy chỉnh cho footer */
  footerClassName?: string;
}

const DEFAULT_COLORS: Record<string, string> = {
  blue: "#2e69b1",
  green: "#059669",
  red: "#dc2626",
  orange: "#d97706",
  purple: "#7c3aed",
  teal: "#0d9488",
};

export default function AppModal({
  open,
  onClose,
  title,
  icon,
  color,
  size = "md",
  children,
  footer,
  hideClose = false,
  closeOnOverlayClick = true,
  closeOnEsc = true,
  overlayClassName = "",
  className = "",
  headerClassName = "",
  bodyClassName = "",
  footerClassName = "",
}: AppModalProps) {
  // Resolve color — hỗ trợ tên preset hoặc hex trực tiếp
  const resolvedColor =
    color && (DEFAULT_COLORS[color] ?? color);

  // Close on Escape
  useEffect(() => {
    if (!open || !closeOnEsc) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, closeOnEsc, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!closeOnOverlayClick) return;
    if (e.target === e.currentTarget) onClose();
  };

  const headerStyle = resolvedColor
    ? ({ "--modal-accent": resolvedColor } as React.CSSProperties)
    : undefined;

  return createPortal(
    <div
      className={`app-modal-overlay ${overlayClassName}`}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "app-modal-title" : undefined}
    >
      <div className={`app-modal app-modal--${size} ${className}`}>
        {/* ── Header ── */}
        {(title || !hideClose) && (
          <div
            className={`app-modal-header ${headerClassName}`}
            style={headerStyle}
          >
            <div className="app-modal-header-left">
              {icon && (
                <div className="app-modal-header-icon">{icon}</div>
              )}
              {title && (
                <h2
                  className="app-modal-title"
                  id="app-modal-title"
                >
                  {title}
                </h2>
              )}
            </div>

            {!hideClose && (
              <button
                type="button"
                className="app-modal-close-btn"
                onClick={onClose}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}

        {/* ── Body ── */}
        <div className={`app-modal-body ${bodyClassName}`}>
          {children}
        </div>

        {/* ── Footer (optional) ── */}
        {footer && (
          <div className={`app-modal-footer ${footerClassName}`}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

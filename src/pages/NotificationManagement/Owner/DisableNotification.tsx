import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle } from 'lucide-react';
import { notificationService } from '../../../services/notificationService';
import type { Notification } from '../../../types/notification.types';

interface DisableProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  notification: Notification;
}

export default function DisableNotification({ isOpen, onClose, onSuccess, notification }: DisableProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setError(null);

      await notificationService.deleteDraft(notification._id);

      onSuccess();
    } catch (err: any) {
      console.error('Error deleting draft:', err);
      setError(err?.response?.data?.message || 'Không thể xóa bản nháp này');
      setIsDeleting(false);
    }
  };

  return createPortal(
    <div className="notification-modal-overlay" onClick={onClose}>
      <div className="notification-modal modal-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Xóa bản nháp</h2>
          <button className="btn-close" onClick={onClose} disabled={isDeleting}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="notification-alert alert-error">
              {error}
            </div>
          )}

          <div style={{ textAlign: 'center', margin: '10px 0 20px' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: '#fee2e2', color: '#ef4444',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <AlertTriangle size={32} />
            </div>
            <h3 style={{ margin: '0 0 8px', color: '#0f172a', fontSize: '18px' }}>
              Xóa thông báo này?
            </h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: '15px' }}>
              Bạn có chắc chắn muốn xóa bản nháp <strong>"{notification.title}"</strong> không? Hành động này không thể hoàn tác.
            </p>
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'center', gap: '16px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isDeleting}
            style={{ minWidth: '100px' }}
          >
            Hủy
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleDelete}
            disabled={isDeleting}
            style={{ minWidth: '100px' }}
          >
            {isDeleting ? 'Đang xóa...' : 'Xóa'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

import { useState } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { notificationService } from '../../../services/notificationService';
import type { Notification } from '../../../types/notification.types';
import { AppModal } from '../../../components/common/Modal';

interface DisableProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  notification: Notification;
}

export default function DisableNotification({ isOpen, onClose, onSuccess, notification }: DisableProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await notificationService.deleteDraft(notification._id);
      onSuccess();
    } catch {
      setIsDeleting(false);
    }
  };

  return (
    <AppModal
      open={isOpen}
      onClose={onClose}
      title="Xóa thông báo"
      icon={<AlertTriangle size={18} />}
      color="red"
      size="sm"
      footer={
        <>
          <button
            type="button"
            className="ms-btn ms-btn--ghost"
            onClick={onClose}
            disabled={isDeleting}
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            className="ms-btn ms-btn--danger"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 size={16} />
            {isDeleting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
          </button>
        </>
      }
    >
      <div className="ms-delete-notice">
        <div className="ms-delete-notice-icon">
          <AlertTriangle size={28} color="#f59e0b" />
        </div>
        <p className="ms-delete-notice-text">
          Bạn có chắc chắn muốn xóa thông báo "<strong>{notification.title}</strong>" không? Hành động này không thể hoàn tác.
        </p>
      </div>
    </AppModal>
  );
}

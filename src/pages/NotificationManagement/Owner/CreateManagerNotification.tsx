import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save } from 'lucide-react';
import { notificationService } from '../../../services/notificationService';
import type { Notification } from '../../../types/notification.types';

interface CreateProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  notification?: Notification; // If provided, we are in edit mode
}

export default function CreateManagerNotification({ isOpen, onClose, onSuccess, notification }: CreateProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!notification;
  const maxTitleLength = 200;
  const maxContentLength = 1000;

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && notification) {
        setTitle(notification.title);
        setContent(notification.content);
      } else {
        setTitle('');
        setContent('');
      }
      setError(null);
    }
  }, [isOpen, isEditMode, notification]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!title.trim()) {
      setError('Tiêu đề không được để trống');
      return;
    }
    if (!content.trim()) {
      setError('Nội dung không được để trống');
      return;
    }
    if (title.length > maxTitleLength) {
      setError(`Tiêu đề không được vượt quá ${maxTitleLength} ký tự`);
      return;
    }
    if (content.length > maxContentLength) {
      setError(`Nội dung không được vượt quá ${maxContentLength} ký tự`);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      if (isEditMode && notification) {
        await notificationService.updateDraft(notification._id, title.trim(), content.trim());
      } else {
        await notificationService.createDraft(title.trim(), content.trim());
      }

      onSuccess();
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      console.error('Error saving notification:', err);
      setError(error?.response?.data?.message || 'Có lỗi xảy ra khi lưu thông báo');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="notification-modal-overlay" onClick={onClose}>
      <div className="notification-modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditMode ? 'Sửa thông báo nháp' : 'Tạo thông báo mới'}</h2>
          <button className="btn-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="notification-alert alert-error">
              {error}
            </div>
          )}

          <form id="notification-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="title">Tiêu đề <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                id="title"
                type="text"
                className="form-control"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nhập tiêu đề thông báo (ví dụ: Thông báo họp định kỳ)"
                maxLength={maxTitleLength}
                disabled={isSubmitting}
                autoFocus
              />
              <span className={`char-count ${title.length >= maxTitleLength ? 'limit-reached' : ''}`}>
                {title.length}/{maxTitleLength}
              </span>
            </div>

            <div className="form-group">
              <label htmlFor="content">Nội dung <span style={{ color: '#ef4444' }}>*</span></label>
              <textarea
                id="content"
                className="form-control"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Nhập nội dung chi tiết của thông báo..."
                maxLength={maxContentLength}
                disabled={isSubmitting}
                style={{ minHeight: '200px' }}
              />
              <span className={`char-count ${content.length >= maxContentLength ? 'limit-reached' : ''}`}>
                {content.length}/{maxContentLength}
              </span>
            </div>
          </form>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Hủy
          </button>
          <button
            type="submit"
            form="notification-form"
            className="btn btn-primary"
            disabled={isSubmitting || !title.trim() || !content.trim()}
          >
            <Save size={18} />
            {isSubmitting ? 'Đang lưu...' : isEditMode ? 'Cập nhật' : 'Lưu bản nháp'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

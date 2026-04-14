import React, { useState, useEffect } from 'react';
import { Save, Plus, Edit2 } from 'lucide-react';
import { notificationService } from '../../../services/notificationService';
import type { Notification } from '../../../types/notification.types';
import { AppModal } from '../../../components/common/Modal';

interface CreateProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  notification?: Notification;
}

export default function CreateManagerNotification({ isOpen, onClose, onSuccess, notification }: CreateProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    }
  }, [isOpen, isEditMode, notification]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) return;
    if (title.length > maxTitleLength || content.length > maxContentLength) return;

    try {
      setIsSubmitting(true);
      if (isEditMode && notification) {
        await notificationService.updateDraft(notification._id, title.trim(), content.trim());
      } else {
        await notificationService.createDraft(title.trim(), content.trim());
      }
      onSuccess();
    } catch {
      setIsSubmitting(false);
    }
  };

  return (
    <AppModal
      open={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Sửa thông báo nháp' : 'Tạo thông báo mới'}
      icon={isEditMode ? <Edit2 size={18} /> : <Plus size={18} />}
      color="blue"
      size="md"
      footer={
        <>
          <button type="button" className="ms-btn ms-btn--ghost" onClick={onClose} disabled={isSubmitting}>
            Hủy bỏ
          </button>
          <button
            type="submit"
            form="ms-notif-form"
            className="ms-btn ms-btn--primary"
            disabled={isSubmitting || !title.trim() || !content.trim()}
          >
            <Save size={16} />
            {isSubmitting ? 'Đang lưu...' : isEditMode ? 'Cập nhật' : 'Lưu bản nháp'}
          </button>
        </>
      }
    >
      <form id="ms-notif-form" onSubmit={handleSubmit}>
        {/* Tiêu đề */}
        <div className="ms-field">
          <label className="ms-label">
            Tiêu đề <span className="ms-label-required">*</span>
          </label>
          <div className="ms-input-wrap">
            <input
              type="text"
              className="ms-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Thông báo họp định kỳ tháng 4/2026"
              maxLength={maxTitleLength}
              disabled={isSubmitting}
              autoFocus
            />
          </div>
          <div className={`ms-textarea-count ${title.length >= maxTitleLength ? 'ms-textarea-count--limit' : ''}`}>
            {title.length}/{maxTitleLength}
          </div>
        </div>

        {/* Nội dung */}
        <div className="ms-field">
          <label className="ms-label">
            Nội dung <span className="ms-label-required">*</span>
          </label>
          <div className="ms-textarea-wrap">
            <textarea
              className="ms-textarea"
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Nhập nội dung chi tiết của thông báo..."
              maxLength={maxContentLength}
              disabled={isSubmitting}
              style={{ minHeight: '160px' }}
            />
            <div className={`ms-textarea-count ${content.length >= maxContentLength ? 'ms-textarea-count--limit' : ''}`}>
              {content.length}/{maxContentLength}
            </div>
          </div>
        </div>
      </form>
    </AppModal>
  );
}

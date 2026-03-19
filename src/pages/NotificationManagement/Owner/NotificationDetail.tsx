import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Calendar, Clock, AlertTriangle } from 'lucide-react';
import type { Notification } from '../../../types/notification.types';

interface DetailProps {
  isOpen: boolean;
  onClose: () => void;
  notification: Notification;
  onPublish: (id: string) => void;
}

export default function NotificationDetail({ isOpen, onClose, notification, onPublish }: DetailProps) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    setShowConfirm(false);
    await onPublish(notification._id);
    setIsPublishing(false);
  };

  const parseSystemNotificationContent = (content: string) => {
    // Parse content format: "Phòng: Phòng 228 Loại: Sửa chữa Mô tả: kajajjajajaja"
    const lines = content.split('\n').filter(line => line.trim());
    const result: Record<string, string> = {};
    
    lines.forEach(line => {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        result[key.trim()] = valueParts.join(':').trim();
      }
    });
    
    return result;
  };

  const isDraft = notification.status === 'draft';
  const isSent = notification.status === 'sent';

  return createPortal(
    <>
    <div className="notification-modal-overlay" onClick={onClose}>
      <div className="notification-modal modal-lg detail-view" onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ paddingBottom: '16px', borderBottom: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {notification.type === 'system' ? (
              <span style={{ 
                padding: '4px 12px', 
                backgroundColor: '#dcfce7', 
                color: '#166534', 
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 500
              }}>
                Yêu cầu từ Tenant
              </span>
            ) : notification.type === 'staff' ? (
              <span style={{ 
                padding: '4px 12px', 
                backgroundColor: '#e0e7ff', 
                color: '#3730a3', 
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 500
              }}>
                Thông báo từ Owner
              </span>
            ) : (
              <span className={`status-badge status-${notification.status}`}>
                {isDraft ? 'Bản nháp' : isSent ? 'Đã gửi' : 'Đã lưu trữ'}
              </span>
            )}
          </div>
          <button className="btn-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body" style={{ paddingTop: '0' }}>
          <div className="detail-header">
            <h2 className="detail-title">{notification.title}</h2>

            <div className="detail-meta">
              <div className="meta-item">
                <Calendar size={14} />
                <span>Ngày: {formatDate(notification.type === 'system' || notification.type === 'staff' ? notification.createdAt : notification.updatedAt)}</span>
              </div>
              <div className="meta-item">
                <Clock size={14} />
                <span>{formatTime(notification.type === 'system' || notification.type === 'staff' ? notification.createdAt : notification.updatedAt)}</span>
              </div>
              {notification.type === 'system' && (
                <div className="meta-item" style={{ color: '#059669', fontWeight: 500 }}>
                  Từ: Cư dân (Tenant)
                </div>
              )}
              {notification.type === 'staff' && (
                <div className="meta-item" style={{ color: '#6366f1', fontWeight: 500 }}>
                  Từ: Ban quản lý (Owner)
                </div>
              )}
            </div>
          </div>

          {notification.type === 'system' ? (
            // System notification - Yêu cầu từ tenant
            <div className="detail-content" style={{ lineHeight: '1.8' }}>
              {(() => {
                const parsed = parseSystemNotificationContent(notification.content);
                if (Object.keys(parsed).length === 0) {
                  return <p>{notification.content}</p>;
                }
                return (
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {Object.entries(parsed).map(([key, value]) => (
                      <div key={key} style={{ 
                        padding: '12px', 
                        backgroundColor: '#f8fafc', 
                        borderLeft: '3px solid #3b82f6',
                        borderRadius: '4px'
                      }}>
                        <strong style={{ color: '#1e293b' }}>{key}:</strong>
                        <p style={{ margin: '4px 0 0', color: '#475569' }}>{value}</p>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          ) : notification.type === 'staff' ? (
            // Staff notification - Thông báo từ owner cho staff
            <div className="detail-content" style={{ lineHeight: '1.8', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#374151' }}>
              {notification.content}
            </div>
          ) : (
            // Tenant notification - Thông báo từ manager/owner cho tenants
            <div
              className="detail-content"
              dangerouslySetInnerHTML={{ __html: notification.content }}
            />
          )}

          {/* Recipients section only visible if status is 'sent' and NOT system/staff notification */}
          {isSent && notification.type !== 'system' && notification.type !== 'staff' && notification.recipients && notification.recipients.length > 0 && (
            <div className="recipients-section">
              <h3>Danh sách người nhận ({notification.recipients.length})</h3>

              <div className="recipient-list">
                {notification.recipients.map((recipient, idx) => (
                  <div key={idx} className="recipient-card">
                    <div className="recipient-info">
                      <div className="recipient-avatar">
                        {recipient.recipient_role === 'manager' ? 'M' : 'A'}
                      </div>
                      <div className="recipient-details">
                        <span className="recipient-role">
                          {recipient.recipient_role === 'manager' ? 'Quản lý (Manager)' : 'Kế toán (Accountant)'}
                        </span>
                        <div className="recipient-read-status">
                          Trạng thái: {recipient.is_read ? 'Đã đọc' : 'Chưa đọc'}
                        </div>
                        {recipient.is_read && recipient.read_at && (
                          <div className="recipient-read-status" style={{ fontSize: '11px' }}>
                            {formatDate(recipient.read_at as unknown as string)} {formatTime(recipient.read_at as unknown as string)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
          >
            Đóng
          </button>

          {isDraft && notification.type !== 'system' && notification.type !== 'staff' && (
            <button
              type="button"
              className="btn btn-success"
              onClick={() => setShowConfirm(true)}
              disabled={isPublishing}
            >
              <Send size={18} />
              {isPublishing ? 'Đang phát hành...' : 'Phát hành thông báo'}
            </button>
          )}
        </div>
      </div>
    </div>

    {showConfirm && notification.type !== 'system' && notification.type !== 'staff' && (
      <div className="notification-modal-overlay" style={{ zIndex: 1100 }} onClick={() => setShowConfirm(false)}>
        <div className="notification-modal" style={{ maxWidth: '420px', width: '90%' }} onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={20} color="#f59e0b" />
              <span style={{ fontWeight: 600, fontSize: '16px' }}>Xác nhận phát hành</span>
            </div>
            <button className="btn-close" onClick={() => setShowConfirm(false)}>
              <X size={20} />
            </button>
          </div>
          <div className="modal-body">
            <p style={{ margin: 0, color: '#374151', lineHeight: '1.6' }}>
              Bạn có chắc chắn muốn phát hành thông báo này?
            </p>
            <p style={{ margin: '8px 0 0', color: '#6b7280', fontSize: '14px' }}>
              Sau khi phát hành sẽ không thể chỉnh sửa hay xóa.
            </p>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowConfirm(false)}
            >
              Hủy
            </button>
            <button
              type="button"
              className="btn btn-success"
              onClick={handlePublish}
            >
              <Send size={16} />
              Xác nhận phát hành
            </button>
          </div>
        </div>
      </div>
    )}
  </>,
    document.body
  );
}

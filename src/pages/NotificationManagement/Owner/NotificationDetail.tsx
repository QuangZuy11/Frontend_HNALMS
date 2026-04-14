import { useState } from 'react';
import { Bell, Send, Calendar, Clock } from 'lucide-react';
import type { Notification } from '../../../types/notification.types';
import { AppModal } from '../../../components/common/Modal';

interface DetailProps {
  isOpen: boolean;
  onClose: () => void;
  notification: Notification;
  onPublish: (id: string) => void;
}

export default function NotificationDetail({ isOpen, onClose, notification, onPublish }: DetailProps) {
  const [isPublishing, setIsPublishing] = useState(false);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    await onPublish(notification._id);
    setIsPublishing(false);
  };

  const parseSystemNotificationContent = (content: string) => {
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

  return (
    <AppModal
      open={isOpen}
      onClose={onClose}
      title="Chi tiết thông báo"
      icon={<Bell size={18} />}
      color="blue"
      size="lg"
      footer={
        <>
          <button type="button" className="ms-btn ms-btn--ghost" onClick={onClose}>
            Đóng
          </button>
          {isDraft && notification.type !== 'system' && notification.type !== 'staff' && (
            <button
              type="button"
              className="ms-btn ms-btn--primary"
              onClick={handlePublish}
              disabled={isPublishing}
            >
              <Send size={16} />
              {isPublishing ? 'Đang phát hành...' : 'Phát hành thông báo'}
            </button>
          )}
        </>
      }
    >
      {isOpen && notification && (
        <div>
          {/* Type badge */}
          <div className="notification-detail-meta">
            {notification.type === 'system' ? (
              <span style={{
                padding: '4px 12px', backgroundColor: '#dcfce7',
                color: '#166534', borderRadius: '4px', fontSize: '12px', fontWeight: 500,
              }}>
                Yêu cầu từ Tenant
              </span>
            ) : notification.type === 'staff' ? (
              <span style={{
                padding: '4px 12px', backgroundColor: '#e0e7ff',
                color: '#3730a3', borderRadius: '4px', fontSize: '12px', fontWeight: 500,
              }}>
                Thông báo từ Owner
              </span>
            ) : (
              <span className={`status-badge ${isDraft ? 'status-draft-badge' : isSent ? 'status-sent-badge' : 'status-archived-badge'}`}>
                {isDraft ? 'Bản nháp' : isSent ? 'Đã gửi' : 'Đã lưu trữ'}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="notification-detail-title">{notification.title}</h3>

          {/* Meta: date + time */}
          <div className="detail-meta" style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '13px' }}>
              <Calendar size={14} />
              <span>
                Ngày: {formatDate(
                  notification.type === 'system' || notification.type === 'staff'
                    ? notification.createdAt
                    : notification.updatedAt
                )}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '13px' }}>
              <Clock size={14} />
              <span>
                {formatTime(
                  notification.type === 'system' || notification.type === 'staff'
                    ? notification.createdAt
                    : notification.updatedAt
                )}
              </span>
            </div>
            {notification.type === 'system' && (
              <span style={{ color: '#059669', fontWeight: 500, fontSize: '13px' }}>Từ: Cư dân (Tenant)</span>
            )}
            {notification.type === 'staff' && (
              <span style={{ color: '#6366f1', fontWeight: 500, fontSize: '13px' }}>Từ: Ban quản lý (Owner)</span>
            )}
          </div>

          {/* Content */}
          {notification.type === 'system' ? (
            (() => {
              const parsed = parseSystemNotificationContent(notification.content);
              if (Object.keys(parsed).length === 0) {
                return <p>{notification.content}</p>;
              }
              return (
                <div style={{ display: 'grid', gap: '12px' }}>
                  {Object.entries(parsed).map(([key, value]) => (
                    <div key={key} style={{
                      padding: '12px', backgroundColor: '#f8fafc',
                      borderLeft: '3px solid #3b82f6', borderRadius: '4px',
                    }}>
                      <strong style={{ color: '#1e293b' }}>{key}:</strong>
                      <p style={{ margin: '4px 0 0', color: '#475569' }}>{value}</p>
                    </div>
                  ))}
                </div>
              );
            })()
          ) : notification.type === 'staff' ? (
            <div className="notification-detail-content">{notification.content}</div>
          ) : (
            <div
              className="notification-detail-content"
              dangerouslySetInnerHTML={{ __html: notification.content }}
            />
          )}

          {/* Recipients */}
          {isSent && notification.type !== 'system' && notification.type !== 'staff' &&
            notification.recipients && notification.recipients.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>
                  Danh sách người nhận ({notification.recipients.length})
                </h4>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {notification.recipients.map((recipient, idx) => (
                    <div key={idx} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 12px', background: '#f8fafc',
                      borderRadius: '8px', border: '1px solid #e2e8f0',
                    }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: '#e0e7ff', color: '#3730a3',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: '13px',
                      }}>
                        {recipient.recipient_role === 'manager' ? 'M' : 'A'}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                          {recipient.recipient_role === 'manager' ? 'Quản lý (Manager)' : 'Kế toán (Accountant)'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          Trạng thái: {recipient.is_read ? 'Đã đọc' : 'Chưa đọc'}
                          {recipient.is_read && recipient.read_at && (
                            <> — {formatDate(recipient.read_at as unknown as string)} {formatTime(recipient.read_at as unknown as string)}</>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>
      )}
    </AppModal>
  );
}

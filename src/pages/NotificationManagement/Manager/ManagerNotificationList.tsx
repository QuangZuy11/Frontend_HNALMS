import { useEffect, useState } from 'react';
import { Eye, CheckCheck, List, BellRing, CheckCircle, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { notificationService } from '../../../services/notificationService';
import type { Notification } from '../../../types/notification.types';
import '../NotificationManagement.css';

export default function ManagerNotificationList() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & State
  const [filterRead, setFilterRead] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 10;

  // Detail modal
  const [viewNotification, setViewNotification] = useState<Notification | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterRead]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);

      const isReadFilter =
        filterRead === 'UNREAD' ? 'false' :
          filterRead === 'READ' ? 'true' :
            undefined;

      const res = await notificationService.getMyNotifications({
        page,
        limit,
        is_read: isReadFilter,
      });

      if (res.success) {
        setNotifications(res.data.notifications || []);
        setTotalPages(res.data.pagination.total_pages);
        setTotalItems(res.data.pagination.total_count);
      }
    } catch (err: any) {
      console.error('Error fetching notifications:', err);
      setError(err?.response?.data?.message || 'Không thể tải danh sách thông báo');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' +
           d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const handleMarkAsRead = async (notif: Notification) => {
    if (notif.is_read) return;
    try {
      await notificationService.markAsRead(notif._id);
      setNotifications(prev =>
        prev.map(n => n._id === notif._id ? { ...n, is_read: true } : n)
      );
    } catch (err: any) {
      console.error('Error marking as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setMarkingAll(true);
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err: any) {
      console.error('Error marking all as read:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleViewDetail = (notif: Notification) => {
    setViewNotification(notif);
    // Auto mark as read when viewing
    if (!notif.is_read) {
      handleMarkAsRead(notif);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= Math.max(totalPages, 1)) {
      setPage(newPage);
    }
  };

  return (
    <div className="notification-page">
      <div className="notification-card">
        <div className="notification-header">
          <div className="notification-header-title">
            <h2>Thông báo</h2>
            <p className="subtitle">Thông báo từ Owner gửi đến bạn</p>
          </div>
          <div className="notification-actions">
            <button
              className="btn btn-secondary"
              onClick={handleMarkAllRead}
              disabled={markingAll}
            >
              <CheckCheck size={18} />
              {markingAll ? 'Đang xử lý...' : 'Đánh dấu tất cả đã đọc'}
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="notification-tabs">
          <button
            className={`notification-tab ${filterRead === 'ALL' ? 'active' : ''}`}
            onClick={() => { setFilterRead('ALL'); setPage(1); }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <List size={16} /> Tất cả
          </button>
          <button
            className={`notification-tab ${filterRead === 'UNREAD' ? 'active' : ''}`}
            onClick={() => { setFilterRead('UNREAD'); setPage(1); }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <BellRing size={16} /> Chưa đọc
          </button>
          <button
            className={`notification-tab ${filterRead === 'READ' ? 'active' : ''}`}
            onClick={() => { setFilterRead('READ'); setPage(1); }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <CheckCircle size={16} /> Đã đọc
          </button>
        </div>

        {error && (
          <div className="notification-alert alert-error">
            <p>{error}</p>
          </div>
        )}

        {/* Table */}
        <div className="notification-table-wrap">
          <table className="notification-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>STT</th>
                <th>Tiêu đề</th>
                <th style={{ width: '120px' }}>Trạng thái</th>
                <th style={{ width: '140px' }}>Ngày gửi</th>
                <th style={{ width: '100px' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '30px' }}>
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : notifications.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="notification-empty">
                      <h3>Không có thông báo</h3>
                      <p>Hiện tại chưa có thông báo nào cho bạn.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                notifications.map((item, index) => (
                  <tr key={item._id} className={!item.is_read ? 'unread-row' : ''}>
                    <td>{(page - 1) * limit + index + 1}</td>
                    <td>
                      <div
                        className="notification-title"
                        title={item.title}
                        style={{ fontWeight: !item.is_read ? 600 : 400 }}
                      >
                        {item.title}
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${item.is_read ? 'status-sent' : 'status-draft'}`}>
                        {item.is_read ? 'Đã đọc' : 'Chưa đọc'}
                      </span>
                    </td>
                    <td>{formatDateTime(item.createdAt)}</td>
                    <td>
                      <div className="action-buttons" style={{ display: 'flex', gap: '8px' }}>
                        {!item.is_read && (
                          <button
                            className="btn-action edit"
                            onClick={() => handleMarkAsRead(item)}
                            title="Đánh dấu đã đọc"
                          >
                            <CheckCheck size={16} />
                          </button>
                        )}
                        <button
                          className="btn-action view"
                          onClick={() => handleViewDetail(item)}
                          title="Xem chi tiết"
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && notifications.length > 0 && (
          <div className="repair-pagination">
            <div className="repair-pagination-info">
              <span>
                Tổng: <strong>{totalItems}</strong> bản ghi | Trang{' '}
                <strong>{page}</strong>/<strong>{Math.max(totalPages, 1)}</strong>
              </span>
            </div>

            <div className="repair-pagination-controls">
              <button type="button" className="pagination-arrow-btn"
                onClick={() => handlePageChange(1)} disabled={page === 1}>«</button>
              <button type="button" className="pagination-arrow-btn"
                onClick={() => handlePageChange(page - 1)} disabled={page === 1}>‹</button>
              <span className="pagination-current-page">{page}</span>
              <button type="button" className="pagination-arrow-btn"
                onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages}>›</button>
              <button type="button" className="pagination-arrow-btn"
                onClick={() => handlePageChange(totalPages)} disabled={page >= totalPages}>»</button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {viewNotification && createPortal(
        <div className="notification-modal-overlay" onClick={() => setViewNotification(null)}>
          <div className="notification-modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Chi tiết thông báo</h2>
              <button className="btn-close" onClick={() => setViewNotification(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-header">
                <h2 className="detail-title">{viewNotification.title}</h2>
                <div className="detail-meta">
                  <div className="meta-item">
                    <span>Ngày gửi: {formatDateTime(viewNotification.createdAt)}</span>
                  </div>
                  <span className={`status-badge ${viewNotification.is_read ? 'status-sent' : 'status-draft'}`}>
                    {viewNotification.is_read ? 'Đã đọc' : 'Chưa đọc'}
                  </span>
                </div>
              </div>
              <div
                className="detail-content"
                dangerouslySetInnerHTML={{ __html: viewNotification.content }}
              />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setViewNotification(null)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <X size={18} /> Đóng
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

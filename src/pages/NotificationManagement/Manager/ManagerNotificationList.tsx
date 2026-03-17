import { useEffect, useState } from 'react';
import { Plus, Eye, Edit2, Trash2, Send, AlertTriangle, CheckCheck, List, BellRing, CheckCircle, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { notificationService } from '../../../services/notificationService';
import type { Notification } from '../../../types/notification.types';
import '../NotificationManagement.css';

// Reuse Modals from Owner package (generic usage)
import CreateManagerNotification from '../Owner/CreateManagerNotification';
import NotificationDetail from '../Owner/NotificationDetail';
import DisableNotification from '../Owner/DisableNotification';

type TabType = 'INBOX' | 'DRAFT' | 'SENT';

export default function ManagerNotificationList() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & State
  const [activeTab, setActiveTab] = useState<TabType>('INBOX');
  const [filterRead, setFilterRead] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL'); // only for INBOX

  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 10;

  // Detail modal
  const [viewNotification, setViewNotification] = useState<Notification | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  // Modals state for Outbound
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editNotification, setEditNotification] = useState<Notification | null>(null);
  const [deleteNotification, setDeleteNotification] = useState<Notification | null>(null);
  const [publishNotification, setPublishNotification] = useState<Notification | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, activeTab, filterRead, searchTerm, fromDate, toDate]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);

      const isOutbound = activeTab === 'DRAFT' || activeTab === 'SENT';
      const statusFilter = activeTab === 'DRAFT' ? 'draft' : activeTab === 'SENT' ? 'sent' : undefined;

      let isReadFilter: 'true' | 'false' | undefined = undefined;
      // Only apply read filter to INBOX
      if (activeTab === 'INBOX') {
        isReadFilter = filterRead === 'UNREAD' ? 'false' : filterRead === 'READ' ? 'true' : undefined;
      }

      const res = await notificationService.getMyNotifications({
        page,
        limit,
        status: statusFilter,
        is_read: isReadFilter,
        outbound: isOutbound ? 'true' : 'false',
        search: searchTerm || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
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

  // INBOX actions
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
    // Auto mark as read when viewing inbox notifications
    if (activeTab === 'INBOX' && !notif.is_read) {
      handleMarkAsRead(notif);
    }
  };

  // OUTBOUND actions
  const handleCreateSuccess = () => {
    setIsCreateModalOpen(false);
    setEditNotification(null);
    fetchNotifications();
  };

  const handleDeleteSuccess = () => {
    setDeleteNotification(null);
    fetchNotifications();
  };

  const handlePublishSuccess = async (id: string) => {
    try {
      await notificationService.publishDraft(id);
      setViewNotification(null);
      fetchNotifications();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể phát hành thông báo');
    }
  };

  const handleConfirmPublish = async () => {
    if (!publishNotification) return;
    setIsPublishing(true);
    try {
      await notificationService.publishDraft(publishNotification._id);
      setPublishNotification(null);
      fetchNotifications();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể phát hành thông báo');
    } finally {
      setIsPublishing(false);
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
            <h2>Quản lý Thông báo</h2>
            <p className="subtitle">Xem thông báo từ Owner và gửi thông báo, nội quy cho Tenant</p>
          </div>
          <div className="notification-actions">
            {activeTab === 'INBOX' ? (
              <button
                className="btn btn-secondary"
                onClick={handleMarkAllRead}
                disabled={markingAll}
              >
                <CheckCheck size={18} />
                {markingAll ? 'Đang xử lý...' : 'Đánh dấu tất cả đã đọc'}
              </button>
            ) : (
              <button
                className="btn-create"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <Plus size={18} />
                <span>Tạo thông báo</span>
              </button>
            )}
          </div>
        </div>

        {/* Filters Section */}
        <div className="notification-filters" style={{ padding: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
          <div className="filter-group" style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>Tìm kiếm tiêu đề</label>
            <input
              type="text"
              placeholder="Nhập tiêu đề..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
            />
          </div>
          <div className="filter-group">
            <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>Từ ngày</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
            />
          </div>
          <div className="filter-group">
            <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>Đến ngày</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setPage(1); }}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
            />
          </div>
        </div>

        {/* Tabs for Manager mode */}
        <div className="notification-tabs">
          <button
            className={`notification-tab ${activeTab === 'INBOX' ? 'active' : ''}`}
            onClick={() => { setActiveTab('INBOX'); setPage(1); }}
          >
            Hộp thư đến
          </button>
          <button
            className={`notification-tab ${activeTab === 'DRAFT' ? 'active' : ''}`}
            onClick={() => { setActiveTab('DRAFT'); setPage(1); }}
          >
            Bản nháp
          </button>
          <button
            className={`notification-tab ${activeTab === 'SENT' ? 'active' : ''}`}
            onClick={() => { setActiveTab('SENT'); setPage(1); }}
          >
            Đã gửi
          </button>
        </div>

        {/* Read Filters (Only for INBOX) */}
        {activeTab === 'INBOX' && (
          <div className="notification-tabs" style={{ borderBottom: 'none', paddingBottom: '0', paddingTop: '10px' }}>
            <button
              className={`notification-tab ${filterRead === 'ALL' ? 'active' : ''}`}
              onClick={() => { setFilterRead('ALL'); setPage(1); }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '6px 12px' }}
            >
              <List size={14} /> Tất cả inbox
            </button>
            <button
              className={`notification-tab ${filterRead === 'UNREAD' ? 'active' : ''}`}
              onClick={() => { setFilterRead('UNREAD'); setPage(1); }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '6px 12px' }}
            >
              <BellRing size={14} /> Chưa đọc
            </button>
            <button
              className={`notification-tab ${filterRead === 'READ' ? 'active' : ''}`}
              onClick={() => { setFilterRead('READ'); setPage(1); }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '6px 12px' }}
            >
              <CheckCircle size={14} /> Đã đọc
            </button>
          </div>
        )}

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
                <th>{activeTab === 'INBOX' ? 'Tiêu đề' : 'Thông báo'}</th>
                <th style={{ width: '120px' }}>Trạng thái</th>
                <th style={{ width: '140px' }}>{activeTab === 'INBOX' ? 'Ngày nhận' : 'Ngày tạo'}</th>
                <th style={{ width: '140px' }}>Thao tác</th>
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
                      {activeTab !== 'INBOX' && (
                        <div className="notification-empty-icon">
                          <Send size={48} />
                        </div>
                      )}
                      <h3>Không có thông báo</h3>
                      <p>Hiện tại chưa có thông báo nào trong mục này.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                notifications.map((item, index) => {
                  const isUnread = activeTab === 'INBOX' && !item.is_read;
                  return (
                    <tr key={item._id} className={isUnread ? 'unread-row' : ''}>
                      <td>{(page - 1) * limit + index + 1}</td>
                      <td>
                        {activeTab === 'INBOX' ? (
                          <div
                            className="notification-title"
                            title={item.title}
                            style={{ fontWeight: isUnread ? 600 : 400 }}
                          >
                            {item.title}
                          </div>
                        ) : (
                          <div className="notification-content-preview">
                            <div className="notification-title" title={item.title}>
                              {item.title}
                            </div>
                            <div className="notification-preview-text" title={item.content}>
                              {item.content.length > 70 ? item.content.substring(0, 70) + '...' : item.content}
                            </div>
                          </div>
                        )}
                      </td>
                      <td>
                        {activeTab === 'INBOX' ? (
                          <span className={`status-badge ${item.is_read ? 'status-sent' : 'status-draft'}`}>
                            {item.is_read ? 'Đã đọc' : 'Chưa đọc'}
                          </span>
                        ) : (
                          <span className={`status-badge status-${item.status}`}>
                            {item.status === 'draft' ? 'Bản nháp' :
                              item.status === 'sent' ? 'Đã gửi' : 'Đã lưu trữ'}
                          </span>
                        )}
                      </td>
                      <td>{formatDateTime(item.createdAt)}</td>
                      <td>
                        <div className="action-buttons" style={{ display: 'flex', gap: '8px' }}>
                          {activeTab === 'INBOX' && !item.is_read && (
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

                          {/* Action only for OUTBOUND DRAFT */}
                          {activeTab === 'DRAFT' && item.status === 'draft' && (
                            <>
                              <button
                                className="btn-action publish"
                                onClick={() => setPublishNotification(item)}
                                title="Phát hành"
                              >
                                <Send size={16} />
                              </button>
                              <button
                                className="btn-action edit"
                                onClick={() => setEditNotification(item)}
                                title="Sửa bản nháp"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                className="btn-action delete"
                                onClick={() => setDeleteNotification(item)}
                                title="Xóa bản nháp"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination using the existing repair-pagination CSS classes */}
        {!loading && notifications.length > 0 && (
          <div className="repair-pagination">
            <div className="repair-pagination-info">
              <span>
                Tổng: <strong>{totalItems}</strong> bản ghi | Trang{' '}
                <strong>{page}</strong>/<strong>{Math.max(totalPages, 1)}</strong>
              </span>
            </div>

            <div className="repair-pagination-controls">
              <button
                type="button"
                className="pagination-arrow-btn"
                onClick={() => handlePageChange(1)}
                disabled={page === 1}
              >
                «
              </button>
              <button
                type="button"
                className="pagination-arrow-btn"
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
              >
                ‹
              </button>

              <span className="pagination-current-page">{page}</span>

              <button
                type="button"
                className="pagination-arrow-btn"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
              >
                ›
              </button>
              <button
                type="button"
                className="pagination-arrow-btn"
                onClick={() => handlePageChange(totalPages)}
                disabled={page >= totalPages}
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals for Outbound operations */}
      {(isCreateModalOpen || editNotification) && (
        <CreateManagerNotification
          isOpen={true}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditNotification(null);
          }}
          onSuccess={handleCreateSuccess}
          notification={editNotification || undefined}
        />
      )}

      {viewNotification && activeTab !== 'INBOX' && (
        <NotificationDetail
          isOpen={true}
          onClose={() => setViewNotification(null)}
          notification={viewNotification}
          onPublish={handlePublishSuccess}
        />
      )}

      {/* Modal for viewing INBOX messages (just read-only view) */}
      {viewNotification && activeTab === 'INBOX' && createPortal(
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

      {deleteNotification && (
        <DisableNotification
          isOpen={true}
          onClose={() => setDeleteNotification(null)}
          onSuccess={handleDeleteSuccess}
          notification={deleteNotification}
        />
      )}

      {publishNotification && (
        <div className="notification-modal-overlay" onClick={() => setPublishNotification(null)}>
          <div className="notification-modal" style={{ maxWidth: '420px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={20} color="#f59e0b" />
                <span style={{ fontWeight: 600, fontSize: '16px' }}>Xác nhận phát hành</span>
              </div>
              <button className="btn-close" onClick={() => setPublishNotification(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0, color: '#374151', lineHeight: '1.6' }}>
                Bạn có chắc chắn muốn phát hành thông báo này?
              </p>
              <p style={{ margin: '8px 0 0', color: '#6b7280', fontSize: '14px' }}>
                Sau khi phát hành sẽ gửi tới tất cả Tenant và không thể chỉnh sửa hay xóa.
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setPublishNotification(null)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn btn-success"
                onClick={handleConfirmPublish}
                disabled={isPublishing}
              >
                <Send size={16} />
                {isPublishing ? 'Đang phát hành...' : 'Xác nhận phát hành'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

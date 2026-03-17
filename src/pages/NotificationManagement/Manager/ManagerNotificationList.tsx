import { useEffect, useState } from 'react';
import { Plus, Eye, Edit2, Trash2, Send, AlertTriangle, X } from 'lucide-react';
import { notificationService } from '../../../services/notificationService';
import type { Notification } from '../../../types/notification.types';
import '../NotificationManagement.css';

// Modals for notification management
import CreateTenantNotification from '../Owner/CreateTenantNotification';
import NotificationDetail from '../Owner/NotificationDetail';
import DisableNotification from '../Owner/DisableNotification';

type TabType = 'ALL' | 'DRAFT' | 'SENT';

export default function ManagerNotificationList() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & State
  const [activeTab, setActiveTab] = useState<TabType>('ALL');

  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 10;

  // Detail modal
  const [viewNotification, setViewNotification] = useState<Notification | null>(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editNotification, setEditNotification] = useState<Notification | null>(null);
  const [deleteNotification, setDeleteNotification] = useState<Notification | null>(null);
  const [publishNotification, setPublishNotification] = useState<Notification | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, activeTab, searchTerm, fromDate, toDate]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);

      const statusFilter = activeTab === 'ALL' ? undefined : activeTab === 'DRAFT' ? 'draft' : 'sent';

      const res = await notificationService.getMyNotifications({
        page,
        limit,
        status: statusFilter,
        outbound: 'true', // Always fetch Manager's created notifications
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
          </div>
          <div className="notification-actions">
            <button
              className="btn-create"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus size={18} />
              <span>Tạo thông báo</span>
            </button>
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
            className={`notification-tab ${activeTab === 'ALL' ? 'active' : ''}`}
            onClick={() => { setActiveTab('ALL'); setPage(1); }}
          >
            Tất cả
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
                <th>Thông báo</th>
                <th style={{ width: '120px' }}>Trạng thái</th>
                <th style={{ width: '140px' }}>Ngày tạo</th>
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
                      <div className="notification-empty-icon">
                        <Send size={48} />
                      </div>
                      <h3>Không có thông báo</h3>
                      <p>Hiện tại chưa có thông báo nào trong mục này.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                notifications.map((item, index) => (
                  <tr key={item._id}>
                    <td>{(page - 1) * limit + index + 1}</td>
                    <td>
                      <div className="notification-content-preview">
                        <div className="notification-title" title={item.title}>
                          {item.title}
                        </div>
                        <div className="notification-preview-text" title={item.content}>
                          {item.content.length > 70 ? item.content.substring(0, 70) + '...' : item.content}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge status-${item.status}`}>
                        {item.status === 'draft' ? 'Bản nháp' :
                          item.status === 'sent' ? 'Đã gửi' : 'Đã lưu trữ'}
                      </span>
                    </td>
                    <td>{formatDateTime(item.createdAt)}</td>
                    <td>
                      <div className="action-buttons" style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="btn-action view"
                          onClick={() => setViewNotification(item)}
                          title="Xem chi tiết"
                        >
                          <Eye size={16} />
                        </button>

                        {item.status === 'draft' && (
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
                ))
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
        <CreateTenantNotification
          isOpen={true}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditNotification(null);
          }}
          onSuccess={handleCreateSuccess}
          notification={editNotification || undefined}
        />
      )}

      {viewNotification && (
        <NotificationDetail
          isOpen={true}
          onClose={() => setViewNotification(null)}
          notification={viewNotification}
          onPublish={handlePublishSuccess}
        />
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

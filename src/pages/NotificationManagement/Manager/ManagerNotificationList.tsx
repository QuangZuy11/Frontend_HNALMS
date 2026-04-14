import { useEffect, useState, useMemo } from 'react';
import {
  Plus, Search, Eye, Edit2, Trash2, Send,
  Bell, FileText, Clock, AlertTriangle, CheckCircle2,
  Filter,
} from 'lucide-react';
import { notificationService } from '../../../services/notificationService';
import type { Notification } from '../../../types/notification.types';
import '../NotificationManagement.css';

import { AppModal } from '../../../components/common/Modal';
import { Pagination } from '../../../components/common/Pagination';
import { useToast } from '../../../components/common/Toast';

import CreateTenantNotification from '../Owner/CreateTenantNotification';
import NotificationDetail from '../Owner/NotificationDetail';
import DisableNotification from '../Owner/DisableNotification';

type TabType = 'ALL' | 'DRAFT' | 'SENT';

const LIMIT = 8;

export default function ManagerNotificationList() {
  const { showToast } = useToast();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<TabType>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewNotification, setViewNotification] = useState<Notification | null>(null);
  const [editNotification, setEditNotification] = useState<Notification | null>(null);
  const [deleteNotification, setDeleteNotification] = useState<Notification | null>(null);
  const [publishNotification, setPublishNotification] = useState<Notification | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const statusFilter =
        activeTab === 'DRAFT' ? 'draft' :
          activeTab === 'SENT' ? 'sent' : undefined;

      const res = await notificationService.getMyNotifications({
        page: currentPage,
        limit: LIMIT,
        status: statusFilter,
        outbound: 'true',
        search: searchTerm || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });

      if (res.success) {
        const filtered = (res.data.notifications || []).filter(n => n.type === 'tenant');
        setNotifications(filtered);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      showToast('error', 'Lỗi', e.response?.data?.message || 'Không thể tải danh sách thông báo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, activeTab, searchTerm, fromDate, toDate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab, fromDate, toDate]);

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' +
      d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // ── Stats ──
  const [allCount, setAllCount] = useState(0);
  const [draftCount, setDraftCount] = useState(0);
  const [sentCount, setSentCount] = useState(0);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [allRes, draftRes, sentRes] = await Promise.all([
          notificationService.getMyNotifications({ page: 1, limit: 1, outbound: 'true' }),
          notificationService.getMyNotifications({ page: 1, limit: 1, status: 'draft', outbound: 'true' }),
          notificationService.getMyNotifications({ page: 1, limit: 1, status: 'sent', outbound: 'true' }),
        ]);
        const toCount = (r: unknown) => ((r as { data?: { notifications?: Notification[] } })?.data?.notifications || []).filter((n: Notification) => n.type === 'tenant').length;
        setAllCount(toCount(allRes));
        setDraftCount(toCount(draftRes));
        setSentCount(toCount(sentRes));
      } catch {
        // silent
      }
    };
    fetchCounts();
  }, [notifications]);

  const tabCounts = useMemo(() => ({
    ALL: allCount,
    DRAFT: draftCount,
    SENT: sentCount,
  }), [allCount, draftCount, sentCount]);

  const totalPages = Math.ceil(tabCounts[activeTab] / LIMIT);

  // ── Handlers ──
  const handleCreateSuccess = () => {
    setIsCreateModalOpen(false);
    setEditNotification(null);
    fetchNotifications();
  };

  const handleDeleteSuccess = () => {
    setDeleteNotification(null);
    showToast('success', 'Thành công', 'Xóa thông báo thành công!');
    fetchNotifications();
  };

  const handleConfirmPublish = async () => {
    if (!publishNotification) return;
    setIsPublishing(true);
    try {
      await notificationService.publishDraft(publishNotification._id);
      setPublishNotification(null);
      showToast('success', 'Thành công', 'Phát hành thông báo thành công!');
      fetchNotifications();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      showToast('error', 'Lỗi', e.response?.data?.message || 'Không thể phát hành thông báo.');
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePublishSuccess = async (id: string) => {
    try {
      await notificationService.publishDraft(id);
      setViewNotification(null);
      showToast('success', 'Thành công', 'Phát hành thông báo thành công!');
      fetchNotifications();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      showToast('error', 'Lỗi', e.response?.data?.message || 'Không thể phát hành thông báo.');
    }
  };

  return (
    <div className="notification-container">
      {/* ── HEADER ── */}
      <div className="notification-header">
        <div className="notification-header-top">
          <div className="notification-title-block">
            <div className="notification-title-row">
              <div className="notification-title-icon" aria-hidden>
                <Bell size={22} strokeWidth={2} />
              </div>
              <div className="notification-title-text">
                <h2>Quản lý Thông báo</h2>
                <p className="notification-subtitle">
                  Tạo và gửi thông báo cho cư dân trong Tòa Nhà Hoàng Nam.
                </p>
              </div>
            </div>
          </div>

          <div className="notification-header-aside">
            {/* Stats Summary */}
            <div className="stats-summary">
              <div className="stat-item">
                <FileText size={16} className="stat-icon icon-accent" />
                <div className="stat-text">
                  <span className="stat-value">{tabCounts.ALL}</span>
                  <span className="stat-label">Tất cả</span>
                </div>
              </div>
              <div className="stat-divider" />
              <div className="stat-item">
                <Clock size={16} className="stat-icon icon-warning" />
                <div className="stat-text">
                  <span className="stat-value">{tabCounts.DRAFT}</span>
                  <span className="stat-label">Bản nháp</span>
                </div>
              </div>
              <div className="stat-divider" />
              <div className="stat-item">
                <CheckCircle2 size={16} className="stat-icon icon-success" />
                <div className="stat-text">
                  <span className="stat-value">{tabCounts.SENT}</span>
                  <span className="stat-label">Đã gửi</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn-primary notification-header-add-btn"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus size={18} /> Tạo thông báo
            </button>
          </div>
        </div>
      </div>

      {/* ── TOOLBAR ── */}
      <div className="notification-toolbar">
        <div className="notification-toolbar-left">
          {/* Search */}
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Tìm kiếm tiêu đề thông báo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Trạng thái dropdown */}
          <div className="control-group">
            <Filter size={16} className="service-toolbar-icon" aria-hidden />
            <select
              className="custom-select notification-status-select"
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as TabType)}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="DRAFT">Bản nháp</option>
              <option value="SENT">Đã gửi</option>
            </select>
          </div>

          {/* Ngày tạo */}
          <div className="control-group">
            <input
              type="date"
              className="custom-select notification-date-input"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              placeholder="Từ ngày"
              title="Từ ngày"
            />
          </div>

          <div className="control-group">
            <input
              type="date"
              className="custom-select notification-date-input"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              placeholder="Đến ngày"
              title="Đến ngày"
            />
          </div>
        </div>
      </div>

      {/* ── TABLE ── */}
      <div className="notification-table-container">
        <table className="notification-table">
          <thead>
            <tr>
              <th className="cell-stt">STT</th>
              <th className="cell-name">Thông báo</th>
              <th className="cell-status">Trạng thái</th>
              <th className="cell-date">Ngày tạo</th>
              <th className="cell-actions">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="table-empty-cell">
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : notifications.length === 0 ? (
              <tr>
                <td colSpan={5} className="table-empty-cell">
                  Không tìm thấy thông báo nào.
                </td>
              </tr>
            ) : (
              notifications.map((item, index) => (
                <tr key={item._id}>
                  <td className="cell-stt">
                    {(currentPage - 1) * LIMIT + index + 1}
                  </td>
                  <td className="cell-name">
                    <div className="notification-cell-name">
                      <span className="notification-cell-title" title={item.title}>
                        {item.title}
                      </span>
                      <span className="notification-cell-preview" title={item.content}>
                        {item.content.length > 60 ? item.content.substring(0, 60) + '...' : item.content}
                      </span>
                    </div>
                  </td>
                  <td className="cell-status">
                    <span className={`status-badge ${item.status === 'draft' ? 'status-draft-badge' : item.status === 'sent' ? 'status-sent-badge' : 'status-archived-badge'}`}>
                      {item.status === 'draft' ? 'Bản nháp' :
                        item.status === 'sent' ? 'Đã gửi' : 'Đã lưu trữ'}
                    </span>
                  </td>
                  <td className="cell-date">
                    {formatDateTime(item.createdAt)}
                  </td>
                  <td className="cell-actions">
                    <div className="table-actions">
                      <button
                        className="btn-icon btn-history"
                        onClick={() => setViewNotification(item)}
                        title="Xem chi tiết"
                      >
                        <Eye size={16} />
                      </button>

                      {item.status === 'draft' && (
                        <>
                          <button
                            className="btn-icon btn-publish"
                            onClick={() => setPublishNotification(item)}
                            title="Phát hành"
                          >
                            <Send size={16} />
                          </button>
                          <button
                            className="btn-icon btn-edit"
                            onClick={() => setEditNotification(item)}
                            title="Sửa"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            className="btn-icon btn-delete"
                            onClick={() => setDeleteNotification(item)}
                            title="Xóa"
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

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={Math.max(1, totalPages)}
          totalItems={tabCounts[activeTab]}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* ── MODALS ── */}

      {/* 1. Modal Tạo / Sửa Thông báo */}
      {(isCreateModalOpen || editNotification) && (
        <CreateTenantNotification
          isOpen={true}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditNotification(null);
          }}
          onSuccess={() => {
            showToast('success', 'Thành công', editNotification ? 'Cập nhật thông báo thành công!' : 'Tạo thông báo thành công!');
            handleCreateSuccess();
          }}
          notification={editNotification || undefined}
        />
      )}

      {/* 2. Modal Chi tiết */}
      {viewNotification && (
        <NotificationDetail
          isOpen={true}
          onClose={() => setViewNotification(null)}
          notification={viewNotification}
          onPublish={handlePublishSuccess}
        />
      )}

      {/* 3. Modal Xác nhận Xóa */}
      {deleteNotification && (
        <DisableNotification
          isOpen={true}
          onClose={() => setDeleteNotification(null)}
          onSuccess={handleDeleteSuccess}
          notification={deleteNotification}
        />
      )}

      {/* 4. Modal Xác nhận Phát hành */}
      <AppModal
        open={!!publishNotification}
        onClose={() => setPublishNotification(null)}
        title="Xác nhận phát hành"
        icon={<Send size={18} />}
        color="teal"
        size="sm"
        footer={
          <>
            <button
              type="button"
              className="ms-btn ms-btn--ghost"
              onClick={() => setPublishNotification(null)}
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              className="ms-btn ms-btn--primary"
              onClick={handleConfirmPublish}
              disabled={isPublishing}
            >
              <Send size={16} />
              {isPublishing ? 'Đang phát hành...' : 'Xác nhận phát hành'}
            </button>
          </>
        }
      >
        {publishNotification && (
          <div className="ms-delete-notice" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <div className="ms-delete-notice-icon" style={{ background: '#dcfce7' }}>
              <AlertTriangle size={28} color="#15803d" />
            </div>
            <p className="ms-delete-notice-text" style={{ color: '#14532d' }}>
              Bạn có chắc chắn muốn phát hành thông báo "<strong>{publishNotification.title}</strong>"? Sau khi phát hành sẽ gửi tới tất cả cư dân và không thể chỉnh sửa hay xóa.
            </p>
          </div>
        )}
      </AppModal>
    </div>
  );
}

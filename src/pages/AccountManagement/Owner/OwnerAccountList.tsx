import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Eye,
  UserPlus,
  Users,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  ArrowUpDown,
  Lock,
  LockOpen,
  User,
  ShieldCheck,
  KeyRound,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { accountService } from '../../../services/accountService';
import {
  STATUS_LABELS,
  formatAccountDate,
  type AccountItem,
  type AccountDetail,
} from '../constants';
import { useToast } from '../../../components/common/Toast';
import '../OwnerAccountList.css';

interface CreateFormData {
  username: string;
  phoneNumber: string;
  email: string;
  password: string;
}

export default function OwnerAccountList() {
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortOption, setSortOption] = useState('newest');

  const [page, setPage] = useState(1);
  const ROWS_PER_PAGE = 10;
  const [total, setTotal] = useState(0);

  const [disablingId, setDisablingId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailAccount, setDetailAccount] = useState<AccountDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState<CreateFormData>({
    username: '',
    phoneNumber: '',
    email: '',
    password: '',
  });
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'disable' | 'enable' | null;
    accountId: string | null;
    accountName: string;
  }>({ isOpen: false, type: null, accountId: null, accountName: '' });

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const offset = (page - 1) * ROWS_PER_PAGE;
      const response = await accountService.list('owners', { offset, limit: ROWS_PER_PAGE });
      if (response.success && response.data) {
        setAccounts(response.data);
        setTotal(response.total ?? response.data.length);
      } else {
        setAccounts([]);
        setTotal(0);
      }
    } catch (err) {
      const errObj = err as { response?: { data?: { message?: string } } };
      setError(errObj?.response?.data?.message || 'Không thể tải danh sách');
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const filteredAccounts = useMemo(() => {
    let result = [...accounts];

    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      result = result.filter(
        (acc) =>
          (acc.username ?? '').toLowerCase().includes(term) ||
          (acc.email ?? '').toLowerCase().includes(term) ||
          (acc.phoneNumber ?? '').toLowerCase().includes(term),
      );
    }

    if (filterStatus !== 'all') {
      result = result.filter((acc) => acc.status === filterStatus);
    }

    switch (sortOption) {
      case 'name-asc':
        result.sort((a, b) => (a.username ?? '').localeCompare(b.username ?? ''));
        break;
      case 'name-desc':
        result.sort((a, b) => (b.username ?? '').localeCompare(a.username ?? ''));
        break;
      default:
        break;
    }

    return result;
  }, [accounts, searchTerm, filterStatus, sortOption]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, filterStatus, sortOption]);

  const totalPages = Math.max(1, Math.ceil((total || filteredAccounts.length) / ROWS_PER_PAGE));

  const buildPageNumbers = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '...')[] = [];
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
  };

  const handleViewDetail = async (accountId: string) => {
    try {
      setDetailLoading(true);
      setDetailAccount(null);
      setShowDetailModal(true);
      const response = await accountService.detail('owners', accountId);
      if (response.success && response.data) {
        setDetailAccount(response.data);
      }
    } catch (err) {
      const errObj = err as { response?: { data?: { message?: string } } };
      alert(errObj?.response?.data?.message || 'Không thể tải chi tiết');
      setShowDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const openConfirmDisable = (accountId: string) => {
    const acc = accounts.find((a) => a._id === accountId) || detailAccount;
    setConfirmModal({
      isOpen: true,
      type: 'disable',
      accountId,
      accountName: acc?.username || 'tài khoản này',
    });
  };

  const openConfirmEnable = (accountId: string) => {
    const acc = accounts.find((a) => a._id === accountId) || detailAccount;
    setConfirmModal({
      isOpen: true,
      type: 'enable',
      accountId,
      accountName: acc?.username || 'tài khoản này',
    });
  };

  const closeConfirmModal = () =>
    setConfirmModal({ isOpen: false, type: null, accountId: null, accountName: '' });

  const executeConfirmAction = async () => {
    const { type, accountId } = confirmModal;
    if (!accountId || !type) return;
    closeConfirmModal();
    try {
      setDisablingId(accountId);
      const response =
        type === 'disable'
          ? await accountService.disable('owners', accountId)
          : await accountService.enable('owners', accountId);
      const updated = response.data;
      if (updated?._id) {
        setAccounts((prev) =>
          prev.map((acc) => (acc._id === updated._id ? { ...acc, status: updated.status } : acc)),
        );
        if (detailAccount?._id === accountId) {
          setDetailAccount((prev) =>
            prev ? { ...prev, status: updated?.status || prev.status } : prev,
          );
        }
      }
      showToast(
        'success',
        type === 'disable' ? 'Đã khóa tài khoản' : 'Đã mở tài khoản',
        type === 'disable'
          ? `Tài khoản @${confirmModal.accountName} đã bị khóa thành công.`
          : `Tài khoản @${confirmModal.accountName} đã được mở lại.`,
      );
    } catch (err) {
      const errObj = err as { response?: { data?: { message?: string } } };
      showToast(
        'error',
        'Thao tác thất bại',
        errObj?.response?.data?.message ||
          (type === 'disable' ? 'Không thể khóa tài khoản.' : 'Không thể mở lại tài khoản.'),
      );
    } finally {
      setDisablingId(null);
    }
  };

  const openCreateModal = () => {
    setShowCreateModal(true);
    setCreateFormData({ username: '', phoneNumber: '', email: '', password: '' });
    setCreateError(null);
    setCreateSuccess(null);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateFormData({ username: '', phoneNumber: '', email: '', password: '' });
    setCreateError(null);
    setCreateSuccess(null);
  };

  const handleCreateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCreateFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);
    try {
      setCreateSaving(true);
      await accountService.createOwner({
        username: createFormData.username.trim(),
        phoneNumber: createFormData.phoneNumber.trim(),
        email: createFormData.email.trim().toLowerCase(),
        password: createFormData.password,
      });
      setCreateSuccess('Tạo tài khoản Chủ nhà thành công!');
      setShowCreateModal(false);
      fetchAccounts();
      setTimeout(() => setCreateSuccess(null), 4000);
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string } } };
      setCreateError(errObj?.response?.data?.message || 'Không thể tạo tài khoản');
    } finally {
      setCreateSaving(false);
    }
  };

  const totalCount = accounts.length;
  const activeCount = accounts.filter((a) => a.status === 'active').length;
  const inactiveCount = accounts.filter((a) => a.status === 'inactive' || a.status === 'suspended').length;

  const hasFilters = searchTerm || filterStatus !== 'all';
  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
  };

  return (
    <>
      <div className="oadm-container">
        {/* ─── HEADER ─────────────────────────────── */}
        <div className="oadm-header">
          <div className="oadm-header-top">
            {/* Title block */}
            <div className="oadm-title-block">
              <div className="oadm-title-row">
                <div className="oadm-title-icon" aria-hidden>
                  <Users size={22} strokeWidth={2} />
                </div>
                <div className="oadm-title-text">
                  <h2>Quản lý Chủ nhà</h2>
                  <p className="oadm-subtitle">
                    Quản lý tài khoản Chủ nhà trong hệ thống tòa nhà Hoàng Nam.
                  </p>
                </div>
              </div>
            </div>

            {/* Stats + Create button */}
            <div className="oadm-header-aside">
              <div className="oadm-stats-summary">
                <div className="oadm-stat-item">
                  <div className="oadm-stat-icon oadm-icon-total">
                    <Users size={16} />
                  </div>
                  <div className="oadm-stat-text">
                    <span className="oadm-stat-value">{totalCount}</span>
                    <span className="oadm-stat-label">Tổng số</span>
                  </div>
                </div>
                <div className="oadm-stat-divider" />
                <div className="oadm-stat-item">
                  <div className="oadm-stat-icon oadm-icon-active">
                    <CheckCircle2 size={16} />
                  </div>
                  <div className="oadm-stat-text">
                    <span className="oadm-stat-value">{activeCount}</span>
                    <span className="oadm-stat-label">Hoạt động</span>
                  </div>
                </div>
                <div className="oadm-stat-divider" />
                <div className="oadm-stat-item">
                  <div className="oadm-stat-icon oadm-icon-inactive">
                    <AlertTriangle size={16} />
                  </div>
                  <div className="oadm-stat-text">
                    <span className="oadm-stat-value">{inactiveCount}</span>
                    <span className="oadm-stat-label">Không HĐ</span>
                  </div>
                </div>
              </div>

              <button type="button" className="oadm-btn-create" onClick={openCreateModal}>
                <UserPlus size={18} /> Tạo tài khoản
              </button>
            </div>
          </div>
        </div>

        {/* ─── TOOLBAR ────────────────────────────── */}
        <div className="oadm-toolbar">
          <div className="oadm-toolbar-left">
            {/* Search */}
            <div className="oadm-search-box">
              <Search size={18} className="oadm-search-icon" />
              <input
                type="text"
                className="oadm-search-input"
                placeholder="Tìm theo tên, email, SĐT..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filter status */}
            <div className="oadm-control-group">
              <Filter size={16} className="oadm-toolbar-icon" aria-hidden />
              <select
                className="oadm-custom-select"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Hoạt động</option>
                <option value="inactive">Không hoạt động</option>
                <option value="suspended">Tạm khóa</option>
              </select>
            </div>

            {hasFilters && (
              <button type="button" className="oadm-btn-clear-filter" onClick={clearFilters}>
                Xóa lọc
              </button>
            )}
          </div>

          <div className="oadm-toolbar-right">
            <ArrowUpDown size={16} className="oadm-toolbar-icon" aria-hidden />
            <select
              className="oadm-custom-select"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
            >
              <option value="newest">Mới nhất</option>
              <option value="name-asc">Tên: A - Z</option>
              <option value="name-desc">Tên: Z - A</option>
            </select>
          </div>
        </div>

        {/* ─── ERROR BANNER ───────────────────────── */}
        {error && (
          <div className="oadm-error-banner">
            <span>{error}</span>
            <button type="button" className="oadm-btn-retry" onClick={fetchAccounts}>
              Thử lại
            </button>
          </div>
        )}

        {/* ─── TABLE ─────────────────────────────── */}
        <div className="oadm-table-container">
          <table className="oadm-table">
            <thead>
              <tr>
                <th className="oadm-cell-stt">STT</th>
                <th className="oadm-cell-username">Tên đăng nhập</th>
                <th className="oadm-cell-email">Email</th>
                <th className="oadm-cell-phone">Số điện thoại</th>
                <th className="oadm-cell-status">Trạng thái</th>
                <th className="oadm-cell-date">Ngày tạo</th>
                <th className="oadm-cell-actions">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="oadm-loading-cell">
                    <div className="oadm-loading-inner">
                      <div className="oadm-spinner" />
                      <p className="oadm-empty-text">Đang tải dữ liệu...</p>
                    </div>
                  </td>
                </tr>
              ) : !error && filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="oadm-table-empty-cell">
                    <div className="oadm-empty-inner">
                      <div className="oadm-empty-icon">
                        <Users size={28} />
                      </div>
                      <p className="oadm-empty-text">
                        {searchTerm
                          ? 'Không tìm thấy tài khoản phù hợp.'
                          : 'Chưa có tài khoản Chủ nhà nào.'}
                      </p>
                      <p className="oadm-empty-sub">
                        {searchTerm ? 'Thử thay đổi từ khóa tìm kiếm.' : 'Nhấn "Tạo tài khoản" để thêm mới.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc, index) => (
                  <tr
                    key={acc._id}
                    className={acc.status !== 'active' ? 'oadm-row-inactive' : ''}
                  >
                    <td className="oadm-cell-stt">
                      {(page - 1) * ROWS_PER_PAGE + index + 1}
                    </td>
                    <td className="oadm-cell-username">{acc.username || '—'}</td>
                    <td className="oadm-cell-email">{acc.email || '—'}</td>
                    <td className="oadm-cell-phone">{acc.phoneNumber || '—'}</td>
                    <td className="oadm-cell-status">
                      <span
                        className={`oadm-status-badge ${acc.status === 'active' ? 'active' : 'inactive'}`}
                      >
                        {acc.status === 'active' ? (
                          <CheckCircle2 size={12} />
                        ) : (
                          <AlertTriangle size={12} />
                        )}
                        {STATUS_LABELS[acc.status] || acc.status}
                      </span>
                    </td>
                    <td className="oadm-cell-date">{formatAccountDate(acc.createdAt)}</td>
                    <td className="oadm-cell-actions">
                      <div className="oadm-table-actions">
                        <button
                          type="button"
                          className="oadm-btn-icon oadm-btn-view"
                          onClick={() => handleViewDetail(acc._id)}
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

          {/* Pagination */}
          {!loading && !error && filteredAccounts.length > 0 && (
            <div className="oadm-pagination">
              <div className="oadm-pagination-info">
                Tổng: <strong>{total || filteredAccounts.length}</strong> tài khoản &nbsp;|&nbsp; Trang{' '}
                <strong>{page}</strong>/{totalPages}
              </div>
              <div className="oadm-pagination-controls">
                <button
                  type="button"
                  className="oadm-page-btn"
                  disabled={page === 1}
                  onClick={() => setPage(1)}
                  title="Trang đầu"
                >
                  «
                </button>
                <button
                  type="button"
                  className="oadm-page-btn"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  title="Trang trước"
                >
                  <ChevronLeft size={14} />
                </button>

                {buildPageNumbers().map((p, i) =>
                  p === '...' ? (
                    <span key={`ellipsis-${i}`} style={{ padding: '0 4px', color: '#94a3b8' }}>
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      className={`oadm-page-btn${page === p ? ' active' : ''}`}
                      onClick={() => setPage(p as number)}
                      aria-current={page === p ? 'page' : undefined}
                    >
                      {p}
                    </button>
                  ),
                )}

                <button
                  type="button"
                  className="oadm-page-btn"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  title="Trang sau"
                >
                  <ChevronRight size={14} />
                </button>
                <button
                  type="button"
                  className="oadm-page-btn"
                  disabled={page >= totalPages}
                  onClick={() => setPage(totalPages)}
                  title="Trang cuối"
                >
                  »
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── TOAST SUCCESS ─────────────────────── */}
      {createSuccess && (
        <div className="oadm-toast">
          <div className="oadm-toast-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <div className="oadm-toast-title">Thành công</div>
            <div className="oadm-toast-msg">{createSuccess}</div>
          </div>
        </div>
      )}

      {/* ─── DETAIL MODAL ──────────────────────── */}
      {showDetailModal && (
        <div className="oadm-modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="oadm-modal oadm-modal--detail" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="oadm-modal-header">
              <div className="oadm-modal-header-left">
                <div className="oadm-modal-icon">
                  <User size={20} />
                </div>
                <div>
                  <p className="oadm-modal-title">Chi tiết Chủ nhà</p>
                  <p className="oadm-modal-subtitle">
                    {detailAccount?.username ? `@${detailAccount.username}` : 'Đang tải...'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="oadm-modal-close"
                onClick={() => setShowDetailModal(false)}
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="oadm-modal-body">
              {detailLoading ? (
                <div className="oadm-loading-inner" style={{ padding: '40px 0' }}>
                  <div className="oadm-spinner" />
                  <p className="oadm-empty-text">Đang tải thông tin...</p>
                </div>
              ) : detailAccount ? (
                <>
                  {/* Profile Strip */}
                  <div className="oadm-profile-strip">
                    <div className="oadm-avatar">
                      {detailAccount.fullname
                        ? detailAccount.fullname.split(' ').pop()?.charAt(0).toUpperCase() || '?'
                        : detailAccount.username?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <div className="oadm-profile-name">{detailAccount.fullname || '—'}</div>
                      <div className="oadm-profile-meta">
                        <span className="oadm-username-tag">@{detailAccount.username}</span>
                        <span className="oadm-role-badge">Chủ nhà</span>
                        {detailAccount.status === 'active' ? (
                          <span className="oadm-profile-status-active">
                            <span className="oadm-profile-status-dot" />
                            Hoạt động
                          </span>
                        ) : (
                          <span className="oadm-profile-status-inactive">
                            <span className="oadm-profile-status-dot" />
                            Không hoạt động
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Two-column panels */}
                  <div className="oadm-detail-panels">
                    {/* Left: Account info */}
                    <div className="oadm-detail-panel">
                      <div className="oadm-detail-panel-title">
                        <KeyRound size={14} />
                        Thông tin đăng nhập
                      </div>
                      <div className="oadm-detail-rows">
                        <div className="oadm-detail-row">
                          <span className="oadm-detail-label">Tên đăng nhập</span>
                          <span className="oadm-detail-value">{detailAccount.username}</span>
                        </div>
                        <div className="oadm-detail-row">
                          <span className="oadm-detail-label">Email</span>
                          <span className="oadm-detail-value">
                            {detailAccount.email || <span className="oadm-detail-value-empty">—</span>}
                          </span>
                        </div>
                        <div className="oadm-detail-row">
                          <span className="oadm-detail-label">SĐT</span>
                          <span className="oadm-detail-value">
                            {detailAccount.phoneNumber || <span className="oadm-detail-value-empty">—</span>}
                          </span>
                        </div>
                        <div className="oadm-detail-row">
                          <span className="oadm-detail-label">Ngày tạo</span>
                          <span className="oadm-detail-value">{formatAccountDate(detailAccount.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Personal info */}
                    <div className="oadm-detail-panel">
                      <div className="oadm-detail-panel-title">
                        <ShieldCheck size={14} />
                        Thông tin cá nhân
                      </div>
                      <div className="oadm-detail-rows">
                        <div className="oadm-detail-row">
                          <span className="oadm-detail-label">Họ và tên</span>
                          <span className="oadm-detail-value">
                            {detailAccount.fullname || <span className="oadm-detail-value-empty">—</span>}
                          </span>
                        </div>
                        <div className="oadm-detail-row">
                          <span className="oadm-detail-label">CCCD / CMND</span>
                          <span className="oadm-detail-value">
                            {detailAccount.cccd || <span className="oadm-detail-value-empty">—</span>}
                          </span>
                        </div>
                        <div className="oadm-detail-row">
                          <span className="oadm-detail-label">Địa chỉ</span>
                          <span className="oadm-detail-value">
                            {detailAccount.address || <span className="oadm-detail-value-empty">—</span>}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* Footer */}
            <div className="oadm-modal-footer">
              <button
                type="button"
                className="oadm-btn oadm-btn--ghost"
                onClick={() => setShowDetailModal(false)}
              >
                Đóng
              </button>
              {detailAccount && (
                detailAccount.status === 'active' ? (
                  <button
                    type="button"
                    className="oadm-btn oadm-btn--danger"
                    onClick={() => openConfirmDisable(detailAccount._id)}
                    disabled={disablingId === detailAccount._id}
                  >
                    <Lock size={16} />
                    {disablingId === detailAccount._id ? 'Đang xử lý...' : 'Đóng tài khoản'}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="oadm-btn oadm-btn--primary"
                    onClick={() => openConfirmEnable(detailAccount._id)}
                    disabled={disablingId === detailAccount._id}
                  >
                    <LockOpen size={16} />
                    {disablingId === detailAccount._id ? 'Đang xử lý...' : 'Mở lại tài khoản'}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── CREATE MODAL ──────────────────────── */}
      {showCreateModal && (
        <div className="oadm-modal-overlay" onClick={closeCreateModal}>
          <div className="oadm-modal oadm-modal--create" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="oadm-modal-header">
              <div className="oadm-modal-header-left">
                <div className="oadm-modal-icon">
                  <UserPlus size={20} />
                </div>
                <div>
                  <p className="oadm-modal-title">Tạo tài khoản Chủ nhà</p>
                  <p className="oadm-modal-subtitle">Nhập thông tin để tạo tài khoản mới</p>
                </div>
              </div>
              <button
                type="button"
                className="oadm-modal-close"
                onClick={closeCreateModal}
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="oadm-modal-body">
              {createError && <div className="oadm-form-error-banner">{createError}</div>}

              <form id="oadm-create-form" onSubmit={handleCreateSubmit} className="oadm-form">
                <div className="oadm-field">
                  <label className="oadm-label" htmlFor="oadm-username">
                    Tên đăng nhập <span className="oadm-label-required">*</span>
                  </label>
                  <input
                    id="oadm-username"
                    type="text"
                    name="username"
                    className="oadm-input"
                    value={createFormData.username}
                    onChange={handleCreateChange}
                    required
                    minLength={3}
                    placeholder="Tối thiểu 3 ký tự"
                  />
                </div>

                <div className="oadm-field">
                  <label className="oadm-label" htmlFor="oadm-phoneNumber">
                    Số điện thoại <span className="oadm-label-required">*</span>
                  </label>
                  <input
                    id="oadm-phoneNumber"
                    type="tel"
                    name="phoneNumber"
                    className="oadm-input"
                    value={createFormData.phoneNumber}
                    onChange={handleCreateChange}
                    required
                    placeholder="Bắt đầu bằng 0..."
                  />
                </div>

                <div className="oadm-field">
                  <label className="oadm-label" htmlFor="oadm-email">
                    Email <span className="oadm-label-required">*</span>
                  </label>
                  <input
                    id="oadm-email"
                    type="email"
                    name="email"
                    className="oadm-input"
                    value={createFormData.email}
                    onChange={handleCreateChange}
                    required
                    placeholder="email@example.com"
                  />
                </div>

                <div className="oadm-field">
                  <label className="oadm-label" htmlFor="oadm-password">
                    Mật khẩu <span className="oadm-label-required">*</span>
                  </label>
                  <input
                    id="oadm-password"
                    type="password"
                    name="password"
                    className="oadm-input"
                    value={createFormData.password}
                    onChange={handleCreateChange}
                    required
                    minLength={6}
                    placeholder="Ít nhất 6 ký tự"
                  />
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="oadm-modal-footer">
              <button
                type="button"
                className="oadm-btn oadm-btn--ghost"
                onClick={closeCreateModal}
                disabled={createSaving}
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                form="oadm-create-form"
                className="oadm-btn oadm-btn--primary"
                disabled={createSaving}
              >
                <UserPlus size={16} />
                {createSaving ? 'Đang tạo...' : 'Tạo tài khoản'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CONFIRM MODAL (Khóa / Mở tài khoản) ─── */}
      {confirmModal.isOpen && (
        <div
          className="oadm-modal-overlay"
          style={{ zIndex: 99999 }}
          onClick={closeConfirmModal}
        >
          <div
            className="oadm-confirm-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div className={`oadm-confirm-icon-wrap ${confirmModal.type === 'disable' ? 'danger' : 'primary'}`}>
              {confirmModal.type === 'disable' ? <Lock size={28} /> : <LockOpen size={28} />}
            </div>

            {/* Title */}
            <p className="oadm-confirm-title">
              {confirmModal.type === 'disable' ? 'Đóng tài khoản' : 'Mở lại tài khoản'}
            </p>

            {/* Message */}
            <p className="oadm-confirm-message">
              {confirmModal.type === 'disable'
                ? <>Bạn có chắc muốn <strong>khóa</strong> tài khoản Chủ nhà <strong>@{confirmModal.accountName}</strong>? Tài khoản sẽ không thể đăng nhập.</>
                : <>Bạn có chắc muốn <strong>mở lại</strong> tài khoản <strong>@{confirmModal.accountName}</strong>?</>}
            </p>

            {/* Buttons */}
            <div className="oadm-confirm-actions">
              <button
                type="button"
                className="oadm-btn oadm-btn--ghost"
                onClick={closeConfirmModal}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className={`oadm-btn ${confirmModal.type === 'disable' ? 'oadm-btn--danger' : 'oadm-btn--primary'}`}
                onClick={executeConfirmAction}
              >
                {confirmModal.type === 'disable' ? <Lock size={15} /> : <LockOpen size={15} />}
                {confirmModal.type === 'disable' ? 'Xác nhận khóa' : 'Xác nhận mở'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Visibility as VisibilityIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
  Person as PersonIcon,
  PersonAdd as PersonAddIcon,
  Group as GroupsIcon,
  VpnKey as VpnKeyIcon,
  Badge as BadgeIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
} from '@mui/icons-material';
import { accountService } from '../../../services/accountService';
import {
  STATUS_LABELS,
  formatAccountDate,
  type AccountItem,
  type AccountDetail,
} from '../constants';
import '../account-management.css';
import '../OwnerAccountList.css';

interface CreateFormData {
  username: string;
  phoneNumber: string;
  email: string;
  password: string;
}

const getStatusColor = (status: string): 'success' | 'warning' | 'default' => {
  switch (status) {
    case 'active':
      return 'success';
    case 'suspended':
      return 'warning';
    default:
      return 'default';
  }
};

export default function OwnerAccountList() {
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
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

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const offset = (page - 1) * limit;
      const response = await accountService.list('owners', { offset, limit });
      if (response.success && response.data) {
        setAccounts(response.data);
        setTotal(response.total ?? response.data.length);
      } else {
        setAccounts([]);
        setTotal(0);
      }
    } catch (err) {
      console.error('Error fetching owners:', err);
      const errObj = err as { response?: { data?: { message?: string } } };
      setError(errObj?.response?.data?.message || 'Không thể tải danh sách');
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const filteredAccounts = useMemo(
    () =>
      searchTerm.trim() === ''
        ? accounts
        : accounts.filter((acc) => {
            const term = searchTerm.trim().toLowerCase();
            const username = (acc.username ?? '').toLowerCase();
            return username.includes(term);
          }),
    [accounts, searchTerm],
  );

  const totalPages = Math.max(1, Math.ceil((total || 0) / limit));

  const getVisiblePages = () => {
    const pages: number[] = [];
    let start = Math.max(1, page - 2);
    let end = Math.min(totalPages, page + 2);

    if (page <= 2) end = Math.min(totalPages, 5);
    if (page >= totalPages - 1) start = Math.max(1, totalPages - 4);

    for (let i = start; i <= end; i += 1) pages.push(i);
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

  const handleDisable = async (accountId: string) => {
    if (!window.confirm('Bạn có chắc muốn đóng tài khoản Chủ nhà này?')) return;
    try {
      setDisablingId(accountId);
      const response = await accountService.disable('owners', accountId);
      const updated = response.data;
      if (updated?._id) {
        setAccounts((prev) =>
          prev.map((acc) =>
            acc._id === updated._id ? { ...acc, status: updated.status } : acc,
          ),
        );
        if (detailAccount?._id === accountId) {
          setDetailAccount((prev) =>
            prev ? { ...prev, status: updated?.status || prev.status } : prev,
          );
        }
      }
    } catch (err) {
      const errObj = err as { response?: { data?: { message?: string } } };
      alert(errObj?.response?.data?.message || 'Không thể đóng tài khoản');
    } finally {
      setDisablingId(null);
    }
  };

  const handleEnable = async (accountId: string) => {
    if (!window.confirm('Bạn có chắc muốn mở lại tài khoản này?')) return;
    try {
      setDisablingId(accountId);
      const response = await accountService.enable('owners', accountId);
      const updated = response.data;
      if (updated?._id) {
        setAccounts((prev) =>
          prev.map((acc) =>
            acc._id === updated._id ? { ...acc, status: updated.status } : acc,
          ),
        );
        if (detailAccount?._id === accountId) {
          setDetailAccount((prev) =>
            prev ? { ...prev, status: updated?.status || prev.status } : prev,
          );
        }
      }
    } catch (err) {
      const errObj = err as { response?: { data?: { message?: string } } };
      alert(errObj?.response?.data?.message || 'Không thể mở lại tài khoản');
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

  return (
    <>
      <div className="admin-accounts-page">
        <div className="admin-accounts-card">
          {/* Page Header */}
          <div className="admin-accounts-header">
            <div className="admin-accounts-header-left">
              <div className="admin-accounts-header-icon">
                <GroupsIcon sx={{ fontSize: 22 }} />
              </div>
              <div>
                <h1 className="admin-accounts-title">Danh sách chủ nhà</h1>
                <p className="admin-accounts-subtitle">Quản lý tài khoản Chủ nhà trong hệ thống</p>
              </div>
            </div>
            <button
              type="button"
              className="admin-accounts-btn-create"
              onClick={openCreateModal}
            >
              <PersonAddIcon sx={{ fontSize: 18 }} />
              Tạo tài khoản
            </button>
          </div>

          {/* Toolbar */}
          <div className="admin-accounts-toolbar">
            <div className="admin-accounts-search-wrap">
              <SearchIcon className="admin-accounts-search-icon" />
              <input
                type="text"
                className="admin-accounts-search-input"
                placeholder="Tim theo ten dang nhap..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  type="button"
                  className="admin-accounts-search-clear"
                  onClick={() => setSearchTerm('')}
                >
                  <ClearIcon sx={{ fontSize: 16 }} />
                </button>
              )}
            </div>

            <div className="admin-accounts-stats">
              <span className="admin-accounts-stats-count">
                {filteredAccounts.length} tai khoan
              </span>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="admin-accounts-loading">
              <div className="admin-accounts-loading-spinner" />
              <span className="admin-accounts-loading-text">Dang tai du lieu...</span>
            </div>
          ) : error ? (
            <div className="admin-accounts-error">
              <div className="admin-accounts-error-icon">!</div>
              <h3>Loi tai danh sach</h3>
              <p>{error}</p>
              <button type="button" className="admin-accounts-btn-retry" onClick={fetchAccounts}>
                Thu lai
              </button>
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="admin-accounts-empty">
              <div className="admin-accounts-empty-icon">
                <GroupsIcon sx={{ fontSize: 48, color: '#cbd5e1' }} />
              </div>
              <h3>Chua co tai khoan nao</h3>
              <p>
                {searchTerm
                  ? 'Khong tim thay tai khoan phu hop voi tu khoa tim kiem.'
                  : 'Nhan "Tao tai khoan" de them Chu nha moi.'}
              </p>
            </div>
          ) : (
            <>
              <div className="admin-accounts-table-wrap">
                <table className="admin-accounts-table">
                  <thead>
                    <tr>
                      <th style={{ width: '5%' }}>STT</th>
                      <th style={{ width: '15%' }}>Tên Đăng Nhập</th>
                      <th style={{ width: '24%' }}>Email</th>
                      <th style={{ width: '14%' }}>Số Điện Thoại</th>
                      <th style={{ width: '12%' }}>Trang Thái</th>
                      <th style={{ width: '12%' }}>Ngày Tạo</th>
                      <th style={{ width: '8%' }}>Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAccounts.map((acc, index) => (
                      <tr key={acc._id}>
                        <td className="admin-accounts-td-center">
                          {(page - 1) * limit + index + 1}
                        </td>
                        <td>
                          <span className="admin-accounts-username">
                            {acc.username || '-'}
                          </span>
                        </td>
                        <td className="admin-accounts-td-email">
                          {acc.email || '-'}
                        </td>
                        <td>{acc.phoneNumber || '-'}</td>
                        <td>
                          <span className={`admin-accounts-status-badge admin-accounts-status-${acc.status}`}>
                            <span className="admin-accounts-status-dot" />
                            {STATUS_LABELS[acc.status] || acc.status}
                          </span>
                        </td>
                        <td>{formatAccountDate(acc.createdAt)}</td>
                        <td>
                          <button
                            type="button"
                            className="admin-accounts-btn-view"
                            onClick={() => handleViewDetail(acc._id)}
                            title="Xem chi tiet"
                          >
                            <VisibilityIcon sx={{ fontSize: 16 }} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="admin-accounts-pagination">
                <span className="admin-accounts-pagination-info">
                  Tong: <strong>{total}</strong> ban ghi - Trang <strong>{page}</strong>/<strong>{totalPages}</strong>
                </span>
                <div className="admin-accounts-pagination-controls">
                  <button
                    type="button"
                    className="admin-accounts-pagination-btn"
                    disabled={page === 1}
                    onClick={() => setPage(1)}
                    title="Trang dau"
                  >
                    <FirstPageIcon sx={{ fontSize: 16 }} />
                  </button>
                  <button
                    type="button"
                    className="admin-accounts-pagination-btn"
                    disabled={page === 1}
                    onClick={() => setPage(Math.max(page - 1, 1))}
                    title="Trang truoc"
                  >
                    <PrevIcon sx={{ fontSize: 16 }} />
                  </button>

                  {getVisiblePages().map((pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      className={`admin-accounts-pagination-btn ${pageNumber === page ? 'active' : ''}`}
                      onClick={() => setPage(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  ))}

                  <button
                    type="button"
                    className="admin-accounts-pagination-btn"
                    disabled={page >= totalPages}
                    onClick={() => setPage(Math.min(page + 1, totalPages))}
                    title="Trang sau"
                  >
                    <NextIcon sx={{ fontSize: 16 }} />
                  </button>
                  <button
                    type="button"
                    className="admin-accounts-pagination-btn"
                    disabled={page >= totalPages}
                    onClick={() => setPage(totalPages)}
                    title="Trang cuoi"
                  >
                    <LastPageIcon sx={{ fontSize: 16 }} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {showDetailModal && (
        <div className="owner-account-detail-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="owner-account-detail-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="owner-account-detail-header">
              <div className="owner-account-detail-header-title">
                <div className="owner-account-detail-header-icon">
                  <PersonIcon sx={{ fontSize: 20 }} />
                </div>
                Chi tiết Chủ nhà
              </div>
              <button
                type="button"
                className="owner-account-detail-close-btn"
                onClick={() => setShowDetailModal(false)}
                aria-label="Đóng"
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div className="owner-account-detail-body">
              {detailLoading ? (
                <div className="owner-account-detail-loading">
                  <div className="owner-account-detail-loading-spinner" />
                  <span className="owner-account-detail-loading-text">Đang tải thông tin...</span>
                </div>
              ) : detailAccount ? (
                <>
                  {/* Profile strip */}
                  <div className="owner-account-detail-profile-strip">
                    <div className="owner-account-detail-avatar">
                      {detailAccount.username?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="owner-account-detail-profile-info">
                      <div className="owner-account-detail-profile-name">
                        {detailAccount.fullname || '—'}
                      </div>
                      <div className="owner-account-detail-profile-meta">
                        <span className="owner-account-detail-username-tag">
                          @{detailAccount.username}
                        </span>
                        <span className="owner-account-detail-role-badge">Chủ nhà</span>
                        {detailAccount.status === 'active' ? (
                          <span className="owner-account-detail-status-active">
                            <span className="owner-account-detail-status-dot" />
                            Hoạt động
                          </span>
                        ) : (
                          <span className="owner-account-detail-status-inactive">
                            <span className="owner-account-detail-status-dot" />
                            Không hoạt động
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Two-column panels */}
                  <div className="owner-account-detail-panels">
                    {/* Left: Account info */}
                    <div className="owner-account-detail-panel">
                      <div className="owner-account-detail-panel-title">
                        <VpnKeyIcon className="owner-account-detail-panel-title-icon" sx={{ fontSize: 15 }} />
                        Thông tin đăng nhập
                      </div>
                      <div className="owner-account-detail-rows">
                        <div className="owner-account-detail-row">
                          <span className="owner-account-detail-label">Tên đăng nhập</span>
                          <span className="owner-account-detail-value">{detailAccount.username}</span>
                        </div>
                        <div className="owner-account-detail-row">
                          <span className="owner-account-detail-label">Email</span>
                          <span className="owner-account-detail-value">
                            {detailAccount.email || <span className="owner-account-detail-value-empty">—</span>}
                          </span>
                        </div>
                        <div className="owner-account-detail-row">
                          <span className="owner-account-detail-label">SĐT</span>
                          <span className="owner-account-detail-value">
                            {detailAccount.phoneNumber || <span className="owner-account-detail-value-empty">—</span>}
                          </span>
                        </div>
                        <div className="owner-account-detail-row">
                          <span className="owner-account-detail-label">Ngày tạo</span>
                          <span className="owner-account-detail-value">
                            {formatAccountDate(detailAccount.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Personal info */}
                    <div className="owner-account-detail-panel">
                      <div className="owner-account-detail-panel-title">
                        <BadgeIcon className="owner-account-detail-panel-title-icon" sx={{ fontSize: 15 }} />
                        Thông tin cá nhân
                      </div>
                      <div className="owner-account-detail-rows">
                        <div className="owner-account-detail-row">
                          <span className="owner-account-detail-label">Họ và tên</span>
                          <span className="owner-account-detail-value">
                            {detailAccount.fullname || <span className="owner-account-detail-value-empty">—</span>}
                          </span>
                        </div>
                        <div className="owner-account-detail-row">
                          <span className="owner-account-detail-label">CCCD / CMND</span>
                          <span className="owner-account-detail-value">
                            {detailAccount.cccd || <span className="owner-account-detail-value-empty">—</span>}
                          </span>
                        </div>
                        <div className="owner-account-detail-row">
                          <span className="owner-account-detail-label">Địa chỉ</span>
                          <span className="owner-account-detail-value">
                            {detailAccount.address || <span className="owner-account-detail-value-empty">—</span>}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="owner-account-detail-actions">
                    {detailAccount.status === 'active' ? (
                      <button
                        type="button"
                        className="owner-account-detail-btn-disable"
                        onClick={() => handleDisable(detailAccount._id)}
                        disabled={disablingId === detailAccount._id}
                      >
                        <LockIcon sx={{ fontSize: 16 }} />
                        {disablingId === detailAccount._id ? 'Đang xử lý...' : 'Đóng tài khoản'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="owner-account-detail-btn-enable"
                        onClick={() => handleEnable(detailAccount._id)}
                        disabled={disablingId === detailAccount._id}
                      >
                        <LockOpenIcon sx={{ fontSize: 16 }} />
                        {disablingId === detailAccount._id ? 'Đang xử lý...' : 'Mở lại tài khoản'}
                      </button>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {createSuccess && (
        <div className="admin-accounts-toast">
          <div className="admin-accounts-toast-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div>
            <div className="admin-accounts-toast-title">Thành công</div>
            <div className="admin-accounts-toast-msg">{createSuccess}</div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="admin-accounts-create-modal-overlay" onClick={closeCreateModal}>
          <div className="admin-accounts-create-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-accounts-create-modal-header">
              <h2>Tạo tài khoản Chủ nhà</h2>
              <button type="button" className="owner-account-detail-close-btn" onClick={closeCreateModal} aria-label="Đóng">×</button>
            </div>
            <div className="admin-accounts-create-modal-body">
              {createError && <div className="admin-accounts-create-error"><p>{createError}</p></div>}
              <form onSubmit={handleCreateSubmit} className="admin-accounts-create-form">
                <div className="admin-accounts-create-field">
                  <label htmlFor="create-username">Tên đăng nhập *</label>
                  <input type="text" id="create-username" name="username" value={createFormData.username} onChange={handleCreateChange} required minLength={3} />
                </div>
                <div className="admin-accounts-create-field">
                  <label htmlFor="create-phoneNumber">Số điện thoại *</label>
                  <input type="tel" id="create-phoneNumber" name="phoneNumber" value={createFormData.phoneNumber} onChange={handleCreateChange} placeholder="Số điện thoại bắt đầu bằng số 0" required />
                </div>
                <div className="admin-accounts-create-field">
                  <label htmlFor="create-email">Email *</label>
                  <input type="email" id="create-email" name="email" value={createFormData.email} onChange={handleCreateChange} placeholder="email@example.com" required />
                </div>
                <div className="admin-accounts-create-field">
                  <label htmlFor="create-password">Mật khẩu *</label>
                  <input type="password" id="create-password" name="password" value={createFormData.password} onChange={handleCreateChange} placeholder="Ít nhất 6 ký tự" required minLength={6} />
                </div>
                <div className="admin-accounts-create-actions">
                  <button type="button" onClick={closeCreateModal} className="admin-accounts-create-btn-cancel" disabled={createSaving}>Hủy</button>
                  <button type="submit" className="admin-accounts-create-btn-submit" disabled={createSaving}>{createSaving ? 'Đang tạo...' : 'Tạo tài khoản'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

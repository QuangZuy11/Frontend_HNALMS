import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
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
  PersonAdd as PersonAddIcon,
  Groups as GroupsIcon,
  Person as PersonIcon,
  VpnKey as VpnKeyIcon,
  Badge as BadgeIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
} from '@mui/icons-material';
import { accountService } from '../../../services/accountService';
import {
  ROLE_LABELS,
  STATUS_LABELS,
  formatAccountDate,
  type AccountItem,
  type AccountDetail,
} from '../constants';
import '../account-management.css';

interface CreateFormData {
  username: string;
  phoneNumber: string;
  email: string;
  password: string;
  role: 'manager' | 'accountant';
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

export default function ManagerAccountList() {
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<string>('');
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
    role: 'manager',
  });
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const offset = (page - 1) * limit;
      const response = await accountService.list('managers', { offset, limit });

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
  }, [page, limit]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const filteredAccounts = useMemo(() => {
    const filteredByRole = filterRole ? accounts.filter((acc) => acc.role === filterRole) : accounts;

    if (searchTerm.trim() === '') return filteredByRole;

    const term = searchTerm.trim().toLowerCase();
    const termNorm = term.replace(/\s/g, '');

    return filteredByRole.filter((acc) => {
      const fullname = (acc.fullname ?? '').toLowerCase();
      const username = (acc.username ?? '').toLowerCase();
      const email = (acc.email ?? '').toLowerCase();
      const phone = (acc.phoneNumber ?? '').replace(/\s/g, '');

      return fullname.includes(term)
        || username.includes(term)
        || email.includes(term)
        || phone.includes(termNorm);
    });
  }, [accounts, filterRole, searchTerm]);

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

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
  };

  const handleViewDetail = async (accountId: string) => {
    try {
      setDetailLoading(true);
      setDetailAccount(null);
      setShowDetailModal(true);
      const response = await accountService.detail('managers', accountId);
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
    if (!window.confirm('Bạn có chắc muốn đóng tài khoản này?')) return;

    try {
      setDisablingId(accountId);
      const response = await accountService.disable('managers', accountId);
      const updated = response.data;

      if (updated?._id) {
        setAccounts((prev) => prev.map((acc) => (acc._id === updated._id ? { ...acc, status: updated.status } : acc)));

        if (detailAccount?._id === accountId) {
          setDetailAccount((prev) => (prev ? { ...prev, status: updated?.status || prev.status } : prev));
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
      const response = await accountService.enable('managers', accountId);
      const updated = response.data;

      if (updated?._id) {
        setAccounts((prev) => prev.map((acc) => (acc._id === updated._id ? { ...acc, status: updated.status } : acc)));

        if (detailAccount?._id === accountId) {
          setDetailAccount((prev) => (prev ? { ...prev, status: updated?.status || prev.status } : prev));
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
    setCreateFormData({ username: '', phoneNumber: '', email: '', password: '', role: 'manager' });
    setCreateError(null);
    setCreateSuccess(null);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateFormData({ username: '', phoneNumber: '', email: '', password: '', role: 'manager' });
    setCreateError(null);
    setCreateSuccess(null);
  };

  const handleCreateChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCreateFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);

    try {
      setCreateSaving(true);
      await accountService.createManagerOrAccountant({
        username: createFormData.username.trim(),
        phoneNumber: createFormData.phoneNumber.trim(),
        email: createFormData.email.trim().toLowerCase(),
        password: createFormData.password,
        role: createFormData.role,
      });

      setCreateSuccess('Tạo tài khoản thành công!');
      setCreateFormData({ username: '', phoneNumber: '', email: '', password: '', role: 'manager' });
      fetchAccounts();
      setTimeout(() => closeCreateModal(), 1200);
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string } } };
      setCreateError(errObj?.response?.data?.message || 'Không thể tạo tài khoản');
    } finally {
      setCreateSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="manager-account-list-page">
        <div className="manager-account-list-card">
          <div className="manager-account-list-loading">
            <div className="manager-account-list-loading-spinner" />
            <span className="manager-account-list-loading-text">Đang tải dữ liệu...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="manager-account-list-page">
        <div className="manager-account-list-card">
          <div className="manager-account-list-error">
            <div className="manager-account-list-error-icon">!</div>
            <h3>Lỗi tải danh sách</h3>
            <p>{error}</p>
            <button type="button" className="manager-account-list-btn-retry" onClick={fetchAccounts}>
              Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="manager-account-list-page">
      <div className="manager-account-list-card">
        {/* Page Header */}
        <div className="manager-account-list-header">
          <div className="manager-account-list-header-left">
            <div className="manager-account-list-header-icon">
              <GroupsIcon sx={{ fontSize: 22 }} />
            </div>
            <div>
              <h1 className="manager-account-list-title">Danh sách Quản lý & Kế toán</h1>
              <p className="manager-account-list-subtitle">Quản lý tài khoản nhân viên trong tòa nhà</p>
            </div>
          </div>
          <button
            type="button"
            className="manager-account-list-btn-create"
            onClick={openCreateModal}
          >
            <PersonAddIcon sx={{ fontSize: 18 }} />
            Tạo tài khoản
          </button>
        </div>

        {/* Toolbar */}
        <div className="manager-account-list-toolbar">
          <div className="manager-account-list-search-wrap">
            <SearchIcon className="manager-account-list-search-icon" />
            <input
              type="text"
              className="manager-account-list-search-input"
              placeholder="Tìm theo tên đăng nhập, email hoặc SĐT..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {(searchTerm) && (
              <button
                type="button"
                className="manager-account-list-search-clear"
                onClick={() => setSearchTerm('')}
              >
                <ClearIcon sx={{ fontSize: 16 }} />
              </button>
            )}
          </div>

          <div className="manager-account-list-filter-group">
            <select
              className="manager-account-list-filter-select"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="">Tất cả vai trò</option>
              <option value="manager">Quản lý</option>
              <option value="accountant">Kế toán</option>
            </select>
          </div>

          <div className="manager-account-list-stats">
            <span className="manager-account-list-stats-count">
              {filteredAccounts.length} tài khoản
            </span>
          </div>
        </div>

        {/* Table */}
        {filteredAccounts.length === 0 ? (
          <div className="manager-account-list-empty">
            <div className="manager-account-list-empty-icon">
              <GroupsIcon sx={{ fontSize: 48, color: '#cbd5e1' }} />
            </div>
            <h3>Chưa có tài khoản nào</h3>
            <p>
              {searchTerm || filterRole
                ? 'Không tìm thấy tài khoản phù hợp với bộ lọc.'
                : 'Nhấn "Tạo tài khoản" để thêm nhân viên mới.'}
            </p>
          </div>
        ) : (
          <>
            <div className="manager-account-list-table-wrap">
              <table className="manager-account-list-table">
                <thead>
                  <tr>
                    <th style={{ width: '5%' }}>STT</th>
                    <th style={{ width: '15%' }}>Tên đăng nhập</th>
                    <th style={{ width: '22%' }}>Email</th>
                    <th style={{ width: '13%' }}>SĐT</th>
                    <th style={{ width: '11%' }}>Vai trò</th>
                    <th style={{ width: '12%' }}>Trạng thái</th>
                    <th style={{ width: '12%' }}>Ngày tạo</th>
                    <th style={{ width: '10%' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAccounts.map((acc, index) => (
                    <tr key={acc._id}>
                      <td className="manager-account-list-td-center">
                        {(page - 1) * limit + index + 1}
                      </td>
                      <td>
                        <span className="manager-account-list-username">
                          {acc.username || '-'}
                        </span>
                      </td>
                      <td className="manager-account-list-td-email">
                        {acc.email || '-'}
                      </td>
                      <td>{acc.phoneNumber || '-'}</td>
                      <td>
                        <span className={`manager-account-list-role-badge manager-account-list-role-${acc.role}`}>
                          {ROLE_LABELS[acc.role] || acc.role}
                        </span>
                      </td>
                      <td>
                        <span className={`manager-account-list-status-badge manager-account-list-status-${acc.status}`}>
                          <span className="manager-account-list-status-dot" />
                          {STATUS_LABELS[acc.status] || acc.status}
                        </span>
                      </td>
                      <td>{formatAccountDate(acc.createdAt)}</td>
                      <td>
                        <button
                          type="button"
                          className="manager-account-list-btn-view"
                          onClick={() => handleViewDetail(acc._id)}
                          title="Xem chi tiết"
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
            <div className="manager-account-list-pagination">
              <span className="manager-account-list-pagination-info">
                Tổng: <strong>{total}</strong> bản ghi · Trang <strong>{page}</strong>/<strong>{totalPages}</strong>
              </span>
              <div className="manager-account-list-pagination-controls">
                <button
                  type="button"
                  className="manager-account-list-pagination-btn"
                  disabled={page === 1}
                  onClick={() => handlePageChange(1)}
                  title="Trang đầu"
                >
                  <FirstPageIcon sx={{ fontSize: 16 }} />
                </button>
                <button
                  type="button"
                  className="manager-account-list-pagination-btn"
                  disabled={page === 1}
                  onClick={() => handlePageChange(Math.max(page - 1, 1))}
                  title="Trang trước"
                >
                  <PrevIcon sx={{ fontSize: 16 }} />
                </button>

                {getVisiblePages().map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    className={`manager-account-list-pagination-btn ${pageNumber === page ? 'active' : ''}`}
                    onClick={() => handlePageChange(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                ))}

                <button
                  type="button"
                  className="manager-account-list-pagination-btn"
                  disabled={page >= totalPages}
                  onClick={() => handlePageChange(Math.min(page + 1, totalPages))}
                  title="Trang sau"
                >
                  <NextIcon sx={{ fontSize: 16 }} />
                </button>
                <button
                  type="button"
                  className="manager-account-list-pagination-btn"
                  disabled={page >= totalPages}
                  onClick={() => handlePageChange(totalPages)}
                  title="Trang cuối"
                >
                  <LastPageIcon sx={{ fontSize: 16 }} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && (
        <div className="manager-account-detail-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="manager-account-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="manager-account-detail-header">
              <div className="manager-account-detail-header-title">
                <div className="manager-account-detail-header-icon">
                  <PersonIcon sx={{ fontSize: 20 }} />
                </div>
                Chi tiết tài khoản
              </div>
              <button
                type="button"
                className="manager-account-detail-close-btn"
                onClick={() => setShowDetailModal(false)}
                aria-label="Đóng"
              >
                ×
              </button>
            </div>
            <div className="manager-account-detail-body">
              {detailLoading ? (
                <div className="manager-account-detail-loading">
                  <div className="manager-account-detail-loading-spinner" />
                  <span className="manager-account-detail-loading-text">Đang tải thông tin...</span>
                </div>
              ) : detailAccount ? (
                <>
                  <div className="manager-account-detail-profile-strip">
                    <div className="manager-account-detail-avatar">
                      {detailAccount.username?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="manager-account-detail-profile-info">
                      <div className="manager-account-detail-profile-name">
                        {detailAccount.fullname || '—'}
                      </div>
                      <div className="manager-account-detail-profile-meta">
                        <span className="manager-account-detail-username-tag">
                          @{detailAccount.username}
                        </span>
                        <span className={`manager-account-detail-role-badge manager-account-detail-role-${detailAccount.role}`}>
                          {ROLE_LABELS[detailAccount.role] || detailAccount.role}
                        </span>
                        {detailAccount.status === 'active' ? (
                          <span className="manager-account-detail-status-active">
                            <span className="manager-account-detail-status-dot" />
                            Hoạt động
                          </span>
                        ) : (
                          <span className="manager-account-detail-status-inactive">
                            <span className="manager-account-detail-status-dot" />
                            Không hoạt động
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="manager-account-detail-panels">
                    <div className="manager-account-detail-panel">
                      <div className="manager-account-detail-panel-title">
                        <VpnKeyIcon className="manager-account-detail-panel-title-icon" sx={{ fontSize: 15 }} />
                        Thông tin đăng nhập
                      </div>
                      <div className="manager-account-detail-rows">
                        <div className="manager-account-detail-row">
                          <span className="manager-account-detail-label">Tên đăng nhập</span>
                          <span className="manager-account-detail-value">{detailAccount.username}</span>
                        </div>
                        <div className="manager-account-detail-row">
                          <span className="manager-account-detail-label">Email</span>
                          <span className="manager-account-detail-value">
                            {detailAccount.email || <span className="manager-account-detail-value-empty">—</span>}
                          </span>
                        </div>
                        <div className="manager-account-detail-row">
                          <span className="manager-account-detail-label">SĐT</span>
                          <span className="manager-account-detail-value">
                            {detailAccount.phoneNumber || <span className="manager-account-detail-value-empty">—</span>}
                          </span>
                        </div>
                        <div className="manager-account-detail-row">
                          <span className="manager-account-detail-label">Ngày tạo</span>
                          <span className="manager-account-detail-value">
                            {formatAccountDate(detailAccount.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="manager-account-detail-panel">
                      <div className="manager-account-detail-panel-title">
                        <BadgeIcon className="manager-account-detail-panel-title-icon" sx={{ fontSize: 15 }} />
                        Thông tin cá nhân
                      </div>
                      <div className="manager-account-detail-rows">
                        <div className="manager-account-detail-row">
                          <span className="manager-account-detail-label">Họ và tên</span>
                          <span className="manager-account-detail-value">
                            {detailAccount.fullname || <span className="manager-account-detail-value-empty">—</span>}
                          </span>
                        </div>
                        <div className="manager-account-detail-row">
                          <span className="manager-account-detail-label">CCCD / CMND</span>
                          <span className="manager-account-detail-value">
                            {detailAccount.cccd || <span className="manager-account-detail-value-empty">—</span>}
                          </span>
                        </div>
                        <div className="manager-account-detail-row">
                          <span className="manager-account-detail-label">Địa chỉ</span>
                          <span className="manager-account-detail-value">
                            {detailAccount.address || <span className="manager-account-detail-value-empty">—</span>}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="manager-account-detail-actions">
                    {detailAccount.status === 'active' ? (
                      <button
                        type="button"
                        className="manager-account-detail-btn-disable"
                        onClick={() => handleDisable(detailAccount._id)}
                        disabled={disablingId === detailAccount._id}
                      >
                        <LockIcon sx={{ fontSize: 16 }} />
                        {disablingId === detailAccount._id ? 'Đang xử lý...' : 'Đóng tài khoản'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="manager-account-detail-btn-enable"
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

      {/* Create Modal */}
      {showCreateModal && (
        <div className="manager-account-list-create-overlay" onClick={closeCreateModal}>
          <div className="manager-account-list-create-modal" onClick={(e) => e.stopPropagation()}>
            <div className="manager-account-list-create-header">
              <div className="manager-account-list-create-header-title">
                <PersonAddIcon sx={{ fontSize: 20, color: '#1a237e' }} />
                Tạo tài khoản
              </div>
              <button
                type="button"
                className="manager-account-list-create-close"
                onClick={closeCreateModal}
                aria-label="Đóng"
              >
                ×
              </button>
            </div>
            <div className="manager-account-list-create-body">
              {createError && (
                <div className="manager-account-list-create-error">
                  <p>{createError}</p>
                </div>
              )}
              {createSuccess && (
                <div className="manager-account-list-create-success">
                  <p>{createSuccess}</p>
                </div>
              )}
              <form onSubmit={handleCreateSubmit} className="manager-account-list-create-form">
                <div className="manager-account-list-create-field">
                  <label htmlFor="create-username">Tên đăng nhập *</label>
                  <input
                    type="text"
                    id="create-username"
                    name="username"
                    value={createFormData.username}
                    onChange={handleCreateChange}
                    required
                    minLength={3}
                    placeholder="VD: nguyenvana"
                  />
                </div>
                <div className="manager-account-list-create-field">
                  <label htmlFor="create-phoneNumber">Số điện thoại *</label>
                  <input
                    type="tel"
                    id="create-phoneNumber"
                    name="phoneNumber"
                    value={createFormData.phoneNumber}
                    onChange={handleCreateChange}
                    placeholder="0901234567"
                    required
                  />
                </div>
                <div className="manager-account-list-create-field">
                  <label htmlFor="create-email">Email *</label>
                  <input
                    type="email"
                    id="create-email"
                    name="email"
                    value={createFormData.email}
                    onChange={handleCreateChange}
                    placeholder="email@example.com"
                    required
                  />
                </div>
                <div className="manager-account-list-create-field">
                  <label htmlFor="create-password">Mật khẩu *</label>
                  <input
                    type="password"
                    id="create-password"
                    name="password"
                    value={createFormData.password}
                    onChange={handleCreateChange}
                    placeholder="Ít nhất 6 ký tự"
                    required
                    minLength={6}
                  />
                </div>
                <div className="manager-account-list-create-field">
                  <label htmlFor="create-role">Vai trò *</label>
                  <select
                    id="create-role"
                    name="role"
                    value={createFormData.role}
                    onChange={handleCreateChange}
                    required
                    className="manager-account-list-create-select"
                  >
                    <option value="manager">Quản lý</option>
                    <option value="accountant">Kế toán</option>
                  </select>
                </div>
                <div className="manager-account-list-create-actions">
                  <button
                    type="button"
                    onClick={closeCreateModal}
                    className="manager-account-list-create-btn-cancel"
                    disabled={createSaving}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="manager-account-list-create-btn-submit"
                    disabled={createSaving}
                  >
                    {createSaving ? 'Đang tạo...' : 'Tạo tài khoản'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

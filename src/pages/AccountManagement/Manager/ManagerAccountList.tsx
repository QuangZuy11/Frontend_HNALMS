import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  Search as SearchIcon,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Eye,
} from 'lucide-react';
import {
  ManageAccounts as ManageAccountsIcon,
  AccountCircle as AccountCircleIcon,
  SupervisorAccount as SupervisorAccountIcon,
  PersonAdd as PersonAddIcon,
  Person as PersonIcon,
  VpnKey as VpnKeyIcon,
  Badge as BadgeIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Clear as ClearIcon,
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

import { AppModal } from '../../../components/common/Modal';
import { Pagination } from '../../../components/common/Pagination';
import { useToast } from '../../../components/common/Toast';

interface CreateFormData {
  username: string;
  phoneNumber: string;
  email: string;
  password: string;
  role: 'manager' | 'accountant';
}

export default function ManagerAccountList() {
  const { showToast } = useToast();

  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);

  const totalCount = accounts.length;
  const managerCount = accounts.filter((a) => a.role === 'manager').length;
  const accountantCount = accounts.filter((a) => a.role === 'accountant').length;

  const [disablingId, setDisablingId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailAccount, setDetailAccount] = useState<AccountDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<{ id: string; username: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [createFormData, setCreateFormData] = useState<CreateFormData>({
    username: '',
    phoneNumber: '',
    email: '',
    password: '',
    role: 'manager',
  });
  const [createSaving, setCreateSaving] = useState(false);

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const offset = (currentPage - 1) * limit;
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
      const msg = errObj?.response?.data?.message || 'Không thể tải danh sách';
      setError(msg);
      setAccounts([]);
      showToast('error', 'Lỗi', msg);
    } finally {
      setLoading(false);
    }
  }, [currentPage, limit, showToast]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const filteredAccounts = useMemo(() => {
    const result = filterRole ? accounts.filter((acc) => acc.role === filterRole) : accounts;
    if (searchTerm.trim() === '') return result;

    const term = searchTerm.trim().toLowerCase();
    const termNorm = term.replace(/\s/g, '');
    return result.filter((acc) => {
      const fullname = (acc.fullname ?? '').toLowerCase();
      const username = (acc.username ?? '').toLowerCase();
      const email = (acc.email ?? '').toLowerCase();
      const phone = (acc.phoneNumber ?? '').replace(/\s/g, '');
      return fullname.includes(term) || username.includes(term) || email.includes(term) || phone.includes(termNorm);
    });
  }, [accounts, filterRole, searchTerm]);

  const totalPages = Math.max(1, Math.ceil((total || 0) / limit));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterRole]);

  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * limit;
    return filteredAccounts.slice(start, start + limit);
  }, [filteredAccounts, currentPage, limit]);

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
      showToast('error', 'Lỗi', errObj?.response?.data?.message || 'Không thể tải chi tiết');
      setShowDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDisable = async (accountId: string) => {
    try {
      setDisablingId(accountId);
      const response = await accountService.disable('managers', accountId);
      const updated = response.data;
      if (updated?._id) {
        setAccounts((prev) => prev.map((acc) => (acc._id === updated._id ? { ...acc, status: updated.status } : acc)));
        if (detailAccount?._id === accountId) {
          setDetailAccount((prev) => (prev ? { ...prev, status: updated?.status || prev.status } : prev));
        }
        showToast('success', 'Thành công', 'Tài khoản đã bị đóng.');
      }
    } catch (err) {
      const errObj = err as { response?: { data?: { message?: string } } };
      showToast('error', 'Lỗi', errObj?.response?.data?.message || 'Không thể đóng tài khoản');
    } finally {
      setDisablingId(null);
    }
  };

  const handleEnable = async (accountId: string) => {
    try {
      setDisablingId(accountId);
      const response = await accountService.enable('managers', accountId);
      const updated = response.data;
      if (updated?._id) {
        setAccounts((prev) => prev.map((acc) => (acc._id === updated._id ? { ...acc, status: updated.status } : acc)));
        if (detailAccount?._id === accountId) {
          setDetailAccount((prev) => (prev ? { ...prev, status: updated?.status || prev.status } : prev));
        }
        showToast('success', 'Thành công', 'Tài khoản đã được mở lại.');
      }
    } catch (err) {
      const errObj = err as { response?: { data?: { message?: string } } };
      showToast('error', 'Lỗi', errObj?.response?.data?.message || 'Không thể mở lại tài khoản');
    } finally {
      setDisablingId(null);
    }
  };

  const openCreateModal = () => {
    setShowCreateModal(true);
    setCreateFormData({ username: '', phoneNumber: '', email: '', password: '', role: 'manager' });
  };

  const handleCreateChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCreateFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setCreateSaving(true);
      await accountService.createManagerOrAccountant({
        username: createFormData.username.trim(),
        phoneNumber: createFormData.phoneNumber.trim(),
        email: createFormData.email.trim().toLowerCase(),
        password: createFormData.password,
        role: createFormData.role,
      });
      showToast('success', 'Thành công', 'Tạo tài khoản thành công!');
      setShowCreateModal(false);
      fetchAccounts();
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string } } };
      showToast('error', 'Lỗi hệ thống', errObj?.response?.data?.message || 'Không thể tạo tài khoản');
    } finally {
      setCreateSaving(false);
    }
  };

  const handleDeleteClick = (acc: AccountItem) => {
    setAccountToDelete({ id: acc._id, username: acc.username || acc.email || 'này' });
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!accountToDelete) return;
    try {
      setDeleteLoading(true);
      await accountService.delete('managers', accountToDelete.id);
      showToast('success', 'Thành công', 'Xóa tài khoản thành công!');
      setShowDeleteConfirm(false);
      setAccountToDelete(null);
      fetchAccounts();
    } catch (err) {
      const errObj = err as { response?: { data?: { message?: string } } };
      showToast('error', 'Lỗi', errObj?.response?.data?.message || 'Không thể xóa tài khoản.');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="service-container">
        <div className="service-header">
          <div className="service-header-top">
            <div className="service-title-block">
              <div className="service-title-row">
                <div className="service-title-icon"><ManageAccountsIcon sx={{ fontSize: 22 }} /></div>
                <div className="service-title-text">
                  <h2>Danh sách Quản lý & Kế toán</h2>
                  <p className="service-subtitle">Quản lý tài khoản nhân viên trong tòa nhà Hoàng Nam.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="manager-loading-card">
          <div className="manager-loading-spinner" />
          <span>Đang tải dữ liệu...</span>
        </div>
      </div>
    );
  }

  if (error && accounts.length === 0) {
    return (
      <div className="service-container">
        <div className="service-header">
          <div className="service-header-top">
            <div className="service-title-block">
              <div className="service-title-row">
                <div className="service-title-icon"><ManageAccountsIcon sx={{ fontSize: 22 }} /></div>
                <div className="service-title-text">
                  <h2>Danh sách Quản lý & Kế toán</h2>
                  <p className="service-subtitle">Quản lý tài khoản nhân viên trong tòa nhà Hoàng Nam.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="manager-error-card">
          <div className="manager-error-icon">!</div>
          <h3>Lỗi tải danh sách</h3>
          <p>{error}</p>
          <button type="button" className="manager-btn-retry" onClick={fetchAccounts}>Thử lại</button>
        </div>
      </div>
    );
  }

  return (
    <div className="service-container">
      {/* HEADER */}
      <div className="service-header">
        <div className="service-header-top">
          <div className="service-title-block">
            <div className="service-title-row">
              <div className="service-title-icon" aria-hidden>
                <ManageAccountsIcon sx={{ fontSize: 22, color: '#fff' }} />
              </div>
              <div className="service-title-text">
                <h2>Danh sách Quản lý & Kế toán</h2>
                <p className="service-subtitle">
                  Quản lý tài khoản nhân viên trong tòa nhà Hoàng Nam.
                </p>
              </div>
            </div>
          </div>

          <div className="service-header-aside">
            <div className="stats-summary">
              <div className="stat-item">
                <AccountCircleIcon sx={{ fontSize: 16 }} className="stat-icon icon-accent" />
                <div className="stat-text">
                  <span className="stat-value">{totalCount}</span>
                  <span className="stat-label">Tổng số</span>
                </div>
              </div>
              <div className="stat-divider" />
              <div className="stat-item">
                <SupervisorAccountIcon sx={{ fontSize: 16 }} className="stat-icon icon-primary" />
                <div className="stat-text">
                  <span className="stat-value">{managerCount}</span>
                  <span className="stat-label">Quản lý</span>
                </div>
              </div>
              <div className="stat-divider" />
              <div className="stat-item">
                <ManageAccountsIcon sx={{ fontSize: 16 }} className="stat-icon icon-warning" />
                <div className="stat-text">
                  <span className="stat-value">{accountantCount}</span>
                  <span className="stat-label">Kế toán</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn-primary service-header-add-btn"
              onClick={openCreateModal}
            >
              <Plus size={18} /> Tạo tài khoản
            </button>
          </div>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="service-toolbar">
        <div className="service-toolbar-left">
          <div className="search-box">
            <SearchIcon className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Tìm theo họ tên, email hoặc SĐT..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button type="button" className="manager-search-clear" onClick={() => setSearchTerm('')}>
                <ClearIcon sx={{ fontSize: 16 }} />
              </button>
            )}
          </div>

          <div className="control-group">
            <select
              className="custom-select"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="">Tất cả vai trò</option>
              <option value="manager">Quản lý</option>
              <option value="accountant">Kế toán</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABLE CARD */}
      <div className="service-table-container">
        <table className="service-table">
          <thead>
            <tr>
              <th className="cell-stt">STT</th>
              <th className="cell-name">Họ Tên</th>
              <th className="cell-email">Email</th>
              <th className="cell-phone">SĐT</th>
              <th className="cell-role">Vai trò</th>
              <th className="cell-status">Trạng thái</th>
              <th className="cell-date">Ngày tạo</th>
              <th className="cell-actions">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length > 0 ? (
              currentItems.map((acc, index) => (
                <tr key={acc._id} className={acc.status === 'inactive' ? 'inactive-row' : ''}>
                  <td className="cell-stt">{(currentPage - 1) * limit + index + 1}</td>
                  <td className="cell-name">
                    <span className="manager-account-list-username">{acc.fullname || '-'}</span>
                  </td>
                  <td className="cell-email">{acc.email || '-'}</td>
                  <td>{acc.phoneNumber || '-'}</td>
                  <td className="cell-role">
                    <span className={`role-badge ${acc.role === 'manager' ? 'role-manager' : 'role-accountant'}`}>
                      {ROLE_LABELS[acc.role] || acc.role}
                    </span>
                  </td>
                  <td className="cell-status">
                    <span className={`status-badge ${acc.status === 'active' ? 'active' : 'inactive'}`}>
                      {acc.status === 'active' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                      {STATUS_LABELS[acc.status] || acc.status}
                    </span>
                  </td>
                  <td>{formatAccountDate(acc.createdAt)}</td>
                  <td className="cell-actions">
                    <div className="table-actions">
                      <button
                        className="btn-icon btn-view manager-account-list-btn-view"
                        onClick={() => handleViewDetail(acc._id)}
                        title="Xem chi tiết"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        className="btn-icon btn-delete"
                        onClick={() => handleDeleteClick(acc)}
                        title="Xóa tài khoản"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="table-empty-cell">
                  {loading ? 'Đang tải dữ liệu...' : 'Không tìm thấy tài khoản nào phù hợp.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredAccounts.length}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* ====================================================================
          MODALS
          ==================================================================== */}

      {/* 1. Modal Tạo Tài Khoản */}
      <AppModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Tạo tài khoản"
        icon={<PersonAddIcon sx={{ fontSize: 18 }} />}
        color="blue"
        size="md"
        footer={
          <>
            <button type="button" className="ms-btn ms-btn--ghost" onClick={() => setShowCreateModal(false)}>
              Hủy bỏ
            </button>
            <button
              type="submit"
              form="manager-create-form"
              className="ms-btn ms-btn--primary"
              disabled={createSaving}
            >
              <CheckCircle2 size={16} />
              {createSaving ? 'Đang tạo...' : 'Tạo tài khoản'}
            </button>
          </>
        }
      >
        <form id="manager-create-form" onSubmit={handleCreateSubmit}>
          <div className="ms-field">
            <label className="ms-label">Tên đăng nhập <span className="ms-label-required">*</span></label>
            <div className="ms-input-wrap">
              <input
                type="text"
                className="ms-input"
                name="username"
                value={createFormData.username}
                onChange={handleCreateChange}
                required
                minLength={3}
                placeholder="VD: nguyenvana"
              />
            </div>
          </div>

          <div className="ms-field-row">
            <div className="ms-field">
              <label className="ms-label">Số điện thoại <span className="ms-label-required">*</span></label>
              <div className="ms-input-wrap">
                <input
                  type="tel"
                  className="ms-input"
                  name="phoneNumber"
                  value={createFormData.phoneNumber}
                  onChange={handleCreateChange}
                  placeholder="0901234567"
                  required
                />
              </div>
            </div>
            <div className="ms-field">
              <label className="ms-label">Email <span className="ms-label-required">*</span></label>
              <div className="ms-input-wrap">
                <input
                  type="email"
                  className="ms-input"
                  name="email"
                  value={createFormData.email}
                  onChange={handleCreateChange}
                  placeholder="email@example.com"
                  required
                />
              </div>
            </div>
          </div>

          <div className="ms-field">
            <label className="ms-label">Mật khẩu <span className="ms-label-required">*</span></label>
            <div className="ms-input-wrap">
              <input
                type="password"
                className="ms-input"
                name="password"
                value={createFormData.password}
                onChange={handleCreateChange}
                placeholder="Ít nhất 6 ký tự"
                required
                minLength={6}
              />
            </div>
          </div>

          <div className="ms-field">
            <label className="ms-label">Vai trò <span className="ms-label-required">*</span></label>
            <div className="ms-select-wrap">
              <select
                className="ms-select"
                name="role"
                value={createFormData.role}
                onChange={handleCreateChange}
                required
              >
                <option value="manager">Quản lý</option>
                <option value="accountant">Kế toán</option>
              </select>
            </div>
          </div>
        </form>
      </AppModal>

      {/* 2. Modal Chi Tiết Tài Khoản */}
      <AppModal
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Chi tiết tài khoản"
        icon={<PersonIcon sx={{ fontSize: 18 }} />}
        color="blue"
        size="lg"
        footer={
          <button type="button" className="ms-btn ms-btn--ghost" onClick={() => setShowDetailModal(false)}>
            Đóng
          </button>
        }
      >
        <div className="ms-detail-body">
          {detailLoading ? (
            <div className="ms-detail-loading">
              <div className="ms-detail-loading-spinner" />
              <span>Đang tải thông tin...</span>
            </div>
          ) : detailAccount ? (
            <>
              <div className="ms-detail-profile">
                <div className="ms-detail-avatar">
                  {detailAccount.username?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="ms-detail-profile-info">
                  <div className="ms-detail-profile-name">{detailAccount.fullname || '—'}</div>
                  <div className="ms-detail-profile-meta">
                    <span className={`role-badge ${detailAccount.role === 'manager' ? 'role-manager' : 'role-accountant'}`}>
                      {ROLE_LABELS[detailAccount.role] || detailAccount.role}
                    </span>
                    <span className={`status-badge ${detailAccount.status === 'active' ? 'active' : 'inactive'}`}>
                      {STATUS_LABELS[detailAccount.status] || detailAccount.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="ms-detail-panels">
                {/* THÔNG TIN ĐĂNG NHẬP - BÊN TRÁI */}
                <div className="ms-detail-panel">
                  <div className="ms-detail-panel-title">
                    <VpnKeyIcon sx={{ fontSize: 15 }} />
                    Thông tin đăng nhập
                  </div>
                  <div className="ms-detail-rows">
                    <div className="ms-detail-row">
                      <span className="ms-detail-label">Tên đăng nhập</span>
                      <span className="ms-detail-value">{detailAccount.username}</span>
                    </div>
                    <div className="ms-detail-row">
                      <span className="ms-detail-label">Email</span>
                      <span className="ms-detail-value">{detailAccount.email || <span className="ms-detail-value-empty">—</span>}</span>
                    </div>
                    <div className="ms-detail-row">
                      <span className="ms-detail-label">Ngày tạo</span>
                      <span className="ms-detail-value">{formatAccountDate(detailAccount.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* THÔNG TIN CÁ NHÂN - BÊN PHẢI */}
                <div className="ms-detail-panel">
                  <div className="ms-detail-panel-title">
                    <BadgeIcon sx={{ fontSize: 15 }} />
                    Thông tin cá nhân
                  </div>
                  <div className="ms-detail-rows">
                    <div className="ms-detail-row">
                      <span className="ms-detail-label">Họ và tên</span>
                      <span className="ms-detail-value">{detailAccount.fullname || <span className="ms-detail-value-empty">—</span>}</span>
                    </div>
                    <div className="ms-detail-row">
                      <span className="ms-detail-label">SĐT</span>
                      <span className="ms-detail-value">{detailAccount.phoneNumber || <span className="ms-detail-value-empty">—</span>}</span>
                    </div>
                    <div className="ms-detail-row">
                      <span className="ms-detail-label">CCCD / CMND</span>
                      <span className="ms-detail-value">{detailAccount.cccd || <span className="ms-detail-value-empty">—</span>}</span>
                    </div>
                    <div className="ms-detail-row">
                      <span className="ms-detail-label">Ngày sinh</span>
                      <span className="ms-detail-value">{detailAccount.dob ? formatAccountDate(detailAccount.dob) : <span className="ms-detail-value-empty">—</span>}</span>
                    </div>
                    <div className="ms-detail-row">
                      <span className="ms-detail-label">Giới tính</span>
                      <span className="ms-detail-value">
                        {detailAccount.gender === 'male' ? 'Nam' : detailAccount.gender === 'female' ? 'Nữ' : detailAccount.gender || <span className="ms-detail-value-empty">—</span>}
                      </span>
                    </div>
                    <div className="ms-detail-row">
                      <span className="ms-detail-label">Địa chỉ</span>
                      <span className="ms-detail-value">{detailAccount.address || <span className="ms-detail-value-empty">—</span>}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="ms-detail-actions">
                {detailAccount.status === 'active' ? (
                  <button
                    type="button"
                    className="ms-btn ms-btn--danger"
                    onClick={() => handleDisable(detailAccount._id)}
                    disabled={disablingId === detailAccount._id}
                  >
                    <LockIcon sx={{ fontSize: 16 }} />
                    {disablingId === detailAccount._id ? 'Đang xử lý...' : 'Đóng tài khoản'}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="ms-btn ms-btn--primary"
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
      </AppModal>

      {/* 3. Modal Xác Nhận Xóa */}
      <AppModal
        open={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setAccountToDelete(null); }}
        title="Xóa tài khoản"
        icon={<AlertTriangle size={18} />}
        color="red"
        size="sm"
        footer={
          <>
            <button
              type="button"
              className="ms-btn ms-btn--ghost"
              onClick={() => { setShowDeleteConfirm(false); setAccountToDelete(null); }}
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              className="ms-btn ms-btn--danger"
              onClick={handleConfirmDelete}
              disabled={deleteLoading}
            >
              <AlertTriangle size={16} />
              {deleteLoading ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
            </button>
          </>
        }
      >
        <div className="ms-delete-notice">
          <div className="ms-delete-notice-icon">
            <AlertTriangle size={28} />
          </div>
          <p className="ms-delete-notice-text">
            Bạn có chắc chắn muốn xóa tài khoản <strong>@{accountToDelete?.username}</strong> không?
            Toàn bộ dữ liệu liên quan sẽ bị mất vĩnh viễn.
          </p>
        </div>
      </AppModal>
    </div>
  );
}

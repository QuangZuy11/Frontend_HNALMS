import { useCallback, useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import { accountService } from '../../../services/accountService';
import { ROLE_LABELS, STATUS_LABELS, formatAccountDate, type AccountItem, type AccountDetail } from '../constants';
import '../account-management.css';

interface CreateFormData {
  username: string;
  phoneNumber: string;
  email: string;
  password: string;
  role: 'manager' | 'accountant';
}

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

  // Khoá scroll trang này
  useEffect(() => {
    const main = document.querySelector('.dashboard-layout-main') as HTMLElement;
    if (main) main.style.overflowY = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      if (main) main.style.overflowY = '';
      document.body.style.overflow = '';
    };
  }, []);

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
      console.error('Error fetching managers:', err);
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

  const filteredByRole = filterRole ? accounts.filter((acc) => acc.role === filterRole) : accounts;
  const filteredAccounts =
    searchTerm.trim() === ''
      ? filteredByRole
      : filteredByRole.filter((acc) => {
        const term = searchTerm.trim().toLowerCase();
        const fullname = (acc.fullname ?? '').toLowerCase();
        const username = (acc.username ?? '').toLowerCase();
        const email = (acc.email ?? '').toLowerCase();
        const phone = (acc.phoneNumber ?? '').replace(/\s/g, '');
        const termNorm = term.replace(/\s/g, '');
        return fullname.includes(term) || username.includes(term) || email.includes(term) || phone.includes(termNorm);
      });

  const totalPages = Math.max(1, Math.ceil((total || 0) / limit));

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
        if (detailAccount?._id === accountId) setDetailAccount((prev) => (prev ? { ...prev, status: updated?.status || prev.status } : prev));
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
        if (detailAccount?._id === accountId) setDetailAccount((prev) => (prev ? { ...prev, status: updated?.status || prev.status } : prev));
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

  const handleCreateChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCreateFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
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
      setTimeout(() => {
        closeCreateModal();
      }, 1200);
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string } } };
      setCreateError(errObj?.response?.data?.message || 'Không thể tạo tài khoản');
    } finally {
      setCreateSaving(false);
    }
  };

  return (
    <div className="created-accounts-page">
      <div className="created-accounts-card">
        <div className="created-accounts-header">
          <div>
            <h1>Danh sách Quản lý & Kế toán</h1>
            <p className="created-accounts-subtitle">Các tài khoản Quản lý, Kế toán</p>
          </div>
          <div className="created-accounts-actions">
            {accounts.length > 0 && (
              <div className="created-accounts-search">
                <input
                  type="text"
                  placeholder="Tìm theo tên đăng nhập, email hoặc SĐT..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                  aria-label="Tìm kiếm"
                />
              </div>
            )}
            <div className="filter-role-group">
              <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
                <option value="">Tất cả</option>
                <option value="manager">Quản lý</option>
                <option value="accountant">Kế toán</option>
              </select>
            </div>
            <button type="button" className="btn-create" onClick={openCreateModal}>+ Tạo tài khoản</button>
          </div>
        </div>

        {loading ? (
          <div className="created-accounts-loading"><div className="spinner" /><p>Đang tải...</p></div>
        ) : error ? (
          <div className="form-error"><p>{error}</p><button type="button" onClick={fetchAccounts} className="btn-retry">Thử lại</button></div>
        ) : accounts.length === 0 ? (
          <div className="created-accounts-empty">
            <p>Chưa có tài khoản Quản lý/Kế toán nào.</p>
            <button type="button" className="btn-primary" onClick={openCreateModal}>Tạo tài khoản đầu tiên</button>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="created-accounts-empty">
            <p>Không tìm thấy tài khoản phù hợp với từ khóa tìm kiếm.</p>
          </div>
        ) : (
          <div className="created-accounts-table-wrap">
            <table className="created-accounts-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Tên đăng nhập</th>
                  <th>Email</th>
                  <th>Số điện thoại</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.map((acc, index) => (
                  <tr key={acc._id}>
                    <td>{(page - 1) * limit + index + 1}</td>
                    <td>{acc.username}</td>
                    <td>{acc.email}</td>
                    <td>{acc.phoneNumber || '-'}</td>
                    <td>
                      <span className="role-badge">
                        {ROLE_LABELS[acc.role] || acc.role}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge status-${acc.status}`}>
                        {STATUS_LABELS[acc.status] || acc.status}
                      </span>
                    </td>
                    <td>{formatAccountDate(acc.createdAt)}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          type="button"
                          className="btn-view-detail btn-icon"
                          onClick={() => handleViewDetail(acc._id)}
                          title="Xem chi tiết"
                          aria-label="Xem chi tiết"
                        >
                          <Eye size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="accounts-pagination">
              <div className="accounts-pagination-info">

              </div>
              <div className="accounts-pagination-controls">
                <button
                  type="button"
                  className="pagination-arrow-btn"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={page === 1 || loading}
                  aria-label="Trang trước"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="pagination-current-page"
                  disabled
                >
                  {page}
                </button>
                <button
                  type="button"
                  className="pagination-arrow-btn"
                  onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={page >= totalPages || loading}
                  aria-label="Trang sau"
                >
                  ›
                </button>
              </div>
            </div>
          </div>
        )}

        {showDetailModal && (
          <div className="create-account-modal-overlay" onClick={() => setShowDetailModal(false)}>
            <div className="account-detail-modal" onClick={(e) => e.stopPropagation()}>
              <div className="create-account-modal-header">
                <h2>Chi tiết tài khoản</h2>
                <button type="button" className="modal-close-btn" onClick={() => setShowDetailModal(false)} aria-label="Đóng">×</button>
              </div>
              <div className="account-detail-modal-body">
                {detailLoading ? (
                  <div className="detail-loading"><div className="spinner" /><p>Đang tải...</p></div>
                ) : detailAccount ? (
                  <div className="detail-content">
                    <div className="detail-section">
                      <h3>Thông tin đăng nhập</h3>
                      <div className="detail-row"><span className="detail-label">Tên đăng nhập:</span><span className="detail-value">{detailAccount.username}</span></div>
                      <div className="detail-row"><span className="detail-label">Email:</span><span className="detail-value">{detailAccount.email}</span></div>
                      <div className="detail-row"><span className="detail-label">Số điện thoại:</span><span className="detail-value">{detailAccount.phoneNumber || '-'}</span></div>
                      <div className="detail-row"><span className="detail-label">Vai trò:</span><span className="role-badge">{ROLE_LABELS[detailAccount.role] || detailAccount.role}</span></div>
                      <div className="detail-row"><span className="detail-label">Trạng thái:</span>
                        <span className={`status-badge status-${detailAccount.status}`}>{STATUS_LABELS[detailAccount.status] || detailAccount.status}</span>
                      </div>
                      <div className="detail-row"><span className="detail-label">Ngày tạo:</span><span className="detail-value">{formatAccountDate(detailAccount.createdAt)}</span></div>
                    </div>
                    <div className="detail-section">
                      <h3>Thông tin cá nhân</h3>
                      <div className="detail-row"><span className="detail-label">Họ và tên:</span><span className="detail-value">{detailAccount.fullname || '-'}</span></div>
                      <div className="detail-row"><span className="detail-label">CCCD:</span><span className="detail-value">{detailAccount.cccd || '-'}</span></div>
                      <div className="detail-row"><span className="detail-label">Địa chỉ:</span><span className="detail-value">{detailAccount.address || '-'}</span></div>
                    </div>
                    <div className="detail-actions">
                      {detailAccount.status === 'active' ? (
                        <button type="button" className="btn-disable" onClick={() => handleDisable(detailAccount._id)} disabled={disablingId === detailAccount._id}>Đóng tài khoản</button>
                      ) : (
                        <button type="button" className="btn-enable" onClick={() => handleEnable(detailAccount._id)} disabled={disablingId === detailAccount._id}>Mở lại</button>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {showCreateModal && (
          <div className="create-account-modal-overlay" onClick={closeCreateModal}>
            <div className="create-account-modal" onClick={(e) => e.stopPropagation()}>
              <div className="create-account-modal-header">
                <h2>Tạo tài khoản Quản lý / Kế toán</h2>
                <button type="button" className="modal-close-btn" onClick={closeCreateModal} aria-label="Đóng">×</button>
              </div>
              <div className="create-account-modal-body">
                {createError && <div className="form-error"><p>{createError}</p></div>}
                {createSuccess && <div className="form-success"><p>{createSuccess}</p></div>}
                <form onSubmit={handleCreateSubmit} className="create-account-form">
                  <div className="form-group">
                    <label htmlFor="create-username">Tên đăng nhập *</label>
                    <input type="text" id="create-username" name="username" value={createFormData.username} onChange={handleCreateChange} required minLength={3} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="create-phoneNumber">Số điện thoại *</label>
                    <input type="tel" id="create-phoneNumber" name="phoneNumber" value={createFormData.phoneNumber} onChange={handleCreateChange} placeholder="0901234567" required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="create-email">Email *</label>
                    <input type="email" id="create-email" name="email" value={createFormData.email} onChange={handleCreateChange} placeholder="email@example.com" required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="create-password">Mật khẩu *</label>
                    <input type="password" id="create-password" name="password" value={createFormData.password} onChange={handleCreateChange} placeholder="Ít nhất 6 ký tự" required minLength={6} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="create-role">Vai trò *</label>
                    <select id="create-role" name="role" value={createFormData.role} onChange={handleCreateChange} required>
                      <option value="manager">Quản lý</option>
                      <option value="accountant">Kế toán</option>
                    </select>
                  </div>
                  <div className="form-actions">
                    <button type="button" onClick={closeCreateModal} className="btn-secondary" disabled={createSaving}>Hủy</button>
                    <button type="submit" className="btn-primary" disabled={createSaving}>{createSaving ? 'Đang tạo...' : 'Tạo tài khoản'}</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

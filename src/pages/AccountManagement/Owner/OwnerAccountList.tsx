import { useCallback, useEffect, useState } from 'react';
import { accountService } from '../../../services/accountService';
import { STATUS_LABELS, formatAccountDate, type AccountItem, type AccountDetail } from '../constants';
import '../account-management.css';

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

  const filteredAccounts = searchTerm.trim() === ''
    ? accounts
    : accounts.filter((acc) => {
        const term = searchTerm.trim().toLowerCase();
        const username = (acc.username ?? '').toLowerCase();
        return username.includes(term);
      });

  const totalPages = Math.max(1, Math.ceil((total || 0) / limit));

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
      const response = await accountService.enable('owners', accountId);
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
      setCreateFormData({ username: '', phoneNumber: '', email: '', password: '' });
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
            <h1>Danh sách Chủ nhà</h1>
            <p className="created-accounts-subtitle">Tất cả tài khoản Chủ nhà trong hệ thống</p>
          </div>
          <div className="created-accounts-actions">
            {!loading && !error && accounts.length > 0 && (
              <div className="created-accounts-search">
                <input
                  type="text"
                  placeholder="Tìm theo tên đăng nhập..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                  aria-label="Tìm kiếm theo tên đăng nhập"
                />
              </div>
            )}
            <button type="button" className="btn-create" onClick={openCreateModal}>
              + Tạo Tài Khoản 
            </button>
          </div>
        </div>

        {loading ? (
          <div className="created-accounts-loading">
            <div className="spinner" />
            <p>Đang tải...</p>
          </div>
        ) : error ? (
          <div className="form-error">
            <p>{error}</p>
            <button type="button" onClick={fetchAccounts} className="btn-retry">Thử lại</button>
          </div>
        ) : accounts.length === 0 ? (
          <div className="created-accounts-empty">
            <p>Chưa có tài khoản Chủ nhà nào.</p>
            <button type="button" className="btn-primary" onClick={openCreateModal}>Tạo Chủ nhà đầu tiên</button>
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
                      <span className={`status-badge status-${acc.status}`}>{STATUS_LABELS[acc.status] || acc.status}</span>
                    </td>
                    <td>{formatAccountDate(acc.createdAt)}</td>
                    <td>
                      <div className="action-buttons">
                        <button type="button" className="btn-view-detail" onClick={() => handleViewDetail(acc._id)}>Xem chi tiết</button>
                        {acc.status === 'active' ? (
                          <button type="button" className="btn-disable" onClick={() => handleDisable(acc._id)} disabled={disablingId === acc._id}>
                            {disablingId === acc._id ? 'Đang xử lý...' : 'Đóng tài khoản'}
                          </button>
                        ) : (
                          <button type="button" className="btn-enable" onClick={() => handleEnable(acc._id)} disabled={disablingId === acc._id}>
                            {disablingId === acc._id ? 'Đang xử lý...' : 'Mở lại'}
                          </button>
                        )}
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
                <h2>Chi tiết Chủ nhà</h2>
                <button type="button" className="modal-close-btn" onClick={() => setShowDetailModal(false)} aria-label="Đóng">×</button>
              </div>
              <div className="account-detail-modal-body">
                {detailLoading ? (
                  <div className="detail-loading"><div className="spinner" /><p>Đang tải...</p></div>
                ) : detailAccount ? (
                  <div className="detail-content">
                    <div className="detail-section">
                      <h3>Thông tin đăng nhập</h3>
                      <div className="detail-row detail-row-tight"><span className="detail-label">Tên đăng nhập:</span><span className="detail-value">{detailAccount.username}</span></div>
                      <div className="detail-row detail-row-tight"><span className="detail-label">Email:</span><span className="detail-value">{detailAccount.email}</span></div>
                      <div className="detail-row detail-row-tight"><span className="detail-label">Số điện thoại:</span><span className="detail-value">{detailAccount.phoneNumber || '-'}</span></div>
                      <div className="detail-row detail-row-tight"><span className="detail-label">Trạng thái:</span>
                        <span className={`status-badge status-${detailAccount.status}`}>{STATUS_LABELS[detailAccount.status] || detailAccount.status}</span>
                      </div>
                      <div className="detail-row detail-row-tight"><span className="detail-label">Ngày tạo:</span><span className="detail-value">{formatAccountDate(detailAccount.createdAt)}</span></div>
                    </div>
                    <div className="detail-section">
                      <h3>Thông tin cá nhân</h3>
                      <div className="detail-row detail-row-tight"><span className="detail-label">Họ và tên:</span><span className="detail-value">{detailAccount.fullname || '-'}</span></div>
                      <div className="detail-row detail-row-tight"><span className="detail-label">CCCD:</span><span className="detail-value">{detailAccount.cccd || '-'}</span></div>
                      <div className="detail-row detail-row-tight"><span className="detail-label">Địa chỉ:</span><span className="detail-value">{detailAccount.address || '-'}</span></div>
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
                <h2>Tạo tài khoản Chủ nhà</h2>
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

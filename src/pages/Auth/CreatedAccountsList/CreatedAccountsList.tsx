import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../../services/authService';
import { useAuth } from '../../../context/AuthContext';
import './CreatedAccountsList.css';

// Admin -> Owner | Owner -> Manager, Accountant
const ROLE_OPTIONS: Record<string, { value: string; label: string }[]> = {
  admin: [{ value: 'owner', label: 'Chủ căn hộ ' }],
  owner: [
    { value: 'manager', label: 'Quản lý' },
    { value: 'accountant', label: 'Kế toán' },
  ],
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  owner: 'Chủ nhà',
  manager: 'Quản lý',
  Tenant: 'Người thuê',
  accountant: 'Kế toán',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Hoạt động',
  inactive: 'Không hoạt động',
  suspended: 'Tạm khóa',
};

interface CreatedAccount {
  _id: string;
  username: string;
  email: string;
  phoneNumber?: string;
  role: string;
  status: string;
  createdAt?: string;
  fullname?: string | null;
}

interface AccountDetail extends CreatedAccount {
  fullname?: string | null;
  cccd?: string | null;
  address?: string | null;
  dob?: string | null;
  gender?: string | null;
}

interface FormData {
  username: string;
  phoneNumber: string;
  email: string;
  password: string;
  role: string;
}

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M1.5 12C3.1 7.9 7.2 5 12 5s8.9 2.9 10.5 7c-1.6 4.1-5.7 7-10.5 7S3.1 16.1 1.5 12Z"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="3" strokeWidth="1.8" />
  </svg>
);

const LockIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect
      x="5"
      y="10"
      width="14"
      height="10"
      rx="2"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8 10V8a4 4 0 0 1 8 0v2"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const UnlockIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect
      x="5"
      y="10"
      width="14"
      height="10"
      rx="2"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9 10V8a4 4 0 0 1 7.5-2"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function CreatedAccountsList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<CreatedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [disablingId, setDisablingId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailAccount, setDetailAccount] = useState<AccountDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [filterRole, setFilterRole] = useState<string>('');

  const currentRole = (user?.role || '').toLowerCase();
  const roleOptions = ROLE_OPTIONS[currentRole] || [];
  const singleRoleOption = roleOptions.length === 1 ? roleOptions[0] : null;

  const [formData, setFormData] = useState<FormData>({
    username: '',
    phoneNumber: '',
    email: '',
    password: '',
    role: roleOptions[0]?.value || '',
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (roleOptions.length > 0) {
      setFormData((prev) => {
        const validRole = roleOptions.some((o) => o.value === prev.role);
        return validRole ? prev : { ...prev, role: roleOptions[0].value };
      });
    }
  }, [currentRole, roleOptions]);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authService.getCreatedAccounts();
      if (response.success && response.data) {
        setAccounts(response.data);
      } else {
        setAccounts([]);
      }
    } catch (err) {
      console.error('Error fetching created accounts:', err);
      const errObj = err as { response?: { data?: { message?: string } } };
      setError(errObj?.response?.data?.message || 'Không thể tải danh sách');
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleCreateNew = () => {
    setFormError(null);
    setFormSuccess(null);
    setFormData({
      username: '',
      phoneNumber: '',
      email: '',
      password: '',
      role: roleOptions[0]?.value || '',
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormError(null);
    setFormSuccess(null);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    try {
      setFormSaving(true);
      await authService.createAccount({
        username: formData.username.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: formData.role,
      });
      setFormSuccess('Tạo tài khoản thành công!');
      setFormData({
        username: '',
        phoneNumber: '',
        email: '',
        password: '',
        role: roleOptions[0]?.value || '',
      });
      fetchAccounts();
    } catch (err: unknown) {
      console.error('Create account error:', err);
      const errObj = err as { response?: { data?: { message?: string } } };
      setFormError(errObj?.response?.data?.message || 'Không thể tạo tài khoản');
    } finally {
      setFormSaving(false);
    }
  };

  const handleViewDetail = async (accountId: string) => {
    try {
      setDetailLoading(true);
      setDetailAccount(null);
      setShowDetailModal(true);
      const response = await authService.getAccountDetail(accountId);
      if (response.success && response.data) {
        setDetailAccount(response.data);
      }
    } catch (err) {
      console.error('Get account detail error:', err);
      const errObj = err as { response?: { data?: { message?: string } } };
      alert(errObj?.response?.data?.message || 'Không thể tải chi tiết tài khoản');
      setShowDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setDetailAccount(null);
  };

  const handleDisableAccount = async (accountId: string) => {
    if (!window.confirm('Bạn có chắc muốn đóng tài khoản này? Tài khoản sẽ không thể đăng nhập.')) {
      return;
    }
    try {
      setDisablingId(accountId);
      const response = await authService.disableAccount(accountId);
      const updated = response.data;

      if (updated?._id) {
        // Cập nhật lại danh sách tài khoản tại chỗ, không reload toàn bộ
        setAccounts((prev) =>
          prev.map((acc) =>
            acc._id === updated._id ? { ...acc, status: updated.status } : acc
          )
        );
      }

      if (detailAccount?._id === accountId) {
        setDetailAccount((prev) =>
          prev ? { ...prev, status: updated?.status || prev.status } : prev
        );
      }
    } catch (err: unknown) {
      console.error('Disable account error:', err);
      const errObj = err as { response?: { data?: { message?: string } } };
      alert(errObj?.response?.data?.message || 'Không thể đóng tài khoản');
    } finally {
      setDisablingId(null);
    }
  };

  const handleEnableAccount = async (accountId: string) => {
    if (!window.confirm('Bạn có chắc muốn mở lại tài khoản này? Tài khoản sẽ có thể đăng nhập trở lại.')) {
      return;
    }
    try {
      setDisablingId(accountId);
      const response = await authService.enableAccount(accountId);
      const updated = response.data;

      if (updated?._id) {
        // Cập nhật lại danh sách tài khoản tại chỗ, không reload toàn bộ
        setAccounts((prev) =>
          prev.map((acc) =>
            acc._id === updated._id ? { ...acc, status: updated.status } : acc
          )
        );
      }

      if (detailAccount?._id === accountId) {
        setDetailAccount((prev) =>
          prev ? { ...prev, status: updated?.status || prev.status } : prev
        );
      }
    } catch (err: unknown) {
      console.error('Enable account error:', err);
      const errObj = err as { response?: { data?: { message?: string } } };
      alert(errObj?.response?.data?.message || 'Không thể mở lại tài khoản');
    } finally {
      setDisablingId(null);
    }
  };

  if (!['admin', 'owner', 'manager'].includes(currentRole)) {
    return (
      <div className="created-accounts-page">
        <div className="created-accounts-card">
          <h1>Không có quyền truy cập</h1>
          <p>Bạn không có quyền xem danh sách tài khoản đã tạo.</p>
          <button onClick={() => navigate(-1)} className="btn-primary">
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  const isManager = currentRole === 'manager';
  const isAdmin = currentRole === 'admin';

  const availableFilterRoles = (() => {
    if (currentRole === 'admin') {
      return Object.keys(ROLE_LABELS);
    }
    if (currentRole === 'owner') {
      return ['manager', 'accountant'];
    }
    if (currentRole === 'manager') {
      return ['Tenant'];
    }
    return [];
  })();

  const filteredAccounts = filterRole
    ? accounts.filter((acc) => acc.role === filterRole)
    : accounts;

  return (
    <div className="created-accounts-page">
      <div className="created-accounts-card">
        <div className="created-accounts-header">
          <div>
            <h1>{isManager ? 'Danh sách tài khoản cư dân' : 'Danh Sách Nhân Sự Tòa Nhà'}</h1>
            <p className="created-accounts-subtitle">
              {currentRole === 'admin' && 'Tất cả tài khoản người dùng trong hệ thống'}
              {currentRole === 'owner' && 'Các tài khoản Quản lý, Kế toán'}
              {isManager && 'Danh sách tài khoản cư dân (tenant) trong tòa nhà'}
            </p>
          </div>
          <div className="created-accounts-actions">
            <div className="filter-role-group">
            
              <select
                id="filter-role"
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
              >
                <option value="">Tất cả</option>
                {availableFilterRoles.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role] || role}
                  </option>
                ))}
              </select>
            </div>
            {!isManager && (
              <button onClick={handleCreateNew} className="btn-create">
                + Tạo tài khoản mới
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="created-accounts-loading">
            <div className="spinner"></div>
            <p>Đang tải...</p>
          </div>
        ) : error ? (
          <div className="form-error">
            <p>{error}</p>
            <button onClick={fetchAccounts} className="btn-retry">
              Thử lại
            </button>
          </div>
        ) : accounts.length === 0 ? (
          <div className="created-accounts-empty">
            <p>{isManager ? 'Chưa có tài khoản cư dân nào.' : 'Chưa có tài khoản nào được tạo.'}</p>
            {!isManager && (
              <button onClick={handleCreateNew} className="btn-primary">
                Tạo tài khoản đầu tiên
              </button>
            )}
          </div>
        ) : null}

        {!loading && !error && accounts.length > 0 ? (
          <div className="created-accounts-table-wrap">
            <table className="created-accounts-table">
              <thead>
                <tr>
                  <th>STT</th>
                  {isManager ? (
                    <>
                      <th>Họ và tên</th>
                      <th>Email</th>
                      <th>Số điện thoại</th>
                      <th>Trạng thái</th>
                      <th>Ngày tạo</th>
                      <th>Thao tác</th>
                    </>
                  ) : (
                    <>
                      <th>Tên đăng nhập</th>
                      <th>Email</th>
                      <th>Số điện thoại</th>
                      <th>Vai trò</th>
                      <th>Trạng thái</th>
                      <th>Ngày tạo</th>
                      <th>Thao tác</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.map((acc, index) => (
                  <tr key={acc._id}>
                    <td>{index + 1}</td>
                    {isManager ? (
                      <>
                        <td>{acc.fullname ?? '-'}</td>
                        <td>{acc.email}</td>
                        <td>{acc.phoneNumber || '-'}</td>
                        <td>
                          <span className={`status-badge status-${acc.status}`}>
                            {STATUS_LABELS[acc.status] || acc.status}
                          </span>
                        </td>
                        <td>{formatDate(acc.createdAt)}</td>
                        <td>
                          <div className="action-buttons">
                            <button
                              type="button"
                              className="btn-view-detail"
                              onClick={() => handleViewDetail(acc._id)}
                              title="Xem chi tiết"
                            >
                              Xem chi tiết
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{acc.username}</td>
                        <td>{acc.email}</td>
                        <td>{acc.phoneNumber || '-'}</td>
                        <td>
                          <span className="role-badge">{ROLE_LABELS[acc.role] || acc.role}</span>
                        </td>
                        <td>
                          <span className={`status-badge status-${acc.status}`}>
                            {STATUS_LABELS[acc.status] || acc.status}
                          </span>
                        </td>
                        <td>{formatDate(acc.createdAt)}</td>
                        <td>
                          <div className="action-buttons">
                            <button
                              type="button"
                              className="btn-view-detail"
                              onClick={() => handleViewDetail(acc._id)}
                              title="Xem chi tiết"
                            >
                              Xem chi tiết
                            </button>
                            {/* Admin chỉ được đóng/mở tài khoản Chủ nhà (owner) */}
                            {(!isAdmin || acc.role === 'owner') && (
                              acc.status === 'active' ? (
                                <button
                                  type="button"
                                  className="btn-disable"
                                  onClick={() => handleDisableAccount(acc._id)}
                                  disabled={disablingId === acc._id}
                                  title="Đóng tài khoản"
                                >
                                  {disablingId === acc._id ? 'Đang xử lý...' : 'Đóng tài khoản'}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="btn-enable"
                                  onClick={() => handleEnableAccount(acc._id)}
                                  disabled={disablingId === acc._id}
                                  title="Mở lại tài khoản"
                                >
                                  {disablingId === acc._id ? 'Đang xử lý...' : 'Mở lại'}
                                </button>
                              )
                            )}
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {/* Modal Chi tiết tài khoản */}
        {showDetailModal && (
          <div className="create-account-modal-overlay" onClick={handleCloseDetailModal}>
            <div className="account-detail-modal" onClick={(e) => e.stopPropagation()}>
              <div className="create-account-modal-header">
                <h2>Chi tiết tài khoản</h2>
                <button type="button" className="modal-close-btn" onClick={handleCloseDetailModal} aria-label="Đóng">
                  ×
                </button>
              </div>
              <div className="account-detail-modal-body">
                {detailLoading ? (
                  <div className="detail-loading">
                    <div className="spinner"></div>
                    <p>Đang tải...</p>
                  </div>
                ) : detailAccount ? (
                  <div className="detail-content">
                    {isManager ? (
                      <div className="detail-content-manager">
                        <div className="detail-section-divider">Thông tin tài khoản</div>
                        <div className="detail-section-block">
                          <div className="detail-row">
                            <span className="detail-label">Username:</span>
                            <span className="detail-value detail-value-black">{detailAccount.username}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Trạng thái:</span>
                            <span className={`status-badge status-${detailAccount.status}`}>
                              {STATUS_LABELS[detailAccount.status] || detailAccount.status}
                            </span>
                          </div>
                        </div>
                        <div className="detail-section-divider">Thông tin liên hệ</div>
                        <div className="detail-section-block">
                          <div className="detail-row">
                            <span className="detail-label">Email:</span>
                            <span className="detail-value detail-value-black">{detailAccount.email}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Số điện thoại:</span>
                            <span className="detail-value detail-value-black">{detailAccount.phoneNumber || '-'}</span>
                          </div>
                        </div>
                        <div className="detail-section-divider">Thông tin cá nhân</div>
                        <div className="detail-section-block">
                          <div className="detail-row">
                            <span className="detail-label">Họ và tên:</span>
                            <span className="detail-value detail-value-black">{detailAccount.fullname || '-'}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Giới tính:</span>
                            <span className="detail-value detail-value-black">
                              {detailAccount.gender === 'Male' ? 'Nam' : detailAccount.gender === 'Female' ? 'Nữ' : detailAccount.gender === 'Other' ? 'Khác' : '-'}
                            </span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Ngày sinh:</span>
                            <span className="detail-value detail-value-black">
                              {detailAccount.dob ? formatDate(detailAccount.dob) : '-'}
                            </span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Địa chỉ:</span>
                            <span className="detail-value detail-value-black">{detailAccount.address || '-'}</span>
                          </div>
                        </div>
                        <div className="detail-section-divider">Thông tin pháp lý</div>
                        <div className="detail-section-block">
                          <div className="detail-row">
                            <span className="detail-label">CCCD:</span>
                            <span className="detail-value detail-value-black">{detailAccount.cccd || '-'}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="detail-section">
                          <h3>Thông tin đăng nhập</h3>
                          <div className="detail-row">
                            <span className="detail-label">Tên đăng nhập:</span>
                            <span className="detail-value">{detailAccount.username}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Email:</span>
                            <span className="detail-value">{detailAccount.email}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Số điện thoại:</span>
                            <span className="detail-value">{detailAccount.phoneNumber || '-'}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Vai trò:</span>
                            <span className="role-badge">{ROLE_LABELS[detailAccount.role] || detailAccount.role}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Trạng thái:</span>
                            <span className={`status-badge status-${detailAccount.status}`}>
                              {STATUS_LABELS[detailAccount.status] || detailAccount.status}
                            </span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Ngày tạo:</span>
                            <span className="detail-value">{formatDate(detailAccount.createdAt)}</span>
                          </div>
                        </div>
                        <div className="detail-section">
                          <h3>Thông tin cá nhân</h3>
                          <div className="detail-row">
                            <span className="detail-label">Họ và tên:</span>
                            <span className="detail-value">{detailAccount.fullname || '-'}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">CCCD/CMND:</span>
                            <span className="detail-value">{detailAccount.cccd || '-'}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Ngày sinh:</span>
                            <span className="detail-value">
                              {detailAccount.dob ? formatDate(detailAccount.dob) : '-'}
                            </span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Giới tính:</span>
                            <span className="detail-value">
                              {detailAccount.gender === 'Male' ? 'Nam' : detailAccount.gender === 'Female' ? 'Nữ' : detailAccount.gender === 'Other' ? 'Khác' : '-'}
                            </span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Địa chỉ:</span>
                            <span className="detail-value">{detailAccount.address || '-'}</span>
                          </div>
                        </div>
                        {detailAccount.status === 'active' && (
                          <div className="detail-actions">
                            <button
                              type="button"
                              className="btn-disable"
                              onClick={() => handleDisableAccount(detailAccount._id)}
                              disabled={disablingId === detailAccount._id}
                            >
                              {disablingId === detailAccount._id ? 'Đang xử lý...' : 'Đóng tài khoản'}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Modal Tạo tài khoản */}
        {showModal && (
          <div className="create-account-modal-overlay" onClick={handleCloseModal}>
            <div className="create-account-modal" onClick={(e) => e.stopPropagation()}>
              <div className="create-account-modal-header">
                <h2>Tạo tài khoản mới</h2>
                <button type="button" className="modal-close-btn" onClick={handleCloseModal} aria-label="Đóng">
                  ×
                </button>
              </div>
              <div className="create-account-modal-body">
                {formError && (
                  <div className="form-error">
                    <p>{formError}</p>
                  </div>
                )}
                {formSuccess && (
                  <div className="form-success">
                    <p>{formSuccess}</p>
                  </div>
                )}
                <form onSubmit={handleFormSubmit} className="create-account-form">
                  <div className="form-group">
                    <label htmlFor="modal-username">Tên đăng nhập *</label>
                    <input
                      type="text"
                      id="modal-username"
                      name="username"
                      value={formData.username}
                      onChange={handleFormChange}

                      required
                      minLength={3}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="modal-phoneNumber">Số điện thoại *</label>
                    <input
                      type="tel"
                      id="modal-phoneNumber"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleFormChange}

                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="modal-email">Email *</label>
                    <input
                      type="email"
                      id="modal-email"
                      name="email"
                      value={formData.email}
                      onChange={handleFormChange}
                      placeholder="email@example.com"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="modal-password">Mật khẩu *</label>
                    <input
                      type="password"
                      id="modal-password"
                      name="password"
                      value={formData.password}
                      onChange={handleFormChange}
                      placeholder="Ít nhất 6 ký tự"
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="modal-role">Vai trò </label>
                    {singleRoleOption ? (
                      // Trường hợp chỉ có 1 vai trò (ví dụ: Admin chỉ tạo được Chủ nhà)
                      <div className="readonly-role">
                        {singleRoleOption.label}
                      </div>
                    ) : (
                      <select
                        id="modal-role"
                        name="role"
                        value={formData.role}
                        onChange={handleFormChange}
                        required
                      >
                        <option value="">Chọn vai trò</option>
                        {roleOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="form-actions">
                    <button type="button" onClick={handleCloseModal} className="btn-secondary" disabled={formSaving}>
                      Đóng
                    </button>
                    <button type="submit" className="btn-primary" disabled={formSaving}>
                      {formSaving ? 'Đang tạo...' : 'Tạo tài khoản'}
                    </button>
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

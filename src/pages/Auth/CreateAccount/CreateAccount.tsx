import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../../services/authService';
import { useAuth } from '../../../context/AuthContext';
import './CreateAccount.css';

// Admin -> Owner | Owner -> Manager, Accountant
const ROLE_OPTIONS: Record<string, { value: string; label: string }[]> = {
  admin: [{ value: 'owner', label: 'Chủ nhà (Owner)' }],
  owner: [
    { value: 'manager', label: 'Quản lý (Manager)' },
    { value: 'accountant', label: 'Kế toán (Accountant)' },
  ],
};

interface FormData {
  username: string;
  phoneNumber: string;
  email: string;
  password: string;
  role: string;
}

export default function CreateAccount() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const currentRole = (user?.role || '').toLowerCase();
  const roleOptions = ROLE_OPTIONS[currentRole] || [];

  const [formData, setFormData] = useState<FormData>({
    username: '',
    phoneNumber: '',
    email: '',
    password: '',
    role: '',
  });

  useEffect(() => {
    if (roleOptions.length > 0) {
      setFormData((prev) => {
        const validRole = roleOptions.some((o) => o.value === prev.role);
        return validRole ? prev : { ...prev, role: roleOptions[0].value };
      });
    }
  }, [currentRole]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      setSaving(true);
      await authService.createAccount({
        username: formData.username.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: formData.role,
      });
      setSuccess('Tạo tài khoản thành công!');
      setFormData({
        username: '',
        phoneNumber: '',
        email: '',
        password: '',
        role: roleOptions[0]?.value || '',
      });
    } catch (err: unknown) {
      console.error('Create account error:', err);
      const errObj = err as { response?: { data?: { message?: string } } };
      setError(errObj?.response?.data?.message || 'Không thể tạo tài khoản');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  if (!['admin', 'owner'].includes(currentRole)) {
    return (
      <div className="create-account-page">
        <div className="create-account-card">
          <h1>Không có quyền truy cập</h1>
          <p>Bạn không có quyền tạo tài khoản.</p>
          <button onClick={() => navigate(-1)} className="btn-primary">
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="create-account-page">
      <div className="create-account-card">
        <div className="create-account-header">
          <div>
            <h1>Tạo tài khoản mới</h1>
            <p className="create-account-subtitle">
              {currentRole === 'admin' && 'Tạo tài khoản Chủ nhà (Owner)'}
              {currentRole === 'owner' && 'Tạo tài khoản Quản lý hoặc Kế toán'}
            </p>
          </div>
          <Link to="/created-accounts" className="btn-secondary">
            Xem danh sách đã tạo
          </Link>
        </div>

        {error && (
          <div className="form-error">
            <p>{error}</p>
          </div>
        )}
        {success && (
          <div className="form-success">
            <p>{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="create-account-form">
          <div className="form-group">
            <label htmlFor="username">Tên đăng nhập *</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              
              required
              minLength={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="phoneNumber">Số điện thoại *</label>
            <input
              type="tel"
              id="phoneNumber"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              placeholder="0901234567"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="email@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mật khẩu *</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Ít nhất 6 ký tự"
              required
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label htmlFor="role">Vai trò *</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
            >
              <option value="">Chọn vai trò</option>
              {roleOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={handleCancel}
              className="btn-secondary"
              disabled={saving}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
            >
              {saving ? 'Đang tạo...' : 'Tạo tài khoản'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

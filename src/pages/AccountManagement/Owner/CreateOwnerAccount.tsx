import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { accountService } from '../../../services/accountService';
import '../account-management.css';

interface FormData {
  username: string;
  phoneNumber: string;
  email: string;
  password: string;
}

export default function CreateOwnerAccount() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    username: '',
    phoneNumber: '',
    email: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      setSaving(true);
      await accountService.createOwner({
        username: formData.username.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });
      setSuccess('Tạo tài khoản Chủ nhà thành công!');
      setFormData({ username: '', phoneNumber: '', email: '', password: '' });
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string } } };
      setError(errObj?.response?.data?.message || 'Không thể tạo tài khoản');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="create-account-page">
      <div className="create-account-card">
        <div className="create-account-header">
          <div>
            <h1>Tạo tài khoản Chủ nhà</h1>
            <p className="create-account-subtitle">Thêm Chủ nhà mới vào hệ thống</p>
          </div>
          <Link to="/admin/accounts" className="btn-secondary">← Danh sách Chủ nhà</Link>
        </div>
        {error && <div className="form-error"><p>{error}</p></div>}
        {success && <div className="form-success"><p>{success}</p></div>}
        <form onSubmit={handleSubmit} className="create-account-form">
          <div className="form-group">
            <label htmlFor="username">Tên đăng nhập *</label>
            <input type="text" id="username" name="username" value={formData.username} onChange={handleChange} required minLength={3} />
          </div>
          <div className="form-group">
            <label htmlFor="phoneNumber">Số điện thoại *</label>
            <input type="tel" id="phoneNumber" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} placeholder="0901234567" required />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email *</label>
            <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} placeholder="email@example.com" required />
          </div>
          <div className="form-group">
            <label htmlFor="password">Mật khẩu *</label>
            <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} placeholder="Ít nhất 6 ký tự" required minLength={6} />
          </div>
          <div className="form-actions">
            <button type="button" onClick={() => navigate(-1)} className="btn-secondary" disabled={saving}>Hủy</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Đang tạo...' : 'Tạo tài khoản'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

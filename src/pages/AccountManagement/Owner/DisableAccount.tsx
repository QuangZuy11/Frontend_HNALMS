import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { accountService } from '../../../services/accountService';
import '../account-management.css';

/**
 * Trang xác nhận đóng tài khoản Chủ nhà (Admin).
 * Route: /admin/accounts/:id/disable
 */
export default function DisableAccount() {
  const { id } = useParams<{ id: string }>();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!id) return;
    try {
      setSubmitting(true);
      setError(null);
      await accountService.disable('owners', id);
      setDone(true);
    } catch (err) {
      const errObj = err as { response?: { data?: { message?: string } } };
      setError(errObj?.response?.data?.message || 'Không thể đóng tài khoản');
    } finally {
      setSubmitting(false);
    }
  };

  if (!id) {
    return (
      <div className="created-accounts-page">
        <div className="created-accounts-card">
          <p className="form-error">Thiếu ID tài khoản.</p>
          <Link to="/admin/accounts" className="btn-primary">Quay lại danh sách</Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="created-accounts-page">
        <div className="created-accounts-card">
          <div className="form-success">
            <p>Đã đóng tài khoản thành công.</p>
          </div>
          <Link to="/admin/accounts" className="btn-primary">Quay lại danh sách</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="created-accounts-page">
      <div className="created-accounts-card">
        <h1>Xác nhận đóng tài khoản</h1>
        <p className="created-accounts-subtitle">
          Bạn có chắc muốn đóng tài khoản Chủ nhà này? Tài khoản sẽ không thể đăng nhập.
        </p>
        {error && <div className="form-error"><p>{error}</p></div>}
        <div className="form-actions" style={{ marginTop: '1rem' }}>
          <Link to="/admin/accounts" className="btn-secondary">Hủy</Link>
          <button type="button" className="btn-disable" onClick={handleConfirm} disabled={submitting}>
            {submitting ? 'Đang xử lý...' : 'Xác nhận đóng'}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { accountService } from '../../../services/accountService';
import { STATUS_LABELS, formatAccountDate, type AccountDetail } from '../constants';
import '../account-management.css';

export default function OwnerAccountDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [account, setAccount] = useState<AccountDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disablingId, setDisablingId] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await accountService.detail('owners', id);
        if (response.success && response.data) {
          setAccount(response.data);
        } else {
          setError('Không tìm thấy tài khoản');
        }
      } catch (err) {
        const errObj = err as { response?: { data?: { message?: string } } };
        setError(errObj?.response?.data?.message || 'Không thể tải chi tiết');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleDisable = async () => {
    if (!id || !window.confirm('Bạn có chắc muốn đóng tài khoản Chủ nhà này?')) return;
    try {
      setDisablingId(true);
      const response = await accountService.disable('owners', id);
      if (response.data) setAccount((prev) => (prev ? { ...prev, status: response.data.status } : prev));
    } catch (err) {
      const errObj = err as { response?: { data?: { message?: string } } };
      alert(errObj?.response?.data?.message || 'Không thể đóng tài khoản');
    } finally {
      setDisablingId(false);
    }
  };

  const handleEnable = async () => {
    if (!id || !window.confirm('Bạn có chắc muốn mở lại tài khoản này?')) return;
    try {
      setDisablingId(true);
      const response = await accountService.enable('owners', id);
      if (response.data) setAccount((prev) => (prev ? { ...prev, status: response.data.status } : prev));
    } catch (err) {
      const errObj = err as { response?: { data?: { message?: string } } };
      alert(errObj?.response?.data?.message || 'Không thể mở lại tài khoản');
    } finally {
      setDisablingId(false);
    }
  };

  if (loading) {
    return (
      <div className="created-accounts-page">
        <div className="created-accounts-card">
          <div className="detail-loading"><div className="spinner" /><p>Đang tải...</p></div>
        </div>
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="created-accounts-page">
        <div className="created-accounts-card">
          <p className="form-error">{error || 'Không tìm thấy'}</p>
          <Link to="/admin/accounts" className="btn-primary">Quay lại danh sách</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="created-accounts-page">
      <div className="created-accounts-card">
        <div className="created-accounts-header">
          <div>
            <h1>Chi tiết Chủ nhà</h1>
            <p className="created-accounts-subtitle">{account.username}</p>
          </div>
          <Link to="/admin/accounts" className="btn-secondary">← Danh sách</Link>
        </div>
        <div className="detail-content">
          <div className="detail-section">
            <h3>Thông tin đăng nhập</h3>
            <div className="detail-row"><span className="detail-label">Tên đăng nhập:</span><span className="detail-value">{account.username}</span></div>
            <div className="detail-row"><span className="detail-label">Email:</span><span className="detail-value">{account.email}</span></div>
            <div className="detail-row"><span className="detail-label">Số điện thoại:</span><span className="detail-value">{account.phoneNumber || '-'}</span></div>
            <div className="detail-row"><span className="detail-label">Trạng thái:</span>
              <span className={`status-badge status-${account.status}`}>{STATUS_LABELS[account.status] || account.status}</span>
            </div>
            <div className="detail-row"><span className="detail-label">Ngày tạo:</span><span className="detail-value">{formatAccountDate(account.createdAt)}</span></div>
          </div>
          <div className="detail-section">
            <h3>Thông tin cá nhân</h3>
            <div className="detail-row"><span className="detail-label">Họ và tên:</span><span className="detail-value">{account.fullname || '-'}</span></div>
            <div className="detail-row"><span className="detail-label">CCCD:</span><span className="detail-value">{account.cccd || '-'}</span></div>
            <div className="detail-row"><span className="detail-label">Địa chỉ:</span><span className="detail-value">{account.address || '-'}</span></div>
          </div>
          <div className="detail-actions">
            {account.status === 'active' ? (
              <button type="button" className="btn-disable" onClick={handleDisable} disabled={disablingId}>Đóng tài khoản</button>
            ) : (
              <button type="button" className="btn-enable" onClick={handleEnable} disabled={disablingId}>Mở lại tài khoản</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

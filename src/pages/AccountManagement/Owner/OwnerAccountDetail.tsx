import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { accountService } from '../../../services/accountService';
import { STATUS_LABELS, formatAccountDate, type AccountDetail } from '../constants';
import {
  Person as PersonIcon,
  VpnKey as VpnKeyIcon,
  Badge as BadgeIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import '../account-management.css';

export default function OwnerAccountDetail() {
  const { id } = useParams<{ id: string }>();
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
      <div className="owner-account-detail-page">
        <div className="owner-account-detail-card">
          <div className="owner-account-detail-page-loading">
            <div className="owner-account-detail-page-loading-spinner" />
            <span className="owner-account-detail-page-loading-text">Đang tải thông tin...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="owner-account-detail-page">
        <div className="owner-account-detail-card">
          <div className="owner-account-detail-page-body">
            <p className="form-error">{error || 'Không tìm thấy tài khoản'}</p>
            <Link to="/owner/accounts" className="btn-primary">Quay lại danh sách</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="owner-account-detail-page">
      <div className="owner-account-detail-card">
        {/* Header */}
        <div className="owner-account-detail-page-header">
          <div className="owner-account-detail-page-header-left">
            <div className="owner-account-detail-page-header-icon">
              <PersonIcon sx={{ fontSize: 22 }} />
            </div>
            <div className="owner-account-detail-page-header-text">
              <h1>Chi tiết Chủ nhà</h1>
              <p>@{account.username}</p>
            </div>
          </div>
          <Link to="/owner/accounts" className="owner-account-detail-page-back-btn">
            <ArrowBackIcon sx={{ fontSize: 16 }} />
            Quay lại
          </Link>
        </div>

        {/* Body */}
        <div className="owner-account-detail-page-body">
          {/* Profile strip */}
          <div className="owner-account-detail-page-profile">
            <div className="owner-account-detail-page-avatar">
              {account.username?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="owner-account-detail-page-profile-info">
              <div className="owner-account-detail-page-profile-name">
                {account.fullname || '—'}
              </div>
              <div className="owner-account-detail-page-profile-meta">
                <span className="owner-account-detail-page-username-tag">
                  @{account.username}
                </span>
                <span className="owner-account-detail-page-role-badge">Chủ nhà</span>
                {account.status === 'active' ? (
                  <span className="owner-account-detail-page-status-active">
                    <span className="owner-account-detail-page-status-dot" />
                    Hoạt động
                  </span>
                ) : (
                  <span className="owner-account-detail-page-status-inactive">
                    <span className="owner-account-detail-page-status-dot" />
                    Không hoạt động
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Two-column panels */}
          <div className="owner-account-detail-page-panels">
            {/* Left: Account info */}
            <div className="owner-account-detail-page-panel">
              <div className="owner-account-detail-page-panel-title">
                <VpnKeyIcon className="owner-account-detail-page-panel-title-icon" sx={{ fontSize: 15 }} />
                Thông tin đăng nhập
              </div>
              <div className="owner-account-detail-page-rows">
                <div className="owner-account-detail-page-row">
                  <span className="owner-account-detail-page-label">Tên đăng nhập</span>
                  <span className="owner-account-detail-page-value">{account.username}</span>
                </div>
                <div className="owner-account-detail-page-row">
                  <span className="owner-account-detail-page-label">Email</span>
                  <span className="owner-account-detail-page-value">
                    {account.email || <span className="owner-account-detail-page-value-empty">—</span>}
                  </span>
                </div>
                <div className="owner-account-detail-page-row">
                  <span className="owner-account-detail-page-label">SĐT</span>
                  <span className="owner-account-detail-page-value">
                    {account.phoneNumber || <span className="owner-account-detail-page-value-empty">—</span>}
                  </span>
                </div>
                <div className="owner-account-detail-page-row">
                  <span className="owner-account-detail-page-label">Ngày tạo</span>
                  <span className="owner-account-detail-page-value">
                    {formatAccountDate(account.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Personal info */}
            <div className="owner-account-detail-page-panel">
              <div className="owner-account-detail-page-panel-title">
                <BadgeIcon className="owner-account-detail-page-panel-title-icon" sx={{ fontSize: 15 }} />
                Thông tin cá nhân
              </div>
              <div className="owner-account-detail-page-rows">
                <div className="owner-account-detail-page-row">
                  <span className="owner-account-detail-page-label">Họ và tên</span>
                  <span className="owner-account-detail-page-value">
                    {account.fullname || <span className="owner-account-detail-page-value-empty">—</span>}
                  </span>
                </div>
                <div className="owner-account-detail-page-row">
                  <span className="owner-account-detail-page-label">CCCD / CMND</span>
                  <span className="owner-account-detail-page-value">
                    {account.cccd || <span className="owner-account-detail-page-value-empty">—</span>}
                  </span>
                </div>
                <div className="owner-account-detail-page-row">
                  <span className="owner-account-detail-page-label">Địa chỉ</span>
                  <span className="owner-account-detail-page-value">
                    {account.address || <span className="owner-account-detail-page-value-empty">—</span>}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="owner-account-detail-page-actions">
            {account.status === 'active' ? (
              <button
                type="button"
                className="owner-account-detail-page-btn-disable"
                onClick={handleDisable}
                disabled={disablingId}
              >
                <LockIcon sx={{ fontSize: 16 }} />
                {disablingId ? 'Đang xử lý...' : 'Đóng tài khoản'}
              </button>
            ) : (
              <button
                type="button"
                className="owner-account-detail-page-btn-enable"
                onClick={handleEnable}
                disabled={disablingId}
              >
                <LockOpenIcon sx={{ fontSize: 16 }} />
                {disablingId ? 'Đang xử lý...' : 'Mở lại tài khoản'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

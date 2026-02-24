import { useCallback, useEffect, useState } from 'react';
import { accountService } from '../../../services/accountService';
import { STATUS_LABELS, formatAccountDate, type AccountItem, type AccountDetail } from '../constants';
import '../account-management.css';

export default function TenantAccountList() {
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disablingId, setDisablingId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailAccount, setDetailAccount] = useState<AccountDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await accountService.list('tenants');
      if (response.success && response.data) {
        setAccounts(response.data);
      } else {
        setAccounts([]);
      }
    } catch (err) {
      console.error('Error fetching tenants:', err);
      const errObj = err as { response?: { data?: { message?: string } } };
      setError(errObj?.response?.data?.message || 'Không thể tải danh sách');
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleViewDetail = async (accountId: string) => {
    try {
      setDetailLoading(true);
      setDetailAccount(null);
      setShowDetailModal(true);
      const response = await accountService.detail('tenants', accountId);
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
    if (!window.confirm('Bạn có chắc muốn đóng tài khoản cư dân này?')) return;
    try {
      setDisablingId(accountId);
      const response = await accountService.disable('tenants', accountId);
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
      const response = await accountService.enable('tenants', accountId);
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

  return (
    <div className="created-accounts-page">
      <div className="created-accounts-card">
        <div className="created-accounts-header">
          <div>
            <h1>Danh sách tài khoản cư dân</h1>
            <p className="created-accounts-subtitle">Danh sách tài khoản cư dân (tenant) trong tòa nhà</p>
          </div>
        </div>

        {loading ? (
          <div className="created-accounts-loading"><div className="spinner" /><p>Đang tải...</p></div>
        ) : error ? (
          <div className="form-error"><p>{error}</p><button type="button" onClick={fetchAccounts} className="btn-retry">Thử lại</button></div>
        ) : accounts.length === 0 ? (
          <div className="created-accounts-empty">
            <p>Chưa có tài khoản cư dân nào.</p>
          </div>
        ) : (
          <div className="created-accounts-table-wrap">
            <table className="created-accounts-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Họ và tên</th>
                  <th>Email</th>
                  <th>Số điện thoại</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((acc, index) => (
                  <tr key={acc._id}>
                    <td>{index + 1}</td>
                    <td>{acc.fullname ?? '-'}</td>
                    <td>{acc.email}</td>
                    <td>{acc.phoneNumber || '-'}</td>
                    <td><span className={`status-badge status-${acc.status}`}>{STATUS_LABELS[acc.status] || acc.status}</span></td>
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
          </div>
        )}

        {showDetailModal && (
          <div className="create-account-modal-overlay" onClick={() => setShowDetailModal(false)}>
            <div className="account-detail-modal" onClick={(e) => e.stopPropagation()}>
              <div className="create-account-modal-header">
                <h2>Chi tiết cư dân</h2>
                <button type="button" className="modal-close-btn" onClick={() => setShowDetailModal(false)} aria-label="Đóng">×</button>
              </div>
              <div className="account-detail-modal-body">
                {detailLoading ? (
                  <div className="detail-loading"><div className="spinner" /><p>Đang tải...</p></div>
                ) : detailAccount ? (
                  <div className="detail-content detail-content-manager">
                    <div className="detail-section-divider">Thông tin tài khoản</div>
                    <div className="detail-section-block">
                      <div className="detail-row">
                        <span className="detail-label">Username:</span>
                        <span className="detail-value detail-value-black">{detailAccount.username}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Trạng thái:</span>
                        <span className={`status-badge status-${detailAccount.status}`}>{STATUS_LABELS[detailAccount.status] || detailAccount.status}</span>
                      </div>
                    </div>
                    <div className="detail-section-divider">Thông tin liên hệ</div>
                    <div className="detail-section-block">
                      <div className="detail-row"><span className="detail-label">Email:</span><span className="detail-value detail-value-black">{detailAccount.email}</span></div>
                      <div className="detail-row"><span className="detail-label">Số điện thoại:</span><span className="detail-value detail-value-black">{detailAccount.phoneNumber || '-'}</span></div>
                    </div>
                    <div className="detail-section-divider">Thông tin cá nhân</div>
                    <div className="detail-section-block">
                      <div className="detail-row"><span className="detail-label">Họ và tên:</span><span className="detail-value detail-value-black">{detailAccount.fullname || '-'}</span></div>
                      <div className="detail-row"><span className="detail-label">Giới tính:</span><span className="detail-value detail-value-black">
                        {detailAccount.gender === 'Male' ? 'Nam' : detailAccount.gender === 'Female' ? 'Nữ' : detailAccount.gender === 'Other' ? 'Khác' : '-'}
                      </span></div>
                      <div className="detail-row"><span className="detail-label">Ngày sinh:</span><span className="detail-value detail-value-black">{detailAccount.dob ? formatAccountDate(detailAccount.dob) : '-'}</span></div>
                      <div className="detail-row"><span className="detail-label">Địa chỉ:</span><span className="detail-value detail-value-black">{detailAccount.address || '-'}</span></div>
                    </div>
                    <div className="detail-section-divider">Thông tin pháp lý</div>
                    <div className="detail-section-block">
                      <div className="detail-row"><span className="detail-label">CCCD:</span><span className="detail-value detail-value-black">{detailAccount.cccd || '-'}</span></div>
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
      </div>
    </div>
  );
}

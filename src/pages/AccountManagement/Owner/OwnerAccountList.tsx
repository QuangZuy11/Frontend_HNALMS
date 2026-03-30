import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Visibility as VisibilityIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
} from '@mui/icons-material';
import { accountService } from '../../../services/accountService';
import {
  STATUS_LABELS,
  formatAccountDate,
  type AccountItem,
  type AccountDetail,
} from '../constants';
import '../account-management.css';

interface CreateFormData {
  username: string;
  phoneNumber: string;
  email: string;
  password: string;
}

const getStatusColor = (status: string): 'success' | 'warning' | 'default' => {
  switch (status) {
    case 'active':
      return 'success';
    case 'suspended':
      return 'warning';
    default:
      return 'default';
  }
};

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

  const filteredAccounts = useMemo(
    () =>
      searchTerm.trim() === ''
        ? accounts
        : accounts.filter((acc) => {
            const term = searchTerm.trim().toLowerCase();
            const username = (acc.username ?? '').toLowerCase();
            return username.includes(term);
          }),
    [accounts, searchTerm],
  );

  const totalPages = Math.max(1, Math.ceil((total || 0) / limit));

  const getVisiblePages = () => {
    const pages: number[] = [];
    let start = Math.max(1, page - 2);
    let end = Math.min(totalPages, page + 2);

    if (page <= 2) end = Math.min(totalPages, 5);
    if (page >= totalPages - 1) start = Math.max(1, totalPages - 4);

    for (let i = start; i <= end; i += 1) pages.push(i);
    return pages;
  };

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
        setAccounts((prev) =>
          prev.map((acc) =>
            acc._id === updated._id ? { ...acc, status: updated.status } : acc,
          ),
        );
        if (detailAccount?._id === accountId) {
          setDetailAccount((prev) =>
            prev ? { ...prev, status: updated?.status || prev.status } : prev,
          );
        }
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
        setAccounts((prev) =>
          prev.map((acc) =>
            acc._id === updated._id ? { ...acc, status: updated.status } : acc,
          ),
        );
        if (detailAccount?._id === accountId) {
          setDetailAccount((prev) =>
            prev ? { ...prev, status: updated?.status || prev.status } : prev,
          );
        }
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
    <>
      <Box
        sx={{
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 'calc(100vh - 64px)',
          background: 'linear-gradient(180deg, #f8fbff 0%, #f3f7fc 100%)',
          fontFamily: 'system-ui, Avenir, Helvetica, Arial, sans-serif',
          '& .MuiTypography-root, & .MuiTableCell-root, & .MuiInputBase-root, & .MuiButton-root, & .MuiChip-root, & .MuiMenuItem-root': {
            fontFamily: 'system-ui, Avenir, Helvetica, Arial, sans-serif',
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 4,
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              color: '#1a237e',
              letterSpacing: '0.2px',
              textShadow: '0 1px 0 rgba(255,255,255,0.7)',
            }}
          >
            Danh sách Chủ nhà
          </Typography>

          <Button variant="contained" onClick={openCreateModal} sx={{ bgcolor: '#1a237e' }}>
            + Tạo Tài Khoản
          </Button>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1.5,
            mb: 2.5,
            justifyContent: 'flex-end',
            alignItems: 'center',
            p: 1.75,
            borderRadius: 2.5,
            background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
            border: '1px solid #dbe4ee',
            boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)',
          }}
        >
          <TextField
            size="small"
            placeholder="Tìm theo tên đăng nhập..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{
              width: 280,
              '& .MuiInputBase-input': { py: 1.05, fontSize: 14 },
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                backgroundColor: '#ffffff',
              },
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#94a3b8', fontSize: 18 }} />
                  </InputAdornment>
                ),
              },
            }}
          />

          {searchTerm && (
            <Button
              size="small"
              onClick={() => setSearchTerm('')}
              sx={{
                minWidth: 'auto',
                p: 0.75,
                color: '#64748b',
                borderRadius: 2,
                bgcolor: '#ffffff',
                border: '1px solid #dbe4ee',
                '&:hover': { bgcolor: '#f8fafc', borderColor: '#cbd5e1' },
              }}
            >
              <ClearIcon sx={{ fontSize: 18 }} />
            </Button>
          )}
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box sx={{ mt: 4, textAlign: 'center', color: 'error.main' }}>
            <Typography variant="h6">Lỗi tải danh sách Chủ nhà</Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {error}
            </Typography>
            <Button variant="outlined" onClick={fetchAccounts}>
              Thử lại
            </Button>
          </Box>
        ) : filteredAccounts.length === 0 ? (
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              borderRadius: 3,
              overflow: 'hidden',
              flex: 1,
              border: '1px solid #dbe4ee',
              boxShadow: '0 10px 24px rgba(15, 23, 42, 0.08)',
              backgroundColor: '#ffffff',
            }}
          >
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell align="center" sx={{ py: 3 }}>
                    {searchTerm
                      ? 'Không tìm thấy tài khoản phù hợp với từ khóa tìm kiếm.'
                      : 'Chưa có tài khoản Chủ nhà nào.'}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <>
            <TableContainer
              component={Paper}
              elevation={0}
              sx={{
                borderRadius: 3,
                overflow: 'hidden',
                flex: 1,
                border: '1px solid #dbe4ee',
                boxShadow: '0 10px 24px rgba(15, 23, 42, 0.08)',
                backgroundColor: '#ffffff',
              }}
            >
              <Table sx={{ minWidth: 650 }}>
                <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, color: '#334155', py: 1.6 }}>STT</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#334155', py: 1.6 }}>
                      Tên đăng nhập
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#334155', py: 1.6 }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#334155', py: 1.6 }}>
                      Số điện thoại
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#334155', py: 1.6 }}>
                      Trạng thái
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#334155', py: 1.6 }}>
                      Ngày tạo
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#334155', py: 1.6 }}>
                      Thao tác
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAccounts.map((acc, index) => (
                    <TableRow
                      key={acc._id}
                      sx={{
                        '& td': { py: 1.35 },
                        transition: 'background-color 0.18s ease',
                        '&:nth-of-type(even)': { bgcolor: '#fcfdff' },
                        '&:hover': { bgcolor: '#eef6ff' },
                      }}
                    >
                      <TableCell>{(page - 1) * limit + index + 1}</TableCell>
                      <TableCell>{acc.username}</TableCell>
                      <TableCell>{acc.email}</TableCell>
                      <TableCell>{acc.phoneNumber || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          label={STATUS_LABELS[acc.status] || acc.status}
                          color={getStatusColor(acc.status)}
                          size="small"
                          sx={{ fontWeight: 'bold' }}
                        />
                      </TableCell>
                      <TableCell>{formatAccountDate(acc.createdAt)}</TableCell>
                      <TableCell>
                        <IconButton
                          color="primary"
                          size="small"
                          onClick={() => handleViewDetail(acc._id)}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 1,
                py: 2,
                mt: 'auto',
              }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
                Tổng: {total} bản ghi | Trang {page}/{totalPages}
              </Typography>

              <Button
                size="small"
                variant="outlined"
                disabled={page === 1}
                onClick={() => setPage(1)}
                sx={{ minWidth: 36, p: 0.5 }}
              >
                <FirstPageIcon fontSize="small" />
              </Button>
              <Button
                size="small"
                variant="outlined"
                disabled={page === 1}
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                sx={{ minWidth: 36, p: 0.5 }}
              >
                <PrevIcon fontSize="small" />
              </Button>

              {getVisiblePages().map((pageNumber) => (
                <Button
                  key={pageNumber}
                  size="small"
                  variant={pageNumber === page ? 'contained' : 'outlined'}
                  onClick={() => setPage(pageNumber)}
                  sx={{
                    minWidth: 36,
                    p: 0.5,
                    ...(pageNumber === page && {
                      bgcolor: '#1a237e',
                      '&:hover': { bgcolor: '#303f9f' },
                    }),
                  }}
                >
                  {pageNumber}
                </Button>
              ))}

              <Button
                size="small"
                variant="outlined"
                disabled={page === totalPages}
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                sx={{ minWidth: 36, p: 0.5 }}
              >
                <NextIcon fontSize="small" />
              </Button>
              <Button
                size="small"
                variant="outlined"
                disabled={page === totalPages}
                onClick={() => setPage(totalPages)}
                sx={{ minWidth: 36, p: 0.5 }}
              >
                <LastPageIcon fontSize="small" />
              </Button>
            </Box>
          </>
        )}
      </Box>

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
                <div className="detail-content detail-content-manager">
                  <div className="detail-section-divider">Thông tin tài khoản</div>
                  <div className="detail-section-block">
                    <div className="detail-row detail-row-tight">
                      <span className="detail-label">Tên đăng nhập:</span>
                      <span className="detail-value detail-value-black">
                        {detailAccount.username}
                      </span>
                    </div>
                    <div className="detail-row detail-row-tight">
                      <span className="detail-label">Email:</span>
                      <span className="detail-value detail-value-black">
                        {detailAccount.email}
                      </span>
                    </div>
                    <div className="detail-row detail-row-tight">
                      <span className="detail-label">Số điện thoại:</span>
                      <span className="detail-value detail-value-black">
                        {detailAccount.phoneNumber || '-'}
                      </span>
                    </div>
                    <div className="detail-row detail-row-tight">
                      <span className="detail-label">Trạng thái:</span>
                      <span
                        className={`status-badge status-${detailAccount.status}`}
                      >
                        {STATUS_LABELS[detailAccount.status] || detailAccount.status}
                      </span>
                    </div>
                    <div className="detail-row detail-row-tight">
                      <span className="detail-label">Ngày tạo:</span>
                      <span className="detail-value detail-value-black">
                        {formatAccountDate(detailAccount.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="detail-section-divider">Thông tin cá nhân</div>
                  <div className="detail-section-block">
                    <div className="detail-row detail-row-tight">
                      <span className="detail-label">Họ và tên:</span>
                      <span className="detail-value detail-value-black">
                        {detailAccount.fullname || '-'}
                      </span>
                    </div>
                    <div className="detail-row detail-row-tight">
                      <span className="detail-label">CCCD:</span>
                      <span className="detail-value detail-value-black">
                        {detailAccount.cccd || '-'}
                      </span>
                    </div>
                    <div className="detail-row detail-row-tight">
                      <span className="detail-label">Địa chỉ:</span>
                      <span className="detail-value detail-value-black">
                        {detailAccount.address || '-'}
                      </span>
                    </div>
                  </div>

                  <div className="detail-actions">
                    {detailAccount.status === 'active' ? (
                      <button
                        type="button"
                        className="btn-disable"
                        onClick={() => handleDisable(detailAccount._id)}
                        disabled={disablingId === detailAccount._id}
                      >
                        {disablingId === detailAccount._id
                          ? 'Đang xử lý...'
                          : 'Đóng tài khoản'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-enable"
                        onClick={() => handleEnable(detailAccount._id)}
                        disabled={disablingId === detailAccount._id}
                      >
                        {disablingId === detailAccount._id
                          ? 'Đang xử lý...'
                          : 'Mở lại tài khoản'}
                      </button>
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
                  <input type="tel" id="create-phoneNumber" name="phoneNumber" value={createFormData.phoneNumber} onChange={handleCreateChange} placeholder="Số điện thoại bắt đầu bằng số 0" required />
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
    </>
  );
}

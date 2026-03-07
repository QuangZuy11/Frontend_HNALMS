import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
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
  ROLE_LABELS,
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
  role: 'manager' | 'accountant';
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

  const filteredAccounts = useMemo(() => {
    const filteredByRole = filterRole ? accounts.filter((acc) => acc.role === filterRole) : accounts;

    if (searchTerm.trim() === '') return filteredByRole;

    const term = searchTerm.trim().toLowerCase();
    const termNorm = term.replace(/\s/g, '');

    return filteredByRole.filter((acc) => {
      const fullname = (acc.fullname ?? '').toLowerCase();
      const username = (acc.username ?? '').toLowerCase();
      const email = (acc.email ?? '').toLowerCase();
      const phone = (acc.phoneNumber ?? '').replace(/\s/g, '');

      return fullname.includes(term)
        || username.includes(term)
        || email.includes(term)
        || phone.includes(termNorm);
    });
  }, [accounts, filterRole, searchTerm]);

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

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
  };

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

        if (detailAccount?._id === accountId) {
          setDetailAccount((prev) => (prev ? { ...prev, status: updated?.status || prev.status } : prev));
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
      const response = await accountService.enable('managers', accountId);
      const updated = response.data;

      if (updated?._id) {
        setAccounts((prev) => prev.map((acc) => (acc._id === updated._id ? { ...acc, status: updated.status } : acc)));

        if (detailAccount?._id === accountId) {
          setDetailAccount((prev) => (prev ? { ...prev, status: updated?.status || prev.status } : prev));
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

  const handleCreateChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCreateFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateSubmit = async (e: FormEvent) => {
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
      setTimeout(() => closeCreateModal(), 1200);
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string } } };
      setCreateError(errObj?.response?.data?.message || 'Không thể tạo tài khoản');
    } finally {
      setCreateSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ mt: 4, textAlign: 'center', color: 'error.main' }}>
        <Typography variant="h6">Lỗi tải danh sách quản lý và kế toán</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          {error}
        </Typography>
        <Button variant="outlined" onClick={fetchAccounts}>
          Thử lại
        </Button>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: 'clamp(16px, 2vw, 32px)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 'calc(100vh - 64px)',
        fontFamily: 'system-ui, Avenir, Helvetica, Arial, sans-serif',
        '& .MuiTypography-root, & .MuiTableCell-root, & .MuiInputBase-root, & .MuiButton-root, & .MuiChip-root, & .MuiMenuItem-root': {
          fontFamily: 'system-ui, Avenir, Helvetica, Arial, sans-serif',
        },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1a237e' }}>
          Danh sách Quản lý & Kế toán
        </Typography>
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
          rowGap: 1,
        }}
      >
        <TextField
          size="small"
          placeholder="Tìm theo tên đăng nhập, email hoặc SĐT"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{
            width: 'clamp(220px, 28vw, 320px)',
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

        <FormControl size="small" sx={{ minWidth: 'clamp(140px, 14vw, 170px)' }}>
          <Select
            value={filterRole}
            displayEmpty
            renderValue={(selected) => {
              if (!selected) return 'Tất cả';
              return selected === 'manager' ? 'Quản lý' : 'Kế toán';
            }}
            onChange={(e) => setFilterRole(e.target.value)}
            sx={{
              fontSize: 14,
              '& .MuiSelect-select': { py: 1.05 },
              borderRadius: 2,
              backgroundColor: '#ffffff',
            }}
          >
            <MenuItem value="" sx={{ fontSize: 14 }}>
              Tất cả
            </MenuItem>
            <MenuItem value="manager" sx={{ fontSize: 14 }}>
              Quản lý
            </MenuItem>
            <MenuItem value="accountant" sx={{ fontSize: 14 }}>
              Kế toán
            </MenuItem>
          </Select>
        </FormControl>

        <Button
          type="button"
          variant="contained"
          onClick={openCreateModal}
          sx={{
            px: 2,
            height: 38,
            borderRadius: 2,
            backgroundColor: '#1a237e',
            '&:hover': { backgroundColor: '#303f9f' },
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          + Tạo tài khoản
        </Button>

        {(searchTerm || filterRole) && (
          <Button
            size="small"
            onClick={() => {
              setSearchTerm('');
              setFilterRole('');
            }}
            sx={{ minWidth: 'auto', p: 0.5, color: '#94a3b8' }}
          >
            <ClearIcon sx={{ fontSize: 18 }} />
          </Button>
        )}
      </Box>

      <TableContainer
        component={Paper}
        elevation={3}
        sx={{
          borderRadius: 2,
          overflow: 'hidden',
          flex: 1,
        }}
      >
        <Table
          sx={{
            width: '100%',
            tableLayout: 'fixed',
            '& .MuiTableCell-root': {
              px: 'clamp(6px, 0.8vw, 16px)',
              py: 'clamp(10px, 1vw, 14px)',
              fontSize: 'clamp(12px, 0.85vw, 14px)',
              verticalAlign: 'middle',
            },
          }}
        >
          <TableHead sx={{ bgcolor: '#f5f5f5' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', width: '6%' }}>STT</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: '16%' }}>Tên đăng nhập</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: '24%' }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: '13%' }}>Số điện thoại</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: '10%' }}>Vai trò</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: '12%' }}>Trạng thái</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: '12%' }}>Ngày tạo</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: '7%' }}>Thao tác</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredAccounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                  Không có dữ liệu tài khoản
                </TableCell>
              </TableRow>
            ) : (
              filteredAccounts.map((acc, index) => (
                <TableRow
                  key={acc._id}
                  sx={{
                    '&:last-child td, &:last-child th': { border: 0 },
                    '&:hover': { bgcolor: '#f9f9f9' },
                  }}
                >
                  <TableCell>{(page - 1) * limit + index + 1}</TableCell>
                  <TableCell sx={{ whiteSpace: 'normal', overflowWrap: 'anywhere', lineHeight: 1.3 }}>
                    {acc.username || '-'}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'normal', overflowWrap: 'anywhere', lineHeight: 1.3 }}>
                    {acc.email || '-'}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'normal', overflowWrap: 'anywhere', lineHeight: 1.3 }}>
                    {acc.phoneNumber || '-'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={ROLE_LABELS[acc.role] || acc.role}
                      size="small"
                      sx={{
                        fontWeight: 'bold',
                        backgroundColor: '#eef5ff',
                        color: '#2f66b1',
                        height: 'auto',
                        '& .MuiChip-label': {
                          display: 'block',
                          whiteSpace: 'normal',
                          overflow: 'visible',
                          textOverflow: 'clip',
                          lineHeight: 1.2,
                          py: 0.5,
                        },
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={STATUS_LABELS[acc.status] || acc.status}
                      color={getStatusColor(acc.status)}
                      size="small"
                      sx={{
                        fontWeight: 'bold',
                        height: 'auto',
                        '& .MuiChip-label': {
                          display: 'block',
                          whiteSpace: 'normal',
                          overflow: 'visible',
                          textOverflow: 'clip',
                          lineHeight: 1.2,
                          py: 0.5,
                        },
                      }}
                    />
                  </TableCell>
                  <TableCell>{formatAccountDate(acc.createdAt)}</TableCell>
                  <TableCell>
                    <IconButton color="primary" size="small" onClick={() => handleViewDetail(acc._id)}>
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
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
          flexWrap: 'wrap',
        }}
      >
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mr: 2, whiteSpace: 'nowrap' }}
        >
          Tổng: {total} bản ghi | Trang {page}/{totalPages}
        </Typography>

        <Button size="small" variant="outlined" disabled={page === 1 || loading} onClick={() => handlePageChange(1)} sx={{ minWidth: 36, p: 0.5 }}>
          <FirstPageIcon fontSize="small" />
        </Button>
        <Button size="small" variant="outlined" disabled={page === 1 || loading} onClick={() => handlePageChange(Math.max(page - 1, 1))} sx={{ minWidth: 36, p: 0.5 }}>
          <PrevIcon fontSize="small" />
        </Button>

        {getVisiblePages().map((pageNumber) => (
          <Button
            key={pageNumber}
            size="small"
            variant={pageNumber === page ? 'contained' : 'outlined'}
            onClick={() => handlePageChange(pageNumber)}
            disabled={loading}
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

        <Button size="small" variant="outlined" disabled={page >= totalPages || loading} onClick={() => handlePageChange(Math.min(page + 1, totalPages))} sx={{ minWidth: 36, p: 0.5 }}>
          <NextIcon fontSize="small" />
        </Button>
        <Button size="small" variant="outlined" disabled={page >= totalPages || loading} onClick={() => handlePageChange(totalPages)} sx={{ minWidth: 36, p: 0.5 }}>
          <LastPageIcon fontSize="small" />
        </Button>
      </Box>

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
                    <div className="detail-row"><span className="detail-label">Email:</span><span className="detail-value detail-value-email">{detailAccount.email}</span></div>
                    <div className="detail-row"><span className="detail-label">Số điện thoại:</span><span className={`detail-value ${!detailAccount.phoneNumber ? 'detail-value-empty' : ''}`}>{detailAccount.phoneNumber || 'Chưa cập nhật'}</span></div>
                    <div className="detail-row detail-row-inline-badge"><span className="detail-label">Vai trò:</span><span className="role-badge">{ROLE_LABELS[detailAccount.role] || detailAccount.role}</span></div>
                    <div className="detail-row detail-row-inline-badge"><span className="detail-label">Trạng thái:</span><span className={`status-badge status-${detailAccount.status}`}>{STATUS_LABELS[detailAccount.status] || detailAccount.status}</span></div>
                    <div className="detail-row"><span className="detail-label">Ngày tạo:</span><span className="detail-value">{formatAccountDate(detailAccount.createdAt)}</span></div>
                  </div>
                  <div className="detail-section">
                    <h3>Thông tin cá nhân</h3>
                    <div className="detail-row"><span className={`detail-label ${!detailAccount.fullname ? 'detail-label-empty' : ''}`}>Họ và tên:</span><span className={`detail-value ${!detailAccount.fullname ? 'detail-value-empty' : ''}`}>{detailAccount.fullname || 'Chưa cập nhật'}</span></div>
                    <div className="detail-row"><span className={`detail-label ${!detailAccount.cccd ? 'detail-label-empty' : ''}`}>CCCD:</span><span className={`detail-value ${!detailAccount.cccd ? 'detail-value-empty' : ''}`}>{detailAccount.cccd || 'Chưa cập nhật'}</span></div>
                    <div className="detail-row"><span className={`detail-label ${!detailAccount.address ? 'detail-label-empty' : ''}`}>Địa chỉ:</span><span className={`detail-value ${!detailAccount.address ? 'detail-value-empty' : ''}`}>{detailAccount.address || 'Chưa cập nhật'}</span></div>
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
    </Box>
  );
}

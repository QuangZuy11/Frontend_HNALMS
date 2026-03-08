import { useCallback, useEffect, useMemo, useState } from "react";
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
} from "@mui/material";
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Visibility as VisibilityIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
} from "@mui/icons-material";
import { accountService } from "../../../services/accountService";
import {
  STATUS_LABELS,
  formatAccountDate,
  type AccountItem,
  type AccountDetail,
} from "../constants";
import useAuth from "../../../hooks/useAuth";
import "../account-management.css";

const getStatusColor = (status: string): "success" | "warning" | "default" => {
  switch (status) {
    case "active":
      return "success";
    case "suspended":
      return "warning";
    default:
      return "default";
  }
};

export default function TenantAccountList() {
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchName, setSearchName] = useState("");
  const [searchContact, setSearchContact] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [disablingId, setDisablingId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailAccount, setDetailAccount] = useState<AccountDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [page, setPage] = useState(1);
  const ROWS_PER_PAGE = 8;

  const { user } = useAuth();
  const isOwner = user?.role === "owner";

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await accountService.list("tenants", {
        offset: 0,
        limit: 9999,
      });

      if (response.success && response.data) {
        setAccounts(response.data);
      } else {
        setAccounts([]);
      }
    } catch (err) {
      const errObj = err as { response?: { data?: { message?: string } } };
      setError(errObj?.response?.data?.message || "Không thể tải danh sách cư dân");
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      const name = (acc.fullname || "").toLowerCase();
      const email = (acc.email || "").toLowerCase();
      const phone = (acc.phoneNumber || "").toLowerCase();

      const matchName = name.includes(searchName.toLowerCase());
      const matchContact =
        searchContact.trim() === "" ||
        email.includes(searchContact.toLowerCase()) ||
        phone.includes(searchContact.toLowerCase());
      const matchStatus = filterStatus === "all" || acc.status === filterStatus;

      return matchName && matchContact && matchStatus;
    });
  }, [accounts, searchName, searchContact, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredAccounts.length / ROWS_PER_PAGE));
  const paginatedAccounts = filteredAccounts.slice(
    (page - 1) * ROWS_PER_PAGE,
    page * ROWS_PER_PAGE,
  );

  useEffect(() => {
    setPage(1);
  }, [searchName, searchContact, filterStatus]);

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

      const response = await accountService.detail("tenants", accountId);
      if (response.success && response.data) {
        setDetailAccount(response.data);
      }
    } catch (err) {
      const errObj = err as { response?: { data?: { message?: string } } };
      alert(errObj?.response?.data?.message || "Không thể tải chi tiết cư dân");
      setShowDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDisable = async (accountId: string) => {
    if (!window.confirm("Bạn có chắc muốn đóng tài khoản cư dân này?")) return;

    try {
      setDisablingId(accountId);
      const response = await accountService.disable("tenants", accountId);
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
      alert(errObj?.response?.data?.message || "Không thể đóng tài khoản");
    } finally {
      setDisablingId(null);
    }
  };

  const handleEnable = async (accountId: string) => {
    if (!window.confirm("Bạn có chắc muốn mở lại tài khoản này?")) return;

    try {
      setDisablingId(accountId);
      const response = await accountService.enable("tenants", accountId);
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
      alert(errObj?.response?.data?.message || "Không thể mở lại tài khoản");
    } finally {
      setDisablingId(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ mt: 4, textAlign: "center", color: "error.main" }}>
        <Typography variant="h6">Lỗi tải danh sách cư dân</Typography>
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
        p: 4,
        display: "flex",
        flexDirection: "column",
        minHeight: "calc(100vh - 64px)",
        fontFamily: "system-ui, Avenir, Helvetica, Arial, sans-serif",
        "& .MuiTypography-root, & .MuiTableCell-root, & .MuiInputBase-root, & .MuiButton-root, & .MuiChip-root, & .MuiMenuItem-root": {
          fontFamily: "system-ui, Avenir, Helvetica, Arial, sans-serif",
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: "bold", color: "#1a237e" }}>
          Danh sách cư dân
        </Typography>
      </Box>

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 1.5,
          mb: 2.5,
          justifyContent: "flex-end",
          alignItems: "center",
          p: 1.75,
          borderRadius: 2.5,
          background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
          border: "1px solid #dbe4ee",
          boxShadow: "0 4px 14px rgba(15, 23, 42, 0.04)",
        }}
      >
        <TextField
          size="small"
          placeholder="Tên..."
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          sx={{
            width: 220,
            "& .MuiInputBase-input": { py: 1.05, fontSize: 14 },
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              backgroundColor: "#ffffff",
            },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#94a3b8", fontSize: 18 }} />
                </InputAdornment>
              ),
            },
          }}
        />

        <TextField
          size="small"
          placeholder="SĐT/Email"
          value={searchContact}
          onChange={(e) => setSearchContact(e.target.value)}
          sx={{
            width: 240,
            "& .MuiInputBase-input": { py: 1.05, fontSize: 14 },
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              backgroundColor: "#ffffff",
            },
          }}
        />

        <FormControl size="small" sx={{ minWidth: 170 }}>
          <Select
            value={filterStatus}
            displayEmpty
            onChange={(e) => setFilterStatus(e.target.value)}
            sx={{
              fontSize: 14,
              "& .MuiSelect-select": { py: 1.05 },
              borderRadius: 2,
              backgroundColor: "#ffffff",
            }}
          >
            <MenuItem value="all" sx={{ fontSize: 14 }}>
              Trạng thái
            </MenuItem>
            <MenuItem value="active" sx={{ fontSize: 14 }}>
              Hoạt động
            </MenuItem>
            <MenuItem value="inactive" sx={{ fontSize: 14 }}>
              Không hoạt động
            </MenuItem>
            <MenuItem value="suspended" sx={{ fontSize: 14 }}>
              Tạm khóa
            </MenuItem>
          </Select>
        </FormControl>

        {(searchName || searchContact || filterStatus !== "all") && (
          <Button
            size="small"
            onClick={() => {
              setSearchName("");
              setSearchContact("");
              setFilterStatus("all");
            }}
            sx={{ minWidth: "auto", p: 0.5, color: "#94a3b8" }}
          >
            <ClearIcon sx={{ fontSize: 18 }} />
          </Button>
        )}
      </Box>

      <TableContainer
        component={Paper}
        elevation={3}
        sx={{ borderRadius: 2, overflow: "hidden", flex: 1 }}
      >
        <Table sx={{ minWidth: 650 }}>
          <TableHead sx={{ bgcolor: "#f5f5f5" }}>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold" }}>STT</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Họ và tên</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Phòng</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>SĐT / Email</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Trạng thái</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Ngày tạo</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Thao tác</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {paginatedAccounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                  Không có dữ liệu cư dân
                </TableCell>
              </TableRow>
            ) : (
              paginatedAccounts.map((acc, index) => (
                <TableRow
                  key={acc._id}
                  sx={{
                    "&:last-child td, &:last-child th": { border: 0 },
                    "&:hover": { bgcolor: "#f9f9f9" },
                  }}
                >
                  <TableCell>{(page - 1) * ROWS_PER_PAGE + index + 1}</TableCell>
                  <TableCell>{acc.fullname || "-"}</TableCell>
                  <TableCell>{acc.roomName || "-"}</TableCell>
                  <TableCell>
                    {acc.phoneNumber || "-"}
                    <br />
                    <Typography variant="caption" color="text.secondary">
                      {acc.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={STATUS_LABELS[acc.status] || acc.status}
                      color={getStatusColor(acc.status)}
                      size="small"
                      sx={{ fontWeight: "bold" }}
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
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 1,
          py: 2,
          mt: "auto",
        }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
          Tổng: {filteredAccounts.length} bản ghi | Trang {page}/{totalPages}
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
            variant={pageNumber === page ? "contained" : "outlined"}
            onClick={() => setPage(pageNumber)}
            sx={{
              minWidth: 36,
              p: 0.5,
              ...(pageNumber === page && {
                bgcolor: "#1a237e",
                "&:hover": { bgcolor: "#303f9f" },
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
                    <div className="detail-row detail-row-tight">
                      <span className="detail-label">Username:</span>
                      <span className="detail-value detail-value-black">{detailAccount.username}</span>
                    </div>
                    <div className="detail-row detail-row-tight">
                      <span className="detail-label">Trạng thái:</span>
                      <span className={`status-badge status-${detailAccount.status}`}>{STATUS_LABELS[detailAccount.status] || detailAccount.status}</span>
                    </div>
                  </div>
                  <div className="detail-section-divider">Thông tin liên hệ</div>
                  <div className="detail-section-block">
                    <div className="detail-row detail-row-tight"><span className="detail-label">Email:</span><span className="detail-value detail-value-black">{detailAccount.email}</span></div>
                    <div className="detail-row detail-row-tight"><span className="detail-label">Số điện thoại:</span><span className="detail-value detail-value-black">{detailAccount.phoneNumber || "-"}</span></div>
                  </div>
                  <div className="detail-section-divider">Thông tin cá nhân</div>
                  <div className="detail-section-block">
                    <div className="detail-row detail-row-tight"><span className="detail-label">Họ và tên:</span><span className="detail-value detail-value-black">{detailAccount.fullname || "-"}</span></div>
                    <div className="detail-row detail-row-tight"><span className="detail-label">Giới tính:</span><span className="detail-value detail-value-black">
                      {detailAccount.gender === "Male" ? "Nam" : detailAccount.gender === "Female" ? "Nữ" : detailAccount.gender === "Other" ? "Khác" : "-"}
                    </span></div>
                    <div className="detail-row detail-row-tight"><span className="detail-label">Ngày sinh:</span><span className="detail-value detail-value-black">{detailAccount.dob ? formatAccountDate(detailAccount.dob) : "-"}</span></div>
                    <div className="detail-row detail-row-tight"><span className="detail-label">Địa chỉ:</span><span className="detail-value detail-value-black">{detailAccount.address || "-"}</span></div>
                  </div>
                  <div className="detail-section-divider">Thông tin pháp lý</div>
                  <div className="detail-section-block">
                    <div className="detail-row detail-row-tight">
                      <span className="detail-label">CCCD:</span>
                      <span className="detail-value detail-value-black">
                        {detailAccount.cccd || "-"}
                      </span>
                    </div>
                  </div>
                  {!isOwner && (
                    <div className="detail-actions">
                      {detailAccount.status === "active" ? (
                        <button
                          type="button"
                          className="btn-disable"
                          onClick={() => handleDisable(detailAccount._id)}
                          disabled={disablingId === detailAccount._id}
                        >
                          {disablingId === detailAccount._id
                            ? "Đang xử lý..."
                            : "Đóng tài khoản"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-enable"
                          onClick={() => handleEnable(detailAccount._id)}
                          disabled={disablingId === detailAccount._id}
                        >
                          {disablingId === detailAccount._id
                            ? "Đang xử lý..."
                            : "Mở lại tài khoản"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </Box>
  );
}

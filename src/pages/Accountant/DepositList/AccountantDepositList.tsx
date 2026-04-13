import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Chip,
} from "@mui/material";
import api from "../../../services/api";
import Pagination from "../../../components/common/Pagination/Pagination";
import "./AccountantDepositList.css";

interface Room {
  _id: string;
  name: string;
  type: string;
  price: number;
  maxPersons: number;
}

interface ContractInfo {
  _id: string;
  contractCode: string;
  startDate: string;
  endDate: string;
  status: string;
  tenantId: string;
}

interface Deposit {
  _id: string;
  name: string;
  phone: string;
  email: string;
  room: Room;
  amount: number;
  status: "Pending" | "Held" | "Refunded" | "Forfeited" | "Expired";
  activationStatus: boolean | null;
  contractId: ContractInfo | string | null;
  createdDate: string;
  createdAt?: string;
  refundDate: string | null;
  forfeitedDate: string | null;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "Held":
      return "primary";
    case "Refunded":
      return "success";
    case "Forfeited":
      return "error";
    case "Expired":
      return "warning";
    case "Pending":
      return "info";
    default:
      return "default";
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "Held":
      return "Đang giữ";
    case "Refunded":
      return "Đã hoàn";
    case "Forfeited":
      return "Đã phạt";
    case "Expired":
      return "Đã hết hạn";
    case "Pending":
      return "Đang chờ";
    default:
      return status;
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

export default function AccountantDepositList() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterName, setFilterName] = useState("");
  const [filterContact, setFilterContact] = useState("");
  const [filterRoom, setFilterRoom] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const ROWS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  const fetchDeposits = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/deposits");
      if (response.data.success) {
        setDeposits(response.data.data);
      } else {
        setError("Không thể tải danh sách cọc");
      }
    } catch (err: unknown) {
      console.error("Error fetching deposits:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Đã xảy ra lỗi khi tải dữ liệu"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeposits();
  }, [fetchDeposits]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterName, filterContact, filterRoom, filterStatus]);

  const filteredDeposits = deposits.filter((deposit) => {
    const matchName = deposit.name
      .toLowerCase()
      .includes(filterName.toLowerCase());
    const matchContact =
      filterContact === "" ||
      deposit.phone.toLowerCase().includes(filterContact.toLowerCase()) ||
      deposit.email.toLowerCase().includes(filterContact.toLowerCase());
    const matchRoom =
      filterRoom === "" ||
      deposit.room?.name?.toLowerCase().includes(filterRoom.toLowerCase());
    const matchStatus =
      filterStatus === "all" || deposit.status === filterStatus;

    return matchName && matchContact && matchRoom && matchStatus;
  });

  const totalPages = Math.max(
    1,
    Math.ceil(filteredDeposits.length / ROWS_PER_PAGE)
  );
  const paginatedDeposits = filteredDeposits.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  if (loading) {
    return (
      <div className="adl-container">
        <div className="adl-loading">
          <CircularProgress />
          <span>Đang tải dữ liệu...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="adl-container">
        <div className="adl-error">
          <Typography variant="h6">Lỗi tải dữ liệu</Typography>
          <Typography variant="body1">{error}</Typography>
        </div>
      </div>
    );
  }

  const statusStats = {
    total: deposits.length,
    held: deposits.filter((d) => d.status === "Held").length,
    refunded: deposits.filter((d) => d.status === "Refunded").length,
    forfeited: deposits.filter((d) => d.status === "Forfeited").length,
    pending: deposits.filter((d) => d.status === "Pending").length,
  };

  return (
    <div className="adl-container">
      <div className="adl-header">
        <div className="adl-title-block">
          <h2>Danh Sách Tiền Cọc</h2>
          <p className="adl-subtitle">
            Theo dõi và quản lý danh sách tiền cọc của cư dân
          </p>
        </div>
        <div className="stats-summary">
          <div className="stat-item">
            <div className="stat-icon icon-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="6" width="20" height="12" rx="2"/>
                <path d="M12 12h.01"/>
              </svg>
            </div>
            <div className="stat-text">
              <span className="stat-value">{statusStats.total}</span>
              <span className="stat-label">Tổng cọc</span>
            </div>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <div className="stat-icon icon-accent">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div className="stat-text">
              <span className="stat-value">{statusStats.held}</span>
              <span className="stat-label">Đang giữ</span>
            </div>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <div className="stat-icon icon-success">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4"/>
                <circle cx="12" cy="12" r="10"/>
              </svg>
            </div>
            <div className="stat-text">
              <span className="stat-value">{statusStats.refunded}</span>
              <span className="stat-label">Đã hoàn</span>
            </div>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <div className="stat-icon" style={{ color: "#9333ea", background: "linear-gradient(135deg, #e9d5ff 0%, #d8b4fe 100%)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
              </svg>
            </div>
            <div className="stat-text">
              <span className="stat-value">{statusStats.pending}</span>
              <span className="stat-label">Đang chờ</span>
            </div>
          </div>
        </div>
      </div>

      <div className="adl-filters">
        <div className="adl-filter-item">
          <label>Tên:</label>
          <input
            type="text"
            placeholder="Nhập tên người cọc..."
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
          />
        </div>
        <div className="adl-filter-item">
          <label>SĐT/Email:</label>
          <input
            type="text"
            placeholder="Nhập SĐT hoặc Email..."
            value={filterContact}
            onChange={(e) => setFilterContact(e.target.value)}
          />
        </div>
        <div className="adl-filter-item">
          <label>Phòng:</label>
          <input
            type="text"
            placeholder="Nhập số phòng..."
            value={filterRoom}
            onChange={(e) => setFilterRoom(e.target.value)}
          />
        </div>
        <div className="adl-filter-item">
          <label>Trạng thái:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Tất cả</option>
            <option value="Held">Đang giữ</option>
            <option value="Refunded">Đã hoàn</option>
            <option value="Forfeited">Đã phạt</option>
            <option value="Expired">Đã hết hạn</option>
            <option value="Pending">Đang chờ</option>
          </select>
        </div>
      </div>

      <TableContainer
        component={Paper}
        elevation={2}
        sx={{ borderRadius: 2, overflow: "hidden" }}
      >
        <Table sx={{ minWidth: 900 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: "#f8fafc" }}>
              <TableCell sx={{ fontWeight: 700, color: "#1e293b", width: 60 }}>
                STT
              </TableCell>
              <TableCell sx={{ fontWeight: 700, color: "#1e293b" }}>
                Tên người cọc
              </TableCell>
              <TableCell sx={{ fontWeight: 700, color: "#1e293b" }}>
                SĐT / Email
              </TableCell>
              <TableCell sx={{ fontWeight: 700, color: "#1e293b", width: 100 }}>
                Phòng
              </TableCell>
              <TableCell sx={{ fontWeight: 700, color: "#1e293b" }}>
                Số tiền cọc
              </TableCell>
              <TableCell sx={{ fontWeight: 700, color: "#1e293b" }}>
                Ngày cọc
              </TableCell>
              <TableCell sx={{ fontWeight: 700, color: "#1e293b" }}>
                Trạng thái
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedDeposits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <Typography variant="body1" color="text.secondary">
                    Không có dữ liệu cọc phòng
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedDeposits.map((deposit, index) => (
                <TableRow
                  key={deposit._id}
                  sx={{
                    "&:last-child td, &:last-child th": { border: 0 },
                    "&:hover": { bgcolor: "#f8fafc" },
                  }}
                >
                  <TableCell>
                    {(currentPage - 1) * ROWS_PER_PAGE + index + 1}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>
                    {deposit.name}
                  </TableCell>
                  <TableCell>
                    <div>
                      <Typography variant="body2">{deposit.phone}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {deposit.email}
                      </Typography>
                    </div>
                  </TableCell>
                  <TableCell>{deposit.room?.name || "N/A"}</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: "#d32f2f" }}>
                    {formatCurrency(deposit.amount)}
                  </TableCell>
                  <TableCell>
                    {deposit.createdDate
                      ? format(new Date(deposit.createdDate), "dd/MM/yyyy")
                      : deposit.createdAt
                      ? format(new Date(deposit.createdAt), "dd/MM/yyyy")
                      : "N/A"}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(deposit.status)}
                      color={getStatusColor(deposit.status) as any}
                      size="small"
                      sx={{ fontWeight: 600, fontSize: "0.75rem" }}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredDeposits.length}
        onPageChange={setCurrentPage}
        displayInfo={
          <span>
            Hiển thị{" "}
            {Math.min(
              (currentPage - 1) * ROWS_PER_PAGE + 1,
              filteredDeposits.length
            )}
            –
            {Math.min(
              currentPage * ROWS_PER_PAGE,
              filteredDeposits.length
            )}{" "}
            / <strong>{filteredDeposits.length}</strong> bản ghi
          </span>
        }
      />
    </div>
  );
}

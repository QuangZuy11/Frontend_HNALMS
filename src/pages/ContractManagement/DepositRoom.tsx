import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
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
import { Add as AddIcon } from "@mui/icons-material";
import "./DepositRoom.css";

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

const getActivationColor = (activationStatus: boolean | null) => {
  if (activationStatus === true) return "success";
  if (activationStatus === false) return "error";
  return "warning"; // null = chưa activate
};

const getActivationLabel = (activationStatus: boolean | null) => {
  if (activationStatus === true) return "Đã kích hoạt";
  if (activationStatus === false) return "Bị reset";
  return "Chưa kích hoạt"; // null
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

const DepositRoom = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine base path (owner or manager)
  const basePath = location.pathname.startsWith("/owner")
    ? "/owner"
    : "/manager";

  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [filterName, setFilterName] = useState("");
  const [filterContact, setFilterContact] = useState(""); // Phone or Email
  const [filterRoom, setFilterRoom] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterActivation, setFilterActivation] = useState<string>("all");

  // Pagination
  const ROWS_PER_PAGE = 13;
  const [currentPage, setCurrentPage] = useState(1);

  // Filter deposits based on filter values
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

    const matchActivation =
      filterActivation === "all" ||
      (filterActivation === "active" && deposit.activationStatus === true) ||
      (filterActivation === "inactive" && deposit.activationStatus === null) ||
      (filterActivation === "reset" && deposit.activationStatus === false);

    return matchName && matchContact && matchRoom && matchStatus && matchActivation;
  });

  // Pagination calculations
  const totalPages = Math.max(
    1,
    Math.ceil(filteredDeposits.length / ROWS_PER_PAGE),
  );
  const paginatedDeposits = filteredDeposits.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE,
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterName, filterContact, filterRoom, filterStatus, filterActivation]);

  useEffect(() => {
    const fetchDeposits = async () => {
      try {
        const response = await axios.get("http://localhost:9999/api/deposits", {
          withCredentials: true,
        });
        if (response.data.success) {
          setDeposits(response.data.data);
        } else {
          setError("Failed to fetch deposits");
        }
      } catch (err: any) {
        console.error("Error fetching deposits:", err);
        setError(
          err.response?.data?.message || err.message || "An error occurred",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDeposits();
  }, []);

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
        <Typography variant="h6">Error loading deposits</Typography>
        <Typography variant="body1">{error}</Typography>
      </Box>
    );
  }

  return (
    <div className="deposit-page">
      <div className="deposit-card">
        <div className="deposit-header">
          <div>
            <h2>Danh sách tiền cọc</h2>
            <p className="subtitle">Quản lý tiền cọc phòng tại tòa nhà</p>
          </div>
          <button
            className="deposit-header-btn"
            onClick={() => navigate(`${basePath}/deposits/floor-map`)}
          >
            <AddIcon style={{ fontSize: 20 }} />
            Tạo Cọc Mới
          </button>
        </div>

        {/* Filter Section */}
        <div className="deposit-filters" style={{ marginBottom: 20 }}>
          <div className="deposit-filter-wrapper">
            <label htmlFor="deposit-name" className="deposit-filter-label">
              Tên:
            </label>
            <input
              type="text"
              id="deposit-name"
              className="deposit-filter-input"
              placeholder="Nhập tên người cọc"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
            />
          </div>
          <div className="deposit-filter-wrapper">
            <label htmlFor="deposit-contact" className="deposit-filter-label">
              SĐT/Email:
            </label>
            <input
              type="text"
              id="deposit-contact"
              className="deposit-filter-input"
              placeholder="Nhập SĐT hoặc Email"
              value={filterContact}
              onChange={(e) => setFilterContact(e.target.value)}
            />
          </div>
          <div className="deposit-filter-wrapper">
            <label htmlFor="deposit-room" className="deposit-filter-label">
              Phòng:
            </label>
            <input
              type="text"
              id="deposit-room"
              className="deposit-filter-input"
              placeholder="Nhập số phòng"
              value={filterRoom}
              onChange={(e) => setFilterRoom(e.target.value)}
              style={{ minWidth: 120 }}
            />
          </div>
          <div className="deposit-filter-wrapper">
            <label htmlFor="deposit-status" className="deposit-filter-label">
              Trạng thái:
            </label>
            <select
              id="deposit-status"
              className="deposit-filter-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Tất cả</option>
              <option value="Held">Đang giữ</option>
              <option value="Refunded">Đã hoàn</option>
              <option value="Forfeited">Đã phạt</option>
              <option value="Expired">Đã hết hạn</option>
            </select>
          </div>
          <div className="deposit-filter-wrapper">
            <label htmlFor="deposit-activation" className="deposit-filter-label">
              Kích hoạt:
            </label>
            <select
              id="deposit-activation"
              className="deposit-filter-select"
              value={filterActivation}
              onChange={(e) => setFilterActivation(e.target.value)}
            >
              <option value="all">Tất cả</option>
              <option value="active">Đã kích hoạt</option>
              <option value="inactive">Chưa kích hoạt</option>
              <option value="reset">Bị reset</option>
            </select>
          </div>
        </div>

        <TableContainer
          component={Paper}
          elevation={3}
          sx={{ borderRadius: 2, overflow: "hidden", flex: 1 }}
        >
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: "#e3eafc" }}>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    color: "#1e40af",
                    fontSize: 15,
                    border: 0,
                  }}
                >
                  STT
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    color: "#1e40af",
                    fontSize: 15,
                    border: 0,
                  }}
                >
                  Tên người cọc
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    color: "#1e40af",
                    fontSize: 15,
                    border: 0,
                  }}
                >
                  SĐT / Email
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    color: "#1e40af",
                    fontSize: 15,
                    border: 0,
                  }}
                >
                  Phòng
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    color: "#1e40af",
                    fontSize: 15,
                    border: 0,
                  }}
                >
                  Số tiền cọc
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    color: "#1e40af",
                    fontSize: 15,
                    border: 0,
                  }}
                >
                  Ngày cọc
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    color: "#1e40af",
                    fontSize: 15,
                    border: 0,
                  }}
                >
                  Trạng thái
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    color: "#1e40af",
                    fontSize: 15,
                    border: 0,
                  }}
                >
                  Kích hoạt
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    color: "#1e40af",
                    fontSize: 15,
                    border: 0,
                  }}
                >
                  Hợp đồng
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedDeposits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                    Không có dữ liệu cọc phòng
                  </TableCell>
                </TableRow>
              ) : (
                paginatedDeposits.map((deposit, index) => (
                  <TableRow
                    key={deposit._id}
                    sx={{
                      "&:last-child td, &:last-child th": { border: 0 },
                      "&:hover": { bgcolor: "#f9f9f9" },
                    }}
                  >
                    <TableCell>
                      {(currentPage - 1) * ROWS_PER_PAGE + index + 1}
                    </TableCell>
                    <TableCell>{deposit.name}</TableCell>
                    <TableCell>
                      {deposit.phone}
                      <br />
                      <Typography variant="caption" color="text.secondary">
                        {deposit.email}
                      </Typography>
                    </TableCell>
                    <TableCell>{deposit.room?.name || "N/A"}</TableCell>
                    <TableCell
                      sx={{ fontWeight: "medium", color: "error.main" }}
                    >
                      {formatCurrency(deposit.amount)}
                    </TableCell>
                    <TableCell>
                      {deposit.createdDate
                        ? format(
                          new Date(deposit.createdDate),
                          "dd/MM/yyyy HH:mm",
                        )
                        : deposit.createdAt
                          ? format(
                            new Date(deposit.createdAt),
                            "dd/MM/yyyy HH:mm",
                          )
                          : "N/A"}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          deposit.status === "Held"
                            ? "Đang giữ"
                            : deposit.status === "Refunded"
                              ? "Đã hoàn"
                              : deposit.status === "Forfeited"
                                ? "Đã phạt"
                                : deposit.status === "Expired"
                                  ? "Đã hết hạn"
                                  : "Đang chờ"
                        }
                        color={getStatusColor(deposit.status) as any}
                        size="small"
                        sx={{ fontWeight: "bold" }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getActivationLabel(deposit.activationStatus)}
                        color={getActivationColor(deposit.activationStatus) as any}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {deposit.contractId ? (
                        (typeof deposit.contractId === "object" && deposit.contractId !== null) ? (
                          <Chip
                            label={deposit.contractId.contractCode || "Đã gắn"}
                            color="success"
                            size="small"
                            onClick={() => {
                              const basePath = location.pathname.startsWith("/owner") ? "/owner" : "/manager";
                              window.open(`${window.location.origin}${basePath}/contracts/${deposit.contractId._id}`, "_blank");
                            }}
                            sx={{ cursor: "pointer", fontWeight: "bold" }}
                          />
                        ) : (
                          <Chip label="Đã gắn" color="success" size="small" />
                        )
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Chưa có
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <div className="deposit-pagination">
          <span className="deposit-pagination-info">
            Tổng: <strong>{filteredDeposits.length}</strong> bản ghi &nbsp;|&nbsp; Trang <strong>{currentPage}</strong>/{totalPages}
          </span>
          <div className="deposit-pagination-controls">
            <button
              className="deposit-page-btn deposit-page-arrow"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
              title="Trang đầu"
            >
              «
            </button>
            <button
              className="deposit-page-btn deposit-page-arrow"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              title="Trang trước"
            >
              ‹
            </button>

            {(() => {
              const pages: number[] = [];
              let start = Math.max(1, currentPage - 2);
              let end = Math.min(totalPages, currentPage + 2);
              if (currentPage <= 2) end = Math.min(totalPages, 5);
              if (currentPage >= totalPages - 1)
                start = Math.max(1, totalPages - 4);
              for (let i = start; i <= end; i++) pages.push(i);
              return pages.map((page) => (
                <button
                  key={page}
                  className={`deposit-page-btn ${page === currentPage ? "deposit-page-active" : ""}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ));
            })()}

            <button
              className="deposit-page-btn deposit-page-arrow"
              disabled={currentPage === totalPages}
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              title="Trang sau"
            >
              ›
            </button>
            <button
              className="deposit-page-btn deposit-page-arrow"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
              title="Trang cuối"
            >
              »
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepositRoom;

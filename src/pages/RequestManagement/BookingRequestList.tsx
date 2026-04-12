import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { bookingRequestService } from "../../services/bookingRequestService";
import { format } from "date-fns";
import api from "../../services/api";
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
  Button,
  Tooltip,
} from "@mui/material";
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import toastr from "toastr";
import "toastr/build/toastr.min.css";

interface Room {
  _id: string;
  name: string;
  type: string;
  price: number;
}

interface BookingRequest {
  _id: string;
  name: string;
  phone: string;
  email: string;
  idCard: string;
  roomId: Room;
  status: "Pending" | "Processed" | "Rejected" | "Awaiting Payment" | "Expired";
  paymentStatus?: "Unpaid" | "Paid";
  transactionCode?: string;
  totalAmount?: number;
  startDate: string;
  duration: number;
  prepayMonths: number | "all";
  coResidents: any[];
  createdAt: string;
}

const POLL_INTERVAL_MS = 5000; // 5 giây – giống deposit polling

const getStatusChip = (req: BookingRequest) => {
  switch (req.status) {
    case "Processed":
      return <Chip label="✅ Đã ký HĐ" color="success" size="small" sx={{ fontWeight: "bold" }} />;
    case "Awaiting Payment":
      return (
        <Tooltip title={`Mã CK: ${req.transactionCode || "—"} | ${(req.totalAmount || 0).toLocaleString("vi-VN")} VNĐ`}>
          <Chip
            label="⏳ Chờ thanh toán"
            color="warning"
            size="small"
            sx={{ fontWeight: "bold", cursor: "help" }}
          />
        </Tooltip>
      );
    case "Pending":
      return <Chip label="📋 Chờ duyệt" color="info" size="small" sx={{ fontWeight: "bold" }} />;
    case "Rejected":
      return <Chip label="❌ Từ chối" color="error" size="small" sx={{ fontWeight: "bold" }} />;
    case "Expired":
      return <Chip label="⌛ Hết hạn" color="default" size="small" sx={{ fontWeight: "bold" }} />;
    default:
      return <Chip label={req.status} size="small" />;
  }
};

const BookingRequestList = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterName, setFilterName] = useState("");
  const [filterRoom, setFilterRoom] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 10;

  // Ref để tránh gọi đồng thời nhiều polling
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Ref lưu danh sách request hiện tại (để polling đọc mà không cần re-render)
  const requestsRef = useRef<BookingRequest[]>([]);
  requestsRef.current = requests;

  const fetchRequests = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const responseData = await bookingRequestService.getAllBookingRequests();
      if (responseData.success) {
        setRequests(responseData.data);
      } else {
        setError("Tải danh sách thất bại");
      }
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Polling cho các request đang "Awaiting Payment"
  useEffect(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      const awaitingList = requestsRef.current.filter(
        (r) => r.status === "Awaiting Payment" && r.transactionCode
      );
      if (awaitingList.length === 0) return;

      for (const req of awaitingList) {
        try {
          const res = await api.get(
            `/booking-requests/payment-status/${encodeURIComponent(req.transactionCode!)}`
          );
          const pollData = res.data?.data;
          if (!pollData) continue;

          if (pollData.status === "Processed") {
            // Thanh toán thành công, tạo HĐ xong → reload danh sách
            toastr.success(
              `✅ Khách ${req.name} (${req.roomId?.name}) đã thanh toán thành công! Hợp đồng đã được tạo.`,
              "Thanh toán thành công",
              { timeOut: 8000 }
            );
            fetchRequests(true);
            break; // Reload rồi thì break, list sẽ refresh
          } else if (pollData.status === "Expired") {
            // Hết hạn → update UI ngay không cần reload
            setRequests((prev) =>
              prev.map((r) => r._id === req._id ? { ...r, status: "Expired" } : r)
            );
          }
        } catch {
          // Bỏ qua lỗi mạng giống deposit polling
        }
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []); // Mount một lần, đọc requestsRef.current để luôn có data mới nhất

  const filteredRequests = requests.filter((req) => {
    const matchName = req.name.toLowerCase().includes(filterName.toLowerCase());
    const matchRoom = filterRoom === "" || req.roomId?.name?.toLowerCase().includes(filterRoom.toLowerCase());
    return matchName && matchRoom;
  });

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / ROWS_PER_PAGE));
  const paginatedRequests = filteredRequests.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  const handleReview = (bookingRequestId: string) => {
    navigate("/manager/booking-contracts/send", { state: { bookingRequestId } });
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
        <Typography variant="h6">Lỗi lấy dữ liệu</Typography>
        <Typography variant="body1">{error}</Typography>
      </Box>
    );
  }

  const awaitingCount = requests.filter(r => r.status === "Awaiting Payment").length;

  return (
    <Box sx={{ p: 4, fontFamily: "'Inter', sans-serif" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
        <Typography variant="h4" sx={{ fontWeight: "bold", color: "#1e293b" }}>
          Khách Đặt Phòng Online
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {awaitingCount > 0 && (
            <Chip
              label={`🔄 Đang chờ thanh toán: ${awaitingCount}`}
              color="warning"
              size="small"
              sx={{ fontWeight: 600 }}
            />
          )}
          <Button
            startIcon={<RefreshIcon />}
            onClick={() => fetchRequests(true)}
            size="small"
            variant="outlined"
            sx={{ textTransform: "none" }}
          >
            Tải lại
          </Button>
        </Box>
      </Box>
      <Typography variant="body1" sx={{ color: "#64748b", mb: 4 }}>
        Quản lý các yêu cầu đặt phòng và làm hợp đồng cho khách
        {awaitingCount > 0 && (
          <span style={{ color: "#f59e0b", fontWeight: 600 }}>
            {" "}— Đang tự động kiểm tra thanh toán mỗi 5 giây...
          </span>
        )}
      </Typography>

      <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
        <Box sx={{ flex: 1, display: "flex", alignItems: "center", bgcolor: "#fff", borderRadius: 2, p: 1, boxShadow: 1 }}>
          <SearchIcon sx={{ color: "#94a3b8", ml: 1, mr: 1 }} />
          <input
            type="text"
            placeholder="Tìm theo tên khách..."
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            style={{ border: "none", outline: "none", flex: 1, fontSize: "16px" }}
          />
        </Box>
        <Box sx={{ flex: 1, display: "flex", alignItems: "center", bgcolor: "#fff", borderRadius: 2, p: 1, boxShadow: 1 }}>
          <SearchIcon sx={{ color: "#94a3b8", ml: 1, mr: 1 }} />
          <input
            type="text"
            placeholder="Tìm theo số phòng..."
            value={filterRoom}
            onChange={(e) => setFilterRoom(e.target.value)}
            style={{ border: "none", outline: "none", flex: 1, fontSize: "16px" }}
          />
        </Box>
      </Box>

      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: "#f8fafc" }}>
              <TableCell sx={{ fontWeight: 600, color: "#334155" }}>STT</TableCell>
              <TableCell sx={{ fontWeight: 600, color: "#334155" }}>Phòng</TableCell>
              <TableCell sx={{ fontWeight: 600, color: "#334155" }}>Khách hàng</TableCell>
              <TableCell sx={{ fontWeight: 600, color: "#334155" }}>SĐT</TableCell>
              <TableCell sx={{ fontWeight: 600, color: "#334155" }}>Ngày muốn vào</TableCell>
              <TableCell sx={{ fontWeight: 600, color: "#334155" }}>Mã CK / Số tiền</TableCell>
              <TableCell sx={{ fontWeight: 600, color: "#334155" }}>Trạng thái</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, color: "#334155" }}>Thao tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4, color: "#64748b" }}>
                  Chưa có khách đặt phòng online
                </TableCell>
              </TableRow>
            ) : (
              paginatedRequests.map((req, index) => (
                <TableRow key={req._id} hover
                  sx={req.status === "Awaiting Payment" ? { bgcolor: "#fffbeb" } : {}}
                >
                  <TableCell>{(currentPage - 1) * ROWS_PER_PAGE + index + 1}</TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{req.roomId?.name || "N/A"}</TableCell>
                  <TableCell>{req.name}</TableCell>
                  <TableCell>{req.phone}</TableCell>
                  <TableCell>
                    {req.startDate ? format(new Date(req.startDate), "dd/MM/yyyy") : "N/A"}
                  </TableCell>
                  <TableCell>
                    {req.transactionCode ? (
                      <Box>
                        <Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: 700, color: "#1d4ed8", display: "block" }}>
                          {req.transactionCode}
                        </Typography>
                        {req.totalAmount && (
                          <Typography variant="caption" sx={{ color: "#991b1b" }}>
                            {req.totalAmount.toLocaleString("vi-VN")} VNĐ
                          </Typography>
                        )}
                      </Box>
                    ) : (
                      <Typography variant="caption" sx={{ color: "#94a3b8" }}>—</Typography>
                    )}
                  </TableCell>
                  <TableCell>{getStatusChip(req)}</TableCell>
                  <TableCell align="right">
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => handleReview(req._id)}
                      disabled={req.status === "Rejected" || req.status === "Processed"}
                      sx={{ textTransform: "none", fontWeight: 600, borderRadius: "6px" }}
                    >
                      {req.status === "Awaiting Payment" ? "Chờ TT..." : "Xem & Chốt HĐ"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination control */}
      {totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 3, gap: 1 }}>
          <Button disabled={currentPage === 1} onClick={() => setCurrentPage(c => c - 1)} variant="outlined" size="small">Trước</Button>
          <Box sx={{ display: "flex", alignItems: "center", px: 2 }}>Trang {currentPage} / {totalPages}</Box>
          <Button disabled={currentPage === totalPages} onClick={() => setCurrentPage(c => c + 1)} variant="outlined" size="small">Sau</Button>
        </Box>
      )}
    </Box>
  );
};

export default BookingRequestList;


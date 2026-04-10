import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { bookingRequestService } from "../../services/bookingRequestService";
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
  Button,
} from "@mui/material";
import SearchIcon from '@mui/icons-material/Search';

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
  status: "Pending" | "Processed" | "Rejected";
  startDate: string;
  duration: number;
  prepayMonths: number | "all";
  coResidents: any[];
  createdAt: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "Held": return "primary";
    case "Refunded": return "success";
    case "Forfeited": return "error";
    case "Expired": return "warning";
    case "Pending": return "info";
    default: return "default";
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

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const responseData = await bookingRequestService.getAllBookingRequests();
        if (responseData.success) {
          setRequests(responseData.data);
        } else {
          setError("Tải danh sách thất bại");
        }
      } catch (err: any) {
        setError(err.message || "Đã xảy ra lỗi");
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, []);

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

  return (
    <Box sx={{ p: 4, fontFamily: "'Inter', sans-serif" }}>
      <Typography variant="h4" sx={{ mb: 1, fontWeight: "bold", color: "#1e293b" }}>
        Khách Đặt Phòng Online
      </Typography>
      <Typography variant="body1" sx={{ color: "#64748b", mb: 4 }}>
        Quản lý các yêu cầu đặt phòng và làm hợp đồng cho khách
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
              <TableCell sx={{ fontWeight: 600, color: "#334155" }}>Trạng thái cọc</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, color: "#334155" }}>Thao tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: "#64748b" }}>
                  Chưa có khách đặt phòng online
                </TableCell>
              </TableRow>
            ) : (
              paginatedRequests.map((req, index) => (
                <TableRow key={req._id} hover>
                  <TableCell>{(currentPage - 1) * ROWS_PER_PAGE + index + 1}</TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{req.roomId?.name || "N/A"}</TableCell>
                  <TableCell>{req.name}</TableCell>
                  <TableCell>{req.phone}</TableCell>
                  <TableCell>
                    {req.startDate ? format(new Date(req.startDate), "dd/MM/yyyy") : "N/A"}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={
                        req.status === "Processed" ? "Đã duyệt" :
                        req.status === "Awaiting Payment" ? "Chờ thanh toán" :
                        req.status === "Pending" ? "Chờ duyệt" :
                        req.status === "Rejected" ? "Đã từ chối" : req.status
                      }
                      color={
                        req.status === "Processed" ? "success" :
                        req.status === "Awaiting Payment" ? "warning" :
                        req.status === "Pending" ? "info" : "error"
                      }
                      size="small"
                      sx={{ fontWeight: "bold" }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => handleReview(req._id)}
                      disabled={req.status === "Rejected" || req.status === "Processed"}
                      sx={{ textTransform: "none", fontWeight: 600, borderRadius: "6px" }}
                    >
                      Xem & Chốt HĐ
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

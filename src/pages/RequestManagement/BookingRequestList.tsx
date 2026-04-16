import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { bookingRequestService } from "../../services/bookingRequestService";
import { format } from "date-fns";
import api from "../../services/api";
import {
  Search,
  RefreshCw,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  ClipboardList,
  UserCheck,
  Receipt,
} from "lucide-react";
import "./BookingRequestList.css";
import { Pagination } from "../../components/common/Pagination";

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
  coResidents: { name: string; phone: string }[];
  createdAt: string;
}

const POLL_INTERVAL_MS = 5000;

const BookingRequestList = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterName, setFilterName] = useState("");
  const [filterRoom, setFilterRoom] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 10;

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      const awaitingList = requestsRef.current.filter(
        (r) => r.status === "Awaiting Payment" && r.transactionCode,
      );
      if (awaitingList.length === 0) return;

      for (const req of awaitingList) {
        try {
          const res = await api.get(
            `/booking-requests/payment-status/${encodeURIComponent(req.transactionCode!)}`,
          );
          const pollData = res.data?.data;
          if (!pollData) continue;

          if (pollData.status === "Processed") {
            fetchRequests(true);
            break;
          } else if (pollData.status === "Expired") {
            setRequests((prev) =>
              prev.map((r) =>
                r._id === req._id ? { ...r, status: "Expired" } : r,
              ),
            );
          }
        } catch {
          // Bỏ qua lỗi mạng
        }
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchRequests]);

  const filteredRequests = requests.filter((req) => {
    const matchName = (req.name || "").toLowerCase().includes(filterName.toLowerCase());
    const matchRoom =
      filterRoom === "" ||
      req.roomId?.name?.toLowerCase().includes(filterRoom.toLowerCase());
    return matchName && matchRoom;
  });

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRequests.length / ROWS_PER_PAGE),
  );
  const paginatedRequests = filteredRequests.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE,
  );

  const handleReview = (bookingRequestId: string) => {
    navigate("/manager/booking-contracts/send", {
      state: { bookingRequestId },
    });
  };

  const pendingCount = requests.filter((r) => r.status === "Pending").length;
  const awaitingCount = requests.filter(
    (r) => r.status === "Awaiting Payment",
  ).length;
  const processedCount = requests.filter(
    (r) => r.status === "Processed",
  ).length;
  const totalCount = requests.length;

  const getStatusBadge = (status: BookingRequest["status"]) => {
    switch (status) {
      case "Processed":
        return (
          <span className="br-status-badge br-status-badge--processed">
            <CheckCircle2 size={14} />
            Đã ký HĐ
          </span>
        );
      case "Awaiting Payment":
        return (
          <span className="br-status-badge br-status-badge--awaiting">
            <Clock size={14} />
            Chờ thanh toán
          </span>
        );
      case "Pending":
        return (
          <span className="br-status-badge br-status-badge--pending">
            <ClipboardList size={14} />
            Chờ duyệt
          </span>
        );
      case "Rejected":
        return (
          <span className="br-status-badge br-status-badge--rejected">
            <XCircle size={14} />
            Từ chối
          </span>
        );
      case "Expired":
        return (
          <span className="br-status-badge br-status-badge--expired">
            <Clock size={14} />
            Hết hạn
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="br-container">
        <div className="br-loading">
          <div className="br-loading-spinner"></div>
          <span>Đang tải dữ liệu...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="br-container">
        <div className="br-error">
          <XCircle size={48} />
          <h3>Lỗi lấy dữ liệu</h3>
          <p>{error}</p>
          <button
            className="br-btn br-btn--outline"
            onClick={() => fetchRequests()}
          >
            <RefreshCw size={16} /> Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="br-container">
      {/* HEADER */}
      <div className="br-header">
        <div className="br-header-top">
          <div className="br-title-block">
            <div className="br-title-row">
              <div className="br-title-icon">
                <ClipboardList size={22} strokeWidth={2} />
              </div>
              <div className="br-title-text">
                <h2>Khách Đặt Phòng Online</h2>
                <p className="br-subtitle">
                  Quản lý các yêu cầu đặt phòng và làm hợp đồng cho khách
                  
                </p>
              </div>
            </div>
          </div>

          <div className="br-header-aside">
            <div className="br-stats-summary">
              <div className="br-stat-item">
                <Receipt size={16} className="br-stat-icon br-icon-primary" />
                <div className="br-stat-text">
                  <span className="br-stat-value">{totalCount}</span>
                  <span className="br-stat-label">Tổng số</span>
                </div>
              </div>
              <div className="br-stat-divider"></div>
              <div className="br-stat-item">
                <ClipboardList
                  size={16}
                  className="br-stat-icon br-icon-warning"
                />
                <div className="br-stat-text">
                  <span className="br-stat-value">{pendingCount}</span>
                  <span className="br-stat-label">Chờ duyệt</span>
                </div>
              </div>
              <div className="br-stat-divider"></div>
              <div className="br-stat-item">
                <UserCheck size={16} className="br-stat-icon br-icon-success" />
                <div className="br-stat-text">
                  <span className="br-stat-value">{processedCount}</span>
                  <span className="br-stat-label">Đã ký</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TOOLBAR LỌC & TÌM KIẾM */}
      <div className="br-toolbar">
        <div className="br-toolbar-left">
          <div className="br-search-box">
            <Search size={18} className="br-search-icon" />
            <input
              type="text"
              className="br-search-input"
              placeholder="Tìm theo tên khách..."
              value={filterName}
              onChange={(e) => {
                setFilterName(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="br-search-box">
            <Search size={18} className="br-search-icon" />
            <input
              type="text"
              className="br-search-input"
              placeholder="Tìm theo số phòng..."
              value={filterRoom}
              onChange={(e) => {
                setFilterRoom(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        <div className="br-toolbar-right">
          <span className="br-display-info">
            Hiển thị {(currentPage - 1) * ROWS_PER_PAGE + 1}–
            {Math.min(currentPage * ROWS_PER_PAGE, filteredRequests.length)} /{" "}
            <strong>{filteredRequests.length}</strong> bản ghi
          </span>
          {awaitingCount > 0 && (
            <span className="br-awaiting-chip">
              <Clock size={14} />
              Chờ thanh toán: {awaitingCount}
            </span>
          )}
        </div>
      </div>

      {/* BẢNG DỮ LIỆU */}
      <div className="br-table-container">
        <table className="br-table">
          <thead>
            <tr>
              <th className="br-cell-stt">STT</th>
              <th className="br-cell-room">Phòng</th>
              <th className="br-cell-customer">Khách hàng</th>
              <th className="br-cell-phone">SĐT</th>
              <th className="br-cell-date">Ngày muốn vào</th>
              <th className="br-cell-transaction">Mã CK / Số tiền</th>
              <th className="br-cell-status">Trạng thái</th>
              <th className="br-cell-actions">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRequests.length === 0 ? (
              <tr>
                <td colSpan={8} className="br-empty-cell">
                  Chưa có khách đặt phòng online
                </td>
              </tr>
            ) : (
              paginatedRequests.map((req, index) => (
                <tr
                  key={req._id}
                  className={
                    req.status === "Awaiting Payment" ? "br-row-awaiting" : ""
                  }
                >
                  <td className="br-cell-stt">
                    {(currentPage - 1) * ROWS_PER_PAGE + index + 1}
                  </td>
                  <td className="br-cell-room">{req.roomId?.name || "N/A"}</td>
                  <td className="br-cell-customer">
                    {req.email && (
                      <span className="br-customer-email">{req.email}</span>
                    )}
                  </td>
                  <td className="br-cell-phone">{req.phone}</td>
                  <td className="br-cell-date">
                    {req.startDate
                      ? format(new Date(req.startDate), "dd/MM/yyyy")
                      : "N/A"}
                  </td>
                  <td className="br-cell-transaction">
                    {req.transactionCode ? (
                      <div>
                        <span className="br-transaction-code">
                          {req.transactionCode}
                        </span>
                        {req.totalAmount && (
                          <span className="br-transaction-amount">
                            {req.totalAmount.toLocaleString("vi-VN")} VNĐ
                          </span>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: "#94a3b8" }}>—</span>
                    )}
                  </td>
                  <td className="br-cell-status">
                    {getStatusBadge(req.status)}
                  </td>
                  <td className="br-cell-actions">
                    <button
                      className="br-btn br-btn--primary"
                      onClick={() => handleReview(req._id)}
                      disabled={
                        req.status === "Rejected" || req.status === "Processed"
                      }
                    >
                      <Eye size={15} />
                      {req.status === "Awaiting Payment"
                        ? "Chờ TT..."
                        : "Xem & Chốt HĐ"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredRequests.length}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
};

export default BookingRequestList;

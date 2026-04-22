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
  ChevronDown,
  ChevronUp,
  Users,
  Ban,
} from "lucide-react";
import "./BookingRequestList.css";

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
  // Khi guest trùng cả 3 trường, booking chỉ lưu userInfoId, không lưu name/phone/email
  userInfoId?: {
    _id: string;
    fullname: string;
    phone: string;
    email: string;
    cccd: string;
    dob?: string;
    address?: string;
    gender?: string;
  } | null;
  roomId: Room;
  status: "Pending" | "Processed" | "Rejected" | "Awaiting Payment" | "Expired";
  rejectionReason?: string | null;
  paymentStatus?: "Unpaid" | "Paid";
  transactionCode?: string;
  totalAmount?: number;
  startDate: string;
  duration: number;
  prepayMonths: number | "all";
  coResidents: { name: string; phone: string }[];
  createdAt: string;
}

// Helper: lấy tên hiển thị từ booking request (có thể có userInfoId hoặc name trực tiếp)
const getReqName = (req: BookingRequest): string =>
  req.name || (req.userInfoId ? req.userInfoId.fullname : "") || "";

const getReqPhone = (req: BookingRequest): string =>
  req.phone || (req.userInfoId ? req.userInfoId.phone : "") || "";

const getReqEmail = (req: BookingRequest): string =>
  req.email || (req.userInfoId ? req.userInfoId.email : "") || "";

interface LeaseTerm {
  termKey: string;          // "YYYY-MM" of the earliest startDate in this term, or "no-date"
  termLabel: string;        // "Kỳ thuê DD/MM/YYYY" or "Kỳ thuê không rõ ngày"
  requests: BookingRequest[];
  hasActive: boolean;       // has Pending or Awaiting Payment
  hasWinner: boolean;       // has Processed
}

interface RoomGroup {
  roomId: string;
  roomName: string;
  leaseTerms: LeaseTerm[];  // ordered list of lease terms for this room
  hasActive: boolean;       // any term has active requests
  hasWinner: boolean;       // any term has Processed
}

const POLL_INTERVAL_MS = 5000;

const BookingRequestList = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterName, setFilterName] = useState("");
  const [filterRoom, setFilterRoom] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Which room groups are expanded
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const requestsRef = useRef<BookingRequest[]>([]);
  requestsRef.current = requests;

  const fetchRequests = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const responseData = await bookingRequestService.getAllBookingRequests();
      if (responseData.success) {
        setRequests(responseData.data);
        // Auto-expand rooms that have active requests
        const activeRoomIds = new Set<string>(
          responseData.data
            .filter((r: BookingRequest) => ["Pending", "Awaiting Payment"].includes(r.status))
            .map((r: BookingRequest) => r.roomId?._id)
            .filter(Boolean),
        );
        setExpandedRooms(activeRoomIds);
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
          // ignore network errors
        }
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchRequests]);

  // Filter individual requests
  const filteredRequests = requests.filter((req) => {
    // Tính tên, phone, email từ cả name trực tiếp lẫn populated userInfoId
    const displayName = getReqName(req);
    const matchName = displayName.toLowerCase().includes(filterName.toLowerCase());
    const matchRoom =
      filterRoom === "" ||
      req.roomId?.name?.toLowerCase().includes(filterRoom.toLowerCase());
    const matchStatus =
      filterStatus === "all" || req.status === filterStatus;
    return matchName && matchRoom && matchStatus;
  });

  // Group by room, then sub-group each room by lease term (startDate month+year)
  const roomGroups: RoomGroup[] = (() => {
    const statusOrder: Record<string, number> = {
      "Awaiting Payment": 0,
      "Pending": 1,
      "Processed": 2,
      "Expired": 3,
      "Rejected": 4,
    };

    // Step 1: group requests by roomId
    const roomMap = new Map<string, { roomName: string; reqs: BookingRequest[] }>();
    filteredRequests.forEach((req) => {
      const rId = req.roomId?._id || "unknown";
      if (!roomMap.has(rId)) {
        roomMap.set(rId, { roomName: req.roomId?.name || "N/A", reqs: [] });
      }
      roomMap.get(rId)!.reqs.push(req);
    });

    // Step 2: for each room, sub-group by lease term (YYYY-MM of startDate)
    const groups: RoomGroup[] = [];
    roomMap.forEach(({ roomName, reqs }, roomId) => {
      const termMap = new Map<string, BookingRequest[]>();
      reqs.forEach((req) => {
        let termKey = "no-date";
        if (req.startDate) {
          const d = new Date(req.startDate);
          if (!isNaN(d.getTime())) {
            termKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          }
        }
        if (!termMap.has(termKey)) termMap.set(termKey, []);
        termMap.get(termKey)!.push(req);
      });

      // Build LeaseTerm objects, sort requests within each term
      const leaseTerms: LeaseTerm[] = [];
      termMap.forEach((termReqs, termKey) => {
        termReqs.sort((a, b) => {
          const so = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
          if (so !== 0) return so;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        const hasActive = termReqs.some((r) => ["Pending", "Awaiting Payment"].includes(r.status));
        const hasWinner = termReqs.some((r) => r.status === "Processed");

        // Build a human-readable label
        let termLabel = "Kỳ thuê không rõ ngày";
        if (termKey !== "no-date") {
          const [yr, mo] = termKey.split("-");
          termLabel = `Kỳ thuê từ tháng ${mo}/${yr}`;
        }

        leaseTerms.push({ termKey, termLabel, requests: termReqs, hasActive, hasWinner });
      });

      // Sort lease terms chronologically (earliest first)
      leaseTerms.sort((a, b) => {
        if (a.termKey === "no-date") return 1;
        if (b.termKey === "no-date") return -1;
        return a.termKey.localeCompare(b.termKey);
      });

      const groupHasActive = leaseTerms.some((t) => t.hasActive);
      const groupHasWinner = leaseTerms.some((t) => t.hasWinner);

      groups.push({
        roomId,
        roomName,
        leaseTerms,
        hasActive: groupHasActive,
        hasWinner: groupHasWinner,
      });
    });

    // Sort groups: rooms with active requests first
    groups.sort((a, b) => {
      if (a.hasActive && !b.hasActive) return -1;
      if (!a.hasActive && b.hasActive) return 1;
      return 0;
    });

    return groups;
  })();

  const toggleRoom = (roomId: string) => {
    setExpandedRooms((prev) => {
      const next = new Set(prev);
      if (next.has(roomId)) next.delete(roomId);
      else next.add(roomId);
      return next;
    });
  };

  const handleReview = (bookingRequestId: string) => {
    navigate("/manager/booking-contracts/send", {
      state: { bookingRequestId },
    });
  };

  const pendingCount = requests.filter((r) => r.status === "Pending").length;
  const awaitingCount = requests.filter((r) => r.status === "Awaiting Payment").length;
  const processedCount = requests.filter((r) => r.status === "Processed").length;
  const totalCount = requests.length;

  const getStatusBadge = (req: BookingRequest) => {
    if (req.status === "Rejected" && req.rejectionReason === "room_taken") {
      return (
        <span className="br-status-badge br-status-badge--room-taken">
          <Ban size={13} />
          Đã hủy
        </span>
      );
    }
    switch (req.status) {
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
                  Quản lý các yêu cầu đặt phòng. Mỗi phòng có thể có nhiều yêu
                  cầu — khi 1 yêu cầu được chốt, các yêu cầu khác cùng phòng
                  sẽ tự động bị hủy.
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
                <ClipboardList size={16} className="br-stat-icon br-icon-warning" />
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

      {/* TOOLBAR */}
      <div className="br-toolbar">
        <div className="br-toolbar-left">
          <div className="br-search-box">
            <Search size={18} className="br-search-icon" />
            <input
              type="text"
              className="br-search-input"
              placeholder="Tìm theo tên khách..."
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
            />
          </div>

          <div className="br-search-box">
            <Search size={18} className="br-search-icon" />
            <input
              type="text"
              className="br-search-input"
              placeholder="Tìm theo số phòng..."
              value={filterRoom}
              onChange={(e) => setFilterRoom(e.target.value)}
            />
          </div>

          <select
            className="br-custom-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="Pending">Chờ duyệt</option>
            <option value="Awaiting Payment">Chờ thanh toán</option>
            <option value="Processed">Đã ký HĐ</option>
            <option value="Rejected">Từ chối / Bị hủy</option>
            <option value="Expired">Hết hạn</option>
          </select>
        </div>

        <div className="br-toolbar-right">
          <span className="br-display-info">
            <strong>{roomGroups.length}</strong> phòng /{" "}
            <strong>{filteredRequests.length}</strong> yêu cầu
          </span>
          {awaitingCount > 0 && (
            <span className="br-awaiting-chip">
              <Clock size={14} />
              Chờ thanh toán: {awaitingCount}
            </span>
          )}
          <button
            className="br-btn br-btn--outline"
            onClick={() => fetchRequests()}
            title="Tải lại"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* ROOM GROUPS */}
      <div className="br-groups-container">
        {roomGroups.length === 0 ? (
          <div className="br-empty-state">
            <ClipboardList size={48} strokeWidth={1.5} />
            <p>Chưa có yêu cầu đặt phòng nào</p>
          </div>
        ) : (
          roomGroups.map((group) => {
            const isExpanded = expandedRooms.has(group.roomId);
            const totalReqs = group.leaseTerms.reduce((s, t) => s + t.requests.length, 0);
            const totalCompeted = group.leaseTerms.reduce(
              (s, t) => s + t.requests.filter((r) => r.rejectionReason === "room_taken").length,
              0,
            );
            const multiTerm = group.leaseTerms.length > 1;

            return (
              <div
                key={group.roomId}
                className={`br-room-group ${group.hasActive && !group.hasWinner
                    ? "br-room-group--active"
                    : group.hasWinner && !group.hasActive
                      ? "br-room-group--won"
                      : group.hasWinner && group.hasActive
                        ? "br-room-group--multi"
                        : ""
                  }`}
              >
                {/* Room group header */}
                <button
                  className="br-room-header"
                  onClick={() => toggleRoom(group.roomId)}
                >
                  <div className="br-room-header-left">
                    <div className="br-room-badge">
                      {group.hasActive ? (
                        <Clock size={16} className="br-room-icon--active" />
                      ) : group.hasWinner ? (
                        <CheckCircle2 size={16} className="br-room-icon--won" />
                      ) : (
                        <XCircle size={16} className="br-room-icon--closed" />
                      )}
                      <span className="br-room-name">Phòng {group.roomName}</span>
                    </div>

                    <div className="br-room-meta">
                      <span className="br-room-count">
                        <Users size={13} />
                        {group.leaseTerms.length} kỳ thuê · {totalReqs} yêu cầu
                      </span>
                      {totalCompeted > 0 && (
                        <span className="br-room-competed">
                          <Ban size={13} />
                          {totalCompeted} bị hủy
                        </span>
                      )}
                      {multiTerm && (
                        <span className="br-room-multi-term-tag">
                          ● Nhiều kỳ thuê
                        </span>
                      )}
                      {group.hasActive && (
                        <span className="br-room-active-tag">● Đang chờ duyệt</span>
                      )}
                      {group.hasWinner && !group.hasActive && (
                        <span className="br-room-won-tag">✓ Đã chốt HĐ</span>
                      )}
                    </div>
                  </div>

                  <div className="br-room-toggle">
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>

                {/* Lease term sub-sections */}
                {isExpanded && (
                  <div className="br-room-requests">
                    {group.leaseTerms.map((term, termIdx) => (
                      <div key={term.termKey} className={`br-lease-term ${termIdx > 0 ? "br-lease-term--separated" : ""
                        }`}>
                        {/* Term header — only show when multiple terms exist */}
                        {group.leaseTerms.length > 1 && (
                          <div className={`br-lease-term-header ${term.hasWinner && !term.hasActive
                              ? "br-lease-term-header--won"
                              : term.hasActive
                                ? "br-lease-term-header--active"
                                : "br-lease-term-header--closed"
                            }`}>
                            <span className="br-lease-term-label">
                              {term.hasWinner && !term.hasActive ? (
                                <CheckCircle2 size={13} />
                              ) : term.hasActive ? (
                                <Clock size={13} />
                              ) : (
                                <XCircle size={13} />
                              )}
                              {term.termLabel}
                            </span>
                            <span className="br-lease-term-count">
                              {term.requests.length} yêu cầu
                            </span>
                            {term.hasWinner && !term.hasActive && (
                              <span className="br-room-won-tag" style={{ fontSize: "11px" }}>✓ Đã chốt HĐ kỳ này</span>
                            )}
                            {term.hasActive && (
                              <span className="br-room-active-tag" style={{ fontSize: "11px" }}>● Đang chờ duyệt</span>
                            )}
                          </div>
                        )}

                        <table className="br-table">
                          <thead>
                            <tr>
                              <th className="br-cell-stt">#</th>
                              <th className="br-cell-customer">Khách hàng</th>
                              <th className="br-cell-phone">SĐT</th>
                              <th className="br-cell-date">Ngày vào</th>
                              <th style={{ width: "8%" }}>Thời hạn</th>
                              <th className="br-cell-transaction">Mã CK / Số tiền</th>
                              <th className="br-cell-status">Trạng thái</th>
                              <th className="br-cell-actions">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody>
                            {term.requests.map((req, index) => {
                              const isLoser = req.rejectionReason === "room_taken";
                              const isWinner = req.status === "Processed";
                              return (
                                <tr
                                  key={req._id}
                                  className={`
                                    ${req.status === "Awaiting Payment" ? "br-row-awaiting" : ""}
                                    ${isLoser ? "br-row-loser" : ""}
                                    ${isWinner ? "br-row-winner" : ""}
                                  `.trim()}
                                >
                                  <td className="br-cell-stt">{index + 1}</td>
                                  <td className="br-cell-customer">
                                    <span className="br-customer-name">
                                      {getReqName(req) || <em style={{ color: "#94a3b8" }}>Chưa có tên</em>}
                                    </span>
                                    {getReqEmail(req) && (
                                      <span className="br-customer-email">{getReqEmail(req)}</span>
                                    )}
                                    {req.userInfoId && (
                                      <span style={{ fontSize: "10px", color: "#6366f1", fontWeight: 600, marginTop: "2px", display: "block" }}>● Tài khoản cũ</span>
                                    )}
                                  </td>
                                  <td className="br-cell-phone">{getReqPhone(req)}</td>
                                  <td className="br-cell-date">
                                    {req.startDate
                                      ? format(new Date(req.startDate), "dd/MM/yyyy")
                                      : "N/A"}
                                  </td>
                                  <td style={{ textAlign: "center" }}>
                                    {req.duration} tháng
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
                                    {getStatusBadge(req)}
                                  </td>
                                  <td className="br-cell-actions">
                                    {isLoser || req.status === "Expired" || req.status === "Rejected" ? (
                                      <span className="br-no-action">—</span>
                                    ) : req.status === "Processed" ? (
                                      <span className="br-status-badge br-status-badge--processed" style={{ fontSize: "11px" }}>
                                        <CheckCircle2 size={12} /> Hoàn tất
                                      </span>
                                    ) : (
                                      <button
                                        className="br-btn br-btn--primary"
                                        onClick={() => handleReview(req._id)}
                                      >
                                        <Eye size={15} />
                                        {req.status === "Awaiting Payment"
                                          ? "Chờ TT..."
                                          : "Xem & Chốt HĐ"}
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default BookingRequestList;

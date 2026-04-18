import { useState, useEffect, useMemo, useCallback } from "react";
import { format } from "date-fns";
import api from "../../../services/api";
import {
  FileText,
  Filter,
  Plus,
  Search,
  Wallet,
  DollarSign,
} from "lucide-react";
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

  const ROWS_PER_PAGE = 8;
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

  const filteredDeposits = useMemo(() => {
    return deposits.filter((deposit) => {
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
  }, [deposits, filterName, filterContact, filterRoom, filterStatus]);

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
          <span>Đang tải dữ liệu tiền cọc...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="adl-container">
        <div className="adl-error">
          <h3>Error loading deposits</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const totalCount = deposits.length;
  const heldCount = deposits.filter((d) => d.status === "Held").length;
  const refundedCount = deposits.filter((d) => d.status === "Refunded").length;

  const pageNumbers: number[] = [];
  let start = Math.max(1, currentPage - 2);
  let end = Math.min(totalPages, currentPage + 2);
  if (currentPage <= 2) end = Math.min(totalPages, 5);
  if (currentPage >= totalPages - 1) start = Math.max(1, totalPages - 4);
  for (let i = start; i <= end; i += 1) pageNumbers.push(i);

  return (
    <div className="adl-container">
      <div className="adl-header">
        <div className="adl-header-top">
          <div className="adl-title-block">
            <div className="adl-title-row">
              <div className="adl-title-icon" aria-hidden>
                <Wallet size={22} strokeWidth={2} />
              </div>
              <div className="adl-title-text">
                <h2>Danh sách tiền cọc</h2>
                <p className="adl-subtitle">
Theo dõi và quản lý danh sách tiền cọc của cư dân                </p>
              </div>
            </div>
          </div>

          <div className="adl-header-aside">
            <div className="adl-stats-summary">
              <div className="adl-stat-item">
                <FileText size={16} className="adl-stat-icon icon-primary" />
                <div className="adl-stat-text">
                  <span className="adl-stat-value">{totalCount}</span>
                  <span className="adl-stat-label">Tổng cọc</span>
                </div>
              </div>
              <div className="adl-stat-divider" />
              <div className="adl-stat-item">
                <Wallet size={16} className="adl-stat-icon icon-warning" />
                <div className="adl-stat-text">
                  <span className="adl-stat-value">{heldCount}</span>
                  <span className="adl-stat-label">Đang giữ</span>
                </div>
              </div>
              <div className="adl-stat-divider" />
              <div className="adl-stat-item">
                <DollarSign size={16} className="adl-stat-icon icon-accent" />
                <div className="adl-stat-text">
                  <span className="adl-stat-value">{refundedCount}</span>
                  <span className="adl-stat-label">Đã hoàn</span>
                </div>
              </div>
            </div>

            <div className="adl-header-actions" />
          </div>
        </div>
      </div>

      <div className="adl-toolbar">
        <div className="adl-toolbar-left">
          <div className="adl-search-box">
            <Search size={18} className="adl-search-icon" />
            <input
              type="text"
              className="adl-search-input"
              placeholder="Tìm tên người cọc..."
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
            />
          </div>

          <div className="adl-search-box" style={{ minWidth: "180px", maxWidth: "220px" }}>
            <Search size={18} className="adl-search-icon" />
            <input
              type="text"
              className="adl-search-input"
              placeholder="SĐT hoặc Email..."
              value={filterContact}
              onChange={(e) => setFilterContact(e.target.value)}
            />
          </div>

          <div className="adl-search-box" style={{ minWidth: "140px", maxWidth: "160px" }}>
            <Search size={18} className="adl-search-icon" />
            <input
              type="text"
              className="adl-search-input"
              placeholder="Tên phòng..."
              value={filterRoom}
              onChange={(e) => setFilterRoom(e.target.value)}
            />
          </div>

          <div className="adl-control-group">
            <Filter size={16} className="adl-toolbar-icon" aria-hidden />
            <select
              className="adl-custom-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="Held">Đang giữ</option>
              <option value="Refunded">Đã hoàn</option>
              <option value="Forfeited">Đã phạt</option>
              <option value="Expired">Đã hết hạn</option>
              <option value="Pending">Đang chờ</option>
            </select>
          </div>
        </div>
      </div>

      <div className="adl-table-container">
        <table className="adl-table">
          <thead>
            <tr>
              <th className="adl-cell-stt">STT</th>
              <th className="adl-cell-name">Tên người cọc</th>
              <th className="adl-cell-contact">SĐT / Email</th>
              <th className="adl-cell-room">Phòng</th>
              <th className="adl-cell-amount">Số tiền cọc</th>
              <th className="adl-cell-date">Ngày cọc</th>
              <th className="adl-cell-status">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {paginatedDeposits.length > 0 ? (
              paginatedDeposits.map((deposit, index) => (
                <tr key={deposit._id}>
                  <td className="adl-cell-stt">
                    {(currentPage - 1) * ROWS_PER_PAGE + index + 1}
                  </td>
                  <td className="adl-cell-name">
                    <div className="main-text">{deposit.name}</div>
                  </td>
                  <td className="adl-cell-contact">
                    <div className="main-text">{deposit.phone}</div>
                    <div className="desc-text">{deposit.email}</div>
                  </td>
                  <td className="adl-cell-room">
                    <span className="adl-status-badge pending" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                      {deposit.room?.name || "N/A"}
                    </span>
                  </td>
                  <td className="adl-cell-amount">
                    {formatCurrency(deposit.amount)}
                  </td>
                  <td className="adl-cell-date">
                    {deposit.createdDate
                      ? format(new Date(deposit.createdDate), "dd/MM/yyyy HH:mm")
                      : deposit.createdAt
                        ? format(new Date(deposit.createdAt), "dd/MM/yyyy HH:mm")
                        : "N/A"}
                  </td>
                  <td className="adl-cell-status">
                    <span
                      className={`adl-status-badge ${deposit.status === "Held"
                        ? "held"
                        : deposit.status === "Refunded"
                          ? "refunded"
                          : deposit.status === "Forfeited"
                            ? "forfeited"
                            : deposit.status === "Expired"
                              ? "expired"
                              : "pending"
                        }`}
                    >
                      {getStatusLabel(deposit.status)}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="adl-table-empty-cell">
                  Không tìm thấy dữ liệu tiền cọc nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="adl-pagination">
          <span className="adl-pagination-info">
            Tổng: <strong>{filteredDeposits.length}</strong> bản ghi
            &nbsp;|&nbsp; Trang <strong>{currentPage}</strong>/{totalPages}
          </span>
          <div className="adl-pagination-controls">
            <button
              className="adl-page-btn adl-page-arrow"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
              title="Trang đầu"
              type="button"
            >
              «
            </button>
            <button
              className="adl-page-btn adl-page-arrow"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              title="Trang trước"
              type="button"
            >
              ‹
            </button>

            {pageNumbers.map((page) => (
              <button
                key={page}
                className={`adl-page-btn${currentPage === page ? " adl-page-active" : ""}`}
                onClick={() => setCurrentPage(page)}
                type="button"
              >
                {page}
              </button>
            ))}

            <button
              className="adl-page-btn adl-page-arrow"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              title="Trang sau"
              type="button"
            >
              ›
            </button>
            <button
              className="adl-page-btn adl-page-arrow"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
              title="Trang cuối"
              type="button"
            >
              »
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

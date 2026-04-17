import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { format } from "date-fns";
import {
  Plus, Search, Filter,
  FileText, Sparkles, LayoutGrid, DollarSign, Wallet
} from "lucide-react";
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
  const [filterContact, setFilterContact] = useState("");
  const [filterRoom, setFilterRoom] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Pagination
  const ROWS_PER_PAGE = 8; // aligned with ManagementDevice mostly
  const [currentPage, setCurrentPage] = useState(1);

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

  // Filter deposits based on filter values
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
  }, [filterName, filterContact, filterRoom, filterStatus]);

  // Quick Stats
  const totalCount = deposits.length;
  const heldCount = deposits.filter(d => d.status === "Held").length;
  // High value could be deposits greater than 2,000,000 for example, or we can just show Refunded
  const refundedCount = deposits.filter(d => d.status === "Refunded").length;

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", marginTop: "2rem" }}>
        <span>Đang tải dữ liệu tiền cọc...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ marginTop: "2rem", textAlign: "center", color: "#ef4444" }}>
        <h3>Error loading deposits</h3>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="deposit-container1">
      {/* HEADER */}
      <div className="deposit-header">
        <div className="deposit-header-top">
          <div className="deposit-title-block">
            <div className="deposit-title-row">
              <div className="deposit-title-icon" aria-hidden>
                <Wallet size={22} strokeWidth={2} />
              </div>
              <div className="deposit-title-text">
                <h2>Danh sách tiền cọc</h2>
                <p className="deposit-subtitle">
                  Quản lý tiền cọc phòng tại tòa nhà. Theo dõi các khoản tiền đang giữ, đã hoàn, hoặc tiền phạt.
                </p>
              </div>
            </div>
          </div>

          <div className="deposit-header-aside">
            <div className="deposit-stats-summary">
              <div className="deposit-stat-item">
                <FileText size={16} className="deposit-stat-icon icon-primary" />
                <div className="deposit-stat-text">
                  <span className="deposit-stat-value">{totalCount}</span>
                  <span className="deposit-stat-label">Tổng cọc</span>
                </div>
              </div>
              <div className="deposit-stat-divider"></div>
              <div className="deposit-stat-item">
                <Wallet size={16} className="deposit-stat-icon icon-warning" />
                <div className="deposit-stat-text">
                  <span className="deposit-stat-value">{heldCount}</span>
                  <span className="deposit-stat-label">Đang giữ</span>
                </div>
              </div>
              <div className="deposit-stat-divider"></div>
              <div className="deposit-stat-item">
                <DollarSign size={16} className="deposit-stat-icon icon-accent" />
                <div className="deposit-stat-text">
                  <span className="deposit-stat-value">{refundedCount}</span>
                  <span className="deposit-stat-label">Đã hoàn</span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <button
                className="deposit-btn-primary"
                onClick={() => navigate(`${basePath}/deposits/floor-map`)}
              >
                <Plus size={18} /> Tạo Cọc Mới
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="deposit-toolbar">
        <div className="deposit-toolbar-left">
          <div className="deposit-search-box">
            <Search size={18} className="deposit-search-icon" />
            <input
              type="text"
              className="deposit-search-input"
              placeholder="Tìm tên người cọc..."
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
            />
          </div>

          <div className="deposit-search-box" style={{ minWidth: "180px", maxWidth: "220px" }}>
            <Search size={18} className="deposit-search-icon" />
            <input
              type="text"
              className="deposit-search-input"
              placeholder="SĐT hoặc Email..."
              value={filterContact}
              onChange={(e) => setFilterContact(e.target.value)}
            />
          </div>

          <div className="deposit-search-box" style={{ minWidth: "140px", maxWidth: "160px" }}>
            <Search size={18} className="deposit-search-icon" />
            <input
              type="text"
              className="deposit-search-input"
              placeholder="Tên phòng..."
              value={filterRoom}
              onChange={(e) => setFilterRoom(e.target.value)}
            />
          </div>

          <div className="deposit-control-group">
            <Filter size={16} className="deposit-toolbar-icon" aria-hidden />
            <select
              className="deposit-custom-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="Held">Đang giữ</option>
              <option value="Refunded">Đã hoàn</option>
              <option value="Forfeited">Đã phạt</option>
              <option value="Expired">Đã hết hạn</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="deposit-table-container">
        <table className="deposit-table">
          <thead>
            <tr>
              <th className="dp-cell-stt">STT</th>
              <th className="dp-cell-name">Tên người cọc</th>
              <th className="dp-cell-contact">SĐT / Email</th>
              <th className="dp-cell-room">Phòng</th>
              <th className="dp-cell-amount">Số tiền cọc</th>
              <th className="dp-cell-date">Ngày cọc</th>
              <th className="dp-cell-status">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {paginatedDeposits.length > 0 ? (
              paginatedDeposits.map((deposit, index) => (
                <tr key={deposit._id}>
                  <td className="dp-cell-stt">
                    {(currentPage - 1) * ROWS_PER_PAGE + index + 1}
                  </td>
                  <td className="dp-cell-name">
                    <div className="main-text">{deposit.name}</div>
                  </td>
                  <td className="dp-cell-contact">
                    <div className="main-text">{deposit.phone}</div>
                    <div className="desc-text">{deposit.email}</div>
                  </td>
                  <td className="dp-cell-room">
                    <span className="dp-status-badge pending" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      {deposit.room?.name || "N/A"}
                    </span>
                  </td>
                  <td className="dp-cell-amount">
                    {formatCurrency(deposit.amount)}
                  </td>
                  <td className="dp-cell-date">
                    {deposit.createdDate
                      ? format(new Date(deposit.createdDate), "dd/MM/yyyy HH:mm")
                      : deposit.createdAt
                        ? format(new Date(deposit.createdAt), "dd/MM/yyyy HH:mm")
                        : "N/A"}
                  </td>
                  <td className="dp-cell-status">
                    <span
                      className={`dp-status-badge ${deposit.status === "Held"
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
                      {deposit.status === "Held"
                        ? "Đang giữ"
                        : deposit.status === "Refunded"
                          ? "Đã hoàn"
                          : deposit.status === "Forfeited"
                            ? "Đã phạt"
                            : deposit.status === "Expired"
                              ? "Đã hết hạn"
                              : "Đang chờ"}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="dp-table-empty-cell">
                  Không tìm thấy dữ liệu tiền cọc nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination aligned with Deposit/Device */}
        <div className="dp-pagination">
          <span className="dp-pagination-info">
            Tổng: <strong>{filteredDeposits.length}</strong> bản ghi
            &nbsp;|&nbsp; Trang <strong>{currentPage}</strong>/{totalPages}
          </span>
          <div className="dp-pagination-controls">
            <button
              className="dp-page-btn dp-page-arrow"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
              title="Trang đầu"
            >
              «
            </button>
            <button
              className="dp-page-btn dp-page-arrow"
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
              if (currentPage >= totalPages - 1) start = Math.max(1, totalPages - 4);
              for (let i = start; i <= end; i++) pages.push(i);
              return pages.map((page) => (
                <button
                  key={page}
                  className={`dp-page-btn${currentPage === page ? " dp-page-active" : ""}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ));
            })()}

            <button
              className="dp-page-btn dp-page-arrow"
              disabled={currentPage === totalPages}
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              title="Trang sau"
            >
              ›
            </button>
            <button
              className="dp-page-btn dp-page-arrow"
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

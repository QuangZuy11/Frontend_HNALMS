import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { format } from "date-fns";
import {
  Plus, Search, Filter,
  FileText, Sparkles, LayoutGrid, DollarSign, Wallet, Edit2, X, Eye
} from "lucide-react";
import toastr from "toastr";
import "toastr/build/toastr.min.css";
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

  // Edit Modal State
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "", phone: "", email: "", room: null as any, status: "Held"
  });

  useEffect(() => {
    const draft = sessionStorage.getItem("depositEditDraft");
    if (draft) {
      const parsed = JSON.parse(draft);
      setSelectedDeposit(parsed.deposit);
      setEditForm(parsed.form);
      setIsEditModalOpen(true);
      sessionStorage.removeItem("depositEditDraft");
    }
  }, []);

  const openEditModal = (deposit: Deposit) => {
    setSelectedDeposit(deposit);
    setEditForm({
      name: deposit.name,
      phone: deposit.phone,
      email: deposit.email,
      room: deposit.room,
      status: deposit.status || "Held"
    });
    setIsEditModalOpen(true);
  };

  const openDetailModal = (deposit: Deposit) => {
    setSelectedDeposit(deposit);
    setIsDetailModalOpen(true);
  };

  const handleSelectRoomForEdit = () => {
    sessionStorage.setItem("depositEditDraft", JSON.stringify({
      deposit: selectedDeposit,
      form: editForm
    }));
    navigate(`${basePath}/deposits/floor-map?selectForEdit=true`);
  };

  const handleSaveEdit = async () => {
    if (!selectedDeposit) return;
    try {
      const response = await axios.put(`http://localhost:9999/api/deposits/${selectedDeposit._id}`, {
        name: editForm.name,
        phone: editForm.phone,
        email: editForm.email,
        room: editForm.room._id,
        status: editForm.status
      }, { withCredentials: true });
      if (response.data.success) {
        toastr.success("Cập nhật thành công");
        setIsEditModalOpen(false);
        // Refresh deposits
        const fetchResponse = await axios.get("http://localhost:9999/api/deposits", { withCredentials: true });
        if (fetchResponse.data.success) {
          setDeposits(fetchResponse.data.data);
        }
      }
    } catch (err: any) {
      toastr.error(err.response?.data?.message || "Lỗi khi cập nhật");
    }
  };

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
              <th className="dp-cell-action" style={{ textAlign: "center" }}>Hành động</th>
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
                  <td className="dp-cell-action" style={{ textAlign: "center" }}>
                    <div className="dp-action-group">
                      <button
                        onClick={() => openDetailModal(deposit)}
                        className="dp-btn-icon view"
                        title="Xem chi tiết"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => openEditModal(deposit)}
                        className="dp-btn-icon edit"
                        title="Chỉnh sửa cọc"
                      >
                        <Edit2 size={16} />
                      </button>
                    </div>
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

      {/* DETAIL MODAL */}
      {isDetailModalOpen && (
        <div className="dr-unique-modal-backdrop">
          <div className="dr-unique-modal-container">
            <div className="dr-unique-modal-header">
              <h3 className="dr-unique-modal-title">Chi tiết tiền cọc</h3>
              <button onClick={() => setIsDetailModalOpen(false)} className="dr-unique-modal-close" title="Đóng">
                <X size={20} />
              </button>
            </div>
            
            {(selectedDeposit?.contractId || selectedDeposit?.activationStatus === true) && (
              <div style={{ padding: "12px", marginBottom: "20px", borderRadius: "8px", background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af", fontSize: "0.9rem", lineHeight: "1.5" }}>
                <strong>Lưu ý:</strong> Cọc này đã được sử dụng để ký hợp đồng {typeof selectedDeposit?.contractId === "object" && (selectedDeposit?.contractId as any)?.contractCode ? `(Mã HĐ: ${(selectedDeposit.contractId as any).contractCode})` : ""}.
              </div>
            )}

            <div style={{ display: "flex", gap: "20px", marginBottom: "20px", padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px dashed #cbd5e1" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px" }}>Ngày thu cọc</div>
                <div style={{ fontSize: "0.95rem", color: "#0f172a", fontWeight: "500" }}>
                  {selectedDeposit?.createdDate ? format(new Date(selectedDeposit.createdDate), "dd/MM/yyyy HH:mm") : selectedDeposit?.createdAt ? format(new Date(selectedDeposit.createdAt), "dd/MM/yyyy HH:mm") : "N/A"}
                </div>
              </div>
              {selectedDeposit?.status === "Refunded" && selectedDeposit?.refundDate && (
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.8rem", color: "#166534", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px" }}>Ngày hoàn cọc</div>
                  <div style={{ fontSize: "0.95rem", color: "#0f172a", fontWeight: "500" }}>
                    {format(new Date(selectedDeposit.refundDate), "dd/MM/yyyy HH:mm")}
                  </div>
                </div>
              )}
            </div>

            <div className="dr-unique-form-grid">
              <div className="dr-unique-form-group">
                <label className="dr-unique-form-label">Tên người cọc</label>
                <input type="text" className="dr-unique-form-input" value={selectedDeposit?.name || ""} disabled />
              </div>

              <div className="dr-unique-form-group">
                <label className="dr-unique-form-label">Số điện thoại</label>
                <input type="text" className="dr-unique-form-input" value={selectedDeposit?.phone || ""} disabled />
              </div>

              <div className="dr-unique-form-group">
                <label className="dr-unique-form-label">Email</label>
                <input type="email" className="dr-unique-form-input" value={selectedDeposit?.email || ""} disabled />
              </div>

              <div className="dr-unique-form-group">
                <label className="dr-unique-form-label">Trạng thái</label>
                <select className="dr-unique-form-select" value={selectedDeposit?.status || "Held"} disabled>
                  <option value="Held">Đã thu (Đang giữ)</option>
                  <option value="Pending">Đang chờ (Pending)</option>
                  <option value="Refunded">Đã hoàn (Refunded)</option>
                  <option value="Forfeited">Đã phạt (Forfeited)</option>
                  <option value="Expired">Đã hết hạn (Expired)</option>
                </select>
              </div>

              <div className="dr-unique-form-group">
                <label className="dr-unique-form-label">Phòng</label>
                <input type="text" className="dr-unique-form-input" value={selectedDeposit?.room?.name || "N/A"} disabled />
              </div>
              
              <div className="dr-unique-form-group">
                <label className="dr-unique-form-label">Số tiền cọc</label>
                <input type="text" className="dr-unique-form-input" value={formatCurrency(selectedDeposit?.amount || 0)} disabled />
              </div>
            </div>

            <div className="dr-unique-modal-actions">
              <button type="button" className="dr-unique-btn-cancel" onClick={() => setIsDetailModalOpen(false)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditModalOpen && (
        <div className="dr-unique-modal-backdrop">
          <div className="dr-unique-modal-container">
            <div className="dr-unique-modal-header">
              <h3 className="dr-unique-modal-title">Chỉnh sửa thông tin cọc</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="dr-unique-modal-close" title="Đóng">
                <X size={20} />
              </button>
            </div>
            
            {(selectedDeposit?.contractId || selectedDeposit?.activationStatus === true) && (
              <div style={{ padding: "12px", marginBottom: "20px", borderRadius: "8px", background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af", fontSize: "0.9rem", lineHeight: "1.5" }}>
                <strong>Lưu ý:</strong> Cọc này đã được sử dụng để ký hợp đồng {typeof selectedDeposit?.contractId === "object" && (selectedDeposit?.contractId as any)?.contractCode ? `(Mã HĐ: ${(selectedDeposit.contractId as any).contractCode})` : ""}. Vì vậy, bạn **không thể** thay đổi phòng và trạng thái cọc phải tuân theo hợp đồng.
              </div>
            )}

            <div style={{ display: "flex", gap: "20px", marginBottom: "20px", padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px dashed #cbd5e1" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px" }}>Ngày thu cọc</div>
                <div style={{ fontSize: "0.95rem", color: "#0f172a", fontWeight: "500" }}>
                  {selectedDeposit?.createdDate ? format(new Date(selectedDeposit.createdDate), "dd/MM/yyyy HH:mm") : selectedDeposit?.createdAt ? format(new Date(selectedDeposit.createdAt), "dd/MM/yyyy HH:mm") : "N/A"}
                </div>
              </div>
              {selectedDeposit?.status === "Refunded" && selectedDeposit?.refundDate && (
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.8rem", color: "#166534", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px" }}>Ngày hoàn cọc</div>
                  <div style={{ fontSize: "0.95rem", color: "#0f172a", fontWeight: "500" }}>
                    {format(new Date(selectedDeposit.refundDate), "dd/MM/yyyy HH:mm")}
                  </div>
                </div>
              )}
            </div>

            <div className="dr-unique-form-grid">
              <div className="dr-unique-form-group">
                <label className="dr-unique-form-label">Tên người cọc</label>
                <input type="text" className="dr-unique-form-input" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} placeholder="Nhập tên người cọc..." />
              </div>

              <div className="dr-unique-form-group">
                <label className="dr-unique-form-label">Số điện thoại</label>
                <input type="text" className="dr-unique-form-input" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} placeholder="Nhập số điện thoại..." />
              </div>

              <div className="dr-unique-form-group">
                <label className="dr-unique-form-label">Email</label>
                <input type="email" className="dr-unique-form-input" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} placeholder="Nhập địa chỉ email..." />
              </div>

              <div className="dr-unique-form-group">
                <label className="dr-unique-form-label">Trạng thái</label>
                <select className="dr-unique-form-select" value={editForm.status} disabled>
                  <option value="Held">Đã thu (Đang giữ)</option>
                  <option value="Pending">Đang chờ (Pending)</option>
                  <option value="Refunded">Đã hoàn (Refunded)</option>
                  <option value="Forfeited">Đã phạt (Forfeited)</option>
                  <option value="Expired">Đã hết hạn (Expired)</option>
                </select>
              </div>

              <div className="dr-unique-form-group dr-unique-col-span-2">
                <label className="dr-unique-form-label">Phòng</label>
                <div className="dr-unique-room-select-wrapper">
                  <div className="dr-unique-room-display">
                    {selectedDeposit?.room?._id !== editForm.room?._id ? (
                      <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ color: "#64748b", textDecoration: "line-through", fontSize: "0.9rem" }}>Phòng cũ: {selectedDeposit?.room?.name}</span>
                        <span style={{ color: "#334155", fontSize: "0.85rem" }}>➔</span>
                        <span style={{ color: "#059669", fontWeight: "700" }}>Phòng mới: {editForm.room?.name}</span>
                      </span>
                    ) : (
                      editForm.room?.name || "N/A"
                    )}
                  </div>
                  {(!selectedDeposit?.contractId && selectedDeposit?.activationStatus !== true && (selectedDeposit?.status === "Held" || selectedDeposit?.status === "Pending")) && (
                    <button type="button" className="dr-unique-btn-select-room" onClick={handleSelectRoomForEdit}>
                      Chọn phòng
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="dr-unique-modal-actions">
              <button type="button" className="dr-unique-btn-cancel" onClick={() => setIsEditModalOpen(false)}>
                Hủy
              </button>
              <button type="button" className="dr-unique-btn-save" onClick={handleSaveEdit}>
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepositRoom;

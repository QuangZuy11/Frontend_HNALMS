import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { format } from "date-fns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { vi } from "date-fns/locale/vi";
import {
  Plus, Search, Filter,
  FileText, DollarSign, Wallet, Edit2, X, Eye, Printer, FileSpreadsheet
} from "lucide-react";
import toastr from "toastr";
import "toastr/build/toastr.min.css";
import * as XLSX from "xlsx-js-style";
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

const convertToText = (n: number) => {
  if (!n || n === 0) return "Không đồng";
  const units = ["", "nghìn ", "triệu ", "tỷ ", "nghìn tỷ "];
  const t = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  let str = "";
  let unitIndex = 0;
  while (n > 0) {
    let p = n % 1000;
    n = Math.floor(n / 1000);
    if (p > 0 || unitIndex === 0) {
      let c = p % 10;
      let b = Math.floor((p / 10)) % 10;
      let a = Math.floor(p / 100);
      let pStr = "";
      if (a > 0 || (n > 0 && p > 0)) pStr += t[a] + " trăm ";
      if (b > 1) pStr += t[b] + " mươi ";
      else if (b === 1) pStr += "mười ";
      else if (a > 0 && c > 0) pStr += "lẻ ";

      if (c === 1 && b > 1) pStr += "mốt ";
      else if (c === 5 && b > 0) pStr += "lăm ";
      else if (c > 0 || (p === 0 && unitIndex === 0)) pStr += t[c] + " ";

      if (p > 0) str = pStr + units[unitIndex] + str;
    }
    unitIndex++;
  }
  str = str.replace(/lẻ không /g, "").trim() + " đồng";
  return str.charAt(0).toUpperCase() + str.slice(1);
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
  const [printDeposit, setPrintDeposit] = useState<Deposit | null>(null);
  const [editForm, setEditForm] = useState({
    name: "", phone: "", email: "", room: null as any, status: "Held"
  });

  // Excel Export Modal State
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [excelFromDate, setExcelFromDate] = useState<Date | null>(null);
  const [excelToDate, setExcelToDate] = useState<Date | null>(new Date());

  // Chuyển dd/mm/yyyy → chuỗi YYYYMMDD cho tên file
  const dateToFileLabel = (d: Date | null) => d ? format(d, "ddMMyyyy") : "all";

  const handleExportExcel = () => {
    // Đặt giờ phút: from 00:00:00, to 23:59:59
    const from = excelFromDate ? new Date(excelFromDate.getFullYear(), excelFromDate.getMonth(), excelFromDate.getDate(), 0, 0, 0) : null;
    const to = excelToDate ? new Date(excelToDate.getFullYear(), excelToDate.getMonth(), excelToDate.getDate(), 23, 59, 59) : null;

    const rows = deposits.filter(d => {
      const rawDate = d.createdDate || d.createdAt;
      if (!rawDate) return false;
      const date = new Date(rawDate);
      if (from && date < from) return false;
      if (to && date > to) return false;
      return true;
    });

    if (rows.length === 0) {
      toastr.warning("Không có dữ liệu trong khoảng thời gian đã chọn.");
      return;
    }

    const statusLabel = (s: string) => {
      if (s === "Held") return "Đang giữ";
      if (s === "Refunded") return "Đã hoàn";
      if (s === "Forfeited") return "Đã phạt";
      if (s === "Expired") return "Đã hết hạn";
      return "Đang chờ";
    };

    const headers = ["STT", "Tên người cọc", "Số điện thoại", "Email", "Phòng", "Số tiền cọc (VND)", "Ngày cọc", "Trạng thái", "Ngày hoàn cọc"];

    const data = rows.map((d, i) => {
      const rawDate = d.createdDate || d.createdAt;
      return [
        i + 1,
        d.name,
        d.phone,
        d.email,
        d.room?.name || "N/A",
        d.amount,
        rawDate ? format(new Date(rawDate), "dd/MM/yyyy HH:mm") : "N/A",
        statusLabel(d.status),
        d.refundDate ? format(new Date(d.refundDate), "dd/MM/yyyy HH:mm") : ""
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);

    // Style header row
    headers.forEach((_, ci) => {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: ci });
      ws[cellRef].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "1D4ED8" } },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: {
          top: { style: "thin", color: { rgb: "BFDBFE" } },
          bottom: { style: "thin", color: { rgb: "BFDBFE" } },
          left: { style: "thin", color: { rgb: "BFDBFE" } },
          right: { style: "thin", color: { rgb: "BFDBFE" } }
        }
      };
    });

    // Style data rows
    data.forEach((row, ri) => {
      row.forEach((_, ci) => {
        const cellRef = XLSX.utils.encode_cell({ r: ri + 1, c: ci });
        if (!ws[cellRef]) return;
        ws[cellRef].s = {
          fill: { fgColor: { rgb: ri % 2 === 0 ? "EFF6FF" : "FFFFFF" } },
          alignment: { vertical: "center", horizontal: ci === 5 ? "right" : "left" },
          border: {
            top: { style: "thin", color: { rgb: "DBEAFE" } },
            bottom: { style: "thin", color: { rgb: "DBEAFE" } },
            left: { style: "thin", color: { rgb: "DBEAFE" } },
            right: { style: "thin", color: { rgb: "DBEAFE" } }
          }
        };
      });
    });

    ws["!cols"] = [8, 24, 16, 28, 10, 20, 18, 14, 18].map(w => ({ wch: w }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh sách tiền cọc");

    const fromLabel = dateToFileLabel(excelFromDate);
    const toLabel = dateToFileLabel(excelToDate);
    XLSX.writeFile(wb, `TienCoc_${fromLabel}_${toLabel}.xlsx`);

    toastr.success(`Xuất thành công ${rows.length} bản ghi!`);
    setIsExcelModalOpen(false);
  };

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

  const handlePrint = (deposit: Deposit) => {
    setPrintDeposit(deposit);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  useEffect(() => {
    const afterPrint = () => setPrintDeposit(null);
    window.addEventListener('afterprint', afterPrint);
    return () => window.removeEventListener('afterprint', afterPrint);
  }, []);

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
                className="deposit-btn-excel"
                onClick={() => setIsExcelModalOpen(true)}
              >
                <FileSpreadsheet size={18} /> Kết xuất Excel
              </button>
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
                      <button
                        onClick={() => handlePrint(deposit)}
                        className="dp-btn-icon"
                        title="In / Tải PDF phiếu thu"
                        style={{ color: '#059669', borderColor: '#d1fae5', background: '#ecfdf5' }}
                      >
                        <Printer size={16} />
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

            <div className="dr-unique-modal-actions" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <button type="button" className="dr-unique-btn-cancel" onClick={() => handlePrint(selectedDeposit!)} style={{ background: '#f8fafc', borderColor: '#cbd5e1', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Printer size={16} /> In / Tải PDF
              </button>
              <button type="button" className="dr-unique-btn-save" onClick={() => setIsDetailModalOpen(false)} style={{ background: '#3b82f6' }}>
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
                <input type="text" className="dr-unique-form-input" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} placeholder="Nhập tên người cọc..." />
              </div>

              <div className="dr-unique-form-group">
                <label className="dr-unique-form-label">Số điện thoại</label>
                <input type="text" className="dr-unique-form-input" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} placeholder="Nhập số điện thoại..." />
              </div>

              <div className="dr-unique-form-group">
                <label className="dr-unique-form-label">Email</label>
                <input type="email" className="dr-unique-form-input" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} placeholder="Nhập địa chỉ email..." />
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

      {/* EXCEL EXPORT MODAL */}
      {isExcelModalOpen && (
        <div className="dr-unique-modal-backdrop">
          <div className="dr-unique-modal-container" style={{ maxWidth: "520px" }}>
            <div className="dr-unique-modal-header">
              <h3 className="dr-unique-modal-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FileSpreadsheet size={20} style={{ color: "#16a34a" }} />
                Kết xuất Excel
              </h3>
              <button onClick={() => setIsExcelModalOpen(false)} className="dr-unique-modal-close" title="Đóng">
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: "8px 0 4px" }}>
              <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: "0.9rem", lineHeight: "1.6" }}>
                Chọn khoảng thời gian để lọc dữ liệu tiền cọc theo <strong>ngày tạo</strong> trước khi xuất ra file Excel.
              </p>

              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", overflow: "hidden" }}>
                  <div style={{ minWidth: 0 }}>
                    <label className="dr-unique-form-label">Từ ngày</label>
                    <DatePicker
                      value={excelFromDate}
                      onChange={(val) => setExcelFromDate(val)}
                      format="dd/MM/yyyy"
                      maxDate={excelToDate ?? undefined}
                      slotProps={{
                        textField: {
                          variant: "outlined",
                          size: "small",
                          placeholder: "DD/MM/YYYY",
                          sx: {
                            width: "100%",
                            "& .MuiOutlinedInput-root": {
                              fontFamily: "'Inter', sans-serif",
                              fontSize: "0.9rem",
                              borderRadius: "8px",
                              background: "#fff",
                              "& fieldset": { borderColor: "#cbd5e1" },
                              "&:hover fieldset": { borderColor: "#3579c6" },
                              "&.Mui-focused fieldset": { borderColor: "#3579c6", borderWidth: "1.5px" },
                            },
                            "& .MuiInputBase-input": { padding: "9px 12px" },
                          },
                        },
                        popper: {
                          disablePortal: false,
                          modifiers: [{ name: "flip", enabled: false }],
                          style: { zIndex: 9999 },
                        },
                      }}
                    />
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <label className="dr-unique-form-label">Đến ngày</label>
                    <DatePicker
                      value={excelToDate}
                      onChange={(val) => setExcelToDate(val)}
                      format="dd/MM/yyyy"
                      minDate={excelFromDate ?? undefined}
                      maxDate={new Date()}
                      slotProps={{
                        textField: {
                          variant: "outlined",
                          size: "small",
                          placeholder: "DD/MM/YYYY",
                          sx: {
                            width: "100%",
                            "& .MuiOutlinedInput-root": {
                              fontFamily: "'Inter', sans-serif",
                              fontSize: "0.9rem",
                              borderRadius: "8px",
                              background: "#fff",
                              "& fieldset": { borderColor: "#cbd5e1" },
                              "&:hover fieldset": { borderColor: "#3579c6" },
                              "&.Mui-focused fieldset": { borderColor: "#3579c6", borderWidth: "1.5px" },
                            },
                            "& .MuiInputBase-input": { padding: "9px 12px" },
                          },
                        },
                        popper: {
                          disablePortal: false,
                          modifiers: [{ name: "flip", enabled: false }],
                          style: { zIndex: 9999 },
                        },
                      }}
                    />
                  </div>
                </div>
              </LocalizationProvider>

              {!excelFromDate && (
                <p style={{ margin: "12px 0 0", color: "#f59e0b", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "6px" }}>
                  Nếu không chọn "Từ ngày", sẽ xuất toàn bộ dữ liệu đến ngày kết thúc.
                </p>
              )}
            </div>

            <div className="dr-unique-modal-actions">
              <button type="button" className="dr-unique-btn-cancel" onClick={() => setIsExcelModalOpen(false)}>
                Hủy
              </button>
              <button
                type="button"
                className="dr-unique-btn-save"
                onClick={handleExportExcel}
                style={{ background: "linear-gradient(135deg, #16a34a, #15803d)", display: "flex", alignItems: "center", gap: "8px" }}
              >
                <FileSpreadsheet size={16} /> Xuất Excel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT CONTAINER */}
      <div className="dp-print-container">
        {printDeposit && (
          <div style={{ padding: '20px', fontFamily: '"Times New Roman", Times, serif', color: '#000', lineHeight: 1.5, fontSize: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '15px', marginBottom: '30px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', textTransform: 'uppercase', fontWeight: 'bold' }}>TÒA NHÀ HOÀNG NAM</h2>
                <p style={{ margin: 0 }}>Địa chỉ: Số nhà 56, Cụm 3, Thôn 3, Xã Hòa Lạc, Hà Nội</p>
                <p style={{ margin: 0 }}>Điện thoại: 0869048066</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontWeight: 'bold' }}>Mẫu số: 01-TT</p>
                <p style={{ margin: 0, fontStyle: 'italic', fontSize: '14px' }}>(Ban hành theo thông tư số ...)</p>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>PHIẾU THU TIỀN CỌC</h1>
              <p style={{ margin: '5px 0 0 0', fontStyle: 'italic', fontSize: '15px' }}>
                {(() => {
                  const d = printDeposit.createdDate ? new Date(printDeposit.createdDate) : printDeposit.createdAt ? new Date(printDeposit.createdAt) : new Date();
                  return `Ngày ${d.getDate().toString().padStart(2, '0')} tháng ${(d.getMonth() + 1).toString().padStart(2, '0')} năm ${d.getFullYear()}`;
                })()}
              </p>
            </div>

            <div style={{ lineHeight: '2' }}>
              <p style={{ margin: 0 }}><strong>Họ và tên người nộp tiền:</strong> <span style={{ textTransform: 'uppercase' }}>{printDeposit.name}</span></p>
              <p style={{ margin: 0 }}><strong>Số điện thoại:</strong> {printDeposit.phone}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<strong>Email:</strong> {printDeposit.email}</p>
              <p style={{ margin: 0 }}><strong>Lý do nộp:</strong> Tiền cọc giữ phòng <strong style={{ textTransform: 'uppercase' }}>{printDeposit.room?.name || 'N/A'}</strong></p>
              <p style={{ margin: 0 }}><strong>Số tiền:</strong> <span style={{ fontWeight: 'bold', fontSize: '20px' }}>{formatCurrency(printDeposit.amount)}</span></p>
              <p style={{ margin: 0 }}><strong>Bằng chữ:</strong> <em>{convertToText(printDeposit.amount)}</em></p>
              <p style={{ margin: 0 }}><strong>Trạng thái:</strong> {printDeposit.status === 'Held' ? 'Đã thu (Đang giữ)' : printDeposit.status === 'Refunded' ? 'Đã hoàn' : printDeposit.status === 'Forfeited' ? 'Đã phạt' : printDeposit.status === 'Expired' ? 'Đã hết hạn' : 'Đang chờ'}</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '60px', textAlign: 'center' }}>
              <div style={{ width: '40%' }}>
                <p style={{ margin: 0, fontWeight: 'bold', fontSize: '18px' }}>Người nộp tiền</p>
                <p style={{ margin: 0, fontStyle: 'italic', fontSize: '15px' }}>(Ký, ghi rõ họ tên)</p>
                <div style={{ height: '100px' }}></div>
                <p style={{ margin: 0, fontWeight: 'bold' }}>{printDeposit.name}</p>
              </div>
              <div style={{ width: '40%' }}>
                <p style={{ margin: 0, fontWeight: 'bold', fontSize: '18px' }}>Người lập phiếu / Ban quản lý</p>
                <p style={{ margin: 0, fontStyle: 'italic', fontSize: '15px' }}>(Ký, ghi rõ họ tên)</p>
                <div style={{ height: '100px' }}></div>
                <p style={{ margin: 0, fontWeight: 'bold' }}>..........................................</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DepositRoom;

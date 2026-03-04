import React, { useEffect, useState } from "react";
import axios from "axios";
import { Eye } from "lucide-react";
import toastr from "toastr";
import "toastr/build/toastr.min.css";
import "./InvoiceManage.css";

const API_BASE_URL = "http://localhost:9999/api";

interface InvoiceItem {
  itemName: string;
  usage: number;
  unitPrice: number;
  amount: number;
}

interface Invoice {
  _id: string;
  invoiceCode: string;
  roomId: { _id: string; name: string } | string;
  title: string;
  totalAmount: number;
  status: "Draft" | "Unpaid" | "Paid";
  dueDate: string;
  items?: InvoiceItem[];
}

const formatCurrency = (val: number) => {
  if (isNaN(val) || val === null || val === undefined) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(val);
};

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("vi-VN");

const InvoiceList: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 11;

  // Cấu hình toastr + load dữ liệu
  useEffect(() => {
    toastr.options = {
      closeButton: true,
      positionClass: "toast-top-right",
      timeOut: 3000,
    };
    fetchInvoices();
  }, []);

  // Khóa scroll dọc như màn Phiếu chi
  useEffect(() => {
    const main = document.querySelector(
      ".dashboard-layout-main"
    ) as HTMLElement | null;

    if (main) {
      main.style.overflowY = "hidden";
    }
    const originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      if (main) {
        main.style.overflowY = "";
      }
      document.body.style.overflow = originalBodyOverflow;
    };
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/invoices`);
      const list: Invoice[] = res.data.data || [];
      setInvoices(list);
      setCurrentPage(1);
    } catch {
      toastr.error("Không thể tải danh sách hóa đơn");
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(invoices.length / pageSize) || 1);
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedInvoices = invoices.slice(
    startIndex,
    startIndex + pageSize
  );

  const handleViewDetail = async (id: string) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/invoices/${id}`);
      setSelectedInvoice(res.data.data);
      setShowDetailModal(true);
    } catch {
      toastr.error("Không thể lấy chi tiết hóa đơn");
    }
  };

  return (
    <div className="payments-page">
      <div className="payments-card">
        <div className="payments-header">
          <div>
            <h1>Danh sách hóa đơn</h1>
            <p className="subtitle">
              Các hóa đơn tiền phòng, điện nước và dịch vụ liên quan đến căn hộ
            </p>
          </div>
        </div>

        {!loading && invoices.length === 0 && (
          <div className="payments-empty">
            <p>Hiện chưa có hóa đơn nào.</p>
          </div>
        )}

        {loading && (
          <div className="payments-empty">
            <p>Đang tải dữ liệu...</p>
          </div>
        )}

        {!loading && invoices.length > 0 && (
          <div className="payments-table-wrap">
            <table className="payments-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Mã HĐ</th>
                  <th>Phòng</th>
                  <th>Tiêu đề</th>
                  <th>Tổng tiền</th>
                  <th>Hạn chót</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedInvoices.map((inv, index) => (
                  <tr key={inv._id}>
                    <td>{startIndex + index + 1}</td>
                    <td className="text-code">{inv.invoiceCode}</td>
                    <td style={{ fontWeight: 600 }}>
                      {typeof inv.roomId === "object" ? inv.roomId.name : inv.roomId}
                    </td>
                    <td>{inv.title}</td>
                    <td>{formatCurrency(inv.totalAmount)}</td>
                    <td>{formatDate(inv.dueDate)}</td>
                    <td>
                      <span
                        className={`status-badge ${
                          inv.status === "Paid" ? "paid" : "unpaid"
                        }`}
                      >
                        {inv.status === "Draft"
                          ? "Bản nháp"
                          : inv.status === "Unpaid"
                          ? "Chưa thu"
                          : "Đã thu"}
                      </span>
                    </td>
                    <td>
                      <div className="payments-actions">
                        <button
                          className="payments-icon-btn"
                          title="Xem chi tiết"
                          onClick={() => handleViewDetail(inv._id)}
                        >
                          <Eye size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && invoices.length > 0 && (
          <div className="payments-pagination">
            <button
              type="button"
              className="payments-page-nav"
              disabled={safePage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              {"<"}
            </button>

            <button
              type="button"
              className="payments-page-number active"
              aria-current="page"
            >
              {safePage}
            </button>

            <button
              type="button"
              className="payments-page-nav"
              disabled={safePage === totalPages}
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
            >
              {">"}
            </button>
          </div>
        )}

        {showDetailModal && selectedInvoice && (
        <div
          className="payments-modal-overlay"
          onClick={() => setShowDetailModal(false)}
        >
          <div
            className="payments-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="payments-modal-header">
              <h3>Chi tiết hóa đơn</h3>
              <button
                type="button"
                className="payments-modal-close"
                onClick={() => setShowDetailModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="payments-modal-body">
              <div className="payments-detail-row">
                <span className="payments-detail-label">Mã hóa đơn</span>
                <span className="payments-detail-value">
                  {selectedInvoice.invoiceCode}
                </span>
              </div>
              <div className="payments-detail-row">
                <span className="payments-detail-label">Phòng</span>
                <span className="payments-detail-value">
                  {typeof selectedInvoice.roomId === "object"
                    ? selectedInvoice.roomId.name
                    : selectedInvoice.roomId}
                </span>
              </div>
              <div className="payments-detail-row">
                <span className="payments-detail-label">Tiêu đề</span>
                <span className="payments-detail-value">
                  {selectedInvoice.title}
                </span>
              </div>
              <div className="payments-detail-row">
                <span className="payments-detail-label">Hạn thanh toán</span>
                <span className="payments-detail-value">
                  {formatDate(selectedInvoice.dueDate)}
                </span>
              </div>
              <div className="payments-detail-row">
                <span className="payments-detail-label">Trạng thái</span>
                <span className="payments-detail-value">
                  {selectedInvoice.status === "Draft"
                    ? "Bản nháp"
                    : selectedInvoice.status === "Unpaid"
                    ? "Chưa thu"
                    : "Đã thu"}
                </span>
              </div>

              {selectedInvoice.items && selectedInvoice.items.length > 0 && (
                <div
                  style={{
                    marginTop: 12,
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    overflow: "hidden",
                  }}
                >
                  <table
                    className="payments-table"
                    style={{ margin: 0, fontSize: 13 }}
                  >
                    <thead>
                      <tr>
                        <th>Nội dung thu</th>
                        <th style={{ textAlign: "center" }}>Số lượng</th>
                        <th style={{ textAlign: "right" }}>Đơn giá</th>
                        <th style={{ textAlign: "right" }}>Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.items.map((item, index) => (
                        <tr key={index}>
                          <td>{item.itemName}</td>
                          <td style={{ textAlign: "center" }}>{item.usage}</td>
                          <td style={{ textAlign: "right" }}>
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {formatCurrency(item.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="payments-detail-row">
                <span className="payments-detail-label">
                  Tổng thanh toán
                </span>
                <span className="payments-detail-value">
                  {formatCurrency(selectedInvoice.totalAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceList;


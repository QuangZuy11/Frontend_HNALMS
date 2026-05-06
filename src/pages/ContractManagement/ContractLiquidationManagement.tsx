import React, { useState, useEffect, useMemo } from "react";
import {
  Search as SearchIcon,
  Autorenew as RefreshCcwIcon,
  Visibility as EyeIcon,
  Close as XIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Warning as AlertTriangleIcon,
  CloudQueue as CloudLightningIcon,
  Sync as Loader2Icon,
  Description as FileTextIcon,
  Person as UserIcon,
  Home as HomeIcon,
  CalendarToday as CalendarIcon,
  Receipt as ReceiptIcon,
  FlashOn as ZapIcon,
  WaterDrop as DropletsIcon,
  Image as ImageIconIcon,
  Error as AlertCircleIcon,
  Restore as RotateCcwIcon,
} from "@mui/icons-material";
import toastr from "toastr";
import "toastr/build/toastr.min.css";
import {
  liquidationService,
  type LiquidationItem,
  type LiquidationType,
} from "../../services/liquidationService";
import "./ContractLiquidationManagement.css";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const formatCurrency = (amount: number | null | undefined): string => {
  if (amount == null) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateStr: string | undefined): string => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatDateTime = (dateStr: string | undefined): string => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getTypeLabel = (type: LiquidationType): string => {
  return type === "force_majeure" ? "Bất khả kháng" : "Vi phạm";
};

const getTypeColor = (type: LiquidationType): string => {
  return type === "force_majeure"
    ? "type-badge--force-majeure"
    : "type-badge--violation";
};

const getSettlementLabel = (item: LiquidationItem): { label: string; amount: number; color: string } => {
  if (item.settlementType === "refund" || (item.liquidationType === "force_majeure" && item.totalSettlement >= 0)) {
    return {
      label: "Hoàn tiền",
      amount: item.totalSettlement,
      color: "#16a34a",
    };
  } else {
    return {
      label: "Cần thu",
      amount: item.totalSettlement,
      color: "#dc2626",
    };
  }
};

const getInvoiceItems = (item: LiquidationItem): any[] => {
  const invoiceItems = (item.invoiceId as any)?.items;
  if (Array.isArray(invoiceItems) && invoiceItems.length > 0) return invoiceItems;

  const ticketItems = (item.financialTicketId as any)?.items;
  if (Array.isArray(ticketItems)) return ticketItems;

  return [];
};

const normalizeUtilityText = (value: unknown): string => {
  if (!value) return "";
  if (typeof value === "string") return value.toLowerCase();
  if (typeof value === "object") {
    const name = (value as any).name || (value as any).serviceName;
    if (name) return String(name).toLowerCase();
  }
  return "";
};

const getUtilityType = (
  mr: any,
  index: number,
  total: number,
  items?: any[]
): "electric" | "water" => {
  const text = normalizeUtilityText(mr?.utilityId);
  if (text.includes("điện") || text.includes("dien") || text.includes("electric")) return "electric";
  if (text.includes("nước") || text.includes("nuoc") || text.includes("water")) return "water";

  const safeItems = Array.isArray(items) ? items : [];
  const matchedItem = safeItems.find(
    (it) =>
      it?.isIndex &&
      (it.oldIndex === mr?.oldIndex && it.newIndex === mr?.newIndex)
  );
  if (matchedItem?.itemName) {
    const name = String(matchedItem.itemName).toLowerCase();
    if (name.includes("điện") || name.includes("electric")) return "electric";
    if (name.includes("nước") || name.includes("water")) return "water";
  }

  if (total === 2) return index === 0 ? "electric" : "water";
  return "water";
};

const findUtilityItem = (
  mr: any,
  items: any[],
  utilityType: "electric" | "water"
) => {
  const keywords = utilityType === "electric"
    ? ["điện", "dien", "electric"]
    : ["nước", "nuoc", "water"];

  const byName = items.find((it) => {
    const name = String(it?.itemName || "").toLowerCase();
    return keywords.some((key) => name.includes(key));
  });
  if (byName) return byName;

  return items.find(
    (it) =>
      it?.isIndex &&
      (it.oldIndex === mr?.oldIndex && it.newIndex === mr?.newIndex)
  );
};

const getStatusBadge = (status: string | undefined, type: LiquidationType, settlementAmount: number, settlementType?: string) => {
  if (status === "pending_owner") {
    return { label: "Chờ chủ tòa nhà duyệt", className: "clm-status-badge clm-status-badge--pending" };
  }
  if (status === "pending_accountant") {
    const isRefund = settlementType === "refund" || (type === "force_majeure" && settlementAmount >= 0);
    return {
      label: isRefund ? "Chờ kế toán giải ngân" : "Chờ kế toán thu tiền",
      className: "clm-status-badge clm-status-badge--info"
    };
  }
  if (status === "completed") {
    return { label: "Đã quyết toán", className: "clm-status-badge clm-status-badge--success" };
  }

  // Fallback if no status field from backend yet
  if (type === "force_majeure" && settlementAmount >= 0) {
    return { label: "Chờ chủ tòa nhà duyệt", className: "clm-status-badge clm-status-badge--pending" };
  }

  return { label: "Đã quyết toán", className: "clm-status-badge clm-status-badge--success" };
};

// ─────────────────────────────────────────────
// Confirm Modal
// ─────────────────────────────────────────────
interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  message,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  confirmColor = "#ef4444",
  loading = false,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div className="clm-modal-overlay" onClick={onCancel}>
      <div className="clm-modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="clm-modal-header">
          <div className="clm-modal-header-left">
            <div className="clm-modal-header-icon" style={{ background: "#fef2f2", color: "#ef4444" }}>
              <AlertCircleIcon className="mui-icon mui-icon-alert-circle" />
            </div>
            <h2 style={{ fontSize: 18 }}>{title}</h2>
          </div>
          <button className="clm-modal-close" onClick={onCancel}>
            <XIcon className="mui-icon mui-icon-x" />
          </button>
        </div>
        <div className="clm-modal-body" style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: 15, color: "#374151", lineHeight: 1.6, whiteSpace: "pre-line" }}>
            {message}
          </div>
        </div>
        <div className="clm-modal-footer">
          <button className="clm-btn clm-btn--secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </button>
          <button
            className="clm-btn"
            style={{ background: confirmColor, color: "#fff", minWidth: 120 }}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2Icon className="mui-icon mui-icon-spinner" /> Đang xử lý...
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// DetailModal Props
// ─────────────────────────────────────────────
interface DetailModalProps {
  item: LiquidationItem | null;
  open: boolean;
  onClose: () => void;
  onRestore: (id: string) => void;
  restoring: boolean;
}

const DetailModal: React.FC<DetailModalProps> = ({
  item,
  open,
  onClose,
  onRestore,
  restoring,
}) => {
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  if (!open || !item) return null;

  const contractData = typeof item.contractId === "object" ? item.contractId : null;
  const settlement = getSettlementLabel(item);

  return (
    <div className="clm-modal-overlay" onClick={onClose}>
      <div className="clm-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="clm-modal-header">
          <div className="clm-modal-header-left">
            <div className="clm-modal-header-icon">
              <FileTextIcon className="mui-icon mui-icon-file-text" />
            </div>
            <h2>Chi Tiết Thanh Lý Hợp Đồng</h2>
          </div>
          <button className="clm-modal-close" onClick={onClose}>
            <XIcon className="mui-icon mui-icon-x" />
          </button>
        </div>

        {/* Body */}
        <div className="clm-modal-body">
          {/* Alert banner */}
          <div className={`clm-alert-banner ${item.liquidationType === "force_majeure" ? "clm-alert--info" : "clm-alert--danger"}`}>
            <div className="clm-alert-icon">
              {item.liquidationType === "force_majeure" ? (
                <CloudLightningIcon className="mui-icon mui-icon-cloud" />
              ) : (
                <AlertTriangleIcon className="mui-icon mui-icon-alert" />
              )}
            </div>
            <div className="clm-alert-content">
              <strong>{getTypeLabel(item.liquidationType)}</strong>
              <span>Ngày thanh lý: {formatDate(item.liquidationDate)}</span>
            </div>
            <div className="clm-alert-amount" style={{ color: settlement.color }}>
              {formatCurrency(settlement.amount)}
            </div>
          </div>

          <div className="clm-detail-grid">
            {/* Left column */}
            <div className="clm-detail-col">
              {/* Contract Info */}
              <div className="clm-detail-section">
                <h3 className="clm-section-title">
                  <FileTextIcon className="mui-icon mui-icon-file-text" /> Thông Tin Hợp Đồng
                </h3>
                <div className="clm-info-grid">
                  <div className="clm-info-item">
                    <label>Mã HĐ</label>
                    <span>{contractData?.contractCode || "—"}</span>
                  </div>
                  <div className="clm-info-item">
                    <label>Ngày bắt đầu</label>
                    <span>{formatDate(contractData?.startDate)}</span>
                  </div>
                  <div className="clm-info-item">
                    <label>Ngày kết thúc</label>
                    <span>{formatDate(contractData?.endDate)}</span>
                  </div>
                </div>
              </div>

              {/* Room & Tenant */}
              <div className="clm-detail-section">
                <h3 className="clm-section-title">
                  <HomeIcon className="mui-icon mui-icon-home" /> Phòng & Khách Thuê
                </h3>
                <div className="clm-info-grid">
                  <div className="clm-info-item">
                    <label>Phòng</label>
                    <span>
                      {typeof contractData?.roomId === "object"
                        ? (contractData.roomId as any)?.name
                        : "—"}
                    </span>
                  </div>
                  <div className="clm-info-item">
                    <label>Khách thuê</label>
                    <span>
                      {typeof contractData?.tenantId === "object"
                        ? (contractData.tenantId as any)?.username
                        : "—"}
                    </span>
                  </div>
                  <div className="clm-info-item">
                    <label>Email</label>
                    <span>
                      {typeof contractData?.tenantId === "object"
                        ? (contractData.tenantId as any)?.email || "—"
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Financial breakdown */}
              <div className="clm-detail-section">
                <h3 className="clm-section-title">
                  <ReceiptIcon className="mui-icon mui-icon-receipt" /> Chi Tiết Tài Chính
                </h3>
                <div className="clm-financial-list">
                  {item.liquidationType === "force_majeure" ? (
                    <>
                      <div className="clm-financial-item">
                        <span className="clm-fi-label">Hoàn tiền cọc</span>
                        <span className="clm-fi-value positive">
                          + {formatCurrency(item.depositRefundAmount)}
                        </span>
                      </div>
                      <div className="clm-financial-item">
                        <span className="clm-fi-label">Hoàn tiền thuê còn dư</span>
                        <span className="clm-fi-value positive">
                          + {formatCurrency(item.remainingRentAmount)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="clm-financial-item">
                      <span className="clm-fi-label">Tiền thuê còn nợ</span>
                      <span className="clm-fi-value negative">
                        {formatCurrency(item.rentDebtAmount)}
                      </span>
                    </div>
                  )}

                  {/* Utility costs */}
                  {item.meterReadingIds?.map((mr, idx) => {
                    const invoiceItems = getInvoiceItems(item);
                    const utilityType = getUtilityType(
                      mr,
                      idx,
                      item.meterReadingIds?.length || 0,
                      invoiceItems
                    );
                    const isElectric = utilityType === "electric";
                    const isUtilityDeduct =
                      item.liquidationType === "force_majeure" &&
                      (item.settlementType === "refund" || item.totalSettlement >= 0);
                    const usage = mr.usageAmount || 0;
                    const reading = findUtilityItem(mr, invoiceItems, utilityType);
                    const amount = reading?.amount ?? 0;
                    const label = isUtilityDeduct
                      ? (isElectric ? "Trừ tiền điện cuối kỳ" : "Trừ tiền nước cuối kỳ")
                      : (isElectric ? "Tiền điện cuối kỳ" : "Tiền nước cuối kỳ");

                    return (
                      <div className="clm-financial-item" key={idx}>
                        <span className="clm-fi-label">
                          {label}
                          <span className="clm-fi-usage">
                            ({mr.oldIndex} → {mr.newIndex}, {usage} {isElectric ? "kWh" : "m³"})
                          </span>
                        </span>
                        <span className={`clm-fi-value ${isUtilityDeduct ? "negative" : "positive"}`}>
                          {isUtilityDeduct ? "-" : ""} {formatCurrency(Math.abs(amount))}
                        </span>
                      </div>
                    );
                  })}

                  <div className="clm-financial-divider" />
                  <div className="clm-financial-item clm-financial-total">
                    <span className="clm-fi-label">Tổng tất toán</span>
                    <span
                      className="clm-fi-value"
                      style={{ color: settlement.color }}
                    >
                      {formatCurrency(settlement.amount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="clm-detail-col">
              {/* Note */}
              <div className="clm-detail-section">
                <h3 className="clm-section-title">
                  <AlertTriangleIcon className="mui-icon mui-icon-alert" /> Lý Do / Ghi Chú
                </h3>
                <p className="clm-note-text">{item.note || "Không có ghi chú."}</p>
              </div>

              {/* Images */}
              {item.images && item.images.length > 0 && (
                <div className="clm-detail-section">
                  <h3 className="clm-section-title">
                    <ImageIconIcon className="mui-icon mui-icon-image" /> Hình Ảnh Bằng Chứng ({item.images.length})
                  </h3>
                  <div className="clm-images-grid">
                    {item.images.map((img, idx) => (
                      <div
                        key={idx}
                        className="clm-image-thumb clm-image-thumb--clickable"
                        title={`Xem ảnh ${idx + 1}`}
                        onClick={() => setLightboxImg(img)}
                      >
                        <img
                          src={img}
                          alt={`Bằng chứng ${idx + 1}`}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='90' viewBox='0 0 120 90'%3E%3Crect width='120' height='90' fill='%23f1f5f9'/%3E%3Ctext x='60' y='45' text-anchor='middle' dominant-baseline='middle' font-family='sans-serif' font-size='12' fill='%2394a3b8'%3EKhông có ảnh%3C/text%3E%3C/svg%3E";
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Meter readings */}
              {item.meterReadingIds && item.meterReadingIds.length > 0 && (
                <div className="clm-detail-section">
                  <h3 className="clm-section-title">
                    <ZapIcon className="mui-icon mui-icon-zap" /> Chỉ Số Điện / Nước Cuối Kỳ
                  </h3>
                  <div className="clm-meter-list">
                    {item.meterReadingIds.map((mr, idx) => {
                      const invoiceItems = getInvoiceItems(item);
                      const utilityType = getUtilityType(
                        mr,
                        idx,
                        item.meterReadingIds?.length || 0,
                        invoiceItems
                      );
                      const isElectric = utilityType === "electric";
                      return (
                        <div key={idx} className="clm-meter-item">
                          <div className="clm-meter-icon">
                            {isElectric ? <ZapIcon className="mui-icon mui-icon-zap" /> : <DropletsIcon className="mui-icon mui-icon-droplets" />}
                          </div>
                          <div className="clm-meter-info">
                            <strong>{isElectric ? "Điện" : "Nước"}</strong>
                            <div className="clm-meter-values">
                              <span>Cũ: <strong>{mr.oldIndex}</strong></span>
                              <span>Mới: <strong>{mr.newIndex}</strong></span>
                              <span>Đã dùng: <strong>{mr.usageAmount} {isElectric ? "kWh" : "m³"}</strong></span>
                            </div>
                            <span className="clm-meter-date">
                              Ngày đọc: {formatDate(mr.readingDate)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="clm-detail-section">
                <h3 className="clm-section-title">
                  <CalendarIcon className="mui-icon mui-icon-calendar" /> Thông Tin Hệ Thống
                </h3>
                <div className="clm-info-grid">
                  <div className="clm-info-item">
                    <label>Tạo lúc</label>
                    <span>{formatDateTime(item.createdAt)}</span>
                  </div>
                  <div className="clm-info-item">
                    <label>Cập nhật lúc</label>
                    <span>{formatDateTime(item.updatedAt)}</span>
                  </div>
                  <div className="clm-info-item">
                    <label>ID Thanh lý</label>
                    <span className="clm-id-text">{item._id}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="clm-modal-footer">
          <button className="clm-btn clm-btn--secondary" onClick={onClose}>
            Đóng
          </button>
          {item.status !== "completed" && (
            <button
              className="clm-btn clm-btn--restore"
              onClick={() => onRestore(item._id)}
              disabled={restoring}
            >
              {restoring ? (
                <>
                  <Loader2Icon className="mui-icon mui-icon-spinner" /> Đang hoàn tác...
                </>
              ) : (
                <>
                  <RotateCcwIcon className="mui-icon mui-icon-restore" /> Hoàn Tác Thanh Lý
                </>
              )}
            </button>
          )}
        </div>

        {/* Lightbox Image Viewer */}
        {lightboxImg && (
          <div
            className="clm-modal-overlay"
            style={{ background: "rgba(0,0,0,0.9)", zIndex: 1000 }}
            onClick={() => setLightboxImg(null)}
          >
            <button
              className="clm-modal-close"
              style={{ position: "fixed", top: 16, right: 16, zIndex: 1001, background: "rgba(255,255,255,0.15)", color: "#fff" }}
              onClick={() => setLightboxImg(null)}
            >
              <XIcon className="mui-icon mui-icon-x" />
            </button>
            <img
              src={lightboxImg}
              alt="Xem ảnh"
              style={{
                maxWidth: "90vw",
                maxHeight: "90vh",
                objectFit: "contain",
                borderRadius: 8,
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
const ContractLiquidationManagement: React.FC = () => {
  const [liquidations, setLiquidations] = useState<LiquidationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [filterType, setFilterType] = useState<LiquidationType | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [detailItem, setDetailItem] = useState<LiquidationItem | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    id: string | null;
    title: string;
    message: React.ReactNode;
  }>({ open: false, id: null, title: "", message: null });

  const PAGE_SIZE = 10;

  // ── Fetch data ──
  const fetchLiquidations = async () => {
    setLoading(true);
    try {
      const res = await liquidationService.getAll();
      if (res.success) {
        setLiquidations(res.data || []);
      }
    } catch (err: any) {
      toastr.error(err?.response?.data?.message || "Không thể tải danh sách thanh lý.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiquidations();
  }, []);

  // ── Filtered & paginated data ──
  const filteredData = useMemo(() => {
    return liquidations.filter((item) => {
      // Type filter
      if (filterType !== "all" && item.liquidationType !== filterType) return false;

      // Search filter
      if (searchText.trim()) {
        const keyword = searchText.toLowerCase();
        const contractData =
          typeof item.contractId === "object"
            ? item.contractId
            : null;

        const roomName = typeof contractData?.roomId === "object"
          ? (contractData.roomId as any)?.name?.toLowerCase() || ""
          : "";
        const tenantName = typeof contractData?.tenantId === "object"
          ? (contractData.tenantId as any)?.username?.toLowerCase() || ""
          : "";
        const contractCode = (contractData?.contractCode || "").toLowerCase();
        const note = (item.note || "").toLowerCase();

        return (
          roomName.includes(keyword) ||
          tenantName.includes(keyword) ||
          contractCode.includes(keyword) ||
          note.includes(keyword)
        );
      }

      return true;
    });
  }, [liquidations, filterType, searchText]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedData = filteredData.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // ── Open detail ──
  const openDetail = async (item: LiquidationItem) => {
    try {
      const liquidation = await liquidationService.getById(item._id);
      setDetailItem(liquidation);
      setDetailModalOpen(true);
    } catch {
      // Fallback: show from list data
      setDetailItem(item);
      setDetailModalOpen(true);
    }
  };

  // ── Open restore confirm ──
  const openRestoreConfirm = (id: string) => {
    setConfirmModal({
      open: true,
      id,
      title: "Xác nhận hoàn tác thanh lý",
      message:
        "Bạn có chắc muốn hoàn tác thanh lý này?\n\n" +
        "• Hợp đồng sẽ được khôi phục về trạng thái Hoạt động\n" +
        "• Phòng sẽ trở về trạng thái Đã thuê\n" +
        "• Tiền đặt cọc sẽ được hoàn trả về trạng thái Đã giữ\n" +
        "• Hóa đơn thanh lý sẽ bị xóa\n" +
        "• Email thông báo sẽ được gửi đến khách thuê",
    });
  };

  // ── Restore ──
  const handleRestore = async () => {
    const id = confirmModal.id;
    if (!id) return;
    setRestoring(true);
    try {
      const res = await liquidationService.restore(id);
      if (res.success) {
        toastr.success(res.message || "Đã hoàn tác thanh lý thành công.");
        setConfirmModal((prev) => ({ ...prev, open: false, id: null }));
        setDetailModalOpen(false);
        setDetailItem(null);
        await fetchLiquidations();
      }
    } catch (err: any) {
      toastr.error(
        err?.response?.data?.message ||
        "Không thể hoàn tác thanh lý. Vui lòng thử lại."
      );
    } finally {
      setRestoring(false);
    }
  };

  // ── Stats ──
  const stats = useMemo(() => {
    const total = liquidations.length;
    const forceMajeure = liquidations.filter((l) => l.liquidationType === "force_majeure").length;
    const violation = liquidations.filter((l) => l.liquidationType === "violation").length;
    return { total, forceMajeure, violation };
  }, [liquidations]);

  return (
    <div className="clm-page">
      {/* Page Header */}
      <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Quản Lý Thanh Lý Hợp Đồng</h1>
          <p>Danh sách các hợp đồng đã thanh lý — Manager có thể xem chi tiết và hoàn tác nếu cần.</p>
        </div>
      </header>

      {/* Stats Cards */}
      <section className="summary-cards">
        <div className="summary-card">
          <div className="card-icon">
            <FileTextIcon className="mui-icon mui-icon-file-text-large" />
          </div>
          <div className="card-info">
            <span className="card-value">{stats.total}</span>
            <span className="card-label">Tổng thanh lý</span>
          </div>
        </div>
        <div className="summary-card">
          <div className="card-icon" style={{ background: '#dbeafe', color: '#3b82f6' }}>
            <CloudLightningIcon className="mui-icon mui-icon-cloud-large" />
          </div>
          <div className="card-info">
            <span className="card-value">{stats.forceMajeure}</span>
            <span className="card-label">Bất khả kháng</span>
          </div>
        </div>
        <div className="summary-card">
          <div className="card-icon" style={{ background: '#fee2e2', color: '#ef4444' }}>
            <AlertTriangleIcon className="mui-icon mui-icon-alert-large" />
          </div>
          <div className="card-info">
            <span className="card-value">{stats.violation}</span>
            <span className="card-label">Vi phạm</span>
          </div>
        </div>
      </section>

      {/* Filters */}
      <div className="clm-filters-section">
        <div className="clm-filters-row">
          <div className="clm-search-wrapper">
            <SearchIcon className="clm-search-icon mui-icon mui-icon-search" />
            <input
              type="text"
              className="clm-search-input"
              placeholder="Tìm theo mã HĐ, phòng, khách thuê, ghi chú..."
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setCurrentPage(1);
              }}
            />
            {searchText && (
              <button
                className="clm-search-clear"
                onClick={() => {
                  setSearchText("");
                  setCurrentPage(1);
                }}
              >
                <XIcon className="mui-icon mui-icon-x" />
              </button>
            )}
          </div>

          <div className="clm-filter-group">
            <label>Loại thanh lý:</label>
            <select
              className="clm-filter-select"
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value as LiquidationType | "all");
                setCurrentPage(1);
              }}
            >
              <option value="all">Tất cả</option>
              <option value="force_majeure">Bất khả kháng</option>
              <option value="violation">Vi phạm</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="clm-table-container">
        <div className="clm-table-wrapper">
          {loading ? (
            <div className="clm-loading">
              <Loader2Icon className="mui-icon mui-icon-spinner-large" />
              <span>Đang tải danh sách thanh lý...</span>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="clm-empty">
              <div className="clm-empty-icon">
                <RefreshCcwIcon className="mui-icon mui-icon-refresh-empty" />
              </div>
              <h3>Không có bản ghi thanh lý nào</h3>
              <p>
                {searchText || filterType !== "all"
                  ? "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm."
                  : "Chưa có hợp đồng nào được thanh lý."}
              </p>
            </div>
          ) : (
            <>
              <table className="clm-table">
                <thead>
                  <tr>
                    <th className="col-stt">STT</th>
                    <th className="col-code">Mã Hợp Đồng</th>
                    <th className="col-room">Phòng</th>
                    <th className="col-tenant">Khách Thuê</th>
                    <th className="col-type">Loại</th>
                    <th className="col-date">Ngày Thanh Lý</th>
                    <th className="col-amount">Tổng Tất Toán</th>
                    <th className="col-status">Trạng Thái</th>
                    <th className="col-actions">Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((item, idx) => {
                    const contractData =
                      typeof item.contractId === "object" ? item.contractId : null;
                    const settlement = getSettlementLabel(item);

                    return (
                      <tr key={item._id}>
                        <td className="col-stt">
                          <span className="col-stt-num">{(safePage - 1) * PAGE_SIZE + idx + 1}</span>
                        </td>
                        <td className="col-code">
                          <span className="clm-code-badge">
                            {contractData?.contractCode || "—"}
                          </span>
                        </td>
                        <td className="col-room">
                          <span className="clm-room-name">
                            <span className="clm-room-icon">
                              <HomeIcon className="mui-icon mui-icon-home-row" />
                            </span>
                            {typeof contractData?.roomId === "object"
                              ? (contractData.roomId as any)?.name
                              : "—"}
                          </span>
                        </td>
                        <td className="col-tenant">
                          <span className="clm-tenant-name">
                            <span className="clm-tenant-icon">
                              <UserIcon className="mui-icon mui-icon-user-row" />
                            </span>
                            {typeof contractData?.tenantId === "object"
                              ? (contractData.tenantId as any)?.username
                              : "—"}
                          </span>
                        </td>
                        <td className="col-type">
                          <span className={`clm-type-badge ${getTypeColor(item.liquidationType)}`}>
                            {item.liquidationType === "force_majeure" ? (
                              <CloudLightningIcon className="mui-icon mui-icon-cloud-badge" />
                            ) : (
                              <AlertTriangleIcon className="mui-icon mui-icon-alert-badge" />
                            )}
                            {getTypeLabel(item.liquidationType)}
                          </span>
                        </td>
                        <td className="col-date">{formatDate(item.liquidationDate)}</td>
                        <td className="col-amount">
                          <div className="clm-amount-wrapper">
                            <span className="clm-amount" style={{ color: settlement.color }}>
                              {formatCurrency(settlement.amount)}
                            </span>
                            <span className="clm-amount-label">{settlement.label}</span>
                          </div>
                        </td>
                        <td className="col-status">
                          {(() => {
                            const badge = getStatusBadge(item.status, item.liquidationType, settlement.amount, item.settlementType);
                            return (
                              <span className={badge.className}>
                                {badge.label}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="col-actions">
                          <button
                            className="clm-action-btn mui-action-btn-special"
                            onClick={() => openDetail(item)}
                            title="Xem chi tiết"
                          >
                            <EyeIcon className="mui-icon mui-icon-eye-action" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="clm-pagination">
                  <span className="clm-pagination-info">
                    Hiển thị {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredData.length)} của {filteredData.length} bản ghi
                  </span>
                  <div className="clm-pagination-controls">
                    <button
                      className="clm-page-btn"
                      disabled={safePage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeftIcon className="mui-icon mui-icon-chevron-left" />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        className={`clm-page-btn ${page === safePage ? "active" : ""}`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      className="clm-page-btn"
                      disabled={safePage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    >
                      <ChevronRightIcon className="mui-icon mui-icon-chevron-right" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <DetailModal
        item={detailItem}
        open={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setDetailItem(null);
        }}
        onRestore={openRestoreConfirm}
        restoring={restoring}
      />

      {/* Confirm Restore Modal */}
      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel="Hoàn tác"
        cancelLabel="Hủy"
        confirmColor="#10b981"
        loading={restoring}
        onConfirm={handleRestore}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, open: false, id: null }))}
      />
    </div>
  );
};

export default ContractLiquidationManagement;

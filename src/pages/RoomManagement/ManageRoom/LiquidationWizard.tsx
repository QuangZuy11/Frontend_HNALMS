import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import {
  X,
  AlertTriangle,
  Zap,
  Droplets,
  ShieldOff,
  Gavel,
  CheckCircle,
  Upload,
  ChevronRight,
  ChevronLeft,
  Calculator,
  FileText,
} from "lucide-react";
import "./LiquidationWizard.css";

const API_BASE_URL = "http://localhost:9999/api";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return "---";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

const today = () => {
  const d = new Date();
  return d.toISOString().split("T")[0];
};

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface Service {
  _id: string;
  name: string;
  currentPrice: number;
  type: "Fixed" | "Extension";
}

interface LiquidationWizardProps {
  contract: any; // contract object from ManageRoom (allRoomContracts selected)
  roomPrice: number; // giá phòng (currentPrice từ roomType)
  depositAmount: number; // số tiền cọc
  onClose: () => void;
  onSuccess: () => void;
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
const LiquidationWizard: React.FC<LiquidationWizardProps> = ({
  contract,
  roomPrice,
  depositAmount,
  onClose,
  onSuccess,
}) => {
  // ── Type selection ──────────────────────────
  const [liquidationType, setLiquidationType] = useState<
    "force_majeure" | "violation" | null
  >(null);

  // ── Step ────────────────────────────────────
  const [step, setStep] = useState<0 | 1 | 2>(0); // 0=type, 1=step1, 2=step2

  // ── Step 1 fields ───────────────────────────
  const [liquidationDate, setLiquidationDate] = useState(today());
  const [note, setNote] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [imageLocalPreviews, setImageLocalPreviews] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Step 2 fields ───────────────────────────
  const [electricService, setElectricService] = useState<Service | null>(null);
  const [waterService, setWaterService] = useState<Service | null>(null);
  const [electricOldIndex, setElectricOldIndex] = useState(0);
  const [waterOldIndex, setWaterOldIndex] = useState(0);
  const [electricNewIndex, setElectricNewIndex] = useState("");
  const [waterNewIndex, setWaterNewIndex] = useState("");

  // ── UI state ────────────────────────────────
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);

  // ── Fetch services on mount ──────────────────
  useEffect(() => {
    const fetchServices = async () => {
      setLoadingServices(true);
      try {
        const res = await axios.get(`${API_BASE_URL}/services`);
        const all: Service[] = res.data.data || res.data || [];

        // ── Tìm dịch vụ điện ──
        // Ưu tiên 1: tên chính xác "Điện" / "điện" / "Electric"
        // Ưu tiên 2: tên ngắn nhất chứa "điện" (để tránh "Gửi Xe máy điện")
        const ELEC_EXACT = ["điện", "electric", "tiền điện", "điện năng"];
        let elec =
          all.find((s) => ELEC_EXACT.includes(s.name.toLowerCase().trim())) ??
          all
            .filter((s) => s.name.toLowerCase().includes("điện") || s.name.toLowerCase().includes("electric"))
            .sort((a, b) => a.name.length - b.name.length)[0] ??
          null;

        // ── Tìm dịch vụ nước ──
        const WATER_EXACT = ["nước", "water", "tiền nước", "nước sinh hoạt"];
        let water =
          all.find((s) => WATER_EXACT.includes(s.name.toLowerCase().trim())) ??
          all
            .filter((s) => s.name.toLowerCase().includes("nước") || s.name.toLowerCase().includes("water"))
            .sort((a, b) => a.name.length - b.name.length)[0] ??
          null;

        if (elec) setElectricService(elec);
        if (water) setWaterService(water);

        console.log("[Liquidation] Dịch vụ điện:", elec?.name, "giá:", elec?.currentPrice);
        console.log("[Liquidation] Dịch vụ nước:", water?.name, "giá:", water?.currentPrice);
      } catch (e) {
        console.error("Lỗi tải dịch vụ:", e);
      } finally {
        setLoadingServices(false);
      }
    };
    fetchServices();
  }, []);

  // ── Fetch old meter indexes when going to Step 2 ──
  const fetchLatestIndexes = useCallback(async () => {
    if (!contract?.roomId?._id && !contract?.roomId) return;
    const roomId =
      typeof contract.roomId === "object"
        ? contract.roomId._id
        : contract.roomId;

    try {
      const fetches = [];
      if (electricService) {
        fetches.push(
          axios
            .get(`${API_BASE_URL}/meter-readings/latest`, {
              params: { roomId, utilityId: electricService._id },
            })
            .catch(() => ({ data: { data: null } }))
        );
      }
      if (waterService) {
        fetches.push(
          axios
            .get(`${API_BASE_URL}/meter-readings/latest`, {
              params: { roomId, utilityId: waterService._id },
            })
            .catch(() => ({ data: { data: null } }))
        );
      }

      const results = await Promise.all(fetches);
      if (electricService && results[0]?.data?.data) {
        setElectricOldIndex(results[0].data.data.newIndex ?? 0);
      }
      if (waterService && results[electricService ? 1 : 0]?.data?.data) {
        setWaterOldIndex(
          results[electricService ? 1 : 0].data.data.newIndex ?? 0
        );
      }
    } catch (e) {
      console.error("Lỗi lấy chỉ số:", e);
    }
  }, [contract, electricService, waterService]);

  useEffect(() => {
    if (step === 2) {
      fetchLatestIndexes();
    }
  }, [step, fetchLatestIndexes]);

  // ── Financial preview computation ────────────
  const computeFinancial = () => {
    if (!liquidationType) return null;

    const liqDate = new Date(liquidationDate);
    liqDate.setHours(12, 0, 0, 0);
    const msPerDay = 1000 * 60 * 60 * 24;

    // Số ngày đã dùng trong tháng — cho violation (tiền thuê nợ)
    const startOfMonth = new Date(liqDate.getFullYear(), liqDate.getMonth(), 1);
    const daysUsed = Math.round((liqDate.getTime() - startOfMonth.getTime()) / msPerDay) + 1;

    const elecUsage = Math.max(0, Number(electricNewIndex || 0) - electricOldIndex);
    const waterUsage = Math.max(0, Number(waterNewIndex || 0) - waterOldIndex);

    // Giá điện/nước: lấy trực tiếp Number() — currentPrice là Number trong DB
    const elecPrice = electricService ? Number(electricService.currentPrice) : 0;
    const waterPrice = waterService ? Number(waterService.currentPrice) : 0;

    // Chỉ tính tiền điện và nước — không tính dịch vụ nào khác
    const electricCost = elecUsage * elecPrice;
    const waterCost = waterUsage * waterPrice;
    const utilityCost = electricCost + waterCost;

    if (liquidationType === "force_majeure") {
      // Hoàn tiền thuê còn dư = từ ngày thanh lý đến endDate của hợp đồng
      let remainingDays = 0;
      let remainingRentLabel = "";

      if (contract.endDate) {
        const endDate = new Date(contract.endDate);
        endDate.setHours(12, 0, 0, 0);
        if (endDate > liqDate) {
          remainingDays = Math.round((endDate.getTime() - liqDate.getTime()) / msPerDay);
          remainingRentLabel = `${remainingDays} ngày (đến ${endDate.toLocaleDateString("vi-VN")})`;
        } else {
          remainingRentLabel = "0 ngày (hợp đồng đã hết hạn)";
        }
      } else {
        remainingRentLabel = "0 ngày";
      }

      const depositRefund = depositAmount;
      const remainRent = Math.round((roomPrice / 30) * remainingDays);
      // Tổng hoàn = cọc + tiền thuê dư − tiền điện − tiền nước
      const total = depositRefund + remainRent - utilityCost;

      return {
        type: "force_majeure" as const,
        daysUsed,
        remainingDays,
        remainingRentLabel,
        depositRefund,
        remainRent,
        electricCost,
        waterCost,
        utilityCost,
        total,
      };
    } else {
      const rentDebt = Math.round((roomPrice / 30) * daysUsed);
      // Tổng thu = tiền thuê nợ + tiền điện + tiền nước (đều CỘNG vào)
      const total = rentDebt + utilityCost;
      return {
        type: "violation" as const,
        daysUsed,
        rentDebt,
        electricCost,
        waterCost,
        utilityCost,
        total,
      };
    }
  };

  const financial = (step === 2 || step === 1) ? computeFinancial() : null;

  // ── Image upload ─────────────────────────────
  const handleImageFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingImages(true);
    setError("");

    // Local previews
    const localUrls: string[] = [];
    Array.from(files).forEach((f) => {
      localUrls.push(URL.createObjectURL(f));
    });
    setImageLocalPreviews((prev) => [...prev, ...localUrls]);

    try {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append("images", f));
      const res = await axios.post(
        `${API_BASE_URL}/liquidations/upload-images`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      if (res.data.success) {
        setImages((prev) => [...prev, ...res.data.data]);
      }
    } catch (e: any) {
      setError(
        "Lỗi upload ảnh: " + (e.response?.data?.message || e.message)
      );
      // Remove local previews on error
      setImageLocalPreviews((prev) =>
        prev.slice(0, prev.length - localUrls.length)
      );
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImageLocalPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Step 1 Validation ──────────────────────
  const validateStep1 = () => {
    if (!liquidationDate) {
      setError("Vui lòng chọn ngày thanh lý.");
      return false;
    }
    if (!note.trim()) {
      setError("Vui lòng nhập ghi chú/lý do thanh lý.");
      return false;
    }
    if (images.length === 0) {
      setError("Cần upload ít nhất 1 ảnh bằng chứng.");
      return false;
    }
    return true;
  };

  // ── Step 2 Validation ──────────────────────
  const validateStep2 = () => {
    if (!electricService || !waterService) {
      setError("Không tìm thấy dịch vụ điện/nước trong hệ thống.");
      return false;
    }
    if (electricNewIndex === "" || Number(electricNewIndex) < electricOldIndex) {
      setError(
        `Chỉ số điện mới (${electricNewIndex}) không được nhỏ hơn chỉ số cũ (${electricOldIndex}).`
      );
      return false;
    }
    if (waterNewIndex === "" || Number(waterNewIndex) < waterOldIndex) {
      setError(
        `Chỉ số nước mới (${waterNewIndex}) không được nhỏ hơn chỉ số cũ (${waterOldIndex}).`
      );
      return false;
    }
    return true;
  };

  // ── Submit ──────────────────────────────────
  const handleSubmit = async () => {
    setError("");
    if (!validateStep2()) return;

    setSubmitting(true);
    try {
      const payload = {
        contractId: contract._id,
        liquidationType,
        liquidationDate,
        note,
        images,
        electricServiceId: electricService!._id,
        waterServiceId: waterService!._id,
        electricNewIndex: Number(electricNewIndex),
        waterNewIndex: Number(waterNewIndex),
      };

      await axios.post(`${API_BASE_URL}/liquidations/create`, payload);
      onSuccess();
    } catch (e: any) {
      setError(
        "Lỗi thanh lý: " +
          (e.response?.data?.message || e.message || "Lỗi không xác định")
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render helpers ─────────────────────────
  const typeBadge = liquidationType ? (
    <span
      className={`liq-type-badge ${
        liquidationType === "force_majeure" ? "force" : "violation"
      }`}
    >
      {liquidationType === "force_majeure" ? (
        <ShieldOff size={12} />
      ) : (
        <AlertTriangle size={12} />
      )}
      {liquidationType === "force_majeure" ? "Bất khả kháng" : "Vi phạm"}
    </span>
  ) : null;

  const roomName =
    typeof contract.roomId === "object"
      ? contract.roomId.name
      : contract.roomId;

  // ── RENDER ─────────────────────────────────
  return (
    <div className="liq-overlay" onClick={onClose}>
      <div className="liq-modal" onClick={(e) => e.stopPropagation()}>
        {/* ── Header ── */}
        <div className="liq-header">
          <div className="liq-header-left">
            <div
              className={`liq-header-icon ${
                liquidationType === "violation" ? "violation" : "force"
              }`}
            >
              <Gavel size={20} />
            </div>
            <div>
              <div className="liq-header-title">
                Thanh lý Hợp đồng — {roomName || "---"}
              </div>
              <div className="liq-header-subtitle">
                {contract.contractCode} {typeBadge}
              </div>
            </div>
          </div>
          <button className="liq-close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* ── Stepper (ẩn ở step 0) ── */}
        {step > 0 && (
          <div className="liq-stepper">
            <div className={`liq-step ${step >= 1 ? (step > 1 ? "done" : "active") : ""}`}>
              <div className="liq-step-circle">
                {step > 1 ? <CheckCircle size={14} /> : "1"}
              </div>
              <span className="liq-step-label">Thông tin cơ bản</span>
            </div>
            <div className={`liq-step-connector ${step > 1 ? "done" : ""}`} />
            <div className={`liq-step ${step === 2 ? "active" : ""}`}>
              <div className="liq-step-circle">2</div>
              <span className="liq-step-label">Chỉ số & Hoá đơn</span>
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="liq-body" style={{ paddingBottom: 0 }}>
            <div className="liq-error">
              <AlertTriangle size={15} />
              {error}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            STEP 0 — Chọn loại thanh lý
           ══════════════════════════════════════ */}
        {step === 0 && (
          <>
            <p className="liq-type-selector-title">
              Chọn loại thanh lý cho hợp đồng này:
            </p>
            <div className="liq-type-selector">
              {/* Bất khả kháng */}
              <div
                className={`liq-type-card ${
                  liquidationType === "force_majeure" ? "selected-force" : ""
                }`}
                onClick={() => setLiquidationType("force_majeure")}
              >
                <div
                  className="liq-type-card-icon"
                  style={{
                    background:
                      liquidationType === "force_majeure"
                        ? "#dbeafe"
                        : "#f1f5f9",
                    color:
                      liquidationType === "force_majeure"
                        ? "#2563eb"
                        : "#64748b",
                  }}
                >
                  <ShieldOff size={26} />
                </div>
                <div className="liq-type-card-title">Bất khả kháng</div>
                <div className="liq-type-card-desc">
                  Cháy nhà, thiên tai, nhà nước thu hồi, bảo trì bắt buộc...
                  <br />
                  <strong style={{ color: "#2563eb" }}>
                    Hoàn 100% tiền cọc + tiền thuê còn dư
                  </strong>
                </div>
              </div>

              {/* Vi phạm */}
              <div
                className={`liq-type-card ${
                  liquidationType === "violation" ? "selected-violation" : ""
                }`}
                onClick={() => setLiquidationType("violation")}
              >
                <div
                  className="liq-type-card-icon"
                  style={{
                    background:
                      liquidationType === "violation" ? "#fee2e2" : "#f1f5f9",
                    color:
                      liquidationType === "violation" ? "#dc2626" : "#64748b",
                  }}
                >
                  <AlertTriangle size={26} />
                </div>
                <div className="liq-type-card-title">Vi phạm</div>
                <div className="liq-type-card-desc">
                  Chậm đóng tiền, gây mất trật tự, vi phạm nội quy...
                  <br />
                  <strong style={{ color: "#dc2626" }}>
                    Tịch thu toàn bộ tiền cọc
                  </strong>
                </div>
              </div>
            </div>

            <div className="liq-footer">
              <button className="liq-btn liq-btn-secondary" onClick={onClose}>
                Hủy
              </button>
              <button
                className="liq-btn liq-btn-primary"
                disabled={!liquidationType}
                onClick={() => {
                  setError("");
                  setStep(1);
                }}
              >
                Tiếp tục <ChevronRight size={16} />
              </button>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════
            STEP 1 — Thông tin cơ bản
           ══════════════════════════════════════ */}
        {step === 1 && (
          <>
            <div className="liq-body">
              <div className="liq-form-row">
                {/* Ngày thanh lý */}
                <div className="liq-form-group">
                  <label className="liq-label">
                    Ngày thanh lý <span>*</span>
                  </label>
                  <input
                    type="date"
                    className="liq-input"
                    value={liquidationDate}
                    onChange={(e) => setLiquidationDate(e.target.value)}
                    max={today()}
                  />
                </div>

                {/* Loại thanh lý (chỉ đọc) */}
                <div className="liq-form-group">
                  <label className="liq-label">Loại thanh lý</label>
                  <div style={{ paddingTop: 8 }}>{typeBadge}</div>
                </div>
              </div>

              {/* Ghi chú */}
              <div className="liq-form-group" style={{ marginBottom: 14 }}>
                <label className="liq-label">
                  Ghi chú / Lý do <span>*</span>
                </label>
                <textarea
                  className="liq-textarea"
                  placeholder="Mô tả lý do thanh lý hợp đồng..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Upload ảnh */}
              <div className="liq-form-group">
                <label className="liq-label">
                  Ảnh bằng chứng <span>*</span>{" "}
                  <span style={{ color: "#94a3b8", fontWeight: 400 }}>
                    (ít nhất 1 ảnh)
                  </span>
                </label>
                <div
                  className="liq-upload-zone"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleImageFiles(e.target.files)}
                  />
                  <div className="liq-upload-icon">
                    <Upload size={28} />
                  </div>
                  <div className="liq-upload-text">
                    <strong>Bấm để chọn ảnh</strong> hoặc kéo thả vào đây
                    <br />
                    Hỗ trợ JPG, PNG, WEBP — tối đa 10 ảnh
                  </div>
                </div>

                {uploadingImages && (
                  <div className="liq-upload-spinner">
                    <div className="liq-spinner" style={{ borderColor: "rgba(59,130,246,0.4)", borderTopColor: "#3b82f6" }} />
                    Đang tải ảnh lên...
                  </div>
                )}

                {imageLocalPreviews.length > 0 && (
                  <div className="liq-image-previews">
                    {imageLocalPreviews.map((url, i) => (
                      <div key={i} className="liq-image-preview-item">
                        <img src={url} alt={`Ảnh ${i + 1}`} />
                        <button
                          className="liq-image-remove-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImage(i);
                          }}
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="liq-footer">
              <button
                className="liq-btn liq-btn-secondary"
                onClick={() => {
                  setError("");
                  setStep(0);
                }}
              >
                <ChevronLeft size={16} /> Quay lại
              </button>
              <button
                className="liq-btn liq-btn-primary"
                disabled={uploadingImages}
                onClick={() => {
                  if (validateStep1()) {
                    setError("");
                    setStep(2);
                  }
                }}
              >
                Tiếp theo <ChevronRight size={16} />
              </button>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════
            STEP 2 — Chỉ số điện/nước & Preview
           ══════════════════════════════════════ */}
        {step === 2 && (
          <>
            <div className="liq-body">
              {/* Meter reading inputs */}
              <div className="liq-section-title">
                <Calculator size={14} /> Nhập chỉ số cuối kỳ
              </div>

              {loadingServices ? (
                <p style={{ color: "#94a3b8", fontSize: 13 }}>Đang tải dịch vụ...</p>
              ) : (
                <div className="liq-meter-grid">
                  {/* Điện */}
                  <div className="liq-meter-card">
                    <div className="liq-meter-card-header">
                      <Zap size={16} className="liq-meter-icon-elec" />
                      Điện (kWh)
                    </div>
                    <div className="liq-meter-row">
                      <span className="liq-meter-row-label">Chỉ số cũ:</span>
                      <span className="liq-meter-row-value">{electricOldIndex}</span>
                    </div>
                    <div className="liq-form-group">
                      <label className="liq-label">
                        Chỉ số mới <span>*</span>
                      </label>
                      <input
                        type="number"
                        className="liq-input"
                        min={electricOldIndex}
                        placeholder={`≥ ${electricOldIndex}`}
                        value={electricNewIndex}
                        onChange={(e) => setElectricNewIndex(e.target.value)}
                      />
                    </div>
                    {electricNewIndex !== "" && (
                      <div
                        className="liq-hint"
                        style={{ marginTop: 6, color: "#f59e0b" }}
                      >
                        Sử dụng:{" "}
                        {Math.max(
                          0,
                          Number(electricNewIndex) - electricOldIndex
                        )}{" "}
                        kWh
                        {electricService &&
                          ` × ${formatCurrency(
                            typeof (electricService.currentPrice as any) === "object"
                              ? parseFloat((electricService.currentPrice as any).$numberDecimal)
                              : Number(electricService.currentPrice)
                          )}`}
                      </div>
                    )}
                  </div>

                  {/* Nước */}
                  <div className="liq-meter-card">
                    <div className="liq-meter-card-header">
                      <Droplets size={16} className="liq-meter-icon-water" />
                      Nước (m³)
                    </div>
                    <div className="liq-meter-row">
                      <span className="liq-meter-row-label">Chỉ số cũ:</span>
                      <span className="liq-meter-row-value">{waterOldIndex}</span>
                    </div>
                    <div className="liq-form-group">
                      <label className="liq-label">
                        Chỉ số mới <span>*</span>
                      </label>
                      <input
                        type="number"
                        className="liq-input"
                        min={waterOldIndex}
                        placeholder={`≥ ${waterOldIndex}`}
                        value={waterNewIndex}
                        onChange={(e) => setWaterNewIndex(e.target.value)}
                      />
                    </div>
                    {waterNewIndex !== "" && (
                      <div
                        className="liq-hint"
                        style={{ marginTop: 6, color: "#3b82f6" }}
                      >
                        Sử dụng:{" "}
                        {Math.max(0, Number(waterNewIndex) - waterOldIndex)} m³
                        {waterService &&
                          ` × ${formatCurrency(
                            typeof (waterService.currentPrice as any) === "object"
                              ? parseFloat((waterService.currentPrice as any).$numberDecimal)
                              : Number(waterService.currentPrice)
                          )}`}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Financial Preview */}
              {financial && electricNewIndex !== "" && waterNewIndex !== "" && (
                <>
                  <div className="liq-section-title">
                    <FileText size={14} /> Bảng tính tất toán (preview)
                  </div>

                  <div
                    className={`liq-financial-preview ${
                      financial.type === "violation" ? "violation" : ""
                    }`}
                  >
                    <div className="liq-financial-title">
                      {financial.type === "force_majeure" ? (
                        <>
                          <ShieldOff size={14} /> Bất khả kháng — Hoàn tiền
                          cho người thuê
                        </>
                      ) : (
                        <>
                          <AlertTriangle size={14} /> Vi phạm — Người thuê cần
                          thanh toán
                        </>
                      )}
                    </div>

                    {financial.type === "force_majeure" && (
                      <>
                        <div className="liq-financial-item">
                          <span className="liq-financial-item-label">
                            ✅ Hoàn tiền cọc (100%)
                          </span>
                          <span className="liq-financial-item-value positive">
                            + {formatCurrency((financial as any).depositRefund)}
                          </span>
                        </div>
                        <div className="liq-financial-item">
                          <span className="liq-financial-item-label">
                            ✅ Hoàn tiền thuê còn dư ({(financial as any).remainingRentLabel})
                          </span>
                          <span className="liq-financial-item-value positive">
                            + {formatCurrency((financial as any).remainRent)}
                          </span>
                        </div>
                        <div className="liq-financial-item">
                          <span className="liq-financial-item-label">
                            ❌ Trừ tiền {electricService?.name || "điện"} ({Math.max(0, Number(electricNewIndex) - electricOldIndex)} kWh)
                          </span>
                          <span className="liq-financial-item-value negative">
                            − {formatCurrency(financial.electricCost)}
                          </span>
                        </div>
                        <div className="liq-financial-item">
                          <span className="liq-financial-item-label">
                            ❌ Trừ tiền {waterService?.name || "nước"} ({Math.max(0, Number(waterNewIndex) - waterOldIndex)} m³)
                          </span>
                          <span className="liq-financial-item-value negative">
                            − {formatCurrency(financial.waterCost)}
                          </span>
                        </div>
                      </>
                    )}

                    {financial.type === "violation" && (
                      <>
                        <div className="liq-financial-item">
                          <span className="liq-financial-item-label">
                            💰 Tiền thuê còn nợ ({(financial as any).daysUsed} ngày)
                          </span>
                          <span className="liq-financial-item-value negative">
                            + {formatCurrency((financial as any).rentDebt)}
                          </span>
                        </div>
                        <div className="liq-financial-item">
                          <span className="liq-financial-item-label">
                            ⚡ Tiền {electricService?.name || "điện"} ({Math.max(0, Number(electricNewIndex) - electricOldIndex)} kWh)
                          </span>
                          <span className="liq-financial-item-value negative">
                            + {formatCurrency(financial.electricCost)}
                          </span>
                        </div>
                        <div className="liq-financial-item">
                          <span className="liq-financial-item-label">
                            💧 Tiền {waterService?.name || "nước"} ({Math.max(0, Number(waterNewIndex) - waterOldIndex)} m³)
                          </span>
                          <span className="liq-financial-item-value negative">
                            + {formatCurrency(financial.waterCost)}
                          </span>
                        </div>
                        <div className="liq-financial-item">
                          <span className="liq-financial-item-label">
                            🔒 Tiền cọc bị tịch thu (giữ lại)
                          </span>
                          <span className="liq-financial-item-value" style={{ color: "#64748b" }}>
                            {formatCurrency(depositAmount)}
                          </span>
                        </div>
                      </>
                    )}

                    <div className="liq-financial-total">
                      <span className="liq-financial-total-label">
                        {financial.type === "force_majeure"
                          ? "Tổng hoàn lại cho người thuê:"
                          : "Tổng người thuê cần nộp thêm:"}
                      </span>
                      <span className="liq-financial-total-value">
                        {formatCurrency(Math.abs(financial.total))}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="liq-footer">
              <button
                className="liq-btn liq-btn-secondary"
                onClick={() => {
                  setError("");
                  setStep(1);
                }}
                disabled={submitting}
              >
                <ChevronLeft size={16} /> Quay lại
              </button>
              <button
                className={`liq-btn ${
                  liquidationType === "force_majeure"
                    ? "liq-btn-primary"
                    : "liq-btn-danger"
                }`}
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <div className="liq-spinner" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <Gavel size={16} />
                    Xác nhận thanh lý
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LiquidationWizard;

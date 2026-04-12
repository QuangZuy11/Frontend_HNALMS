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

interface Service {
  _id: string;
  name: string;
  currentPrice: number;
  type: "Fixed" | "Extension";
}

interface LiquidationWizardProps {
  contract: any;
  roomPrice: number;
  depositAmount: number;
  onClose: () => void;
  onSuccess: () => void;
}

const LiquidationWizard: React.FC<LiquidationWizardProps> = ({
  contract,
  roomPrice,
  depositAmount,
  onClose,
  onSuccess,
}) => {
  const [liquidationType, setLiquidationType] = useState<
    "force_majeure" | "violation" | null
  >(null);

  const [step, setStep] = useState<0 | 1 | 2>(0);

  const [liquidationDate, setLiquidationDate] = useState(today());
  const [note, setNote] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [imageLocalPreviews, setImageLocalPreviews] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [electricService, setElectricService] = useState<Service | null>(null);
  const [waterService, setWaterService] = useState<Service | null>(null);
  const [electricOldIndex, setElectricOldIndex] = useState(0);
  const [waterOldIndex, setWaterOldIndex] = useState(0);
  const [electricNewIndex, setElectricNewIndex] = useState("");
  const [waterNewIndex, setWaterNewIndex] = useState("");
  const [preflightData, setPreflightData] = useState<any>(null);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);

  useEffect(() => {
    const fetchServices = async () => {
      setLoadingServices(true);
      try {
        const res = await axios.get(`${API_BASE_URL}/services`);
        const all: Service[] = res.data.data || res.data || [];

        const ELEC_EXACT = ["điện", "electric", "tiền điện", "điện năng"];
        let elec =
          all.find((s) => ELEC_EXACT.includes(s.name.toLowerCase().trim())) ??
          all
            .filter(
              (s) =>
                s.name.toLowerCase().includes("điện") ||
                s.name.toLowerCase().includes("electric")
            )
            .sort((a, b) => a.name.length - b.name.length)[0] ??
          null;

        const WATER_EXACT = ["nước", "water", "tiền nước", "nước sinh hoạt"];
        let water =
          all.find((s) => WATER_EXACT.includes(s.name.toLowerCase().trim())) ??
          all
            .filter(
              (s) =>
                s.name.toLowerCase().includes("nước") ||
                s.name.toLowerCase().includes("water")
            )
            .sort((a, b) => a.name.length - b.name.length)[0] ??
          null;

        if (elec) setElectricService(elec);
        if (water) setWaterService(water);
      } catch (e) {
        console.error("Lỗi tải dịch vụ:", e);
      } finally {
        setLoadingServices(false);
      }
    };
    fetchServices();
  }, []);

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
      if (
        waterService &&
        results[electricService ? 1 : 0]?.data?.data
      ) {
        setWaterOldIndex(
          results[electricService ? 1 : 0].data.data.newIndex ?? 0
        );
      }
    } catch (e) {
      console.error("Lỗi lấy chỉ số:", e);
    }
  }, [contract, electricService, waterService]);

  const fetchPreflight = useCallback(async () => {
    if (!contract?._id) return;
    try {
      const res = await axios.get(
        `${API_BASE_URL}/liquidations/preflight/${contract._id}`,
        { params: { liquidationDate } }
      );
      if (res.data?.success) setPreflightData(res.data.data);
    } catch (e) {
      console.error("Lỗi lấy preflight data:", e);
    }
  }, [contract, liquidationDate]);

  useEffect(() => {
    if (step === 2) {
      fetchLatestIndexes();
      fetchPreflight();
    }
  }, [step, liquidationDate, fetchLatestIndexes, fetchPreflight]);

  const computeFinancial = () => {
    if (!liquidationType) return null;

    const liqDate = new Date(liquidationDate);
    liqDate.setHours(12, 0, 0, 0);
    const msPerDay = 1000 * 60 * 60 * 24;

    const startOfMonth = new Date(
      liqDate.getFullYear(),
      liqDate.getMonth(),
      1
    );
    const daysUsed =
      Math.round(
        (liqDate.getTime() - startOfMonth.getTime()) / msPerDay
      ) + 1;

    const elecUsage = Math.max(
      0,
      Number(electricNewIndex || 0) - electricOldIndex
    );
    const waterUsage = Math.max(
      0,
      Number(waterNewIndex || 0) - waterOldIndex
    );

    const elecPrice = electricService
      ? Number(electricService.currentPrice)
      : 0;
    const waterPrice = waterService
      ? Number(waterService.currentPrice)
      : 0;

    const electricCost = elecUsage * elecPrice;
    const waterCost = waterUsage * waterPrice;
    const utilityCost = electricCost + waterCost;

    if (liquidationType === "force_majeure") {
      const isDepositRefunded =
        preflightData?.deposit?.status === "Refunded";
      const depositRefund = isDepositRefunded ? 0 : depositAmount;

      let remainRent = 0;
      let remainingRentLabel = "";
      if (preflightData?.paidRentPeriods !== undefined) {
        remainRent = preflightData.totalRentRefund ?? 0;
        const totalUnused = (
          preflightData.paidRentPeriods as any[]
        ).reduce((s: number, p: any) => s + p.unusedDays, 0);
        remainingRentLabel =
          remainRent > 0
            ? `${totalUnused} ngày chưa dùng (từ ${
                (preflightData.paidRentPeriods as any[]).length
              } kỳ HĐ)`
            : "0 ngày (không có kỳ đã thanh toán còn dư)";
      } else {
        if (preflightData?.rentPaidUntil) {
          const rpUntil = new Date(preflightData.rentPaidUntil);
          rpUntil.setHours(12, 0, 0, 0);
          if (rpUntil > liqDate) {
            const days = Math.round(
              (rpUntil.getTime() - liqDate.getTime()) / msPerDay
            );
            remainRent = Math.round((roomPrice / 30) * days);
            remainingRentLabel = `${days} ngày (đến ${rpUntil.toLocaleDateString(
              "vi-VN"
            )})`;
          }
        }
      }

      const total = depositRefund + remainRent - utilityCost;

      return {
        type: "force_majeure" as const,
        daysUsed,
        remainingRentLabel,
        isDepositRefunded,
        depositRefund,
        remainRent,
        electricCost,
        waterCost,
        utilityCost,
        total,
      };
    } else {
      let rentDebt = 0;
      let actualOwedDays = daysUsed;
      if (preflightData?.rentDebtDays !== undefined) {
        rentDebt = preflightData.rentDebtAmount;
        actualOwedDays = preflightData.rentDebtDays;
      } else {
        rentDebt = Math.round((roomPrice / 30) * daysUsed);
      }

      const total = rentDebt + utilityCost;
      return {
        type: "violation" as const,
        daysUsed: actualOwedDays,
        rentDebt,
        electricCost,
        waterCost,
        utilityCost,
        total,
      };
    }
  };

  const financial =
    step === 2 || step === 1 ? computeFinancial() : null;

  const handleImageFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingImages(true);
    setError("");

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

  const validateStep2 = () => {
    if (!electricService || !waterService) {
      setError("Không tìm thấy dịch vụ điện/nước trong hệ thống.");
      return false;
    }
    if (
      electricNewIndex === "" ||
      Number(electricNewIndex) < electricOldIndex
    ) {
      setError(
        `Chỉ số điện mới (${electricNewIndex}) không được nhỏ hơn chỉ số cũ (${electricOldIndex}).`
      );
      return false;
    }
    if (
      waterNewIndex === "" ||
      Number(waterNewIndex) < waterOldIndex
    ) {
      setError(
        `Chỉ số nước mới (${waterNewIndex}) không được nhỏ hơn chỉ số cũ (${waterOldIndex}).`
      );
      return false;
    }
    return true;
  };

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

  const typeBadge = liquidationType ? (
    <span
      className={`lqw-type-badge ${
        liquidationType === "force_majeure" ? "force" : "violation"
      }`}
    >
      {liquidationType === "force_majeure" ? (
        <ShieldOff size={10} />
      ) : (
        <AlertTriangle size={10} />
      )}
      {liquidationType === "force_majeure" ? "Bất khả kháng" : "Vi phạm"}
    </span>
  ) : null;

  const roomName =
    typeof contract.roomId === "object"
      ? contract.roomId.name
      : contract.roomId;

  return (
    <div className="lqw-overlay" onClick={onClose}>
      <div className="lqw-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="lqw-header">
          <div className="lqw-header-left">
            <div
              className={`lqw-header-icon ${
                liquidationType === "violation" ? "violation" : "force"
              }`}
            >
              <Gavel size={18} />
            </div>
            <div>
              <div className="lqw-header-title">
                Thanh lý Hợp đồng — {roomName || "---"}
              </div>
              <div className="lqw-header-subtitle">
                {contract.contractCode} {typeBadge}
              </div>
            </div>
          </div>
          <button className="lqw-close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Stepper */}
        {step > 0 && (
          <div className="lqw-stepper">
            <div
              className={`lqw-step ${
                step >= 1 ? (step > 1 ? "done" : "active") : ""
              }`}
            >
              <div className="lqw-step-circle">
                {step > 1 ? <CheckCircle size={14} /> : "1"}
              </div>
              <span className="lqw-step-label">Thông tin cơ bản</span>
            </div>
            <div
              className={`lqw-step-connector ${step > 1 ? "done" : ""}`}
            />
            <div className={`lqw-step ${step === 2 ? "active" : ""}`}>
              <div className="lqw-step-circle">2</div>
              <span className="lqw-step-label">Chỉ số & Hoá đơn</span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="lqw-body" style={{ paddingBottom: 0 }}>
            <div className="lqw-error">
              <AlertTriangle size={14} />
              {error}
            </div>
          </div>
        )}

        {/* STEP 0 */}
        {step === 0 && (
          <>
            <p className="lqw-type-selector-title">
              Chọn loại thanh lý cho hợp đồng này:
            </p>
            <div className="lqw-type-selector">
              <div
                className={`lqw-type-card ${
                  liquidationType === "force_majeure"
                    ? "selected-force"
                    : ""
                }`}
                onClick={() => setLiquidationType("force_majeure")}
              >
                <div className="lqw-type-card-icon">
                  <ShieldOff size={24} />
                </div>
                <div className="lqw-type-card-title">Bất khả kháng</div>
                <div className="lqw-type-card-desc">
                  Cháy nhà, thiên tai, nhà nước thu hồi, bảo trì bắt buộc...
                  <br />
                  <strong style={{ color: "#2563eb" }}>
                    Hoàn 100% tiền cọc + tiền thuê còn dư
                  </strong>
                </div>
              </div>

              <div
                className={`lqw-type-card ${
                  liquidationType === "violation" ? "selected-violation" : ""
                }`}
                onClick={() => setLiquidationType("violation")}
              >
                <div className="lqw-type-card-icon">
                  <AlertTriangle size={24} />
                </div>
                <div className="lqw-type-card-title">Vi phạm</div>
                <div className="lqw-type-card-desc">
                  Chậm đóng tiền, gây mất trật tự, vi phạm nội quy...
                  <br />
                  <strong style={{ color: "#dc2626" }}>
                    Tịch thu toàn bộ tiền cọc
                  </strong>
                </div>
              </div>
            </div>

            <div className="lqw-footer">
              <button
                className="lqw-btn lqw-btn-secondary"
                onClick={onClose}
              >
                Hủy
              </button>
              <button
                className="lqw-btn lqw-btn-primary"
                disabled={!liquidationType}
                onClick={() => {
                  setError("");
                  setStep(1);
                }}
              >
                Tiếp tục <ChevronRight size={14} />
              </button>
            </div>
          </>
        )}

        {/* STEP 1 */}
        {step === 1 && (
          <>
            <div className="lqw-body">
              <div className="lqw-form-row">
                <div className="lqw-form-group">
                  <label className="lqw-label">
                    Ngày thanh lý <span>*</span>
                  </label>
                  <input
                    type="date"
                    className="lqw-input"
                    value={liquidationDate}
                    onChange={(e) => setLiquidationDate(e.target.value)}
                    max={today()}
                  />
                </div>

                <div className="lqw-form-group">
                  <label className="lqw-label">Loại thanh lý</label>
                  <div style={{ paddingTop: "6px" }}>{typeBadge}</div>
                </div>
              </div>

              <div className="lqw-form-group lqw-form-group-full">
                <label className="lqw-label">
                  Ghi chú / Lý do <span>*</span>
                </label>
                <textarea
                  className="lqw-textarea"
                  placeholder="Mô tả lý do thanh lý hợp đồng..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="lqw-form-group lqw-form-group-full">
                <label className="lqw-label">
                  Ảnh bằng chứng <span>*</span>{" "}
                  <span style={{ color: "#94a3b8", fontWeight: 400 }}>
                    (ít nhất 1 ảnh)
                  </span>
                </label>
                <div
                  className="lqw-upload-zone"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleImageFiles(e.target.files)}
                  />
                  <div className="lqw-upload-icon">
                    <Upload size={24} />
                  </div>
                  <div className="lqw-upload-text">
                    <strong>Bấm để chọn ảnh</strong> hoặc kéo thả vào đây
                    <br />
                    Hỗ trợ JPG, PNG, WEBP — tối đa 10 ảnh
                  </div>
                </div>

                {uploadingImages && (
                  <div className="lqw-upload-spinner">
                    <div
                      className="lqw-spinner"
                      style={{
                        borderColor: "rgba(59,130,246,0.4)",
                        borderTopColor: "#3b82f6",
                      }}
                    />
                    Đang tải ảnh lên...
                  </div>
                )}

                {imageLocalPreviews.length > 0 && (
                  <div className="lqw-image-previews">
                    {imageLocalPreviews.map((url, i) => (
                      <div key={i} className="lqw-image-preview-item">
                        <img src={url} alt={`Ảnh ${i + 1}`} />
                        <button
                          className="lqw-image-remove-btn"
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

            <div className="lqw-footer">
              <button
                className="lqw-btn lqw-btn-secondary"
                onClick={() => {
                  setError("");
                  setStep(0);
                }}
              >
                <ChevronLeft size={14} /> Quay lại
              </button>
              <button
                className="lqw-btn lqw-btn-primary"
                disabled={uploadingImages}
                onClick={() => {
                  if (validateStep1()) {
                    setError("");
                    setStep(2);
                  }
                }}
              >
                Tiếp theo <ChevronRight size={14} />
              </button>
            </div>
          </>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <>
            <div className="lqw-body">
              <div className="lqw-section-title">
                <Calculator size={14} /> Nhập chỉ số cuối kỳ
              </div>

              {loadingServices ? (
                <p style={{ color: "#94a3b8", fontSize: "0.8rem" }}>
                  Đang tải dịch vụ...
                </p>
              ) : (
                <div className="lqw-meter-grid">
                  <div className="lqw-meter-card">
                    <div className="lqw-meter-card-header">
                      <Zap size={14} className="lqw-meter-icon-elec" />
                      Điện (kWh)
                    </div>
                    <div className="lqw-meter-row">
                      <span className="lqw-meter-row-label">Chỉ số cũ:</span>
                      <span className="lqw-meter-row-value">
                        {electricOldIndex}
                      </span>
                    </div>
                    <div className="lqw-form-group">
                      <label className="lqw-label">
                        Chỉ số mới <span>*</span>
                      </label>
                      <input
                        type="number"
                        className="lqw-input"
                        min={electricOldIndex}
                        placeholder={`≥ ${electricOldIndex}`}
                        value={electricNewIndex}
                        onChange={(e) => setElectricNewIndex(e.target.value)}
                      />
                    </div>
                    {electricNewIndex !== "" && (
                      <div
                        className="lqw-hint"
                        style={{ color: "#f59e0b" }}
                      >
                        Sử dụng:{" "}
                        {Math.max(
                          0,
                          Number(electricNewIndex) - electricOldIndex
                        )}{" "}
                        kWh
                        {electricService &&
                          ` × ${formatCurrency(
                            typeof (
                              electricService.currentPrice as unknown as {
                                $numberDecimal: string;
                              }
                            ) === "object"
                              ? parseFloat(
                                  (
                                    electricService.currentPrice as unknown as {
                                      $numberDecimal: string;
                                    }
                                  ).$numberDecimal
                                )
                              : Number(electricService.currentPrice)
                          )}`}
                      </div>
                    )}
                  </div>

                  <div className="lqw-meter-card">
                    <div className="lqw-meter-card-header">
                      <Droplets size={14} className="lqw-meter-icon-water" />
                      Nước (m³)
                    </div>
                    <div className="lqw-meter-row">
                      <span className="lqw-meter-row-label">Chỉ số cũ:</span>
                      <span className="lqw-meter-row-value">
                        {waterOldIndex}
                      </span>
                    </div>
                    <div className="lqw-form-group">
                      <label className="lqw-label">
                        Chỉ số mới <span>*</span>
                      </label>
                      <input
                        type="number"
                        className="lqw-input"
                        min={waterOldIndex}
                        placeholder={`≥ ${waterOldIndex}`}
                        value={waterNewIndex}
                        onChange={(e) => setWaterNewIndex(e.target.value)}
                      />
                    </div>
                    {waterNewIndex !== "" && (
                      <div className="lqw-hint" style={{ color: "#3b82f6" }}>
                        Sử dụng:{" "}
                        {Math.max(
                          0,
                          Number(waterNewIndex) - waterOldIndex
                        )}{" "}
                        m³
                        {waterService &&
                          ` × ${formatCurrency(
                            typeof (
                              waterService.currentPrice as unknown as {
                                $numberDecimal: string;
                              }
                            ) === "object"
                              ? parseFloat(
                                  (
                                    waterService.currentPrice as unknown as {
                                      $numberDecimal: string;
                                    }
                                  ).$numberDecimal
                                )
                              : Number(waterService.currentPrice)
                          )}`}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {financial && electricNewIndex !== "" && waterNewIndex !== "" && (
                <>
                  <div className="lqw-section-title">
                    <FileText size={14} /> Bảng tính tất toán
                  </div>

                  <div
                    className={`lqw-financial-preview ${
                      financial.type === "violation" ? "violation" : ""
                    }`}
                  >
                    <div className="lqw-financial-title">
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
                        <div
                          className="lqw-financial-item"
                          style={{ flexDirection: "column", alignItems: "flex-start" }}
                        >
                          <span className="lqw-financial-item-label">
                            ✅ Hoàn tiền cọc (100%)
                          </span>
                          {(financial as any).isDepositRefunded &&
                            preflightData?.deposit && (
                              <div
                                style={{
                                  fontSize: "0.7rem",
                                  color: "#64748b",
                                  marginTop: "4px",
                                  fontWeight: "normal",
                                }}
                              >
                                💡 Tiền cọc{" "}
                                <strong>
                                  {formatCurrency(preflightData.deposit.amount)}
                                </strong>{" "}
                                đã được hoàn vào ngày{" "}
                                {new Date(
                                  preflightData.deposit.refundDate
                                ).toLocaleDateString("vi-VN")}
                                .
                              </div>
                            )}
                          <span className="lqw-financial-item-value positive">
                            {(financial as any).isDepositRefunded
                              ? `+ 0 ₫ (Đã được hoàn)`
                              : `+ ${formatCurrency(
                                  (financial as any).depositRefund
                                )}`}
                          </span>
                        </div>
                        <div
                          className="lqw-financial-item"
                          style={{
                            flexDirection: "column",
                            alignItems: "flex-start",
                          }}
                        >
                          <span className="lqw-financial-item-label">
                            ✅ Hoàn tiền thuê còn dư (
                            {(financial as any).remainingRentLabel})
                          </span>
                          <span className="lqw-financial-item-value positive">
                            +{" "}
                            {formatCurrency((financial as any).remainRent)}
                          </span>
                          {preflightData?.paidRentPeriods &&
                            (preflightData.paidRentPeriods as any[]).length >
                              0 && (
                              <div style={{ marginTop: "8px", width: "100%" }}>
                                <div
                                  style={{
                                    fontSize: "0.7rem",
                                    color: "#64748b",
                                    marginBottom: "4px",
                                  }}
                                >
                                  💡 Chi tiết từng kỳ hoà đơn đã thanh toán:
                                </div>
                                <table
                                  style={{
                                    width: "100%",
                                    fontSize: "0.7rem",
                                    borderCollapse: "collapse",
                                    background: "#fff",
                                    borderRadius: "4px",
                                    overflow: "hidden",
                                  }}
                                >
                                  <thead>
                                    <tr
                                      style={{
                                        background: "#f8fafc",
                                        color: "#475569",
                                        borderBottom: "1px solid #e2e8f0",
                                      }}
                                    >
                                      <th
                                        style={{
                                          textAlign: "left",
                                          padding: "6px",
                                          fontWeight: 600,
                                        }}
                                      >
                                        Kỳ
                                      </th>
                                      <th
                                        style={{
                                          textAlign: "center",
                                          padding: "6px",
                                          fontWeight: 600,
                                        }}
                                      >
                                        Từ
                                      </th>
                                      <th
                                        style={{
                                          textAlign: "center",
                                          padding: "6px",
                                          fontWeight: 600,
                                        }}
                                      >
                                        Đến
                                      </th>
                                      <th
                                        style={{
                                          textAlign: "center",
                                          padding: "6px",
                                          fontWeight: 600,
                                        }}
                                      >
                                        Chưa dùng
                                      </th>
                                      <th
                                        style={{
                                          textAlign: "right",
                                          padding: "6px",
                                          fontWeight: 600,
                                        }}
                                      >
                                        Hoàn
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(preflightData.paidRentPeriods as any[]).map(
                                      (p: any, i: number) => (
                                        <tr
                                          key={i}
                                          style={{
                                            borderBottom: "1px solid #f1f5f9",
                                            color:
                                              p.unusedDays > 0
                                                ? "#0f172a"
                                                : "#94a3b8",
                                          }}
                                        >
                                          <td style={{ padding: "6px" }}>
                                            {p.invoiceTitle?.replace(
                                              "Hóa đơn tiền thuê & dịch vụ ",
                                              ""
                                            ) || `Kỳ ${i + 1}`}
                                          </td>
                                          <td
                                            style={{
                                              textAlign: "center",
                                              padding: "6px",
                                            }}
                                          >
                                            {p.fromStr}
                                          </td>
                                          <td
                                            style={{
                                              textAlign: "center",
                                              padding: "6px",
                                            }}
                                          >
                                            {p.toStr}
                                          </td>
                                          <td
                                            style={{
                                              textAlign: "center",
                                              padding: "6px",
                                            }}
                                          >
                                            {p.unusedDays > 0 ? (
                                              <span style={{ color: "#10b981" }}>
                                                ✅ {p.unusedDays} ngày
                                              </span>
                                            ) : (
                                              <span style={{ color: "#ef4444" }}>
                                                ❌ 0 ngày
                                              </span>
                                            )}
                                          </td>
                                          <td
                                            style={{
                                              textAlign: "right",
                                              padding: "6px",
                                              fontWeight: p.refundAmount > 0 ? 600 : 400,
                                            }}
                                          >
                                            {p.refundAmount > 0
                                              ? `+ ${formatCurrency(
                                                  p.refundAmount
                                                )}`
                                              : "0 ₫"}
                                          </td>
                                        </tr>
                                      )
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          {preflightData?.paidRentPeriods &&
                            (preflightData.paidRentPeriods as any[]).length ===
                              0 && (
                              <div
                                style={{
                                  fontSize: "0.7rem",
                                  color: "#ef4444",
                                  marginTop: "4px",
                                }}
                              >
                                ⚠️ Chưa có hóa đơn tiền thuê nào được ghi nhận
                                Paid cho hợp đồng này.
                              </div>
                            )}
                        </div>
                        <div className="lqw-financial-item">
                          <span className="lqw-financial-item-label">
                            ❌ Trừ tiền {electricService?.name || "điện"} (
                            {Math.max(
                              0,
                              Number(electricNewIndex) - electricOldIndex
                            )}{" "}
                            kWh)
                          </span>
                          <span className="lqw-financial-item-value negative">
                            − {formatCurrency(financial.electricCost)}
                          </span>
                        </div>
                        <div className="lqw-financial-item">
                          <span className="lqw-financial-item-label">
                            ❌ Trừ tiền {waterService?.name || "nước"} (
                            {Math.max(
                              0,
                              Number(waterNewIndex) - waterOldIndex
                            )}{" "}
                            m³)
                          </span>
                          <span className="lqw-financial-item-value negative">
                            − {formatCurrency(financial.waterCost)}
                          </span>
                        </div>
                      </>
                    )}

                    {financial.type === "violation" && (
                      <>
                        <div className="lqw-financial-item">
                          <span className="lqw-financial-item-label">
                            💰 Tiền thuê còn nợ (
                            {(financial as any).daysUsed} ngày)
                          </span>
                          <span className="lqw-financial-item-value negative">
                            + {formatCurrency((financial as any).rentDebt)}
                          </span>
                        </div>
                        <div className="lqw-financial-item">
                          <span className="lqw-financial-item-label">
                            ⚡ Tiền {electricService?.name || "điện"} (
                            {Math.max(
                              0,
                              Number(electricNewIndex) - electricOldIndex
                            )}{" "}
                            kWh)
                          </span>
                          <span className="lqw-financial-item-value negative">
                            + {formatCurrency(financial.electricCost)}
                          </span>
                        </div>
                        <div className="lqw-financial-item">
                          <span className="lqw-financial-item-label">
                            💧 Tiền {waterService?.name || "nước"} (
                            {Math.max(
                              0,
                              Number(waterNewIndex) - waterOldIndex
                            )}{" "}
                            m³)
                          </span>
                          <span className="lqw-financial-item-value negative">
                            + {formatCurrency(financial.waterCost)}
                          </span>
                        </div>
                        <div className="lqw-financial-item">
                          <span className="lqw-financial-item-label">
                            🔒 Tiền cọc bị tịch thu (giữ lại)
                          </span>
                          <span
                            className="lqw-financial-item-value"
                            style={{ color: "#64748b" }}
                          >
                            {formatCurrency(depositAmount)}
                          </span>
                        </div>
                      </>
                    )}

                    <div className="lqw-financial-total">
                      <span className="lqw-financial-total-label">
                        {financial.type === "force_majeure"
                          ? "Tổng hoàn lại cho người thuê:"
                          : "Tổng người thuê cần nộp thêm:"}
                      </span>
                      <span className="lqw-financial-total-value">
                        {formatCurrency(Math.abs(financial.total))}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="lqw-footer">
              <button
                className="lqw-btn lqw-btn-secondary"
                onClick={() => {
                  setError("");
                  setStep(1);
                }}
                disabled={submitting}
              >
                <ChevronLeft size={14} /> Quay lại
              </button>
              <button
                className={`lqw-btn ${
                  liquidationType === "force_majeure"
                    ? "lqw-btn-primary"
                    : "lqw-btn-danger"
                }`}
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <div className="lqw-spinner" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <Gavel size={14} />
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

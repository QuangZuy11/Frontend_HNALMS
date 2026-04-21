import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { vi } from "date-fns/locale/vi";
import {
  ChevronLeft,
  CheckCircle,
  Loader,
  User,
  CreditCard,
  Building,
  Shield,
  Mail,
  Phone,
  Calendar,
  CreditCard as IdCard,
  Users,
  Plus,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { roomService } from "../../../services/roomService";
import { bookingRequestService } from "../../../services/bookingRequestService";
import toastr from "toastr";
import "toastr/build/toastr.min.css";
import "./BookingPage.css";

interface CoResident {
  fullName: string;
  cccd: string;
}

interface FormErrors {
  fullName?: string;
  email?: string;
  phone?: string;
  idCard?: string;
  dob?: string;
  address?: string;
  startDate?: string;
  duration?: string;
  prepayMonths?: string;
  coResidents?: { fullName?: string; cccd?: string }[];
}

interface DuplicateErrors {
  cccd?: string;
  phone?: string;
  email?: string;
  global?: string;
}

export default function BookingPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [bookingStep, setBookingStep] = useState<"form" | "success">("form");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // --- Tenant fields ---
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [idCard, setIdCard] = useState("");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");

  // --- Contract preference fields ---
  const [startDate, setStartDate] = useState("");
  const [duration, setDuration] = useState(12);
  const [prepayMonths, setPrepayMonths] = useState<number | "all">(2);

  // --- Co-residents ---
  const [coResidents, setCoResidents] = useState<CoResident[]>([]);

  const [errors, setErrors] = useState<FormErrors>({});
  const [duplicateErrors, setDuplicateErrors] = useState<DuplicateErrors>({});

  // Xác định có phải "hợp đồng gap-fill" hay không
  // Là phòng đã có hợp đồng trước đó → cho phép thuê ngắn hạn
  const isSecondContract = !!room?.futureContractStartDate;

  // Số tháng trả trước tối thiểu: gap-fill = 1, bình thường = 2
  const minPrepay = isSecondContract ? 1 : 2;

  // Số tháng thuê tối thiểu: gap-fill = 1, bình thường = 6
  const minDuration = isSecondContract ? 1 : 6;

  useEffect(() => {
    toastr.options = {
      closeButton: true,
      progressBar: true,
      positionClass: "toast-top-right",
      timeOut: 4000,
    };
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!id) return;
    const fetchRoom = async () => {
      try {
        setLoading(true);
        const response = await roomService.getRoomById(id);
        if (response.data) {
          const roomData = response.data;
          let price = 0;
          const rawPrice = roomData.roomTypeId?.currentPrice;
          if (rawPrice) {
            if (typeof rawPrice === "object" && rawPrice.$numberDecimal) {
              price = parseFloat(rawPrice.$numberDecimal);
            } else if (typeof rawPrice === "string") {
              price = parseFloat(rawPrice);
            } else {
              price = Number(rawPrice);
            }
          }
          const futureStart = roomData.futureContractStartDate;
          const successorLeaseBooked = !!roomData.successorLeaseBooked;
          let isShortTermAvailable = false;
          if (
            roomData.status === "Deposited" &&
            futureStart &&
            !roomData.hasFloatingDeposit
          ) {
            const daysUntil = Math.ceil(
              (new Date(futureStart).getTime() - new Date().getTime()) /
                (1000 * 60 * 60 * 24),
            );
            if (daysUntil >= 30) isShortTermAvailable = true;
          }
          if (
            roomData.hasFutureInactiveContract &&
            !roomData.hasFloatingDeposit
          ) {
            isShortTermAvailable = true;
          }
          if (
            roomData.contractRenewalStatus === "declined" &&
            !roomData.hasFloatingDeposit &&
            !successorLeaseBooked
          ) {
            isShortTermAvailable = true;
          }
          if (successorLeaseBooked) isShortTermAvailable = false;

          const roomObj = {
            ...roomData,
            roomCode: roomData.roomCode || roomData.name,
            floor: roomData.floorId?.name || "N/A",
            floorLabel: `Tầng ${roomData.floorId?.name || "N/A"}`,
            price,
            typeName: roomData.roomTypeId?.typeName || "Phòng",
            personMax: roomData.roomTypeId?.personMax ?? 2,
            futureContractStartDate: futureStart,
            isShortTermAvailable,
            contractRenewalStatus: roomData.contractRenewalStatus ?? null,
            successorLeaseBooked,
            activeContractEndDate: roomData.activeContractEndDate ?? null,
            contractEndDate: roomData.contractEndDate ?? null,
            nextInactiveContractStart:
              roomData.nextInactiveContractStart ?? null,
          };
          setRoom(roomObj);

          // Set default startDate: nếu declined renewal → ngày sau endDate HĐ hiện tại
          const minDate = getMinStartDate(roomObj);
          setStartDate(toLocalDateString(minDate));
        }
      } catch (err) {
        console.error("Error fetching room:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRoom();
  }, [id]);

  // ---------- Helpers ----------

  /** Ngày local → yyyy-MM-dd */
  function toLocalDateString(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  const today = new Date();
  const maxDateLimit = new Date(
    today.getFullYear(),
    today.getMonth() + 6,
    today.getDate(),
  );
  const maxStartDateStr = toLocalDateString(maxDateLimit);

  /** Tính ngày tối thiểu được chọn vào ở */
  function getMinStartDate(r: any): Date {
    if (r?.contractRenewalStatus === "declined") {
      const endRaw = r.activeContractEndDate ?? r.contractEndDate;
      if (endRaw) {
        const end = new Date(endRaw);
        if (!isNaN(end.getTime())) {
          const min = new Date(
            end.getFullYear(),
            end.getMonth(),
            end.getDate(),
          );
          min.setDate(min.getDate() + 1);
          return min;
        }
      }
    }
    return new Date();
  }

  /**
   * Tính ngày tối đa được phép chọn làm ngày vào ở.
   * Nếu phòng có hợp đồng inactive đang chờ (nextInactiveContractStart),
   * người dùng phải bắt đầu muộn nhất là ngày 1 của tháng trước ngày đó
   * (đảm bảo thuê tối thiểu 1 tháng trước kỳ thuê kế tiếp).
   */
  function getMaxStartDate(r: any): Date {
    if (r?.nextInactiveContractStart) {
      const cutoff = new Date(r.nextInactiveContractStart);
      // Lùi về ngày 1 của tháng trước: đây là ngày bắt đầu muộn nhất hợp lệ
      cutoff.setDate(1);
      cutoff.setMonth(cutoff.getMonth() - 1);
      // Nếu cutoff nhỏ hơn hôm nay thì trả về hôm nay (phòng hết hạn đặt)
      return cutoff < today ? today : cutoff;
    }
    return maxDateLimit;
  }

  /** Tính số tháng tối đa có thể thuê (nếu có futureContractStartDate) */
  function getMaxDuration(r: any, sd: string): number {
    if (!r?.futureContractStartDate || !sd) return 60;
    const start = new Date(sd);
    const future = new Date(r.futureContractStartDate);
    if (start >= future) return 1;
    let months =
      (future.getFullYear() - start.getFullYear()) * 12 +
      (future.getMonth() - start.getMonth());
    if (future.getDate() < start.getDate()) months -= 1;
    return Math.max(1, months);
  }

  const minStartDateStr = room
    ? toLocalDateString(getMinStartDate(room))
    : toLocalDateString(new Date());
  // maxStartDateForPicker: giới hạn ngày bắt đầu tối đa trên DatePicker
  const maxStartDateForPicker = room ? getMaxStartDate(room) : maxDateLimit;
  const maxDuration = room ? getMaxDuration(room, startDate) : 60;
  // personMax: sức chứa phòng (bao gồm chủ hợp đồng), nên max co-residents = personMax - 1
  const maxCoResidents = room ? Math.max(0, (room.personMax ?? 2) - 1) : 1;

  // Tự điều chỉnh duration khi startDate thay đổi
  useEffect(() => {
    if (!room) return;
    const max = getMaxDuration(room, startDate);
    if (duration > max) setDuration(max);
  }, [startDate, room]);

  // Tự điều chỉnh prepayMonths khi duration thay đổi
  useEffect(() => {
    if (prepayMonths !== "all" && prepayMonths > duration) {
      setPrepayMonths(duration);
    }
    if (prepayMonths !== "all" && prepayMonths < minPrepay) {
      setPrepayMonths(minPrepay);
    }
  }, [duration, minPrepay]);

  // Tự điều chỉnh duration khi thấp hơn minDuration
  useEffect(() => {
    if (duration < minDuration) {
      setDuration(minDuration);
    }
  }, [minDuration]);

  // ---------- Validation (đồng bộ với CreateContract) ----------
  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!fullName.trim() || fullName.trim().length < 2)
      newErrors.fullName = "Tên phải ít nhất 2 ký tự";

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      newErrors.email = "Email không hợp lệ";

    // SĐT: 10 chữ số, bắt đầu bằng 0
    if (!phone.trim() || !/^0[0-9]{9}$/.test(phone.trim()))
      newErrors.phone = "Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0";

    // CCCD: 12 chữ số
    if (!idCard.trim() || !/^[0-9]{12}$/.test(idCard.replace(/\s/g, "")))
      newErrors.idCard = "CCCD phải gồm đúng 12 chữ số";

    if (!dob) newErrors.dob = "Ngày sinh là bắt buộc";

    if (!address.trim() || address.trim().length < 5)
      newErrors.address = "Hộ khẩu thường trú quá ngắn (ít nhất 5 ký tự)";

    if (!startDate) {
      newErrors.startDate = "Vui lòng chọn ngày muốn vào ở";
    } else {
      const sd = new Date(startDate);
      if (startDate < minStartDateStr) {
        newErrors.startDate = `Ngày vào ở phải từ ${new Date(minStartDateStr).toLocaleDateString("vi-VN")} trở đi`;
      } else if (sd > maxDateLimit) {
        newErrors.startDate = "Không được chọn ngày vào ở quá 6 tháng";
      } else {
        // Tính cutoff: nếu có hợp đồng inactive → cutoff = ngày 1 của (nextInactiveContractStart - 1 tháng)
        // Ngược lại → cutoff = hôm nay (hoặc ngày sau khi HĐ hiện tại kết thúc nếu declined)
        const inactiveStart = room?.nextInactiveContractStart
          ? new Date(room.nextInactiveContractStart)
          : null;
        const cutoffDate = inactiveStart
          ? (() => {
              const d = new Date(inactiveStart);
              d.setDate(1);
              d.setMonth(d.getMonth() - 1);
              return d;
            })()
          : new Date(minStartDateStr);

        // Nếu startDate > cutoff → báo lỗi rule 1 tháng
        if (sd > cutoffDate) {
          newErrors.startDate =
            `Ngày vào ở phải ≤ ${cutoffDate.toLocaleDateString("vi-VN")} (tối thiểu 1 tháng trước kỳ thuê kế tiếp).`;
        } else if (room?.contractRenewalStatus !== "declined") {
          // Từ tháng của cutoff trở đi: chỉ cho phép ngày 1
          const cutoffMonth =
            cutoffDate.getFullYear() * 12 + cutoffDate.getMonth();
          const sdMonth = sd.getFullYear() * 12 + sd.getMonth();
          if (sdMonth >= cutoffMonth && sd.getDate() !== 1) {
            newErrors.startDate =
              "Từ tháng trước kỳ thuê kế tiếp trở đi chỉ được phép chọn ngày 1 đầu tháng";
          }
        }
      }
    }

    const durVal = Number(duration);
    if (!duration || durVal < 1)
      newErrors.duration = "Số tháng thuê tối thiểu là 1";
    else if (!isSecondContract && durVal < 6)
      newErrors.duration = "Hợp đồng mới phải thuê tối thiểu 6 tháng";

    // validate co-residents
    const coErrors: { fullName?: string; cccd?: string }[] = coResidents.map(
      (cr, i) => {
        const e: { fullName?: string; cccd?: string } = {};
        if (!cr.fullName.trim() || cr.fullName.trim().length < 2)
          e.fullName = "Tên phải ít nhất 2 ký tự";
        if (!cr.cccd.trim() || !/^[0-9]{12}$/.test(cr.cccd.replace(/\s/g, "")))
          e.cccd = "CCCD phải đúng 12 chữ số";
        else if (cr.cccd === idCard.trim())
          e.cccd = "CCCD người ở cùng không được trùng chủ hợp đồng";
        else if (
          coResidents.some((other, j) => j !== i && other.cccd === cr.cccd)
        )
          e.cccd = "CCCD bị trùng với người ở cùng khác";
        return e;
      },
    );
    if (coErrors.some((e) => e.fullName || e.cccd)) {
      newErrors.coResidents = coErrors;
    }

    setErrors(newErrors);
    return (
      Object.keys(newErrors).filter((k) => k !== "coResidents").length === 0 &&
      !coErrors.some((e) => e.fullName || e.cccd)
    );
  };

  // ---------- Submit ----------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room) return;
    const allowed =
      !room.successorLeaseBooked &&
      (room.status === "Available" ||
        room.status === "Trống" ||
        room.isShortTermAvailable);
    if (!allowed) return;

    // Validate all fields first
    const isValid = validate();
    if (!isValid) {
      toastr.error("Vui lòng kiểm tra lại thông tin đã nhập.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setDuplicateErrors({});

    try {
      // 1. Check duplicate CCCD/Phone/Email via API
      // Axios ném lỗi khi HTTP >= 400, nên dùng try/catch riêng để đọc body từ err.response.data
      let dupData: any = null;
      try {
        const dupRes = await axios.post(
          "http://localhost:9999/api/booking-requests/check-duplicate",
          {
            cccd: idCard.trim(),
            phone: phone.trim(),
            email: email.trim(),
          },
        );
        dupData = dupRes.data;
      } catch (dupErr: any) {
        // HTTP 409 hoặc lỗi khác từ check-duplicate
        dupData = dupErr?.response?.data || null;
        if (!dupData) {
          // Không kết nối được server → dừng
          throw dupErr;
        }
      }

      if (dupData && !dupData.success) {
        const dupType = dupData.type;
        const dupMsg = dupData.message;

        // Cùng 1 người → vẫn cho gửi (reuse tài khoản cũ)
        if (dupType === "same_person") {
          toastr.warning(dupMsg);
          // Không return → tiếp tục gửi booking request bình thường
        }

        // Trùng từng trường riêng lẻ → gán lỗi vào field + toast + dừng
        if (dupType === "duplicate_cccd") {
          setDuplicateErrors((prev) => ({ ...prev, cccd: dupMsg }));
          toastr.error(dupMsg);
        } else if (dupType === "duplicate_phone") {
          setDuplicateErrors((prev) => ({ ...prev, phone: dupMsg }));
          toastr.error(dupMsg);
        } else if (dupType === "duplicate_email") {
          setDuplicateErrors((prev) => ({ ...prev, email: dupMsg }));
          toastr.error(dupMsg);
        } else if (
          dupType === "duplicate_phone_email" ||
          dupType === "duplicate_cccd_phone" ||
          dupType === "duplicate_cccd_email"
        ) {
          setDuplicateErrors({ global: dupMsg });
          setSubmitError(dupMsg);
          toastr.error(dupMsg);
        }

        // Nếu có lỗi trùng field cụ thể (không phải same_person) → không submit
        if (dupType && dupType.startsWith("duplicate_")) {
          setIsSubmitting(false);
          return;
        }
      }

      // Trích xuất userInfoId nếu có (từ phản hồi trùng cùng người)
      const userInfoId =
        dupData && dupData.type === "same_person" && dupData.data?.userInfoId
          ? dupData.data.userInfoId
          : undefined;

      // 2. Gửi yêu cầu đặt phòng
      const payload: any = {
        roomId: id!,
        startDate,
        duration,
        prepayMonths,
        coResidents,
      };

      if (userInfoId) {
        // Nếu đã có userInfoId, chỉ truyền ID đó đi, không gửi full thông tin
        payload.userInfoId = userInfoId;
      } else {
        // Nếu người mới, gửi đầy đủ thông tin
        payload.name = fullName.trim();
        payload.phone = phone.trim();
        payload.email = email.trim();
        payload.idCard = idCard.trim();
        payload.dob = dob;
        payload.address = address.trim();
      }

      const res = await bookingRequestService.createBookingRequest(payload);
      if (res.success) {
        setBookingStep("success");
      } else {
        setSubmitError(res.message || "Đã xảy ra lỗi. Vui lòng thử lại.");
        toastr.error(res.message || "Đã xảy ra lỗi. Vui lòng thử lại.");
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        "Không thể kết nối máy chủ. Vui lòng thử lại.";
      setSubmitError(msg);
      toastr.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelDeposit = () => {
    setBookingStep("form");
  };

  // ---------- Co-resident helpers ----------
  const addCoResident = () => {
    if (coResidents.length >= maxCoResidents) return;
    setCoResidents((prev) => [...prev, { fullName: "", cccd: "" }]);
  };
  const removeCoResident = (i: number) => {
    setCoResidents((prev) => prev.filter((_, idx) => idx !== i));
  };
  const updateCoResident = (
    i: number,
    field: keyof CoResident,
    value: string,
  ) => {
    setCoResidents((prev) =>
      prev.map((cr, idx) => (idx === i ? { ...cr, [field]: value } : cr)),
    );
  };

  // ---------- Render ----------
  if (loading) {
    return (
      <main className="booking-page">
        <div className="booking-loading">
          <p className="booking-loading-text">Đang tải thông tin phòng...</p>
        </div>
      </main>
    );
  }

  if (!room) {
    return (
      <main className="booking-page">
        <div
          className="booking-container"
          style={{ textAlign: "center", paddingTop: "4rem" }}
        >
          <h2>Phòng Không Tồn Tại</h2>
          <button
            className="booking-back-link"
            onClick={() => navigate("/rooms")}
            style={{ marginTop: "1rem" }}
          >
            Quay Lại Danh Sách Phòng
          </button>
        </div>
      </main>
    );
  }

  const depositAmount = room.price;
  const depositAllowed =
    !room.successorLeaseBooked &&
    (room.status === "Available" ||
      room.status === "Trống" ||
      room.isShortTermAvailable);

  return (
    <main className="booking-page">
      <div className="booking-container">
        {/* Back */}
        <button className="booking-back-link" onClick={() => navigate(-1)}>
          <ChevronLeft size={16} />
          Quay Lại Chi Tiết Phòng
        </button>

        <h1 className="booking-page-title">Đặt Cọc {room.roomCode}</h1>
        <p className="booking-page-subtitle">
          Điền đầy đủ thông tin để tiến hành đặt cọc giữ phòng
        </p>

        <div className="booking-grid">
          {/* ========== MAIN ========== */}
          <div className="booking-main">
            {bookingStep === "form" && (
              <form className="bkp-form-outer" onSubmit={handleSubmit}>
                {!depositAllowed && (
                  <div className="bk-card">
                    <div className="bkp-submit-error">
                      {room.successorLeaseBooked
                        ? "Kỳ thuê tiếp theo đã có hợp đồng. Phòng không mở đặt cọc thêm."
                        : "Phòng hiện không thể đặt cọc trực tuyến."}
                    </div>
                  </div>
                )}

                {/* ---- Section 1: Thông tin cá nhân ---- */}
                <div className="bk-card">
                  <h3 className="bk-card-title">
                    <User size={18} />
                    Thông Tin Người Đặt Cọc
                  </h3>
                  <p className="bk-card-desc">
                    Cung cấp thông tin chính xác để lập hợp đồng thuê phòng
                  </p>

                  <div className="bk-fields">
                    {/* Họ tên */}
                    <div className="bkp-group">
                      <label className="bkp-label">
                        <User
                          size={13}
                          style={{
                            display: "inline",
                            verticalAlign: "-2px",
                            marginRight: "0.3rem",
                          }}
                        />
                        Họ Tên Đầy Đủ <span className="bkp-required">*</span>
                      </label>
                      <input
                        type="text"
                        className={`bkp-input ${errors.fullName ? "error" : ""}`}
                        placeholder="Nguyễn Văn A"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                      {errors.fullName && (
                        <span className="bkp-error">{errors.fullName}</span>
                      )}
                    </div>

                    {/* Email + SĐT */}
                    <div className="bkp-row-2col">
                      <div className="bkp-group">
                        <label className="bkp-label">
                          <Mail
                            size={13}
                            style={{
                              display: "inline",
                              verticalAlign: "-2px",
                              marginRight: "0.3rem",
                            }}
                          />
                          Email <span className="bkp-required">*</span>
                        </label>
                        <input
                          type="email"
                          className={`bkp-input ${errors.email || duplicateErrors.email ? "error" : ""}`}
                          placeholder="email@example.com"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (duplicateErrors.email)
                              setDuplicateErrors((prev) => ({
                                ...prev,
                                email: undefined,
                              }));
                          }}
                        />
                        {(errors.email || duplicateErrors.email) && (
                          <span className="bkp-error">
                            {duplicateErrors.email || errors.email}
                          </span>
                        )}
                      </div>
                      <div className="bkp-group">
                        <label className="bkp-label">
                          <Phone
                            size={13}
                            style={{
                              display: "inline",
                              verticalAlign: "-2px",
                              marginRight: "0.3rem",
                            }}
                          />
                          Số Điện Thoại <span className="bkp-required">*</span>
                        </label>
                        <input
                          type="text"
                          className={`bkp-input ${errors.phone || duplicateErrors.phone ? "error" : ""}`}
                          placeholder="0912345678"
                          value={phone}
                          onChange={(e) => {
                            setPhone(e.target.value);
                            if (duplicateErrors.phone)
                              setDuplicateErrors((prev) => ({
                                ...prev,
                                phone: undefined,
                              }));
                          }}
                        />
                        {(errors.phone || duplicateErrors.phone) && (
                          <span className="bkp-error">
                            {duplicateErrors.phone || errors.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* CCCD */}
                    <div className="bkp-group">
                      <label className="bkp-label">
                        <IdCard
                          size={13}
                          style={{
                            display: "inline",
                            verticalAlign: "-2px",
                            marginRight: "0.3rem",
                          }}
                        />
                        Số CCCD / CMND <span className="bkp-required">*</span>
                      </label>
                      <input
                        type="text"
                        className={`bkp-input ${errors.idCard || duplicateErrors.cccd ? "error" : ""}`}
                        placeholder="012345678901"
                        value={idCard}
                        onChange={(e) => {
                          setIdCard(e.target.value);
                          if (duplicateErrors.cccd)
                            setDuplicateErrors((prev) => ({
                              ...prev,
                              cccd: undefined,
                            }));
                        }}
                      />
                      {(errors.idCard || duplicateErrors.cccd) && (
                        <span className="bkp-error">
                          {duplicateErrors.cccd || errors.idCard}
                        </span>
                      )}
                    </div>

                    {/* Ngày sinh + HTTQ */}
                    <div className="bkp-row-2col">
                      <div className="bkp-group">
                        <label className="bkp-label">
                          Ngày Sinh <span className="bkp-required">*</span>
                        </label>
                        <LocalizationProvider
                          dateAdapter={AdapterDateFns}
                          adapterLocale={vi}
                        >
                          <DatePicker
                            value={dob ? new Date(dob) : null}
                            onChange={(newValue) =>
                              setDob(
                                newValue ? toLocalDateString(newValue) : "",
                              )
                            }
                            format="dd/MM/yyyy"
                            maxDate={new Date()}
                            slotProps={{
                              textField: {
                                variant: "standard",
                                error: !!errors.dob,
                                sx: {
                                  width: "100%",
                                  "& .MuiInputBase-root": {
                                    fontFamily: "'Inter', sans-serif",
                                    fontSize: "0.9rem",
                                    color: "#1a1a1a",
                                    marginTop: 0,
                                    "&:before": {
                                      borderBottom: errors.dob
                                        ? "1.5px solid #ef4444"
                                        : "1.5px solid #e0e0e0",
                                    },
                                    "&:hover:not(.Mui-disabled):before": {
                                      borderBottom: errors.dob
                                        ? "1.5px solid #ef4444"
                                        : "1.5px solid #3579C6",
                                    },
                                    "&:after": {
                                      borderBottom: errors.dob
                                        ? "1.5px solid #ef4444"
                                        : "1.5px solid #3579C6",
                                    },
                                  },
                                  "& .MuiInputBase-input": {
                                    padding: "0.5rem 0",
                                    boxSizing: "border-box",
                                    height: "auto",
                                  },
                                  "& .MuiInputAdornment-root": {
                                    marginRight: 0,
                                  },
                                },
                              },
                            }}
                          />
                        </LocalizationProvider>
                        {errors.dob && (
                          <span className="bkp-error">{errors.dob}</span>
                        )}
                      </div>
                      <div className="bkp-group">
                        <label className="bkp-label">
                          Hộ Khẩu Thường Trú{" "}
                          <span className="bkp-required">*</span>
                        </label>
                        <input
                          type="text"
                          className={`bkp-input ${errors.address ? "error" : ""}`}
                          placeholder="Địa chỉ..."
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                        />
                        {errors.address && (
                          <span className="bkp-error">{errors.address}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ---- Section 2: Thông tin thuê phòng ---- */}
                <div className="bk-card">
                  <h3 className="bk-card-title">
                    <Calendar size={18} />
                    Thông Tin Thuê Phòng
                  </h3>
                  <p className="bk-card-desc">
                    Chọn ngày vào ở, thời hạn thuê và số tháng muốn trả trước
                  </p>

                  <div className="bk-fields">
                    <div className="bkp-row-2col">
                      {/* Ngày muốn vào ở */}
                      <div className="bkp-group">
                        <label className="bkp-label">
                          <Calendar
                            size={13}
                            style={{
                              display: "inline",
                              verticalAlign: "-2px",
                              marginRight: "0.3rem",
                            }}
                          />
                          Ngày Muốn Vào Ở{" "}
                          <span className="bkp-required">*</span>
                        </label>
                        <LocalizationProvider
                          dateAdapter={AdapterDateFns}
                          adapterLocale={vi}
                        >
                          <DatePicker
                            value={startDate ? new Date(startDate) : null}
                            onChange={(newValue) =>
                              setStartDate(
                                newValue ? toLocalDateString(newValue) : "",
                              )
                            }
                            format="dd/MM/yyyy"
                            minDate={new Date(minStartDateStr)}
                            maxDate={maxStartDateForPicker}
                            shouldDisableDate={(date) => {
                              if (!date) return false;
                              if (room?.contractRenewalStatus === "declined") {
                                return false;
                              }
                              // Tháng hiện tại: chọn ngày nào cũng được
                              // Từ tháng sau trở đi: chỉ được chọn ngày 1 đầu tháng
                              // (maxDate đã giới hạn cutoff cho trường hợp có nextInactiveContractStart)
                              const isFutureMonth =
                                date.getFullYear() > today.getFullYear() ||
                                (date.getFullYear() === today.getFullYear() &&
                                  date.getMonth() > today.getMonth());
                              if (isFutureMonth) {
                                return date.getDate() !== 1;
                              }
                              return false;
                            }}
                            slotProps={{
                              textField: {
                                variant: "standard",
                                error: !!errors.startDate,
                                sx: {
                                  width: "100%",
                                  "& .MuiInputBase-root": {
                                    fontFamily: "'Inter', sans-serif",
                                    fontSize: "0.9rem",
                                    color: "#1a1a1a",
                                    marginTop: 0,
                                    "&:before": {
                                      borderBottom: errors.startDate
                                        ? "1.5px solid #ef4444"
                                        : "1.5px solid #e0e0e0",
                                    },
                                    "&:hover:not(.Mui-disabled):before": {
                                      borderBottom: errors.startDate
                                        ? "1.5px solid #ef4444"
                                        : "1.5px solid #3579C6",
                                    },
                                    "&:after": {
                                      borderBottom: errors.startDate
                                        ? "1.5px solid #ef4444"
                                        : "1.5px solid #3579C6",
                                    },
                                  },
                                  "& .MuiInputBase-input": {
                                    padding: "0.5rem 0",
                                    boxSizing: "border-box",
                                    height: "auto",
                                  },
                                  "& .MuiInputAdornment-root": {
                                    marginRight: 0,
                                  },
                                },
                              },
                            }}
                          />
                        </LocalizationProvider>
                        {room.contractRenewalStatus === "declined" && (
                          <span
                            className="bkp-hint"
                            style={{ display: "block", marginTop: "4px" }}
                          >
                            ⚠ Bắt đầu sớm nhất:{" "}
                            {new Date(minStartDateStr).toLocaleDateString(
                              "vi-VN",
                            )}{" "}
                            (ngày sau khi HĐ hiện tại kết thúc)
                          </span>
                        )}
                        {room.nextInactiveContractStart && (
                          <span
                            className="bkp-hint"
                            style={{ display: "block", marginTop: "4px" }}
                          >
                            ⚠ Kỳ thuê kế tiếp bắt đầu từ{" "}
                            {new Date(
                              room.nextInactiveContractStart,
                            ).toLocaleDateString("vi-VN")}.{" "}
                            Phải thuê tối thiểu 1 tháng trước đó (trước{" "}
                            {(() => {
                              const cutoff = new Date(room.nextInactiveContractStart);
                              cutoff.setDate(1);
                              cutoff.setMonth(cutoff.getMonth() - 1);
                              return cutoff.toLocaleDateString("vi-VN");
                            })()}
                            ).
                          </span>
                        )}
                        {errors.startDate && (
                          <span className="bkp-error">{errors.startDate}</span>
                        )}
                      </div>

                      {/* Số tháng thuê */}
                      <div className="bkp-group">
                        <label className="bkp-label">
                          Số Tháng Muốn Thuê{" "}
                          <span className="bkp-required">*</span>
                        </label>
                        <input
                          type="number"
                          className={`bkp-input ${errors.duration ? "error" : ""}`}
                          min={minDuration}
                          max={maxDuration}
                          value={duration}
                          onChange={(e) => {
                            const v = Math.min(
                              maxDuration,
                              Math.max(
                                minDuration,
                                parseInt(e.target.value) || minDuration,
                              ),
                            );
                            setDuration(v);
                          }}
                        />
                        {minDuration > 1 && (
                          <span className="bkp-hint">
                            Tối thiểu {minDuration} tháng
                          </span>
                        )}
                        {maxDuration < 60 && (
                          <span
                            className="bkp-hint"
                            style={{ display: "block" }}
                          >
                            Tối đa {maxDuration} tháng
                          </span>
                        )}
                        {errors.duration && (
                          <span className="bkp-error">{errors.duration}</span>
                        )}
                      </div>
                    </div>

                    <div className="bkp-row-2col">
                      {/* Số tháng trả trước */}
                      <div className="bkp-group">
                        <label className="bkp-label">
                          Số Tháng Muốn Trả Trước
                        </label>
                        <select
                          className="bkp-input"
                          value={prepayMonths}
                          onChange={(e) => {
                            const v = e.target.value;
                            setPrepayMonths(v === "all" ? "all" : parseInt(v));
                          }}
                        >
                          {Array.from(
                            { length: Math.max(0, duration - minPrepay + 1) },
                            (_, i) => minPrepay + i,
                          ).map((n) => (
                            <option key={n} value={n}>
                              {n} tháng
                            </option>
                          ))}
                          <option value="all">Tất cả ({duration} tháng)</option>
                        </select>
                        <span className="bkp-hint">
                          Tối thiểu {minPrepay} tháng
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ---- Section 3: Người ở cùng ---- */}
                <div className="bk-card">
                  <div className="bk-card-header-row">
                    <div>
                      <h3 className="bk-card-title">
                        <Users size={18} />
                        Danh Sách Người Ở Cùng
                      </h3>
                      <p className="bk-card-desc">
                        Tối đa {maxCoResidents} người ở cùng/phòng (không tính
                        chủ hợp đồng)
                      </p>
                    </div>
                    {coResidents.length < maxCoResidents && (
                      <button
                        type="button"
                        className="bk-add-btn"
                        onClick={addCoResident}
                      >
                        <Plus size={15} />
                        Thêm
                      </button>
                    )}
                  </div>

                  {coResidents.length === 0 ? (
                    <div className="coresident-empty">
                      <Users size={28} className="coresident-empty-icon" />
                      <p>Chưa có người ở cùng.</p>
                      {maxCoResidents > 0 && (
                        <button
                          type="button"
                          className="bk-add-btn"
                          onClick={addCoResident}
                        >
                          <Plus size={15} />
                          Thêm người ở cùng
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="coresident-list">
                      {coResidents.map((cr, i) => (
                        <div key={i} className="coresident-row">
                          <span className="coresident-index">{i + 1}</span>
                          <div className="coresident-fields">
                            <div className="bkp-group">
                              <label className="bkp-label">
                                Họ và tên{" "}
                                <span className="bkp-required">*</span>
                              </label>
                              <input
                                type="text"
                                className={`bkp-input ${errors.coResidents?.[i]?.fullName ? "error" : ""}`}
                                placeholder="Nguyễn Thị B"
                                value={cr.fullName}
                                onChange={(e) =>
                                  updateCoResident(
                                    i,
                                    "fullName",
                                    e.target.value,
                                  )
                                }
                              />
                              {errors.coResidents?.[i]?.fullName && (
                                <span className="bkp-error">
                                  {errors.coResidents[i].fullName}
                                </span>
                              )}
                            </div>
                            <div className="bkp-group">
                              <label className="bkp-label">
                                Số CCCD <span className="bkp-required">*</span>
                              </label>
                              <input
                                type="text"
                                className={`bkp-input ${errors.coResidents?.[i]?.cccd ? "error" : ""}`}
                                placeholder="012345678901"
                                value={cr.cccd}
                                onChange={(e) =>
                                  updateCoResident(i, "cccd", e.target.value)
                                }
                              />
                              {errors.coResidents?.[i]?.cccd && (
                                <span className="bkp-error">
                                  {errors.coResidents[i].cccd}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="coresident-remove-btn"
                            onClick={() => removeCoResident(i)}
                            title="Xóa"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ---- Điều khoản + Submit ---- */}
                <div className="bk-card">
                  <div className="terms-box">
                    <p>
                      ✓ Sau khi đặt cọc thành công, bạn sẽ nhận email xác nhận
                    </p>
                    <p>
                      ✓ Phòng sẽ được giữ lại trong vòng 30 ngày để ký hợp đồng
                    </p>
                    <p>
                      ✓ Tiền cọc bằng 1 tháng tiền nhà, không hoàn lại nếu không
                      ký HĐ
                    </p>
                    <p>
                      ✓ Thông tin CCCD sẽ được dùng để lập hợp đồng thuê chính
                      thức
                    </p>
                  </div>

                  {(submitError || duplicateErrors.global) && (
                    <div
                      className="bkp-submit-error"
                      style={{ marginTop: "1rem" }}
                    >
                      {duplicateErrors.global || submitError}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="bk-primary-btn"
                    style={{ marginTop: "1rem" }}
                    disabled={isSubmitting || !depositAllowed}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader size={18} className="spin" />
                        Đang xử lý...
                      </>
                    ) : (
                      <>
                        <CreditCard size={18} />
                        Gửi Yêu Cầu Đặt Phòng
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP: SUCCESS */}
            {bookingStep === "success" && (
              <div className="bk-card">
                <div className="success-content">
                  <div className="success-icon-wrapper">
                    <CheckCircle />
                  </div>
                  <h2 className="success-heading">
                    Yêu Cầu Đặt Phòng Đã Được Gửi!
                  </h2>
                  <p className="success-subheading">
                    Cảm ơn bạn đã chọn {room.roomCode} của Hoàng Nam Building.
                    Yêu cầu của bạn đang chờ được xử lý.
                  </p>

                  <div className="success-summary">
                    <div className="payment-info-row">
                      <span className="payment-info-label">Phòng:</span>
                      <span className="payment-info-value highlight">
                        {room.roomCode}
                      </span>
                    </div>
                    <div className="payment-info-row">
                      <span className="payment-info-label">Trạng thái:</span>
                      <span className="success-badge">Chờ Xác Nhận</span>
                    </div>
                  </div>

                  <div className="success-info-box">
                    <p>📋 Thông tin cần biết:</p>
                    <ul>
                      <li>
                        • Yêu cầu đặt phòng của bạn đã được gửi đến bộ phận quản
                        lý
                      </li>
                      <li>
                        • Bạn sẽ nhận email xác nhận khi yêu cầu được duyệt
                      </li>
                      <li>
                        • Thanh toán sẽ được thực hiện sau khi hợp đồng được gửi
                        qua email
                      </li>
                      <li>• Hotline: 0869 048 066</li>
                    </ul>
                  </div>

                  <div className="success-buttons">
                    <button
                      className="bk-primary-btn"
                      onClick={() => navigate("/rooms")}
                    >
                      Quay Lại Danh Sách Phòng
                    </button>
                    <button
                      className="bk-outline-btn"
                      onClick={() => navigate(`/rooms/${id}`)}
                    >
                      Xem Lại Chi Tiết Phòng
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ========== SIDEBAR ========== */}
          <div className="booking-sidebar">
            <div className="bk-card">
              <div className="sidebar-room-header">
                <div className="sidebar-room-icon">
                  <Building size={20} />
                </div>
                <div>
                  <h3 className="sidebar-room-name">{room.roomCode}</h3>
                  <p className="sidebar-room-floor">
                    Tầng {room.floor} • {room.typeName}
                  </p>
                </div>
              </div>

              <div className="sidebar-price-box">
                <span className="sidebar-price-label">Giá Phòng</span>
                <span className="sidebar-price-value">
                  {room.price > 0
                    ? `${room.price.toLocaleString("vi-VN")} đ / tháng`
                    : "Liên hệ"}
                </span>
              </div>

              {/* Tóm tắt thông tin đã điền */}
              {bookingStep === "form" &&
                startDate &&
                (() => {
                  const prepayCount =
                    prepayMonths === "all" ? duration : Number(prepayMonths);
                  const basePrice = room.price || 0;
                  const prepayAmount = prepayCount * basePrice;
                  const totalCost = basePrice + prepayAmount;

                  return (
                    <>
                      <div className="sidebar-summary-box">
                        <p className="sidebar-terms-title">Thông tin đã chọn</p>
                        <div className="sidebar-summary-row">
                          <span>Ngày vào ở:</span>
                          <strong>
                            {new Date(startDate).toLocaleDateString("vi-VN")}
                          </strong>
                        </div>
                        <div className="sidebar-summary-row">
                          <span>Thời hạn:</span>
                          <strong>{duration} tháng</strong>
                        </div>
                        <div className="sidebar-summary-row">
                          <span>Trả trước:</span>
                          <strong>{prepayCount} tháng</strong>
                        </div>
                        <div className="sidebar-summary-row">
                          <span>Người ở cùng:</span>
                          <strong>{coResidents.length} người</strong>
                        </div>
                      </div>

                      <div
                        className="sidebar-summary-box"
                        style={{
                          backgroundColor: "#fffbeb",
                          borderColor: "#fde68a",
                        }}
                      >
                        <p
                          className="sidebar-terms-title"
                          style={{ color: "#92400e", marginBottom: "0.5rem" }}
                        >
                          Ước tính chi phí
                        </p>
                        <div className="sidebar-summary-row">
                          <span style={{ color: "#92400e" }}>
                            Tiền cọc (1 tháng):
                          </span>
                          <strong style={{ color: "#92400e" }}>
                            {basePrice.toLocaleString("vi-VN")} đ
                          </strong>
                        </div>
                        <div className="sidebar-summary-row">
                          <span style={{ color: "#92400e" }}>
                            Trả trước ({prepayCount} tháng):
                          </span>
                          <strong style={{ color: "#92400e" }}>
                            {prepayAmount.toLocaleString("vi-VN")} đ
                          </strong>
                        </div>
                        <div
                          className="sidebar-summary-row"
                          style={{
                            marginTop: "0.375rem",
                            paddingTop: "0.5rem",
                            borderTop: "1px dashed #fcd34d",
                            fontWeight: "700",
                          }}
                        >
                          <span style={{ color: "#92400e" }}>Tổng cộng:</span>
                          <strong
                            style={{ color: "#b45309", fontSize: "1.05rem" }}
                          >
                            {totalCost.toLocaleString("vi-VN")} đ
                          </strong>
                        </div>
                        <div
                          style={{
                            fontSize: "0.725rem",
                            color: "#b45309",
                            marginTop: "0.625rem",
                            fontStyle: "italic",
                            lineHeight: "1.4",
                          }}
                        >
                          * Số tiền chính xác sẽ được xác nhận khi hệ thống lập
                          hợp đồng.
                        </div>
                      </div>
                    </>
                  );
                })()}

              <div className="sidebar-terms">
                {/* <p className="sidebar-terms-title">
                                    <Shield size={14} style={{ display: "inline", verticalAlign: "-2px", marginRight: "0.375rem" }} />
                                    Điều Khoản
                                </p> */}
                <ul className="sidebar-terms-list">
                  {/* <li><span className="check">✓</span><span>Giữ phòng 30 ngày</span></li>
                                    <li><span className="check">✓</span><span>Không hoàn lại cọc</span></li>
                                    <li><span className="check">✓</span><span>Phải ký HĐ trong 30 ngày</span></li> */}
                  {room.isShortTermAvailable &&
                    room.futureContractStartDate && (
                      <li>
                        <span
                          className="check"
                          style={{ color: "var(--warning)" }}
                        >
                          ⚠
                        </span>
                        <span
                          style={{
                            color: "var(--warning)",
                            fontWeight: "bold",
                          }}
                        >
                          Thuê ngắn hạn đến{" "}
                          {new Date(
                            room.futureContractStartDate,
                          ).toLocaleDateString("vi-VN")}
                        </span>
                      </li>
                    )}
                  {room.contractRenewalStatus === "declined" &&
                    !room.successorLeaseBooked && (
                      <li>
                        <span
                          className="check"
                          style={{ color: "var(--warning)" }}
                        >
                          ⚠
                        </span>
                        <span
                          style={{
                            color: "var(--warning)",
                            fontWeight: "bold",
                          }}
                        >
                          Người thuê hiện tại đã từ chối gia hạn — đặt cọc cho
                          kỳ thuê tiếp theo.
                        </span>
                      </li>
                    )}
                  {room.successorLeaseBooked && (
                    <li>
                      <span className="check" style={{ color: "#92400e" }}>
                        ℹ
                      </span>
                      <span style={{ color: "#92400e", fontWeight: "bold" }}>
                        Kỳ thuê tiếp theo đã có hợp đồng — không đặt cọc thêm.
                      </span>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

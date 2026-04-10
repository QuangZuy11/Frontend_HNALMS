import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { roomService } from "../../../services/roomService";
import { bookingRequestService } from "../../../services/bookingRequestService";
import DepositPayment from "./DepositPayment";
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

export default function BookingPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [room, setRoom] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [bookingStep, setBookingStep] = useState<"form" | "success">("form");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

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

    useEffect(() => {
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
                    if (roomData.status === "Deposited" && futureStart && !roomData.hasFloatingDeposit) {
                        const daysUntil = Math.ceil((new Date(futureStart).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                        if (daysUntil >= 30) isShortTermAvailable = true;
                    }
                    if (roomData.hasFutureInactiveContract && !roomData.hasFloatingDeposit) {
                        isShortTermAvailable = true;
                    }
                    if (roomData.contractRenewalStatus === "declined" && !roomData.hasFloatingDeposit && !successorLeaseBooked) {
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
                        nextInactiveContractStart: roomData.nextInactiveContractStart ?? null,
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
    const maxDateLimit = new Date(today.getFullYear(), today.getMonth() + 6, today.getDate());
    const maxStartDateStr = toLocalDateString(maxDateLimit);

    /** Tính ngày tối thiểu được chọn vào ở */
    function getMinStartDate(r: any): Date {
        if (r?.contractRenewalStatus === "declined") {
            const endRaw = r.activeContractEndDate ?? r.contractEndDate;
            if (endRaw) {
                const end = new Date(endRaw);
                if (!isNaN(end.getTime())) {
                    const min = new Date(end.getFullYear(), end.getMonth(), end.getDate());
                    min.setDate(min.getDate() + 1);
                    return min;
                }
            }
        }
        return new Date();
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

    const minStartDateStr = room ? toLocalDateString(getMinStartDate(room)) : toLocalDateString(new Date());
    const maxDuration = room ? getMaxDuration(room, startDate) : 60;
    // Số tháng tối đa có thể trả trước
    const maxPrepay = duration;
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
    }, [duration]);

    // ---------- Validation ----------
    const validate = (): boolean => {
        const newErrors: FormErrors = {};
        if (!fullName.trim() || fullName.trim().length < 2)
            newErrors.fullName = "Tên phải ít nhất 2 ký tự";
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
            newErrors.email = "Email không hợp lệ";
        if (!phone.trim() || !/^[0-9]{10,11}$/.test(phone))
            newErrors.phone = "Số điện thoại phải có 10-11 chữ số";
        if (!idCard.trim() || !/^[0-9]{9,12}$/.test(idCard.replace(/\s/g, "")))
            newErrors.idCard = "CCCD/CMND phải có 9-12 chữ số";
        if (!dob)
            newErrors.dob = "Ngày sinh là bắt buộc";
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
            } else if (room?.contractRenewalStatus !== "declined") {
                const isFutureMonth = sd.getFullYear() > today.getFullYear() || 
                                     (sd.getFullYear() === today.getFullYear() && sd.getMonth() > today.getMonth());
                if (isFutureMonth && sd.getDate() !== 1) {
                    newErrors.startDate = "Từ tháng sau trở đi chỉ được phép chọn ngày 1 đầu tháng";
                }
            }
        }

        if (!duration || duration < 1)
            newErrors.duration = "Số tháng thuê tối thiểu là 1";

        // validate co-residents
        const coErrors: { fullName?: string; cccd?: string }[] = coResidents.map((cr, i) => {
            const e: { fullName?: string; cccd?: string } = {};
            if (!cr.fullName.trim() || cr.fullName.trim().length < 2)
                e.fullName = "Tên phải ít nhất 2 ký tự";
            if (!cr.cccd.trim() || !/^[0-9]{12}$/.test(cr.cccd.replace(/\s/g, "")))
                e.cccd = "CCCD phải đúng 12 chữ số";
            else if (cr.cccd === idCard.trim())
                e.cccd = "CCCD người ở cùng không được trùng chủ hợp đồng";
            // Check duplicate with other co-residents
            else if (coResidents.some((other, j) => j !== i && other.cccd === cr.cccd))
                e.cccd = "CCCD bị trùng với người ở cùng khác";
            return e;
        });
        if (coErrors.some(e => e.fullName || e.cccd)) {
            newErrors.coResidents = coErrors;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).filter(k => k !== "coResidents").length === 0 &&
            !coErrors.some(e => e.fullName || e.cccd);
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
        if (!validate()) return;
        setIsSubmitting(true);
        setSubmitError(null);
        try {
            const res = await bookingRequestService.createBookingRequest({
                roomId: id!,
                name: fullName.trim(),
                phone: phone.trim(),
                email: email.trim(),
                idCard: idCard.trim(),
                dob,
                address: address.trim(),
                startDate,
                duration,
                prepayMonths,
                coResidents
            });
            if (res.success) {
                setBookingStep("success");
            } else {
                setSubmitError(res.message || "Đã xảy ra lỗi. Vui lòng thử lại.");
            }
        } catch (err: any) {
            const msg =
                err?.response?.data?.message ||
                "Không thể kết nối máy chủ. Vui lòng thử lại.";
            setSubmitError(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePaymentSuccess = () => {
        setShowPaymentModal(false);
        setBookingStep("success");
    };

    const handleCancelDeposit = async () => {
        if (depositData?.transactionCode) {
            try {
                await depositService.cancelDeposit(depositData.transactionCode);
            } catch { /* ignore */ }
        }
        setShowPaymentModal(false);
        setDepositData(null);
    };

    // ---------- Co-resident helpers ----------
    const addCoResident = () => {
        if (coResidents.length >= maxCoResidents) return;
        setCoResidents(prev => [...prev, { fullName: "", cccd: "" }]);
    };
    const removeCoResident = (i: number) => {
        setCoResidents(prev => prev.filter((_, idx) => idx !== i));
    };
    const updateCoResident = (i: number, field: keyof CoResident, value: string) => {
        setCoResidents(prev => prev.map((cr, idx) => idx === i ? { ...cr, [field]: value } : cr));
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
                <div className="booking-container" style={{ textAlign: "center", paddingTop: "4rem" }}>
                    <h2>Phòng Không Tồn Tại</h2>
                    <button className="booking-back-link" onClick={() => navigate("/rooms")} style={{ marginTop: "1rem" }}>
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
                <p className="booking-page-subtitle">Điền đầy đủ thông tin để tiến hành đặt cọc giữ phòng</p>

                <div className="booking-grid">
                    {/* ========== MAIN ========== */}
                    <div className="booking-main">
                        {bookingStep === "form" && (
                            <form className="booking-form-outer" onSubmit={handleSubmit}>
                                {!depositAllowed && (
                                    <div className="bk-card">
                                        <div className="form-submit-error">
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
                                    <p className="bk-card-desc">Cung cấp thông tin chính xác để lập hợp đồng thuê phòng</p>

                                    <div className="bk-fields">
                                        {/* Họ tên */}
                                        <div className="form-group">
                                            <label className="form-label">
                                                <User size={13} style={{ display: "inline", verticalAlign: "-2px", marginRight: "0.3rem" }} />
                                                Họ Tên Đầy Đủ <span className="form-required">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                className={`form-input ${errors.fullName ? "error" : ""}`}
                                                placeholder="Nguyễn Văn A"
                                                value={fullName}
                                                onChange={e => setFullName(e.target.value)}
                                            />
                                            {errors.fullName && <span className="form-error">{errors.fullName}</span>}
                                        </div>

                                        {/* Email + SĐT */}
                                        <div className="form-row-2col">
                                            <div className="form-group">
                                                <label className="form-label">
                                                    <Mail size={13} style={{ display: "inline", verticalAlign: "-2px", marginRight: "0.3rem" }} />
                                                    Email <span className="form-required">*</span>
                                                </label>
                                                <input
                                                    type="email"
                                                    className={`form-input ${errors.email ? "error" : ""}`}
                                                    placeholder="email@example.com"
                                                    value={email}
                                                    onChange={e => setEmail(e.target.value)}
                                                />
                                                {errors.email && <span className="form-error">{errors.email}</span>}
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">
                                                    <Phone size={13} style={{ display: "inline", verticalAlign: "-2px", marginRight: "0.3rem" }} />
                                                    Số Điện Thoại <span className="form-required">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    className={`form-input ${errors.phone ? "error" : ""}`}
                                                    placeholder="0912345678"
                                                    value={phone}
                                                    onChange={e => setPhone(e.target.value)}
                                                />
                                                {errors.phone && <span className="form-error">{errors.phone}</span>}
                                            </div>
                                        </div>

                                        {/* CCCD */}
                                        <div className="form-group">
                                            <label className="form-label">
                                                <IdCard size={13} style={{ display: "inline", verticalAlign: "-2px", marginRight: "0.3rem" }} />
                                                Số CCCD / CMND <span className="form-required">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                className={`form-input ${errors.idCard ? "error" : ""}`}
                                                placeholder="012345678901"
                                                value={idCard}
                                                onChange={e => setIdCard(e.target.value)}
                                            />
                                            {errors.idCard && <span className="form-error">{errors.idCard}</span>}
                                        </div>

                                        {/* Ngày sinh + HTTQ */}
                                        <div className="form-row-2col">
                                            <div className="form-group">
                                                <label className="form-label">
                                                    Ngày Sinh <span className="form-required">*</span>
                                                </label>
                                                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
                                                    <DatePicker
                                                        value={dob ? new Date(dob) : null}
                                                        onChange={(newValue) => setDob(newValue ? toLocalDateString(newValue) : "")}
                                                        format="dd/MM/yyyy"
                                                        slotProps={{
                                                            textField: {
                                                                variant: "outlined",
                                                                error: !!errors.dob,
                                                                sx: {
                                                                    width: '100%',
                                                                    bgcolor: '#fff',
                                                                    '& .MuiInputBase-root': {
                                                                        height: '42px',
                                                                        borderRadius: '6px',
                                                                        fontFamily: 'inherit',
                                                                        fontSize: '0.875rem'
                                                                    },
                                                                    '& .MuiOutlinedInput-notchedOutline': {
                                                                        borderColor: errors.dob ? '#dc2626' : '#cbd5e1'
                                                                    }
                                                                }
                                                            }
                                                        }}
                                                    />
                                                </LocalizationProvider>
                                                {errors.dob && <span className="form-error">{errors.dob}</span>}
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">
                                                    Hộ Khẩu Thường Trú <span className="form-required">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    className={`form-input ${errors.address ? "error" : ""}`}
                                                    placeholder="Địa chỉ..."
                                                    value={address}
                                                    onChange={e => setAddress(e.target.value)}
                                                />
                                                {errors.address && <span className="form-error">{errors.address}</span>}
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
                                    <p className="bk-card-desc">Chọn ngày vào ở, thời hạn thuê và số tháng muốn trả trước</p>

                                    <div className="bk-fields">
                                        {/* Ngày muốn vào ở */}
                                        <div className="form-group">
                                            <label className="form-label">
                                                <Calendar size={13} style={{ display: "inline", verticalAlign: "-2px", marginRight: "0.3rem" }} />
                                                Ngày Muốn Vào Ở <span className="form-required">*</span>
                                            </label>
                                            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
                                                <DatePicker
                                                    value={startDate ? new Date(startDate) : null}
                                                    onChange={(newValue) => setStartDate(newValue ? toLocalDateString(newValue) : "")}
                                                    format="dd/MM/yyyy"
                                                    minDate={new Date(minStartDateStr)}
                                                    maxDate={maxDateLimit}
                                                    shouldDisableDate={(date) => {
                                                        if (!date) return false;
                                                        if (room?.contractRenewalStatus === "declined") {
                                                            return false;
                                                        }
                                                        const isFutureMonth = 
                                                            date.getFullYear() > today.getFullYear() ||
                                                            (date.getFullYear() === today.getFullYear() && date.getMonth() > today.getMonth());
                                                        if (isFutureMonth) {
                                                            return date.getDate() !== 1;
                                                        }
                                                        return false;
                                                    }}
                                                    slotProps={{
                                                        textField: {
                                                            variant: "outlined",
                                                            error: !!errors.startDate,
                                                            sx: {
                                                                width: '100%',
                                                                bgcolor: '#fff',
                                                                '& .MuiInputBase-root': {
                                                                    height: '42px',
                                                                    borderRadius: '6px',
                                                                    fontFamily: 'inherit',
                                                                    fontSize: '0.875rem' // matched with standard UI
                                                                },
                                                                '& .MuiOutlinedInput-notchedOutline': {
                                                                    borderColor: errors.startDate ? '#dc2626' : '#cbd5e1'
                                                                },
                                                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                                                    borderColor: '#94a3b8'
                                                                },
                                                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                                    borderColor: '#2563eb',
                                                                    borderWidth: '1px'
                                                                }
                                                            }
                                                        }
                                                    }}
                                                />
                                            </LocalizationProvider>
                                            {room.contractRenewalStatus === "declined" && (
                                                <span className="form-hint" style={{display: "block", marginTop: "4px"}}>
                                                    ⚠ Bắt đầu sớm nhất: {new Date(minStartDateStr).toLocaleDateString("vi-VN")} (ngày sau khi HĐ hiện tại kết thúc)
                                                </span>
                                            )}
                                            {room.futureContractStartDate && (
                                                <span className="form-hint" style={{display: "block", marginTop: "4px"}}>
                                                    ⚠ Kết thúc trước: {new Date(room.futureContractStartDate).toLocaleDateString("vi-VN")}
                                                    {room.nextInactiveContractStart && ` (HĐ kế tiếp bắt đầu từ ${new Date(room.nextInactiveContractStart).toLocaleDateString("vi-VN")})`}
                                                </span>
                                            )}
                                            {errors.startDate && <span className="form-error">{errors.startDate}</span>}
                                        </div>

                                        {/* Số tháng thuê + Số tháng trả trước */}
                                        <div className="form-row-2col">
                                            <div className="form-group">
                                                <label className="form-label">
                                                    Số Tháng Muốn Thuê <span className="form-required">*</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    className={`form-input ${errors.duration ? "error" : ""}`}
                                                    min={1}
                                                    max={maxDuration}
                                                    value={duration}
                                                    onChange={e => {
                                                        const v = Math.min(maxDuration, Math.max(1, parseInt(e.target.value) || 1));
                                                        setDuration(v);
                                                    }}
                                                />
                                                {maxDuration < 60 && (
                                                    <span className="form-hint">Tối đa {maxDuration} tháng</span>
                                                )}
                                                {errors.duration && <span className="form-error">{errors.duration}</span>}
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">
                                                    Số Tháng Muốn Trả Trước
                                                </label>
                                                <select
                                                    className="form-input"
                                                    value={prepayMonths}
                                                    onChange={e => {
                                                        const v = e.target.value;
                                                        setPrepayMonths(v === "all" ? "all" : parseInt(v));
                                                    }}
                                                >
                                                    {Array.from({ length: maxPrepay }, (_, i) => i + 1).map(n => (
                                                        <option key={n} value={n}>{n} tháng</option>
                                                    ))}
                                                    <option value="all">Tất cả ({duration} tháng)</option>
                                                </select>
                                                <span className="form-hint">Số tháng tiền nhà trả trước khi ký HĐ</span>
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
                                                Tối đa {maxCoResidents} người ở cùng/phòng (không tính chủ hợp đồng)
                                            </p>
                                        </div>
                                        {coResidents.length < maxCoResidents && (
                                            <button type="button" className="bk-add-btn" onClick={addCoResident}>
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
                                                <button type="button" className="bk-add-btn" onClick={addCoResident}>
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
                                                        <div className="form-group">
                                                            <label className="form-label">Họ và tên <span className="form-required">*</span></label>
                                                            <input
                                                                type="text"
                                                                className={`form-input ${errors.coResidents?.[i]?.fullName ? "error" : ""}`}
                                                                placeholder="Nguyễn Thị B"
                                                                value={cr.fullName}
                                                                onChange={e => updateCoResident(i, "fullName", e.target.value)}
                                                            />
                                                            {errors.coResidents?.[i]?.fullName && (
                                                                <span className="form-error">{errors.coResidents[i].fullName}</span>
                                                            )}
                                                        </div>
                                                        <div className="form-group">
                                                            <label className="form-label">Số CCCD <span className="form-required">*</span></label>
                                                            <input
                                                                type="text"
                                                                className={`form-input ${errors.coResidents?.[i]?.cccd ? "error" : ""}`}
                                                                placeholder="012345678901"
                                                                value={cr.cccd}
                                                                onChange={e => updateCoResident(i, "cccd", e.target.value)}
                                                            />
                                                            {errors.coResidents?.[i]?.cccd && (
                                                                <span className="form-error">{errors.coResidents[i].cccd}</span>
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
                                        <p>✓ Sau khi đặt cọc thành công, bạn sẽ nhận email xác nhận</p>
                                        <p>✓ Phòng sẽ được giữ lại trong vòng 30 ngày để ký hợp đồng</p>
                                        <p>✓ Tiền cọc bằng 1 tháng tiền nhà, không hoàn lại nếu không ký HĐ</p>
                                        <p>✓ Thông tin CCCD sẽ được dùng để lập hợp đồng thuê chính thức</p>
                                    </div>

                                    {submitError && (
                                        <div className="form-submit-error" style={{ marginTop: "1rem" }}>{submitError}</div>
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
                                                <CheckCircle size={18} />
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
                                    <h2 className="success-heading">Gửi Yêu Cầu Thành Công!</h2>
                                    <p className="success-subheading">
                                        Cảm ơn bạn đã chọn {room.roomCode} của Hoàng Nam Building
                                    </p>

                                    <div className="success-summary">
                                        <div className="payment-info-row">
                                            <span className="payment-info-label">Số tiền cọc dự kiến:</span>
                                            <span className="payment-info-value highlight">
                                                {depositAmount.toLocaleString("vi-VN")}đ
                                            </span>
                                        </div>
                                        <div className="payment-info-row">
                                            <span className="payment-info-label">Người đại diện:</span>
                                            <span className="payment-info-value">{fullName}</span>
                                        </div>
                                        <div className="payment-info-row">
                                            <span className="payment-info-label">Ngày muốn vào ở:</span>
                                            <span className="payment-info-value">
                                                {startDate ? new Date(startDate).toLocaleDateString("vi-VN") : "—"}
                                            </span>
                                        </div>
                                        <div className="payment-info-row">
                                            <span className="payment-info-label">Thời hạn thuê:</span>
                                            <span className="payment-info-value">{duration} tháng</span>
                                        </div>
                                        <div className="payment-info-row">
                                            <span className="payment-info-label">Trả trước:</span>
                                            <span className="payment-info-value">
                                                {prepayMonths === "all" ? `${duration} tháng (toàn bộ)` : `${prepayMonths} tháng`}
                                            </span>
                                        </div>
                                        {coResidents.length > 0 && (
                                            <div className="payment-info-row">
                                                <span className="payment-info-label">Người ở cùng:</span>
                                                <span className="payment-info-value">{coResidents.map(c => c.fullName).join(", ")}</span>
                                            </div>
                                        )}
                                        <div className="payment-info-row">
                                            <span className="payment-info-label">Trạng thái yêu cầu:</span>
                                            <span className="success-badge" style={{ backgroundColor: "#e2e8f0", color: "#475569" }}>Đang Chờ Xử Lý</span>
                                        </div>
                                    </div>

                                    <div className="success-info-box">
                                        <p>📋 Thông tin cần biết:</p>
                                        <ul>
                                            <li>• Yêu cầu của bạn đã được gửi đến Ban Quản Lý (Status: Pending).</li>
                                            <li>• BQL sẽ xem xét, chốt thông tin và gửi hợp đồng kèm phương thức thanh toán vào Email: {email}</li>
                                            <li>• Hotline hỗ trợ ngay: 0869 048 066</li>
                                        </ul>
                                    </div>

                                    <div className="success-buttons">
                                        <button className="bk-primary-btn" onClick={() => navigate("/rooms")}>
                                            Quay Lại Danh Sách Phòng
                                        </button>
                                        <button className="bk-outline-btn" onClick={() => navigate(`/rooms/${id}`)}>
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
                                    <p className="sidebar-room-floor">Tầng {room.floor} • {room.typeName}</p>
                                </div>
                            </div>

                            <div className="sidebar-price-box">
                                <span className="sidebar-price-label">Giá Phòng</span>
                                <span className="sidebar-price-value">
                                    {room.price > 0 ? `${room.price.toLocaleString("vi-VN")} đ / tháng` : "Liên hệ"}
                                </span>
                            </div>

                            <div className="sidebar-deposit-box">
                                <div className="sidebar-deposit-row">
                                    <span className="sidebar-price-label">Tiền Cọc (Tạm tính)</span>
                                    <span className="sidebar-deposit-value">
                                        {depositAmount > 0 ? `${depositAmount.toLocaleString("vi-VN")} đ` : "Liên hệ"}
                                        <span className="sidebar-deposit-note"> = 1 tháng tiền nhà</span>
                                    </span>
                                </div>
                            </div>

                            {/* Tóm tắt thông tin đã điền */}
                            {bookingStep === "form" && startDate && (
                                <div className="sidebar-summary-box">
                                    <p className="sidebar-terms-title">📝 Thông tin đã chọn</p>
                                    <div className="sidebar-summary-row">
                                        <span>Ngày vào ở:</span>
                                        <strong>{new Date(startDate).toLocaleDateString("vi-VN")}</strong>
                                    </div>
                                    <div className="sidebar-summary-row">
                                        <span>Thời hạn:</span>
                                        <strong>{duration} tháng</strong>
                                    </div>
                                    <div className="sidebar-summary-row">
                                        <span>Trả trước:</span>
                                        <strong>
                                            {prepayMonths === "all" ? `${duration} tháng` : `${prepayMonths} tháng`}
                                        </strong>
                                    </div>
                                    <div className="sidebar-summary-row">
                                        <span>Người ở cùng:</span>
                                        <strong>{coResidents.length} người</strong>
                                    </div>
                                </div>
                            )}

                            <div className="sidebar-terms">
                                <p className="sidebar-terms-title">
                                    <Shield size={14} style={{ display: "inline", verticalAlign: "-2px", marginRight: "0.375rem" }} />
                                    Điều Khoản
                                </p>
                                <ul className="sidebar-terms-list">
                                    <li><span className="check" style={{ color: "#2563eb" }}>ℹ</span><span style={{ color: "#2563eb", fontWeight: "bold" }}>Các khoản tiền ở đây chỉ là tạm tính. Bạn sẽ thanh toán chính thức sau khi Ban Quản Lý duyệt yêu cầu.</span></li>
                                    <li><span className="check">✓</span><span>Giữ phòng 30 ngày</span></li>
                                    <li><span className="check">✓</span><span>Không hoàn lại cọc</span></li>
                                    <li><span className="check">✓</span><span>Phải ký HĐ trong 30 ngày</span></li>
                                    {room.isShortTermAvailable && room.futureContractStartDate && (
                                        <li>
                                            <span className="check" style={{ color: "var(--warning)" }}>⚠</span>
                                            <span style={{ color: "var(--warning)", fontWeight: "bold" }}>Thuê ngắn hạn đến {new Date(room.futureContractStartDate).toLocaleDateString("vi-VN")}</span>
                                        </li>
                                    )}
                                    {room.contractRenewalStatus === "declined" && !room.successorLeaseBooked && (
                                        <li>
                                            <span className="check" style={{ color: "var(--warning)" }}>⚠</span>
                                            <span style={{ color: "var(--warning)", fontWeight: "bold" }}>Người thuê hiện tại đã từ chối gia hạn — đặt cọc cho kỳ thuê tiếp theo.</span>
                                        </li>
                                    )}
                                    {room.successorLeaseBooked && (
                                        <li>
                                            <span className="check" style={{ color: "#92400e" }}>ℹ</span>
                                            <span style={{ color: "#92400e", fontWeight: "bold" }}>Kỳ thuê tiếp theo đã có hợp đồng — không đặt cọc thêm.</span>
                                        </li>
                                    )}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* PAYMENT MODAL */}
            {showPaymentModal && depositData && (
                <div className="payment-modal-overlay" onClick={handleCancelDeposit}>
                    <div className="payment-modal-content" onClick={e => e.stopPropagation()}>
                        <button className="payment-modal-close" onClick={handleCancelDeposit}>✕</button>
                        <DepositPayment
                            depositData={depositData}
                            onSuccess={handlePaymentSuccess}
                            onCancel={handleCancelDeposit}
                        />
                    </div>
                </div>
            )}
        </main>
    );
}

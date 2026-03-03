import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    ChevronLeft,
    CheckCircle,
    Loader,
    User,
    CreditCard,
    Building,
    Shield,
} from "lucide-react";
import { roomService } from "../../../services/roomService";
import { depositService } from "../../../services/depositService";
import type { DepositInitiateData } from "../../../services/depositService";
import DepositPayment from "./DepositPayment";
import "./BookingPage.css";

interface FormErrors {
    fullName?: string;
    email?: string;
    phone?: string;
}

export default function BookingPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [room, setRoom] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [bookingStep, setBookingStep] = useState<"form" | "success">("form");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [depositData, setDepositData] = useState<DepositInitiateData | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
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
                    setRoom({
                        ...roomData,
                        roomCode: roomData.roomCode || roomData.name,
                        floor: roomData.floorId?.name || "N/A",
                        floorLabel: `Tầng ${roomData.floorId?.name || "N/A"} `,
                        price,
                        typeName: roomData.roomTypeId?.typeName || "Phòng",
                    });
                }
            } catch (err) {
                console.error("Error fetching room:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchRoom();
    }, [id]);

    const validate = (): boolean => {
        const newErrors: FormErrors = {};
        if (!fullName.trim() || fullName.trim().length < 2)
            newErrors.fullName = "Tên phải ít nhất 2 ký tự";
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
            newErrors.email = "Email không hợp lệ";
        if (!phone.trim() || !/^[0-9]{10,11}$/.test(phone))
            newErrors.phone = "Số điện thoại phải có 10-11 chữ số";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setIsSubmitting(true);
        setSubmitError(null);
        try {
            const res = await depositService.initiateDeposit({
                roomId: id!,
                name: fullName.trim(),
                phone: phone.trim(),
                email: email.trim(),
            });
            if (res.success) {
                setDepositData(res.data);
                setShowPaymentModal(true);
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
            } catch {
                // Ignore cancel errors - deposit may already be expired/deleted
            }
        }
        setShowPaymentModal(false);
        setDepositData(null);
    };

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

    return (
        <main className="booking-page">
            <div className="booking-container">
                {/* Back Link */}
                <button className="booking-back-link" onClick={() => navigate(-1)}>
                    <ChevronLeft size={16} />
                    Quay Lại Chi Tiết Phòng
                </button>

                {/* Page Title */}
                <h1 className="booking-page-title">Đặt Cọc {room.roomCode}</h1>
                <p className="booking-page-subtitle">Điền thông tin và thanh toán để giữ phòng</p>

                <div className="booking-grid">
                    {/* ========== MAIN CONTENT ========== */}
                    <div className="booking-main">
                        {/* STEP 1: FORM */}
                        {bookingStep === "form" && (
                            <div className="bk-card">
                                <h3 className="bk-card-title">
                                    <User size={18} />
                                    Thông Tin Người Đặt
                                </h3>
                                <p className="bk-card-desc">Vui lòng cung cấp thông tin liên hệ chính xác</p>

                                <form className="booking-form" onSubmit={handleSubmit}>
                                    <div className="form-group">
                                        <label className="form-label">Họ Tên Đầy Đủ *</label>
                                        <input
                                            type="text"
                                            className={`form-input ${errors.fullName ? "error" : ""}`}
                                            placeholder="Nguyễn Văn A"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                        />
                                        {errors.fullName && <span className="form-error">{errors.fullName}</span>}
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Email *</label>
                                        <input
                                            type="email"
                                            className={`form-input ${errors.email ? "error" : ""}`}
                                            placeholder="email@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                        {errors.email && <span className="form-error">{errors.email}</span>}
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Số Điện Thoại *</label>
                                        <input
                                            type="text"
                                            className={`form-input ${errors.phone ? "error" : ""}`}
                                            placeholder="0912345678"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                        />
                                        {errors.phone && <span className="form-error">{errors.phone}</span>}
                                    </div>

                                    <div className="terms-box">
                                        <p>✓ Sau khi đặt cọc thành công, bạn sẽ nhận được email xác nhận</p>
                                        <p>✓ Phòng sẽ được giữ lại trong vòng 7 ngày</p>
                                        <p>✓ Vui lòng ký hợp đồng trong thời gian này</p>
                                    </div>

                                    {submitError && (
                                        <div className="form-submit-error">{submitError}</div>
                                    )}

                                    <button type="submit" className="bk-primary-btn" disabled={isSubmitting}>
                                        {isSubmitting ? (
                                            <>
                                                <Loader size={18} className="spin" />
                                                Đang xử lý...
                                            </>
                                        ) : (
                                            <>
                                                <CreditCard size={18} />
                                                Tiếp Tục Thanh Toán
                                            </>
                                        )}
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* STEP 2: SUCCESS */}
                        {bookingStep === "success" && (
                            <div className="bk-card">
                                <div className="success-content">
                                    <div className="success-icon-wrapper">
                                        <CheckCircle />
                                    </div>

                                    <h2 className="success-heading">Đặt Cọc Thành Công!</h2>
                                    <p className="success-subheading">
                                        Cảm ơn bạn đã chọn {room.roomCode} của Hoàng Nam Building
                                    </p>

                                    <div className="success-summary">
                                        <div className="payment-info-row">
                                            <span className="payment-info-label">Số tiền cọc:</span>
                                            <span className="payment-info-value highlight">
                                                {depositAmount.toLocaleString("vi-VN")}đ
                                            </span>
                                        </div>
                                        <div className="payment-info-row">
                                            <span className="payment-info-label">Thời gian giữ phòng:</span>
                                            <span className="payment-info-value">7 ngày</span>
                                        </div>
                                        <div className="payment-info-row">
                                            <span className="payment-info-label">Trạng thái:</span>
                                            <span className="success-badge">Đã Đặt Cọc</span>
                                        </div>
                                    </div>

                                    <div className="success-info-box">
                                        <p>📋 Thông tin cần biết:</p>
                                        <ul>
                                            <li>• Email xác nhận đã được gửi tới email của bạn</li>
                                            <li>• Vui lòng liên hệ để ký hợp đồng trong vòng 7 ngày</li>
                                            <li>• Hotline: (028) 1234 5678</li>
                                            <li>• Zalo: @hoangnambuilding</li>
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
                                    <p className="sidebar-room-floor">{room.floor} • {room.typeName}</p>
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
                                    <span className="sidebar-price-label">Tiền Cọc</span>
                                    <span className="sidebar-deposit-value">
                                        {depositAmount > 0 ? `${depositAmount.toLocaleString("vi-VN")} đ` : "Liên hệ"}
                                        <span className="sidebar-deposit-note"> = 1 tháng tiền nhà</span>
                                    </span>
                                </div>
                            </div>

                            <div className="sidebar-terms">
                                <p className="sidebar-terms-title">
                                    <Shield size={14} style={{ display: "inline", verticalAlign: "-2px", marginRight: "0.375rem" }} />
                                    Điều Khoản
                                </p>
                                <ul className="sidebar-terms-list">
                                    <li>
                                        <span className="check">✓</span>
                                        <span>Giữ phòng 7 ngày</span>
                                    </li>
                                    <li>
                                        <span className="check">✓</span>
                                        <span>Không hoàn lại cọc</span>
                                    </li>
                                    <li>
                                        <span className="check">✓</span>
                                        <span>Phải ký HĐ trong 7 ngày</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ========== PAYMENT MODAL ========== */}
            {showPaymentModal && depositData && (
                <div className="payment-modal-overlay" onClick={handleCancelDeposit}>
                    <div className="payment-modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="payment-modal-close" onClick={handleCancelDeposit}>
                            ✕
                        </button>
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

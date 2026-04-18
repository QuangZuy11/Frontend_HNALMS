import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import {
  ChevronLeft,
  CheckCircle,
  Loader,
  User,
  Building,
  Shield,
} from "lucide-react";
import { roomService } from "../../services/roomService";
import toastr from "toastr";
import "toastr/build/toastr.min.css";
import "./CreateDeposit.css";

interface FormErrors {
  fullName?: string;
  email?: string;
  phone?: string;
}

interface Room {
  _id: string;
  roomCode?: string;
  name?: string;
  floorId?: {
    _id: string;
    name: string;
  };
  roomTypeId?: {
    _id: string;
    typeName?: string;
    name?: string;
    currentPrice?: any;
  };
  price: number;
  floor?: string;
  floorLabel?: string;
  typeName?: string;
  futureContractStartDate?: string; // Ngày bắt đầu hợp đồng tương lai (nếu có)
}

export default function CreateDeposit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine base path (owner or manager)
  const basePath = location.pathname.startsWith("/owner")
    ? "/owner"
    : "/manager";

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);

  const [bookingStep, setBookingStep] = useState<"form" | "success">("form");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    toastr.options = {
      closeButton: true,
      progressBar: true,
      positionClass: "toast-top-right",
      timeOut: 3000,
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
          setRoom({
            ...roomData,
            roomCode: roomData.roomCode || roomData.name,
            floor: roomData.floorId?.name || "N/A",
            floorLabel: `Tầng ${roomData.floorId?.name || "N/A"}`,
            price,
            typeName: roomData.roomTypeId?.typeName || "Phòng",
            futureContractStartDate: roomData.futureContractStartDate,
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
    if (!paymentConfirmed || !room) {
      toastr.warning("Vui lòng xác nhận đã nhận tiền cọc");
      return;
    }

    setIsSubmitting(true);
    try {
      // Tính expireAt: 30 ngày sau, cuối ngày (23:59:59)
      const expireDate = new Date();
      expireDate.setDate(expireDate.getDate() + 30);
      expireDate.setHours(23, 59, 59, 999);

      // Call API to create deposit
      const response = await axios.post(
        "http://localhost:9999/api/deposits",
        {
          name: fullName,
          email: email,
          phone: phone,
          room: room._id,
          amount: room.price,
          status: "Held",
          createdDate: new Date().toISOString(),
          expireAt: expireDate.toISOString(),
        },
        { withCredentials: true },
      );

      if (response.data.success) {
        toastr.success("Tạo cọc thành công!");
        setBookingStep("success");
      } else {
        toastr.error(
          "Có lỗi xảy ra khi tạo cọc: " +
          (response.data.message || "Unknown error"),
        );
      }
    } catch (err: unknown) {
      console.error("Error creating deposit:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      const axiosError = err as { response?: { data?: { message?: string } } };
      toastr.error(
        "Có lỗi xảy ra: " +
        (axiosError.response?.data?.message || errorMessage),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="create-deposit-page">
        <div className="deposit-loading">
          <p className="deposit-loading-text">Đang tải thông tin phòng...</p>
        </div>
      </main>
    );
  }

  if (!room) {
    return (
      <main className="create-deposit-page">
        <div
          className="deposit-container"
          style={{ textAlign: "center", paddingTop: "4rem" }}
        >
          <h2>Phòng Không Tồn Tại</h2>
          <button
            className="deposit-back-link"
            onClick={() => navigate(`${basePath}/deposits/floor-map`)}
            style={{ marginTop: "1rem" }}
          >
            Quay Lại Sơ Đồ Tầng
          </button>
        </div>
      </main>
    );
  }

  const depositAmount = room.price;

  return (
    <main className="create-deposit-page">
      <div className="deposit-container">
        {/* Back Link */}
        <button className="deposit-back-link" onClick={() => navigate(-1)}>
          <ChevronLeft size={16} />
          Quay Lại Sơ Đồ Tầng
        </button>

        {/* Page Title */}
        <h1 className="deposit-page-title">Tạo Cọc Phòng {room.roomCode}</h1>
        <p className="deposit-page-subtitle">
          Điền thông tin khách hàng và xác nhận thanh toán
        </p>

        <div className="deposit-grid">
          {/* ========== MAIN CONTENT ========== */}
          <div className="deposit-main">
            {/* STEP 1: FORM */}
            {bookingStep === "form" && (
              <div className="dp-card">
                <h3 className="dp-card-title">
                  <User size={18} />
                  Thông Tin Người Cọc
                </h3>
                <p className="dp-card-desc">
                  Vui lòng nhập thông tin khách hàng
                </p>

                <form className="deposit-form" onSubmit={handleSubmit}>
                  <fieldset disabled={isSubmitting} style={{ border: "none", margin: 0, padding: 0 }}>
                    <div className="form-group">
                      <label className="form-label">Họ Tên Đầy Đủ *</label>
                      <input
                        type="text"
                        className={`form-input ${errors.fullName ? "error" : ""}`}
                        placeholder="Nguyễn Văn A"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                      {errors.fullName && (
                        <span className="form-error">{errors.fullName}</span>
                      )}
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
                      {errors.email && (
                        <span className="form-error">{errors.email}</span>
                      )}
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
                      {errors.phone && (
                        <span className="form-error">{errors.phone}</span>
                      )}
                    </div>

                    <div className="terms-box">
                      <p>✓ Sau khi tạo cọc, hệ thống sẽ ghi nhận thông tin</p>
                      <p>✓ Phòng sẽ được giữ trong vòng 30 ngày</p>
                      <p>✓ Khách hàng cần ký hợp đồng trong thời gian này</p>
                      {room.futureContractStartDate && (
                        <p style={{ color: "#d97706", fontWeight: 500 }}>
                          ⚠ Lưu ý: Phòng này đã có người đặt cọc từ ngày{" "}
                          {new Date(room.futureContractStartDate).toLocaleDateString("vi-VN")}.
                          Hợp đồng mới phải kết thúc trước ngày này.
                        </p>
                      )}
                    </div>

                    <div className="deposit-amount-display">
                      <span className="deposit-amount-label">Số tiền cọc:</span>
                      <span className="deposit-amount-value">
                        {depositAmount.toLocaleString("vi-VN")}đ
                      </span>
                    </div>

                    <div className="confirm-checkbox">
                      <label>
                        <input
                          type="checkbox"
                          checked={paymentConfirmed}
                          onChange={(e) => setPaymentConfirmed(e.target.checked)}
                        />
                        Đã nhận tiền cọc từ khách hàng
                      </label>
                    </div>

                    <button
                      type="submit"
                      className="dp-primary-btn green"
                      disabled={isSubmitting || !paymentConfirmed}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader size={18} className="spin" />
                          Đang xử lý...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={18} />
                          Tạo Cọc
                        </>
                      )}
                    </button>
                  </fieldset>
                </form>
              </div>
            )}

            {/* STEP 2: SUCCESS */}
            {bookingStep === "success" && (
              <div className="dp-card">
                <div className="success-content">
                  <div className="success-icon-wrapper">
                    <CheckCircle />
                  </div>

                  <h2 className="success-heading">Tạo Cọc Thành Công!</h2>
                  <p className="success-subheading">
                    Đã ghi nhận tiền cọc phòng {room.roomCode}
                  </p>

                  <div className="success-summary">
                    <div className="payment-info-row">
                      <span className="payment-info-label">Khách hàng:</span>
                      <span className="payment-info-value">{fullName}</span>
                    </div>
                    <div className="payment-info-row">
                      <span className="payment-info-label">Số tiền cọc:</span>
                      <span className="payment-info-value highlight">
                        {depositAmount.toLocaleString("vi-VN")}đ
                      </span>
                    </div>
                    <div className="payment-info-row">
                      <span className="payment-info-label">
                        Thời gian giữ phòng:
                      </span>
                      <span className="payment-info-value">30 ngày</span>
                    </div>
                    <div className="payment-info-row">
                      <span className="payment-info-label">Trạng thái:</span>
                      <span className="success-badge">Đã Cọc</span>
                    </div>
                  </div>

                  <div className="success-info-box">
                    <p>📋 Các bước tiếp theo:</p>
                    <ul>
                      <li>
                        • Thông báo cho khách hàng về thời hạn ký hợp đồng
                      </li>
                      <li>• Chuẩn bị hợp đồng thuê phòng</li>
                      <li>• Liên hệ khách hàng để sắp xếp lịch ký HĐ</li>
                    </ul>
                  </div>

                  <div className="success-buttons">
                    {location.state?.returnTo === "create-contract" ? (
                      <button
                        className="dp-primary-btn"
                        onClick={() =>
                          navigate(`${basePath}/contracts/create`, {
                            state: { roomId: id },
                          })
                        }
                      >
                        ← Tiếp tục tạo hợp đồng
                      </button>
                    ) : (
                      <button
                        className="dp-primary-btn"
                        onClick={() => navigate(`${basePath}/deposits`)}
                      >
                        Xem Danh Sách Cọc
                      </button>
                    )}
                    <button
                      className="dp-outline-btn"
                      onClick={() => navigate(`${basePath}/deposits/floor-map`)}
                    >
                      Tạo Cọc Khác
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ========== SIDEBAR ========== */}
          <div className="deposit-sidebar">
            <div className="dp-card">
              <div className="sidebar-room-header">
                <div className="sidebar-room-icon">
                  <Building size={20} />
                </div>
                <div>
                  <h3 className="sidebar-room-name">{room.roomCode}</h3>
                  <p className="sidebar-room-floor">
                    {room.floorLabel} • {room.typeName}
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

              <div className="sidebar-deposit-box">
                <div className="sidebar-deposit-row">
                  <span className="sidebar-price-label">Tiền Cọc</span>
                  <span className="sidebar-deposit-value">
                    {depositAmount > 0
                      ? `${depositAmount.toLocaleString("vi-VN")} đ`
                      : "Liên hệ"}
                    <span className="sidebar-deposit-note">
                      {" "}
                      = 1 tháng tiền nhà
                    </span>
                  </span>
                </div>
              </div>

              <div className="sidebar-terms">
                {/* <p className="sidebar-terms-title">
                  <Shield
                    size={14}
                    style={{
                      display: "inline",
                      verticalAlign: "-2px",
                      marginRight: "0.375rem",
                    }}
                  />
                  Điều Khoản Cọc
                </p>
                <ul className="sidebar-terms-list">
                  <li>
                    <span className="check">✓</span>
                    <span>Giữ phòng 30 ngày</span>
                  </li>
                  <li>
                    <span className="check">✓</span>
                    <span>Không hoàn cọc nếu hủy</span>
                  </li>
                  <li>
                    <span className="check">✓</span>
                    <span>Phải ký HĐ trong 30 ngày</span>
                  </li>
                </ul> */}
                {room.futureContractStartDate && (
                  <div
                    style={{
                      marginTop: "1rem",
                      padding: "0.75rem",
                      backgroundColor: "#fef3c7",
                      borderRadius: "0.5rem",
                      border: "1px solid #f59e0b",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.875rem",
                        color: "#92400e",
                        fontWeight: 500,
                      }}
                    >
                      ⚠ Thuê ngắn hạn
                    </p>
                    <p
                      style={{
                        margin: "0.25rem 0 0 0",
                        fontSize: "0.8rem",
                        color: "#78350f",
                      }}
                    >
                      Phòng có người thuê từ{" "}
                      {new Date(room.futureContractStartDate).toLocaleDateString(
                        "vi-VN"
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Home,
  Users,
  Monitor,
  Zap,
  Droplet,
  Wifi,
  Sparkles,
  ArrowUpDown,
  Phone,
  MessageCircle,
} from "lucide-react";
import { roomService } from "../../../services/roomService";
import { serviceService } from "../../../services/serviceService";

import "./RoomDetail.css";

export default function RoomDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [services, setServices] = useState<any[]>([]);

  // Scroll thumbnail into view when image changes
  useEffect(() => {
    const thumbnailElement = document.querySelector(
      `.thumbnail-wrapper:nth-child(${currentImageIndex + 1})`,
    );
    if (thumbnailElement) {
      thumbnailElement.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [currentImageIndex]);

  useEffect(() => {
    fetchRoomDetail();
    fetchServices();
  }, [id]);

  const fetchRoomDetail = async () => {
    try {
      setLoading(true);
      const response = await roomService.getRoomById(id);

      // Backend returns { data } format
      if (response.data) {
        const roomData = response.data;

        console.log("🏠 Room Detail Data:", roomData);
        console.log("📸 roomTypeId:", roomData.roomTypeId);
        console.log("💰 currentPrice raw:", roomData.roomTypeId?.currentPrice);

        // Parse price - handle Decimal128 object format
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
        console.log("💰 Parsed price:", price);

        // Transform data to match component expectations
        const transformedRoom = {
          ...roomData,
          roomCode: roomData.roomCode || roomData.name,
          floor: roomData.floorId?.name || "N/A",
          floorLabel: roomData.floorId?.name || "N/A",
          price: price,
          area: roomData.roomTypeId?.area || 30,
          capacity: roomData.roomTypeId?.personMax || 2,
          description:
            roomData.description || roomData.roomTypeId?.description || "",
          images: roomData.roomTypeId?.images || [],
          amenities: roomData.amenities || [],
          assets: roomData.assets || [],
        };

        console.log("✅ Transformed room price:", transformedRoom.price);
        console.log("✅ Images length:", transformedRoom.images.length);

        setRoom(transformedRoom);
      } else {
        setError("Không thể tải thông tin phòng");
      }
    } catch (err) {
      console.error("Error fetching room detail:", err);
      setError("Đã xảy ra lỗi khi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const response = await serviceService.getServices();
      if (response.data) {
        // Filter only the services we want to display
        const allowedNames = [
          "Điện",
          "Nước",
          "Internet",
          "Vệ Sinh",
          "Thang máy",
        ];
        const filtered = response.data.filter((svc: any) =>
          allowedNames.some((name) =>
            svc.name.toLowerCase().includes(name.toLowerCase()),
          ),
        );
        setServices(filtered);
      }
    } catch (err) {
      console.error("Error fetching services:", err);
    }
  };

  const getServiceIcon = (serviceName: string) => {
    const lowerName = serviceName.toLowerCase();
    if (lowerName.includes("điện")) return Zap;
    if (lowerName.includes("nước")) return Droplet;
    if (lowerName.includes("internet") || lowerName.includes("wifi"))
      return Wifi;
    if (lowerName.includes("vệ sinh")) return Sparkles;
    if (lowerName.includes("thang máy")) return ArrowUpDown;
    return Zap;
  };

  const handlePrevImage = () => {
    if (room?.images?.length > 0) {
      setCurrentImageIndex((prev) =>
        prev === 0 ? room.images.length - 1 : prev - 1,
      );
    }
  };

  const handleNextImage = () => {
    if (room?.images?.length > 0) {
      setCurrentImageIndex((prev) =>
        prev === room.images.length - 1 ? 0 : prev + 1,
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg">Đang tải thông tin phòng...</p>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-red-600">
            {error || "Không tìm thấy phòng"}
          </p>
          <button
            onClick={() => {
              navigate("/rooms");
            }}
            className="mt-4 btn-primary"
          >
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  const depositAmount = room.price;

  return (
    <main className="room-detail-page">
      <div className="room-detail-container">
        {/* Back Button */}
        <button
          onClick={() => {
            navigate("/rooms");
          }}
          className="back-button"
        >
          <ChevronLeft className="icon" />
          Quay lại danh sách
        </button>

        {/* Gallery - Full Width */}
        <div className="gallery-card full-width">
          {room.images && room.images.length > 0 ? (
            <div className="image-gallery">
              {/* Main Image */}
              <div className="main-image-container">
                <img
                  src={room.images[currentImageIndex]}
                  alt={`${room.roomCode} - Ảnh ${currentImageIndex + 1}`}
                  className="main-gallery-image"
                />

                {/* Room Info Overlay */}
                <div className="gallery-overlay">
                  <div className="overlay-info">
                    <h1 className="overlay-title">
                      Phòng {room.roomCode || room.name}
                    </h1>
                    <div className="overlay-location">
                      <MapPin size={14} />
                      <span>{room.floorLabel}</span>
                    </div>
                  </div>
                  <span
                    className={`overlay-status ${room.status === "Available" || room.status === "Trống"
                        ? "available"
                        : room.status === "Deposited"
                          ? "deposited"
                          : "occupied"
                      }`}
                  >
                    {room.status === "Available" || room.status === "Trống"
                      ? "Còn trống"
                      : room.status === "Deposited"
                        ? "Đã đặt cọc"
                        : "Đã thuê"}
                  </span>
                </div>

                {/* Navigation Buttons */}
                {room.images.length > 1 && (
                  <>
                    <button
                      className="gallery-nav-button prev"
                      onClick={handlePrevImage}
                      aria-label="Ảnh trước"
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <button
                      className="gallery-nav-button next"
                      onClick={handleNextImage}
                      aria-label="Ảnh tiếp theo"
                    >
                      <ChevronRight size={24} />
                    </button>
                  </>
                )}

                {/* Image Counter */}
                <div className="image-counter">
                  {currentImageIndex + 1} / {room.images.length}
                </div>
              </div>

              {/* Thumbnails */}
              {room.images.length > 1 && (
                <div className="thumbnails-container">
                  {room.images.map((image, index) => (
                    <div
                      key={index}
                      className={`thumbnail-wrapper ${index === currentImageIndex ? "active" : ""
                        }`}
                      onClick={() => setCurrentImageIndex(index)}
                    >
                      <img
                        src={image}
                        alt={`Thumbnail ${index + 1}`}
                        className="thumbnail-image"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="gallery-placeholder">
              {/* Room Info Overlay for placeholder */}
              <div className="gallery-overlay">
                <div className="overlay-info">
                  <h1 className="overlay-title">
                    Phòng {room.roomCode || room.name}
                  </h1>
                  <div className="overlay-location">
                    <MapPin size={14} />
                    <span>{room.floorLabel}</span>
                  </div>
                </div>
                <span
                  className={`overlay-status ${room.status === "Available" || room.status === "Trống"
                      ? "available"
                      : room.status === "Deposited"
                        ? "deposited"
                        : "occupied"
                    }`}
                >
                  {room.status === "Available" || room.status === "Trống"
                    ? "Còn trống"
                    : room.status === "Deposited"
                      ? "Đã đặt cọc"
                      : "Đã thuê"}
                </span>
              </div>
              <span className="gallery-text">Hình Ảnh Phòng</span>
            </div>
          )}
        </div>

        <div className="detail-grid">
          {/* Main Content */}
          <div className="main-content">
            {/* Room Info Card */}
            <div className="info-card">
              <h3 className="card-title">Thông Tin Phòng</h3>

              {room.description && (
                <p className="detail-room-description">{room.description}</p>
              )}

              {/* Specs Grid */}
              <div className="specs-grid-detail">
                <div className="spec-box">
                  <Home className="spec-icon-large" />
                  <div className="spec-value-large">{room.area}m²</div>
                  <div className="spec-label">Diện tích</div>
                </div>
                <div className="spec-box">
                  <Users className="spec-icon-large" />
                  <div className="spec-value-large">{room.capacity || 2}</div>
                  <div className="spec-label">Tối đa người</div>
                </div>
                <div className="spec-box">
                  <Monitor className="spec-icon-large" />
                  <div className="spec-value-large">
                    {room.assets?.length || 0}
                  </div>
                  <div className="spec-label">Thiết bị</div>
                </div>
              </div>
            </div>

            {/* Amenities Card - Real device data from RoomDevice collection */}
            <div className="info-card">
              <h3 className="card-title">Thiết Bị Phòng</h3>
              <div className="amenities-grid">
                {room.assets && room.assets.length > 0 ? (
                  room.assets.map((asset: any) => (
                    <div key={asset._id} className="amenity-item">
                      <span className="check-icon">✓</span>
                      <span>
                        {asset.deviceId?.name || "N/A"}
                        {asset.quantity > 1 ? ` x${asset.quantity}` : ""}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="amenity-item" style={{ opacity: 0.6 }}>
                    <span>Chưa có dữ liệu thiết bị</span>
                  </div>
                )}
              </div>
            </div>

            {/* Services Card - Real data from services collection */}
            <div className="info-card">
              <h3 className="card-title">Dịch Vụ Kèm Theo</h3>
              <div className="services-grid">
                {services.length > 0 ? (
                  services
                    .filter((svc) => {
                      // Exclude "Thang máy" for floor 1
                      if (svc.name.toLowerCase().includes("thang máy")) {
                        const floorName = room?.floor || room?.floorLabel || "";
                        if (floorName === "1" || floorName === "Tầng 1") {
                          return false;
                        }
                      }
                      return true;
                    })
                    .map((svc: any) => {
                      const Icon = getServiceIcon(svc.name);
                      return (
                        <div key={svc._id} className="service-item">
                          <div className="service-icon-box">
                            <Icon className="service-icon" />
                          </div>
                          <div className="service-info">
                            <div className="service-name">{svc.name}</div>
                            <div className="service-description">
                              {svc.description ||
                                `${svc.currentPrice?.toLocaleString("vi-VN")}đ/${svc.type === "Extension" ? "đơn vị" : "tháng"}`}
                            </div>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <div style={{ opacity: 0.6, fontSize: "0.9rem" }}>
                    Đang tải dịch vụ...
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="sidebar">
            <div className="sticky-sidebar">
              {/* Booking Card */}
              <div className="booking-card">
                <div className="price-title">
                  {room.price > 0
                    ? `${room.price.toLocaleString("vi-VN")}`
                    : "Liên hệ"}
                  <span className="price-unit">đ/tháng</span>
                </div>
                <p className="price-subtitle">Tiền thuê nhà hàng tháng</p>

                <div className="deposit-row">
                  <span className="deposit-label">TIỀN CỌC YÊU CẦU:</span>
                  <span className="deposit-amount">
                    {room.price > 0
                      ? `${depositAmount.toLocaleString("vi-VN")}đ`
                      : "Liên hệ"}
                  </span>
                  <span className="deposit-note">= 1 tháng tiền nhà</span>
                </div>

                <div className="benefits-list">
                  <p>✓ Giữ phòng trong 7 ngày</p>
                  <p>✓ Hỗ trợ ký hợp đồng</p>
                  <p>✓ Nhân viên sẵn sàng tư vấn</p>
                </div>

                <button
                  className="booking-button"
                  disabled={
                    room.status !== "Available" && room.status !== "Trống"
                  }
                  onClick={() => navigate(`/rooms/${id}/booking`)}
                >
                  {room.status === "Available" || room.status === "Trống"
                    ? "Đặt Cọc Ngay"
                    : room.status === "Deposited"
                      ? "Phòng Đã Được Đặt Cọc"
                      : "Phòng Đã Có Chủ"}
                </button>

                <button className="contact-button">Gọi Tư Vấn</button>
              </div>

              {/* Help Card */}
              <div className="help-card">
                <h4 className="help-title">Cần Hỗ Trợ?</h4>
                <p className="help-description">
                  Liên hệ với quản lý để được tư vấn chi tiết về phòng.
                </p>
                <a href="tel:+842812345678" className="help-button">
                  <Phone className="button-icon" />
                  Gọi: (028) 1234 5678
                </a>
                <a
                  href="https://zalo.me/0812345678"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="help-button"
                >
                  <MessageCircle className="button-icon" />
                  Chat Zalo
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

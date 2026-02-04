import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Home,
  Users,
  Zap,
  Droplet,
  Wifi,
  Wind,
  Phone,
  MessageCircle,
} from "lucide-react";
import { roomService } from "../../../services/roomService";

import "./RoomDetail.css";

export default function RoomDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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
          floorLabel: `Tầng ${roomData.floorId?.name || "N/A"}`,
          price: price,
          area: roomData.roomTypeId?.area || 30,
          capacity: roomData.roomTypeId?.personMax || 2,
          description:
            roomData.description || roomData.roomTypeId?.description || "",
          images: roomData.roomTypeId?.images || [],
          amenities: roomData.amenities || [],
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

  const getServiceIcon = (serviceName) => {
    const iconMap = {
      Điện: Zap,
      Nước: Droplet,
      Internet: Wifi,
      "Điều hòa không khí": Wind,
    };
    return iconMap[serviceName] || Zap;
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
            onClick={() => navigate("/rooms")}
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
        <button onClick={() => navigate("/rooms")} className="back-button">
          <ChevronLeft className="icon" />
          Quay Lại Danh Sách
        </button>

        <div className="detail-grid">
          {/* Main Content */}
          <div className="main-content">
            {/* Gallery with Images from Cloudinary */}
            <div className="gallery-card">
              {room.images && room.images.length > 0 ? (
                <div className="image-gallery">
                  {/* Main Image */}
                  <div className="main-image-container">
                    <img
                      src={room.images[currentImageIndex]}
                      alt={`${room.roomCode} - Ảnh ${currentImageIndex + 1}`}
                      className="main-gallery-image"
                    />

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
                          className={`thumbnail-wrapper ${
                            index === currentImageIndex ? "active" : ""
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
                  <span className="gallery-text">Hình Ảnh Phòng</span>
                </div>
              )}
            </div>

            {/* Room Info */}
            <div className="info-card">
              <h3 className="card-title">Thông Tin Phòng</h3>
              <p className="detail-room-description">
                {room.description ||
                  `Phòng ${room.roomCode} là một căn phòng thoáng mát nằm tại ${room.floorLabel} của tòa nhà. Với diện tích ${room.area}m², phòng có cửa sổ lớn nhìn ra đường chính, đảm bảo ánh sáng tự nhiên suốt cả ngày. Phòng được trang bị đầy đủ các tiện nghi cơ bản.`}
              </p>

              <div className="specs-grid-detail">
                <div className="spec-box">
                  <Home className="spec-icon-large" />
                  <div className="spec-value-large">{room.area}m²</div>
                  <p className="spec-label">Diện tích</p>
                </div>
                <div className="spec-box">
                  <Users className="spec-icon-large" />
                  <div className="spec-value-large">{room.capacity || 2}</div>
                  <p className="spec-label">Tối đa người</p>
                </div>
                <div className="spec-box">
                  <div className="spec-number">
                    {room.amenities?.length || 4}
                  </div>
                  <p className="spec-label">Tiện nghi</p>
                </div>
              </div>
            </div>

            {/* Amenities */}
            <div className="info-card">
              <h3 className="card-title">Tiện Nghi Phòng</h3>
              <div className="amenities-grid">
                {(
                  room.amenities || ["Giường đơn", "Điều hòa", "Tủ", "Ban công"]
                ).map((amenity, index) => (
                  <div key={index} className="amenity-item">
                    <span className="check-icon">✓</span>
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Services */}
            <div className="info-card">
              <h3 className="card-title">Dịch Vụ Kèm Theo</h3>
              <div className="services-grid">
                {[
                  { name: "Điện", description: "Cung cấp 24/7, giá hợp lý" },
                  { name: "Nước", description: "Nước sạch, có bể mắt nước" },
                  { name: "Internet", description: "100Mbps, WiFi miễn phí" },
                  {
                    name: "Điều hòa không khí",
                    description: "Máy lạnh tích hợp",
                  },
                ].map((service, index) => {
                  const Icon = getServiceIcon(service.name);
                  return (
                    <div key={index} className="service-item">
                      <div className="service-icon-box">
                        <Icon className="service-icon" />
                      </div>
                      <div className="service-info">
                        <p className="service-name">{service.name}</p>
                        <p className="service-description">
                          {service.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rules */}
            <div className="info-card">
              <h3 className="card-title">Nội Quy Phòng</h3>
              <ul className="rules-list">
                {[
                  "Không nuôi thú cưng",
                  "Không khiếu khích",
                  "Giờ yên tĩnh 23:00 - 7:00",
                ].map((rule, index) => (
                  <li key={index} className="rule-item">
                    <span className="bullet">•</span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Sidebar - Booking */}
          <div className="sidebar">
            <div className="sticky-sidebar">
              {/* Booking Card */}
              <div className="booking-card">
                <h3 className="price-title">
                  {room.price > 0
                    ? `${room.price.toLocaleString("vi-VN")}đ/tháng`
                    : "Liên hệ"}
                </h3>
                <p className="price-subtitle">Tiền thuê nhà hàng tháng</p>

                <div className="deposit-box">
                  <p className="deposit-label">TIỀN CỌC YÊU CẦU</p>
                  <p className="deposit-amount">
                    {room.price > 0
                      ? `${depositAmount.toLocaleString("vi-VN")}đ`
                      : "Liên hệ"}
                  </p>
                  <p className="deposit-note">= 1 tháng tiền nhà</p>
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
                >
                  {room.status === "Available" || room.status === "Trống"
                    ? "Đặt Cọc Ngay"
                    : "Phòng Đã Có Chủ"}
                </button>

                <button className="contact-button">Gọi Tư Vấn</button>
              </div>

              {/* Contact Card */}
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

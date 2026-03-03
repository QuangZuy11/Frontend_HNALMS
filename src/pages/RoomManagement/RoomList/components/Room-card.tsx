import { Link } from "react-router-dom";
import { Users, Maximize, MapPin, ListChecks } from "lucide-react";
import "./Room-card.css";

export default function RoomCard({ room }) {
  const statusColors = {
    Available: "available",
    Occupied: "occupied",
    Maintenance: "maintenance",
    Trống: "available",
    "Đã thuê": "occupied",
    "Bảo trì": "maintenance",
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  // Get the first image from room images array
  const roomImage =
    room.images && room.images.length > 0
      ? room.images[0]
      : "https://via.placeholder.com/400x300?text=No+Image";

  return (
    <div className="room-card">
      {/* Image Section */}
      <div className="room-image-container">
        <img
          src={roomImage}
          alt={room.name || room.title}
          className="room-image"
          style={{ width: "100%", height: "200px", objectFit: "cover" }}
        />
        <div className="room-image-gradient">
          <span className="room-name-overlay">{room.roomCode}</span>
        </div>
        <span className={`room-status ${statusColors[room.status]}`}>
          {room.status}
        </span>
      </div>

      {/* Card Header */}
      <div className="room-header">
        <div className="room-title-section">
          <h3 className="room-title">{room.title}</h3>
          <p className="room-floor">
            <MapPin className="icon-small" />
            {room.floorLabel}
          </p>
        </div>
      </div>

      {/* Card Content */}
      <div className="room-content">
        <p className="room-description">{room.description}</p>

        {/* Specs Grid */}
        <div className="specs-grid">
          <div className="spec-item">
            <Maximize className="spec-icon" />
            <span className="spec-value">{room.area}m²</span>
          </div>
          <div className="spec-item">
            <Users className="spec-icon" />
            <span className="spec-value">{room.capacity} người</span>
          </div>
          <div className="spec-item">
            <ListChecks className="spec-icon" />
            <span className="spec-value">{room.amenities?.length || 0}</span>
          </div>
        </div>

        {/* Price Section */}
        <div className="price-section">
          <div className="price-amount">
            {room.priceLabel || (room.price / 1000000).toFixed(1) + "M"}
          </div>
          <p className="price-label">/tháng</p>
        </div>

        {/* Amenities Tags */}
        {room.amenities && room.amenities.length > 0 && (
          <div className="amenities-tags">
            {room.amenities.slice(0, 3).map((amenity, index) => (
              <span key={index} className="amenity-tag">
                {amenity}
              </span>
            ))}
            {room.amenities.length > 3 && (
              <span className="amenity-more">+{room.amenities.length - 3}</span>
            )}
          </div>
        )}

        {/* CTA Button */}
        <Link to={`/rooms/${room._id}`} className="detail-button">
          Xem Chi Tiết
        </Link>
      </div>
    </div>
  );
}

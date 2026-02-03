import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import "./RoomTypeDetail.css";

interface RoomTypeDetailProps {
  room: any;
}

export default function RoomTypeDetail({ room }: RoomTypeDetailProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (!room) return null;

  const images =
    room.images && room.images.length > 0
      ? room.images
      : ["https://placehold.co/600x400?text=No+Image"];

  const handleNext = () => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handlePrev = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleThumbnailClick = (index: number) => {
    setCurrentImageIndex(index);
  };

  const priceFormatted = room.priceLabel || "Liên hệ";

  return (
    <div className="room-type-detail-card">
      <div className="rtd-image-container">
        <img
          src={images[currentImageIndex]}
          alt={`${room.title} - ${currentImageIndex + 1}`}
          className="rtd-image"
        />

        {/* Navigation Arrows (Only if multiple images) */}
        {images.length > 1 && (
          <>
            <button className="rtd-nav-btn prev" onClick={handlePrev}>
              <ChevronLeft size={14} />
            </button>
            <button className="rtd-nav-btn next" onClick={handleNext}>
              <ChevronRight size={14} />
            </button>

            {/* Image Counter Badge */}
            <div className="rtd-image-counter">
              {currentImageIndex + 1}/{images.length}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails Strip */}
      {images.length > 1 && (
        <div className="rtd-thumbnails">
          {images.map((img: string, idx: number) => (
            <div
              key={idx}
              className={`rtd-thumbnail-item ${idx === currentImageIndex ? "active" : ""}`}
              onClick={() => handleThumbnailClick(idx)}
            >
              <img src={img} alt={`Thumb ${idx}`} />
            </div>
          ))}
        </div>
      )}

      <div className="rtd-content">
        <h2 className="rtd-title">Phòng {room.title || room.name}</h2>
        <p className="rtd-subtitle">
          {room.roomTypeId?.name || "Phòng Tiêu Chuẩn"}
        </p>

        <div className="rtd-specs">
          <div className="rtd-spec-row">
            <span className="spec-label">Tầng:</span>
            <span className="spec-value">
              {room.floorLabel?.replace("Tầng ", "") || "1"}
            </span>
          </div>
          <div className="rtd-spec-row">
            <span className="spec-label">Diện tích:</span>
            <span className="spec-value">{room.area}m²</span>
          </div>
          <div className="rtd-spec-row">
            <span className="spec-label">Giá:</span>
            <span className="spec-value price">
              {priceFormatted.replace("M", ".000.000 đ")}
            </span>
          </div>
        </div>

        {/* Description from DB */}
        <div className="rtd-description">
          <p>{room.description || "Chưa có mô tả cho loại phòng này."}</p>
        </div>

        <div className="rtd-amenities-section">
          <p className="amenities-label">Tiện nghi:</p>
          <div className="amenities-tags">
            {(room.amenities && room.amenities.length > 0
              ? room.amenities
              : ["WiFi", "TV 4K", "AC", "Bồn tắm jacuzzi"]
            ).map((am: string, idx: number) => (
              <span key={idx} className="amenity-tag">
                {am}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

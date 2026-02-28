import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { roomService } from "../../../../services/roomService";
import "./RoomTypeDetail.css";

interface DeviceAsset {
  _id: string;
  deviceId: {
    _id: string;
    name: string;
    brand?: string;
    model?: string;
  };
  quantity: number;
  condition?: string;
}

interface RoomTypeDetailProps {
  room: any;
}

export default function RoomTypeDetail({ room }: RoomTypeDetailProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [devices, setDevices] = useState<DeviceAsset[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);

  // Fetch real device data when room changes
  useEffect(() => {
    if (!room?._id) {
      setDevices([]);
      return;
    }

    const fetchDevices = async () => {
      setLoadingDevices(true);
      try {
        const response = await roomService.getRoomById(room._id);
        if (response.data?.assets) {
          setDevices(response.data.assets);
        } else {
          setDevices([]);
        }
      } catch (error) {
        console.error("Error fetching room devices:", error);
        setDevices([]);
      } finally {
        setLoadingDevices(false);
      }
    };

    fetchDevices();
  }, [room?._id]);

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

  // Format price properly
  const formatPrice = (priceVal: any): string => {
    // Check if it's a mongo Decimal128 object format
    if (priceVal && typeof priceVal === "object" && priceVal.$numberDecimal) {
      priceVal = parseFloat(priceVal.$numberDecimal);
    }

    // Convert to number if it's a parseable string
    const numericPrice = Number(priceVal);

    if (!isNaN(numericPrice) && numericPrice > 0) {
      return `${numericPrice.toLocaleString("vi-VN")}đ`;
    }
    return "Liên hệ";
  };

  const rawPrice = room.price || room.roomTypeId?.currentPrice || 0;
  const priceFormatted = formatPrice(rawPrice);

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
        <h2 className="rtd-title">
          Phòng {room.roomTypeId?.typeName || room.title || room.name}
        </h2>

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
            <span className="spec-value price">{priceFormatted}</span>
          </div>
        </div>

        {/* Description from DB */}
        <div className="rtd-description">
          <p>{room.description || "Chưa có mô tả cho loại phòng này."}</p>
        </div>

        <div className="rtd-amenities-section">
          <p className="amenities-label">Thiết bị phòng:</p>
          <div className="amenities-tags">
            {loadingDevices ? (
              <span className="amenity-tag" style={{ opacity: 0.6 }}>
                Đang tải...
              </span>
            ) : devices.length > 0 ? (
              devices.map((asset) => (
                <span key={asset._id} className="amenity-tag">
                  {asset.deviceId?.name || "N/A"}
                  {asset.deviceId?.brand ? ` (${asset.deviceId.brand})` : ""}
                  {asset.quantity > 1 ? ` x${asset.quantity}` : ""}
                </span>
              ))
            ) : (
              <span className="amenity-tag" style={{ opacity: 0.6 }}>
                Chưa có dữ liệu thiết bị
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

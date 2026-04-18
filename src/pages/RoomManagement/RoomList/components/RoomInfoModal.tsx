
import { createPortal } from "react-dom";
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { roomService } from "../../../../services/roomService";
import "./RoomInfoModal.css";

interface RoomTypeData {
  _id: string;
  typeName: string;
  currentPrice: number;
  description: string;
  area: number;
  personMax: number;
}

interface RoomInfoModalProps {
    onClose: () => void;
}

export default function RoomInfoModal({ onClose }: RoomInfoModalProps) {
    const [roomTypes, setRoomTypes] = useState<RoomTypeData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRoomTypes = async () => {
            try {
                const response = await roomService.getRoomTypes();
                // Backend returns { count, data } or array directly
                const data = response.data || response;
                setRoomTypes(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error("Error fetching room types:", error);
                setRoomTypes([]);
            } finally {
                setLoading(false);
            }
        };

        fetchRoomTypes();
    }, []);

    // Format price properly
    const formatPrice = (priceVal: any): string => {
        if (priceVal && typeof priceVal === "object" && priceVal.$numberDecimal) {
            priceVal = parseFloat(priceVal.$numberDecimal);
        }
        const numericPrice = Number(priceVal);
        if (!isNaN(numericPrice) && numericPrice > 0) {
            return `${numericPrice.toLocaleString("vi-VN")}đ/tháng`;
        }
        return "Liên hệ";
    };

    if (typeof document === 'undefined') return null;

    return createPortal(
        <div className="rim-overlay" onClick={onClose}>
            <div className="rim-content" onClick={(e) => e.stopPropagation()}>
                <div className="rim-header">
                    <h3 className="rim-title">Thông tin chi tiết loại phòng</h3>
                    <button className="rim-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="rim-scroll-body">
                    {loading ? (
                        <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
                            Đang tải dữ liệu...
                        </div>
                    ) : roomTypes.length > 0 ? (
                        <div className="rim-grid">
                            {roomTypes.map((item) => (
                                <div key={item._id} className="rim-card">
                                    <div className="rim-card-header">
                                        <span className="rim-type-name">{item.typeName}</span>
                                        <span className="rim-price">{formatPrice(item.currentPrice)}</span>
                                    </div>
                                    <div className="rim-card-body">
                                        <p className="rim-desc">{item.description || "Chưa có mô tả"}</p>
                                        <p className="rim-specs">
                                            Diện tích: 30m² | Tối đa: {item.personMax} người
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
                            Không có dữ liệu loại phòng
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

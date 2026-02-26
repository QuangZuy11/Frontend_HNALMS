import React from "react";
import { useNavigate } from "react-router-dom";
import "./FloorMap.css";

interface Room {
  _id: string;
  name: string;
  status: string;
  floorLabel?: string;
  roomTypeId?: {
    _id: string;
    name?: string;
    typeName?: string;
  };
  contractEndDate?: string;
  [key: string]: any;
}

interface FloorMapProps {
  rooms: Room[];
  highlightedRooms?: Room[];
  floorName?: string;
  compact?: boolean;
  onRoomSelect?: (room: Room) => void;
}

// Soft & Eye-Friendly Color Palette - Easy to distinguish
const ROOM_TYPE_COLORS = [
  "#059669", // Emerald Green (Tầng 1)
  "#f59e0b", // Soft Amber
  "#10b981", // Soft Emerald
  "#f43f5e", // Soft Rose
  "#8b5cf6", // Soft Violet
  "#14b8a6", // Soft Teal
  "#3b82f6", // Soft Blue
  "#ec4899", // Soft Pink
];

// Helper to extract number from room type name (e.g., "Loại 1" -> 1)
// Format contract expiry: endDate + 1 day => "Trống từ DD/MM"
const getExpiryLabel = (contractEndDate?: string): string | null => {
  if (!contractEndDate) return null;
  const endDate = new Date(contractEndDate);
  const vacantDate = new Date(endDate);
  vacantDate.setDate(vacantDate.getDate() + 1);
  const day = vacantDate.getDate().toString().padStart(2, "0");
  const month = (vacantDate.getMonth() + 1).toString().padStart(2, "0");
  return `Trống từ ${day}/${month}`;
};

const extractTypeNumber = (typeName: string): number => {
  const match = typeName.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
};

export default function FloorMap({
  rooms,
  highlightedRooms,
  floorName,
  compact = false,
  onRoomSelect,
}: FloorMapProps) {
  const navigate = useNavigate();

  // 1. Identify Unique Room Types present in this list
  const uniqueRoomTypes = Array.from(
    new Set(rooms.map((r) => r.roomTypeId?._id).filter(Boolean)),
  ).map((id) => {
    const room = rooms.find((r) => r.roomTypeId?._id === id);
    // Try to find a name property. roomTypeId might have name or typeName
    const name =
      room?.roomTypeId?.typeName || room?.roomTypeId?.name || "Loại Khác";
    const price = room?.price || 0;
    return { id, name, price };
  });

  // Sort types by name to assign colors consistently
  uniqueRoomTypes.sort((a, b) => a.name.localeCompare(b.name));

  // Helper to format price short (e.g. 5000000 -> 5tr)
  const formatPriceShort = (price: number) => {
    if (!price) return "";
    if (price >= 1000000) {
      return `${(price / 1000000).toFixed(1).replace(/\.0$/, "")}tr`;
    }
    return `${(price / 1000).toFixed(0)}k`;
  };

  // 2. Helper to get color for a type based on type name number
  const getRoomTypeColor = (typeId?: string) => {
    if (!typeId) return "#6b7280"; // Default gray
    const roomType = uniqueRoomTypes.find((t) => t.id === typeId);
    if (!roomType) return "#6b7280";
    const typeNumber = extractTypeNumber(roomType.name);
    // Use typeNumber - 1 as index (Loại 1 -> index 0)
    const colorIndex = typeNumber > 0 ? typeNumber - 1 : 0;
    return ROOM_TYPE_COLORS[colorIndex % ROOM_TYPE_COLORS.length];
  };

  // Sort rooms by name Descending
  const sortedRooms = [...rooms].sort((a, b) => {
    return b.name.localeCompare(a.name, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });

  const handleRoomClick = (roomId: string) => {
    if (onRoomSelect) {
      const room = rooms.find((r) => r._id === roomId);
      if (room) onRoomSelect(room);
    } else {
      navigate(`/rooms/${roomId}`);
    }
  };

  return (
    <div className="floor-map-container">
      <div className="map-header">
        <h3 className="map-title">SƠ ĐỒ {floorName || "TẦNG"}</h3>

        <div className="map-legends-container">
          {/* Instruction Legend */}
          <div
            className="map-legend status-legend"
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: "1.5rem",
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: "0.8rem", color: "#374151" }}>
              Phòng sáng màu = chưa có hợp đồng, click để tạo HĐ mới.
            </span>
            <span
              style={{
                fontSize: "0.8rem",
                color: "#374151",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: "16px",
                  height: "16px",
                  borderRadius: "3px",
                  background:
                    "repeating-linear-gradient(135deg, #ffffff, #ffffff 3px, #c5cdd6 3px, #c5cdd6 6px)",
                  border: "1px solid #d1d5db",
                }}
              />
              Đã thuê → Click để xem HĐ
            </span>
            <span
              style={{
                fontSize: "0.8rem",
                color: "#374151",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
              }}
            >
              <span
                style={{
                  position: "relative",
                  display: "inline-block",
                  width: "16px",
                  height: "16px",
                  borderRadius: "3px",
                  background:
                    "linear-gradient(145deg, #f59e0b 0%, #d97706 100%)",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: "-4px",
                    right: "-4px",
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    background: "#ef4444",
                    color: "white",
                    fontSize: "7px",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: 1,
                  }}
                >
                  !
                </span>
              </span>
              Đã cọc → Click để tạo HĐ
            </span>
          </div>

          {/* Room Type Legend (Dynamic) */}
          {uniqueRoomTypes.length > 0 && (
            <div className="map-legend type-legend">
              {uniqueRoomTypes.map((type) => (
                <div key={type.id} className="legend-item">
                  <span
                    className="legend-color"
                    style={{
                      backgroundColor: getRoomTypeColor(type.id),
                      border: "none",
                      borderRadius: "0.25rem",
                    }}
                  ></span>
                  <span>
                    {type.name}{" "}
                    <span style={{ opacity: 1, fontWeight: 500 }}>
                      ({formatPriceShort(type.price)})
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="map-layout">
        <div className="rooms-grid">
          {sortedRooms.length > 0 ? (
            sortedRooms.map((room, index) => {
              const isAvailable =
                room.status === "Available" || room.status === "Trống";
              const isDeposited = room.status === "Deposited";
              const typeColor = getRoomTypeColor(room.roomTypeId?._id);

              // Check if highlighted
              const isGhosted =
                highlightedRooms &&
                !highlightedRooms.some((r) => r._id === room._id);

              const statusClass = isAvailable
                ? "status-available"
                : isDeposited
                  ? "status-deposited"
                  : "status-occupied";

              // logic for inserting corridors
              return (
                <React.Fragment key={room._id}>
                  {/* Render the room node */}
                  <div
                    className={`room-node ${statusClass} ${isGhosted ? "ghosted" : ""}`}
                    onClick={() => handleRoomClick(room._id)}
                    title={`${room.name} - ${room.roomTypeId?.typeName || room.roomTypeId?.name || ""}`}
                    data-color={typeColor}
                    style={
                      isAvailable || isDeposited
                        ? {
                          background: `linear-gradient(145deg, ${typeColor} 0%, ${typeColor}dd 100%)`,
                        }
                        : undefined
                    }
                  >
                    <span className="room-node-name">{room.name}</span>
                    {getExpiryLabel(room.contractEndDate) && (
                      <span className="room-expiry-label">
                        {getExpiryLabel(room.contractEndDate)}
                      </span>
                    )}
                  </div>

                  {/* Insert Corridor 1 after first row (index 7) */}
                  {index === 7 && (
                    <div className="map-corridor">
                      <span>
                        ====================== HÀNH LANG ======================
                      </span>
                    </div>
                  )}

                  {/* Insert Corridor 2 after third row (index 23 of total items, but indices shift? No, index in map) */}
                  {/* Wait, sortedRooms map index is 0-31. */}
                  {/* R1: 0-7. R2: 8-15. R3: 16-23. R4: 24-31. */}
                  {/* User wants corridor between R1-R2 (after 7) and R3-R4 (after 23). */}

                  {index === 23 && (
                    <div className="map-corridor">
                      <span>
                        ====================== HÀNH LANG ======================
                      </span>
                    </div>
                  )}
                </React.Fragment>
              );
            })
          ) : (
            <div
              className="map-empty-state"
              style={{
                gridColumn: "1 / -1",
                height: "200px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#6b7280",
                fontStyle: "italic",
              }}
            >
              Không tìm thấy phòng phù hợp
            </div>
          )}
        </div>

        <div className="map-sidebar-area">
          <div className="area-label">
            {floorName?.includes("5") ? "Sân Phơi" : "Nhà Xe"}
          </div>
        </div>
      </div>
    </div>
  );
}

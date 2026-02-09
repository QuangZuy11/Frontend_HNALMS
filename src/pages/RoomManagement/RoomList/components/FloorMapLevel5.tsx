import React from "react";
import { useNavigate } from "react-router-dom";
import "./FloorMapLevel5.css";

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
  "#6366f1", // Soft Indigo
  "#f59e0b", // Soft Amber
  "#10b981", // Soft Emerald
  "#f43f5e", // Soft Rose
  "#8b5cf6", // Soft Violet
  "#14b8a6", // Soft Teal
  "#3b82f6", // Soft Blue
  "#ec4899", // Soft Pink
];

// Helper to extract number from room type name (e.g., "Loại 1" -> 1)
const extractTypeNumber = (typeName: string): number => {
  const match = typeName.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
};

export default function FloorMapLevel5({
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
    <div className="floor-map-container level-5">
      <div className="map-header">
        <h3 className="map-title">SƠ ĐỒ {floorName || "TẦNG 5"}</h3>

        <div className="map-legends-container">
          {/* Status Legend */}
          <div className="map-legend status-legend">
            <div className="legend-item">
              <span className="legend-color available"></span>
              <span>Trống</span>
            </div>
            <div className="legend-item">
              <span className="legend-color occupied"></span>
              <span>Đã Thuê</span>
            </div>
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
              const typeColor = getRoomTypeColor(room.roomTypeId?._id);

              // Check if highlighted
              const isGhosted =
                highlightedRooms &&
                !highlightedRooms.some((r) => r._id === room._id);

              // logic for inserting corridors
              return (
                <React.Fragment key={room._id}>
                  {/* Render the room node */}
                  <div
                    className={`room-node ${isAvailable ? "status-available" : "status-occupied"} ${isGhosted ? "ghosted" : ""}`}
                    onClick={() => handleRoomClick(room._id)}
                    title={`${room.name} - ${room.roomTypeId?.typeName || room.roomTypeId?.name || ""}`}
                    style={
                      isAvailable
                        ? {
                          background: `linear-gradient(145deg, ${typeColor} 0%, ${typeColor}dd 100%)`,
                        }
                        : undefined
                    }
                  >
                    <span className="room-node-name">{room.name}</span>
                  </div>

                  {/* Insert Corridor 1 after first row (index 7) */}
                  {index === 7 && (
                    <div className="map-corridor">
                      <span>
                        ====================== HÀNH LANG ======================
                      </span>
                    </div>
                  )}

                  {/* Insert Corridor 2 after third row (index 23 of total items) */}
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
          <div className="area-label">Sân Phơi</div>
        </div>
      </div>
    </div>
  );
}

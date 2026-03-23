import React from "react";
import { useNavigate } from "react-router-dom";
import "./FloorMapLevel2.css";

interface Room {
  _id: string;
  name: string;
  status: string;
  floorLabel?: string;
  roomTypeId?: {
    _id: string;
    name?: string;
    typeName?: string;
    currentPrice?: number;
  };
  price?: number;
  contractStartDate?: string;
  contractEndDate?: string;
  hasFloatingDeposit?: boolean;
  isShortTermAvailable?: boolean;
  [key: string]: any;
}

interface FloorMapLevel2Props {
  rooms: Room[];
  floorName?: string;
  onRoomSelect?: (room: Room) => void;
  legendType?: "default" | "deposit" | "guest" | "none" | "contract";
}

// Detailed Layout Configuration
// Total Grid Columns: 16 (9 Left + 1 Separator + 6 Right)
// Detailed Layout Configuration
// Total Grid Columns: 15 (8 Left + 1 Separator + 6 Right)
const FLOOR_CONFIG = [
  // Row 1: 254...247 (8 rooms) | GAP | 246...242 (5 rooms)
  {
    type: "ROW",
    left: { slots: 8, rooms: 8 }, // 8 slots, 8 rooms (Flush)
    separator: "GAP",
    right: { slots: 6, rooms: 5 },
  },
  // Corridor
  { type: "CORRIDOR" },
  // Row 2: 241...234 (8 rooms) | ELEVATOR | 233...229 (5 rooms)
  {
    type: "ROW",
    left: { slots: 8, rooms: 8 }, // 8 slots, 8 rooms
    separator: "ELEVATOR",
    right: { slots: 6, rooms: 5 },
  },
  // Row 3: 228...221 (8 rooms) | ELEVATOR | 220...215 (6 rooms)
  // Left: 8 slots, 8 rooms -> Flush
  // Right: 6 rooms -> Takes 220...215
  {
    type: "ROW",
    left: { slots: 8, rooms: 8 },
    separator: "ELEVATOR",
    right: { slots: 6, rooms: 6 },
  },
  // Corridor
  { type: "CORRIDOR" },
  // Row 4: 214...207 (8 rooms) | GAP | 206...201 (6 rooms)
  {
    type: "ROW",
    left: { slots: 8, rooms: 8 }, // 8 slots, 8 rooms
    separator: "GAP",
    right: { slots: 6, rooms: 6 },
  },
];

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

// Label for Deposited rooms with a future contract
const getComingSoonLabel = (contractStartDate?: string): string | null => {
  if (!contractStartDate) return null;
  const d = new Date(contractStartDate);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `Có người thuê từ ${day}/${month}/${year}`;
};

const extractTypeNumber = (typeName: string): number => {
  const match = typeName.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
};

// Format room label: "Phòng 201" => "P.201"
const formatRoomLabel = (name: string): string =>
  name.replace(/^Phòng\s*/i, "P.");

// Format contract date label: DD/MM/YY <br/> DD/MM/YY
const getContractDateLabel = (startDate?: string, endDate?: string): React.ReactNode => {
  if (!startDate || !endDate) return null;

  const startDt = new Date(startDate);
  const endDt = new Date(endDate);

  const startDd = startDt.getDate().toString().padStart(2, "0");
  const startMm = (startDt.getMonth() + 1).toString().padStart(2, "0");
  const endDd = endDt.getDate().toString().padStart(2, "0");
  const endMm = (endDt.getMonth() + 1).toString().padStart(2, "0");

  const startNoYear = `${startDd}/${startMm}`;
  const endNoYear = `${endDd}/${endMm}`;

  const startYy = startDt.getFullYear().toString().slice(-2);
  const endYy = endDt.getFullYear().toString().slice(-2);

  return (
    <>
      {startNoYear}/{startYy}
      <br />
      đến {endNoYear}/{endYy}
    </>
  );
};

export default function FloorMapLevel2({
  rooms,
  floorName,
  highlightedRooms,
  compact = false,
  onRoomSelect,
  legendType = "default",
}: FloorMapLevel2Props & {
  highlightedRooms?: Room[];
  compact?: boolean;
  onRoomSelect?: (room: Room) => void;
}) {
  const navigate = useNavigate();

  // 1. Sort Rooms Descending (254 -> 201)
  const sortedRooms = [...rooms].sort((a, b) => {
    return b.name.localeCompare(a.name, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });

  // 2. Identify Room Types for Legend
  const uniqueRoomTypes = Array.from(
    new Set(rooms.map((r) => r.roomTypeId?._id).filter(Boolean)),
  ).map((id) => {
    const room = rooms.find((r) => r.roomTypeId?._id === id);
    const name =
      room?.roomTypeId?.typeName || room?.roomTypeId?.name || "Loại Khác";
    const price = room?.price || room?.roomTypeId?.currentPrice || 0;
    return { id, name, price };
  });
  uniqueRoomTypes.sort((a, b) => a.name.localeCompare(b.name));

  const getRoomTypeColor = (typeId?: string) => {
    if (!typeId) return "#6b7280";
    const roomType = uniqueRoomTypes.find((t) => t.id === typeId);
    if (!roomType) return "#6b7280";
    const typeNumber = extractTypeNumber(roomType.name);
    const colorIndex = typeNumber > 0 ? typeNumber - 1 : 0;
    return ROOM_TYPE_COLORS[colorIndex % ROOM_TYPE_COLORS.length];
  };

  const formatPriceShort = (price: number) => {
    if (!price) return "";
    if (price >= 1000000)
      return `${(price / 1000000).toFixed(1).replace(/\.0$/, "")}tr`;
    return `${(price / 1000).toFixed(0)}k`;
  };

  const handleRoomClick = (roomId: string) => {
    if (onRoomSelect) {
      const room = rooms.find((r) => r._id === roomId);
      if (room) onRoomSelect(room);
    } else {
      navigate(`/rooms/${roomId}`);
    }
  };

  // 3. Generate Layout Grid
  let roomIndex = 0;
  const generatedLayout = FLOOR_CONFIG.map((config) => {
    if (config.type === "CORRIDOR") return { type: "CORRIDOR" };
    if (config.type !== "ROW" || !config.left || !config.right) return null;

    const rowItems = [];

    // Fill Left (Standard Grid Cells)
    for (let i = 0; i < config.left.slots; i++) {
      if (i < config.left.rooms && roomIndex < sortedRooms.length) {
        rowItems.push(sortedRooms[roomIndex]);
        roomIndex++;
      } else {
        rowItems.push(null); // Empty slot padding
      }
    }

    // Separator
    rowItems.push({ type: "SEPARATOR", subtype: config.separator });

    // Fill Right (Grouped for Flex Expansion)
    const rightRooms = [];
    for (let i = 0; i < config.right.rooms; i++) {
      // Only loop through actual rooms count
      if (roomIndex < sortedRooms.length) {
        rightRooms.push(sortedRooms[roomIndex]);
        roomIndex++;
      }
    }

    // Push the group instead of individual slots
    rowItems.push({
      type: "RIGHT_SECTION",
      rooms: rightRooms,
      colSpan: config.right.slots, // Tell it how many columns to span
    });

    return { type: "ROW", items: rowItems };
  });

  return (
    <div className={`floor-map-container level-2 ${compact ? "compact" : ""}`}>
      <div className="map-header">
        <h3 className="map-title">SƠ ĐỒ {floorName || "TẦNG 2"}</h3>
        <div className="map-legends-container">
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
              {legendType === "deposit"
                ? "Phòng sáng màu = chưa có cọc, click để tạo cọc mới."
                : legendType === "guest"
                  ? "Phòng sáng màu = Phòng trống, có thể đặt phòng."
                  : legendType === "contract"
                    ? "Phòng sáng màu = chưa có hợp đồng, click để tạo HĐ mới."
                    : "Phòng sáng màu = chưa có hợp đồng"}
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
              Đã thuê{legendType === "contract" && " → Click để xem HĐ"}
              {legendType === "default" && " → Click để xem chi tiết"}
              {legendType === "guest" && " (Không khả dụng)"}
            </span>
            {(legendType !== "default") && (
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
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    background:
                      "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                    color: "#1e293b",
                    fontSize: "8px",
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: 1,
                    border: "1.5px solid white",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                  }}
                >
                  !
                </span>
              </span>
              Đã cọc
              {legendType === "guest" && " (Không khả dụng)"}
            </span>
            )}
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
                    <span style={{ opacity: 0.7, fontWeight: 400 }}>
                      ({formatPriceShort(type.price)})
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="map-layout-l2">
        <div className="grid-l2">
          {generatedLayout.map((row: any, rowIndex) => {
            if (row.type === "CORRIDOR") {
              return (
                <div key={`corridor-${rowIndex}`} className="map-corridor">
                  <span>
                    ====================== HÀNH LANG ======================
                  </span>
                </div>
              );
            }

            if (!row.items) return null;

            return (
              <React.Fragment key={`row-${rowIndex}`}>
                {row.items.map((item: any, colIndex: number) => {
                  // Handle Spanning Right Section
                  if (item && item.type === "RIGHT_SECTION") {
                    return (
                      <div
                        key={`right-sec-${rowIndex}`}
                        className="right-section-group"
                        style={{
                          gridColumn: `span ${item.colSpan}`,
                          display: "flex",
                          gap: "0.625rem", // Match grid horizontal gap
                          width: "100%",
                        }}
                      >
                        {item.rooms.map((room: Room) => {
                          const isAvailable =
                            room.status === "Available" ||
                            room.status === "Trống";
                          const isDeposited = room.status === "Deposited";
                          const isShortTermAvailable = room.isShortTermAvailable || false;
                          const hasFloatingDeposit = room.hasFloatingDeposit || false;
                          const showAsAvailable = isAvailable || (isDeposited && isShortTermAvailable && !hasFloatingDeposit);
                          const showDepositedBadge = isDeposited && hasFloatingDeposit;
                          const typeColor = getRoomTypeColor(
                            room.roomTypeId?._id,
                          );
                          const isGhosted =
                            highlightedRooms &&
                            !highlightedRooms.some((r) => r._id === room._id);
                          const statusClass = showAsAvailable
                            ? "status-available"
                            : isDeposited
                              ? "status-deposited"
                              : "status-occupied";

                          return (
                            <div
                              key={room._id}
                              className={`room-node ${statusClass} ${isGhosted ? "ghosted" : ""}`}
                              onClick={() => handleRoomClick(room._id)}
                              data-color={typeColor}
                              style={{
                                flex: 1, // Expand to fill space
                                ...(showAsAvailable || showDepositedBadge
                                  ? {
                                    background: `linear-gradient(145deg, ${typeColor} 0%, ${typeColor}dd 100%)`,
                                  }
                                  : {}),
                              }}
                              title={room.name}
                            >
                              {/* Deposited badge */}
                              {showDepositedBadge && (
                                <span
                                  style={{
                                    position: "absolute",
                                    top: "-6px",
                                    right: "-6px",
                                    width: "20px",
                                    height: "20px",
                                    borderRadius: "50%",
                                    background:
                                      "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                                    color: "#1e293b",
                                    fontSize: "13px",
                                    fontWeight: 800,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    lineHeight: 1,
                                    boxShadow:
                                      "0 2px 6px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.3)",
                                    zIndex: 10,
                                    border: "2px solid white",
                                  }}
                                >
                                  !
                                </span>
                              )}
                              <span className="room-node-name">
                                {formatRoomLabel(room.name)}
                              </span>
                              {/* Deposited + future contract */}
                              {isDeposited && room.contractStartDate && getComingSoonLabel(room.contractStartDate) && (
                                <span className="room-expiry-label" style={{ fontSize: "0.6rem", color: "#fff8e1", fontWeight: 600, lineHeight: 1.2 }}>
                                  {getComingSoonLabel(room.contractStartDate)}
                                </span>
                              )}
                              {!isDeposited && !room.contractStartDate && getExpiryLabel(room.contractEndDate) && (
                                <span className="room-expiry-label">
                                  {getExpiryLabel(room.contractEndDate)}
                                </span>
                              )}
                              {!isDeposited && room.contractStartDate && getContractDateLabel(room.contractStartDate, room.contractEndDate) && (
                                <span className="room-contract-dates">
                                  {getContractDateLabel(room.contractStartDate, room.contractEndDate)}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  }

                  // Handle Separators
                  if (item && item.type === "SEPARATOR") {
                    if (item.subtype === "ELEVATOR") {
                      return (
                        <div
                          key={`sep-${rowIndex}-${colIndex}`}
                          className="separator-node elevator"
                        >
                          <div>
                            Thang
                            <br />
                            máy
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div
                        key={`sep-${rowIndex}-${colIndex}`}
                        className="separator-node gap"
                      >
                        <div>
                          Khoảng
                          <br />
                          trống
                        </div>
                      </div>
                    );
                  }

                  // Handle Empty Nodes (Left side padding)
                  if (!item) {
                    return (
                      <div
                        key={`empty-${rowIndex}-${colIndex}`}
                        className="empty-node"
                      ></div>
                    );
                  }

                  // Handle Normal Rooms (Left Side)
                  const room = item as Room;
                  const isAvailable =
                    room.status === "Available" || room.status === "Trống";
                  const isDeposited = room.status === "Deposited";
                  const isShortTermAvailable = room.isShortTermAvailable || false;
                  const hasFloatingDeposit = room.hasFloatingDeposit || false;
                  const showAsAvailable = isAvailable || (isDeposited && isShortTermAvailable && !hasFloatingDeposit);
                  const showDepositedBadge = isDeposited && hasFloatingDeposit;
                  const typeColor = getRoomTypeColor(room.roomTypeId?._id);
                  const isGhosted =
                    highlightedRooms &&
                    !highlightedRooms.some((r) => r._id === room._id);
                  const statusClass = showAsAvailable
                    ? "status-available"
                    : isDeposited
                      ? "status-deposited"
                      : "status-occupied";

                  return (
                    <div
                      key={room._id}
                      className={`room-node ${statusClass} ${isGhosted ? "ghosted" : ""}`}
                      onClick={() => handleRoomClick(room._id)}
                      data-color={typeColor}
                      style={
                        showAsAvailable || showDepositedBadge
                          ? {
                            background: `linear-gradient(145deg, ${typeColor} 0%, ${typeColor}dd 100%)`,
                          }
                          : undefined
                      }
                      title={room.name}
                    >
                      {/* Deposited badge */}
                      {showDepositedBadge && (
                        <span
                          style={{
                            position: "absolute",
                            top: "-6px",
                            right: "-6px",
                            width: "20px",
                            height: "20px",
                            borderRadius: "50%",
                            background:
                              "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                            color: "#1e293b",
                            fontSize: "13px",
                            fontWeight: 800,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            lineHeight: 1,
                            boxShadow:
                              "0 2px 6px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.3)",
                            zIndex: 10,
                            border: "2px solid white",
                          }}
                        >
                          !
                        </span>
                      )}
                      <span className="room-node-name">{formatRoomLabel(room.name)}</span>
                      {/* Deposited + future contract */}
                      {isDeposited && room.contractStartDate && getComingSoonLabel(room.contractStartDate) && (
                        <span className="room-expiry-label" style={{ fontSize: "0.6rem", color: "#fff8e1", fontWeight: 600, lineHeight: 1.2 }}>
                          {getComingSoonLabel(room.contractStartDate)}
                        </span>
                      )}
                      {!isDeposited && !room.contractStartDate && getExpiryLabel(room.contractEndDate) && (
                        <span className="room-expiry-label">
                          {getExpiryLabel(room.contractEndDate)}
                        </span>
                      )}
                      {!isDeposited && room.contractStartDate && getContractDateLabel(room.contractStartDate, room.contractEndDate) && (
                        <span className="room-contract-dates">
                          {getContractDateLabel(room.contractStartDate, room.contractEndDate)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

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
    currentPrice?: number;
  };
  price?: number;
  contractStartDate?: string;
  contractEndDate?: string;
  hasFloatingDeposit?: boolean;
  isShortTermAvailable?: boolean;
  futureContractId?: string;
  futureContractStartDate?: string;
  hasFutureInactiveContract?: boolean;
  contractRenewalStatus?: string | null;
  /** Đã có HĐ kế tiếp sau kỳ declined — guest không đặt cọc thêm */
  successorLeaseBooked?: boolean;
  /** Ngày bắt đầu HĐ chưa kích hoạt kế tiếp (vd HĐ 464) — giới hạn thời gian thuê mới */
  nextInactiveContractStart?: string | null;
  [key: string]: any;
}

interface FloorMapProps {
  rooms: Room[];
  highlightedRooms?: Room[];
  floorName?: string;
  compact?: boolean;
  onRoomSelect?: (room: Room, event?: React.MouseEvent) => void;
  legendType?: "default" | "deposit" | "guest" | "none" | "contract";
  showDateYear?: boolean;
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
  // endDate = ngày hết hạn HP - 1 (vd: 04/04/2027), nên phòng trống từ 05/04/2027
  const vacantDate = new Date(endDate);
  vacantDate.setDate(vacantDate.getDate() + 1);
  const day = vacantDate.getDate().toString().padStart(2, "0");
  const month = (vacantDate.getMonth() + 1).toString().padStart(2, "0");
  return `Trống từ ${day}/${month}`;
};

// Label for Deposited rooms with a future contract (short format: room is available until this date)
const getComingSoonLabel = (contractStartDate?: string): string | null => {
  if (!contractStartDate) return null;
  const d = new Date(contractStartDate);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `Trống đến → ${day}/${month}/${year}`;
};


const extractTypeNumber = (typeName: string): number => {
  const match = typeName.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
};

// Format room label: "Phòng 101" => "P.101"
const formatRoomLabel = (name: string): string =>
  name.replace(/^Phòng\s*/i, "P.");

// Format contract date label: DD/MM/YY–DD/MM/YY (showYear=true) or DD/MM–DD/MM (showYear=false)
const getContractDateLabel = (startDate?: string, endDate?: string, showYear = true): string | null => {
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

  // Vì Tầng 1/5 đủ rộng, luôn hiển thị cả năm (kể cả khi trùng DD/MM)
  if (startNoYear === endNoYear) {
    return `${startNoYear}/${startYy}–${endNoYear}/${endYy}`;
  }

  // Nếu chữ đủ rộng (showYear = true)
  if (showYear) {
    return `${startNoYear}/${startYy}–${endNoYear}/${endYy}`;
  }

  // Mặc định: hiện DD/MM–DD/MM
  return `${startNoYear}–${endNoYear}`;
};

export default function FloorMap({
  rooms,
  highlightedRooms,
  floorName,
  compact = false,
  onRoomSelect,
  legendType = "default",
  showDateYear = true,
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
    const price = room?.price || room?.roomTypeId?.currentPrice || 0;
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

  const handleRoomClick = (roomId: string, event: React.MouseEvent) => {
    if (onRoomSelect) {
      const room = rooms.find((r) => r._id === roomId);
      if (room) onRoomSelect(room, event);
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
          {legendType !== "none" && (
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
          )}

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

              // For guest view: if room is Deposited but no floating deposit and
              // has future contract >= 30 days, treat it as available for short-term
              const isShortTermAvailable = room.isShortTermAvailable || false;
              const hasFloatingDeposit = room.hasFloatingDeposit || false;
              const hasFutureContract = !!(room.futureContractId || room.contractStartDate);
              const hasFutureInactiveContract = room.hasFutureInactiveContract || false;

              // Special case: room is Deposited AND has future contract
              const hasMultiOptions = isDeposited && hasFutureContract && !hasFloatingDeposit;

              const renewalDeclinedRebook =
                room.contractRenewalStatus === "declined" &&
                !hasFloatingDeposit &&
                (room.status === "Occupied" || room.status === "Deposited");

              // Inactive contract (>30 days): treat as available, green label, no !
              // Guest + declined: giữ dạng đang thuê (sọc), chỉ thêm nhãn "Có thể cọc"
              const showAsAvailable =
                isAvailable ||
                (isDeposited && isShortTermAvailable && !hasFutureContract) ||
                hasFutureInactiveContract ||
                (renewalDeclinedRebook && legendType !== "guest");
              // Visual: show deposit badge if deposited + has floating deposit (NOT for inactive contracts)
              // Show ! badge if: deposited (no multi-options) OR inactive contract + has new floating deposit OR gap is already filled
              const showDepositedBadge =
                (isDeposited && !hasMultiOptions && !hasFutureInactiveContract) ||
                (hasFutureInactiveContract && hasFloatingDeposit) ||
                (hasFutureInactiveContract && room.successorLeaseBooked);

              // Check if highlighted
              const isGhosted =
                highlightedRooms &&
                !highlightedRooms.some((r) => r._id === room._id);

              const statusClass = showAsAvailable
                ? "status-available"
                : isDeposited
                  ? "status-deposited"
                  : "status-occupied";

              // logic for inserting corridors
              return (
                <React.Fragment key={room._id}>
                  {/* Render the room node */}
                  <div
                    className={`room-node ${statusClass} ${isGhosted ? "ghosted" : ""} ${hasMultiOptions ? "has-multi-options" : ""}`}
                    onClick={(e) => handleRoomClick(room._id, e)}
                    title={`${room.name} - ${room.roomTypeId?.typeName || room.roomTypeId?.name || ""}${hasFutureInactiveContract ? " (Có HĐ inactive, đặt cọc được)" : hasMultiOptions ? " (Có 2 lựa chọn)" : isShortTermAvailable && !hasFloatingDeposit ? " (Có thể thuê ngắn hạn)" : ""}`}
                    data-color={typeColor}
                    style={
                      showAsAvailable || isDeposited
                        ? {
                          background: `linear-gradient(145deg, ${typeColor} 0%, ${typeColor}dd 100%)`,
                        }
                        : undefined
                    }
                  >
                    <span className="room-node-name">{formatRoomLabel(room.name)}</span>
                    {/* 2 lựa chọn: chỉ một dòng ngày (tránh trùng inactive + deposited) */}
                    {hasMultiOptions &&
                      (room.futureContractStartDate || room.contractStartDate) &&
                      getComingSoonLabel(room.futureContractStartDate || room.contractStartDate) && (
                        <span className="room-multi-options-date">
                          {getComingSoonLabel(room.futureContractStartDate || room.contractStartDate)}
                        </span>
                      )}
                    {/* Inactive contract (>30 days): green label — không hiện khi đang có multi-options */}
                    {!hasMultiOptions && hasFutureInactiveContract && !hasFloatingDeposit && (room.futureContractStartDate || room.contractStartDate) && (
                      <span className="room-inactive-label">
                        Trống đến → {new Date((room.futureContractStartDate || room.contractStartDate) as string).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                      </span>
                    )}
                    {/* Short-term available: show "trống đến → DD/MM/YY" label (KHÔNG khi có inactive contract) */}
                    {isShortTermAvailable && !hasFloatingDeposit && !hasFutureInactiveContract && room.contractStartDate && (
                      <span className="room-expiry-label" style={{ fontSize: "0.6rem", color: "#fff", fontWeight: 700, background: "rgba(16, 185, 129, 0.9)", padding: "2px 4px", borderRadius: "3px", lineHeight: 1.2 }}>
                        Trống đến → {new Date(room.contractStartDate).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                      </span>
                    )}

                    {/* Declined: thứ tự Trống từ → Đến (inactive) → nhãn guest / Từ chối gia hạn */}
                    {room.contractRenewalStatus === "declined" &&
                      !isDeposited &&
                      getExpiryLabel(room.contractEndDate) && (
                        <span className="room-expiry-label">
                          {getExpiryLabel(room.contractEndDate)}
                        </span>
                      )}
                    {legendType === "guest" &&
                      room.contractRenewalStatus === "declined" &&
                      isDeposited &&
                      getExpiryLabel(room.contractEndDate) && (
                        <span className="room-expiry-label">
                          {getExpiryLabel(room.contractEndDate)}
                        </span>
                      )}
                    {legendType === "contract" &&
                      room.contractRenewalStatus === "declined" &&
                      isDeposited &&
                      getExpiryLabel(room.contractEndDate) && (
                        <span className="room-expiry-label">
                          {getExpiryLabel(room.contractEndDate)}
                        </span>
                      )}
                    {room.contractRenewalStatus === "declined" &&
                      room.nextInactiveContractStart &&
                      !room.successorLeaseBooked && (
                        <span className="room-inactive-label" style={{ background: "rgba(220,38,38,0.85)" }}>
                          Đến → {new Date(room.nextInactiveContractStart as string).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                        </span>
                      )}
                    {legendType === "guest" &&
                      room.contractRenewalStatus === "declined" &&
                      !hasFloatingDeposit &&
                      room.successorLeaseBooked && (
                        <span className="room-guest-successor-booked">Đã có HĐ kế tiếp</span>
                      )}
                    {legendType === "guest" &&
                      room.contractRenewalStatus === "declined" &&
                      !hasFloatingDeposit &&
                      !room.successorLeaseBooked && (
                        <span className="room-guest-can-deposit">Có thể cọc</span>
                      )}
                    {legendType === "contract" &&
                      room.contractRenewalStatus === "declined" &&
                      getExpiryLabel(room.contractEndDate) && (
                        <span className="room-manager-declined-tag">
                          Từ chối gia hạn
                        </span>
                      )}
                    {!isDeposited && room.contractStartDate && getContractDateLabel(room.contractStartDate, room.contractEndDate, showDateYear) && (
                      <span className="room-contract-dates">
                        {getContractDateLabel(room.contractStartDate, room.contractEndDate, showDateYear)}
                      </span>
                    )}
                    {/* Deposited badge - exclamation mark (always on top) */}
                    {showDepositedBadge && (
                      <span
                        className="deposited-badge"
                      >
                        !
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

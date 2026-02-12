
import React from "react";
import { useNavigate } from "react-router-dom";
import "./FloorMapLevel3.css";

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

interface FloorMapLevel3Props {
    rooms: Room[];
    floorName?: string;
}

// Detailed Layout Configuration
// Total Grid Columns: 15 (8 Left + 1 Separator + 6 Right)
const FLOOR_CONFIG = [
    // Row 1: 254...247 (8 rooms) | GAP | 246...242 (5 rooms)
    {
        type: "ROW",
        left: { slots: 8, rooms: 8 }, // 8 slots, 8 rooms (Flush)
        separator: "GAP",
        right: { slots: 6, rooms: 5 }
    },
    // Corridor
    { type: "CORRIDOR" },
    // Row 2: 241...234 (8 rooms) | ELEVATOR | 233...229 (5 rooms)
    {
        type: "ROW",
        left: { slots: 8, rooms: 8 }, // 8 slots, 8 rooms
        separator: "ELEVATOR",
        right: { slots: 6, rooms: 5 }
    },
    // Row 3: 228...221 (8 rooms) | ELEVATOR | 220...215 (6 rooms)
    // Left: 8 slots, 8 rooms -> Flush
    // Right: 6 rooms -> Takes 220...215
    {
        type: "ROW",
        left: { slots: 8, rooms: 8 },
        separator: "ELEVATOR",
        right: { slots: 6, rooms: 6 }
    },
    // Corridor
    { type: "CORRIDOR" },
    // Row 4: 214...207 (8 rooms) | GAP | 206...201 (6 rooms)
    {
        type: "ROW",
        left: { slots: 8, rooms: 8 }, // 8 slots, 8 rooms
        separator: "GAP",
        right: { slots: 6, rooms: 6 }
    }
];

const ROOM_TYPE_COLORS = [
    "#2dd4bf", "#818cf8", "#fb7185", "#fbbf24", "#34d399", "#a78bfa", "#38bdf8", "#f472b6",
];

export default function FloorMapLevel3({ rooms, floorName, highlightedRooms, compact = false }: FloorMapLevel3Props & { highlightedRooms?: Room[], compact?: boolean }) {
    const navigate = useNavigate();

    // 1. Sort Rooms Descending (254 -> 201)
    const sortedRooms = [...rooms].sort((a, b) => {
        return b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: 'base' });
    });

    // 2. Identify Room Types for Legend
    const uniqueRoomTypes = Array.from(new Set(rooms.map(r => r.roomTypeId?._id).filter(Boolean)))
        .map(id => {
            const room = rooms.find(r => r.roomTypeId?._id === id);
            const name = room?.roomTypeId?.typeName || room?.roomTypeId?.name || "Loại Khác";
            const price = room?.price || 0;
            return { id, name, price };
        });
    uniqueRoomTypes.sort((a, b) => a.name.localeCompare(b.name));

    const getRoomTypeColor = (typeId?: string) => {
        if (!typeId) return "#6b7280";
        const index = uniqueRoomTypes.findIndex(t => t.id === typeId);
        if (index === -1) return "#6b7280";
        return ROOM_TYPE_COLORS[index % ROOM_TYPE_COLORS.length];
    };

    const formatPriceShort = (price: number) => {
        if (!price) return "";
        if (price >= 1000000) return `${(price / 1000000).toFixed(1).replace(/\.0$/, '')}tr`;
        return `${(price / 1000).toFixed(0)}k`;
    };

    const handleRoomClick = (roomId: string) => {
        navigate(`/rooms/${roomId}`);
    };

    // 3. Generate Layout Grid
    let roomIndex = 0;
    const generatedLayout = FLOOR_CONFIG.map(config => {
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
        for (let i = 0; i < config.right.rooms; i++) { // Only loop through actual rooms count
            if (roomIndex < sortedRooms.length) {
                rightRooms.push(sortedRooms[roomIndex]);
                roomIndex++;
            }
        }

        // Push the group instead of individual slots
        rowItems.push({
            type: "RIGHT_SECTION",
            rooms: rightRooms,
            colSpan: config.right.slots // Tell it how many columns to span
        });

        return { type: "ROW", items: rowItems };
    });

    return (
        <div className={`floor-map-container level-3 ${compact ? "compact" : ""}`}>
            <div className="map-header">
                <h3 className="map-title">SƠ ĐỒ {floorName || "TẦNG 3"}</h3>
                <div className="map-legends-container">
                    <div className="map-legend status-legend">
                        <div className="legend-item"><span className="legend-color available"></span><span>Trống</span></div>
                        <div className="legend-item"><span className="legend-color occupied"></span><span>Đã Thuê</span></div>
                    </div>
                    {uniqueRoomTypes.length > 0 && (
                        <div className="map-legend type-legend">
                            {uniqueRoomTypes.map((type) => (
                                <div key={type.id} className="legend-item">
                                    <span className="legend-color" style={{ backgroundColor: "white", border: `2px solid ${getRoomTypeColor(type.id)}` }}></span>
                                    <span>{type.name} <span style={{ opacity: 0.7, fontWeight: 400 }}>({formatPriceShort(type.price)})</span></span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="map-layout-l3">
                <div className="grid-l3">
                    {generatedLayout.map((row: any, rowIndex) => {
                        if (row.type === "CORRIDOR") {
                            return (
                                <div key={`corridor-${rowIndex}`} className="map-corridor">
                                    <span>====================== HÀNH LANG ======================</span>
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
                                                    display: 'flex',
                                                    gap: '0.625rem', // Match grid horizontal gap
                                                    width: '100%'
                                                }}
                                            >
                                                {item.rooms.map((room: Room) => {
                                                    const isAvailable = room.status === "Available" || room.status === "Trống";
                                                    const typeColor = getRoomTypeColor(room.roomTypeId?._id);
                                                    const isGhosted = highlightedRooms && !highlightedRooms.some(r => r._id === room._id);

                                                    return (
                                                        <div
                                                            key={room._id}
                                                            className={`room-node ${isAvailable ? "status-available" : "status-occupied"} ${isGhosted ? "ghosted" : ""}`}
                                                            onClick={() => handleRoomClick(room._id)}
                                                            style={{
                                                                flex: 1, // Expand to fill space
                                                                ...(isAvailable ? {
                                                                    borderColor: typeColor,
                                                                    color: typeColor,
                                                                    backgroundColor: `${typeColor}0D`
                                                                } : {})
                                                            }}
                                                            title={room.name}
                                                        >
                                                            <span className="room-node-name">{room.name}</span>
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
                                                <div key={`sep-${rowIndex}-${colIndex}`} className="separator-node elevator">
                                                    <div>Thang<br />máy</div>
                                                </div>
                                            )
                                        }
                                        return (
                                            <div key={`sep-${rowIndex}-${colIndex}`} className="separator-node gap">
                                                <div>Khoảng<br />trống</div>
                                            </div>
                                        )
                                    }

                                    // Handle Empty Nodes (Left side padding)
                                    if (!item) {
                                        return <div key={`empty-${rowIndex}-${colIndex}`} className="empty-node"></div>;
                                    }

                                    // Handle Normal Rooms (Left Side)
                                    const room = item as Room;
                                    const isAvailable = room.status === "Available" || room.status === "Trống";
                                    const typeColor = getRoomTypeColor(room.roomTypeId?._id);
                                    const isGhosted = highlightedRooms && !highlightedRooms.some(r => r._id === room._id);

                                    return (
                                        <div
                                            key={room._id}
                                            className={`room-node ${isAvailable ? "status-available" : "status-occupied"} ${isGhosted ? "ghosted" : ""}`}
                                            onClick={() => handleRoomClick(room._id)}
                                            style={isAvailable ? {
                                                borderColor: typeColor,
                                                color: typeColor,
                                                backgroundColor: `${typeColor}0D`
                                            } : undefined}
                                            title={room.name}
                                        >
                                            <span className="room-node-name">{room.name}</span>
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

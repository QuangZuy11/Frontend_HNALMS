
import React from "react";
import { useNavigate } from "react-router-dom";
import "./FloorMapLevel4.css";

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

interface FloorMapLevel4Props {
    rooms: Room[];
    floorName?: string;
}

// Row Configuration: Number of rooms on Left vs Right of Elevator
const ROW_CONFIG = [
    { left: 8, right: 5 }, // Row 1
    { left: 8, right: 5 }, // Row 2
    "SPACER",              // Spacer Row
    { left: 8, right: 6 }, // Row 3
    { left: 8, right: 6 }, // Row 4
];

const ROOM_TYPE_COLORS = [
    "#2dd4bf", "#818cf8", "#fb7185", "#fbbf24", "#34d399", "#a78bfa", "#38bdf8", "#f472b6",
];

export default function FloorMapLevel4({ rooms, floorName, highlightedRooms, compact = false }: FloorMapLevel4Props & { highlightedRooms?: Room[], compact?: boolean }) {
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

    // 3. Generate Layout Grid from Sorted Data
    let roomIndex = 0;
    const generatedLayout = ROW_CONFIG.map(config => {
        if (config === "SPACER") return "SPACER";

        const rowConfig = config as { left: number; right: number };
        const rowItems = [];

        // Fill Left Side
        for (let i = 0; i < rowConfig.left; i++) {
            if (roomIndex < sortedRooms.length) {
                rowItems.push(sortedRooms[roomIndex]);
                roomIndex++;
            } else {
                rowItems.push(null); // Explicit empty slot if run out of rooms
            }
        }

        // Add Elevator Marker (Logic only, UI handled by seamless node or hidden node)
        rowItems.push("ELEVATOR_MARKER");

        // Fill Right Side
        for (let i = 0; i < rowConfig.right; i++) {
            if (roomIndex < sortedRooms.length) {
                rowItems.push(sortedRooms[roomIndex]);
                roomIndex++;
            } else {
                rowItems.push(null);
            }
        }

        return rowItems;
    });

    return (
        <div className={`floor-map-container level-4 ${compact ? "compact" : ""}`}>
            <div className="map-header">
                <h3 className="map-title">SƠ ĐỒ {floorName || "TẦNG 4"}</h3>
                <div className="map-legends-container">
                    {/* Legend Reuse */}
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

            <div className="map-layout-l4">
                <div className="grid-l4">
                    {/* Fixed seamless elevator column */}
                    <div className="elevator-node-seamless">THANG MÁY</div>

                    {generatedLayout.map((row, rowIndex) => (
                        <React.Fragment key={rowIndex}>
                            {row === "SPACER" ? (
                                <div className="grid-spacer-row"></div>
                            ) : (
                                Array.isArray(row) && row.map((item, colIndex) => {
                                    if (item === "ELEVATOR_MARKER") {
                                        return <div key={`${rowIndex}-${colIndex}-elv`} className="elevator-placeholder"></div>;
                                    }

                                    if (!item) {
                                        return <div key={`${rowIndex}-${colIndex}-empty`} className="empty-node"></div>;
                                    }

                                    const room = item as Room;
                                    const isAvailable = room.status === "Available" || room.status === "Trống";
                                    const typeColor = getRoomTypeColor(room.roomTypeId?._id);

                                    // Check if highlighted
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
                                })
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
    );
}

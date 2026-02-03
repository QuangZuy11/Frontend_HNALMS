
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
    };
    [key: string]: any;
}

interface FloorMapLevel2Props {
    rooms: Room[];
    floorName?: string;
}

// Row Configuration: Number of rooms on Left vs Right of Elevator
const ROW_CONFIG = [
    { left: 8, right: 5 }, // Row 1: 254-247 | Elevator | 246-242
    { left: 8, right: 5 }, // Row 2: 241-234 | Elevator | 233-229
    "SPACER",              // Spacer Row
    { left: 8, right: 6 }, // Row 3: 228-221 | Elevator | 220-215
    { left: 8, right: 6 }, // Row 4: 214-207 | Elevator | 206-201
];

const ROOM_TYPE_COLORS = [
    "#2dd4bf", "#818cf8", "#fb7185", "#fbbf24", "#34d399", "#a78bfa", "#38bdf8", "#f472b6",
];

export default function FloorMapLevel2({ rooms, floorName }: FloorMapLevel2Props) {
    const navigate = useNavigate();

    // 1. Sort Rooms Descending (254 -> 201)
    // Handling B vs A: "252B" should come before "252A"? 
    // User list: 254 252B 252A 251...
    // Descending sort: 254 > 252B > 252A > 251
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
        <div className="floor-map-container level-2">
            <div className="map-header">
                <h3 className="map-title">SƠ ĐỒ {floorName || "TẦNG 2"}</h3>
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

            <div className="map-layout-l2">
                <div className="grid-l2">
                    {/* Fixed seamless elevator column */}
                    <div className="elevator-node-seamless">THANG MÁY</div>

                    {generatedLayout.map((row, rowIndex) => (
                        <React.Fragment key={rowIndex}>
                            {row === "SPACER" ? (
                                <div className="grid-spacer-row"></div>
                            ) : (
                                Array.isArray(row) && row.map((item, colIndex) => {
                                    if (item === "ELEVATOR_MARKER") {
                                        // This slot is occupied by the seamless column visually
                                        // We just render nothing or an empty placeholder to keep grid count correct if needed
                                        // But since we use explicit grid-placement for seamless, 
                                        // we actually DO NOT want to render a div here that takes up space 
                                        // unless it's `display: none` or invisible, 
                                        // because grid items auto-flow.

                                        // WAIT: The seamless node is explicitly placed at col 9.
                                        // These items are auto-placed. 
                                        // If we don't render a div here, the next item (room) will slide into col 9 underneath the elevator.
                                        // So we MUST render a placeholder div to occupy Grid Column 9 in the auto-flow.
                                        return <div key={`${rowIndex}-${colIndex}-elv`} className="elevator-placeholder"></div>;
                                    }

                                    if (!item) {
                                        return <div key={`${rowIndex}-${colIndex}-empty`} className="empty-node"></div>;
                                    }

                                    const room = item as Room;
                                    const isAvailable = room.status === "Available" || room.status === "Trống";
                                    const typeColor = getRoomTypeColor(room.roomTypeId?._id);

                                    return (
                                        <div
                                            key={room._id}
                                            className={`room-node ${isAvailable ? "status-available" : "status-occupied"}`}
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

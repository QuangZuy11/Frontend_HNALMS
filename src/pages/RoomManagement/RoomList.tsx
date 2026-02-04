import { useState, useEffect } from "react";
import { roomService } from "../../services/roomService";
import FloorMap from "./RoomList/components/FloorMap";
import FloorMapLevel2 from "./RoomList/components/FloorMapLevel2";
import FloorMapLevel3 from "./RoomList/components/FloorMapLevel3";
import FloorMapLevel4 from "./RoomList/components/FloorMapLevel4";
import FloorMapLevel5 from "./RoomList/components/FloorMapLevel5";
import RoomFilters from "./RoomList/components/Room-filters";
import RoomCard from "./RoomList/components/Room-card";
import RoomTypeDetail from "./RoomList/components/RoomTypeDetail";
import "./RoomList/RoomList.css";

interface Room {
  _id: string;
  name: string;
  status: string;
  floorId?: { _id: string; name: string };
  roomTypeId?: {
    _id: string;
    currentPrice: number;
    area: number;
    personMax: number;
    description: string;
    images: string[];
  };
  description?: string;
  // mapped props
  title: string;
  floor: string;
  floorLabel: string;
  price: number;
  priceLabel: string;
  area: number;
  capacity: number;
  amenities: string[];
  images: string[];
}

export default function RoomList() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [floorLayoutRooms, setFloorLayoutRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<{
    selectedFloors: string[];
    selectedRoomTypes: string[];
    selectedStatus: string[];
  }>({
    selectedFloors: [],
    selectedRoomTypes: [],
    selectedStatus: [],
  });

  const [defaultFloorId, setDefaultFloorId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [floorsData, setFloorsData] = useState<{ _id: string; name: string }[]>(
    [],
  );

  useEffect(() => {
    const initializeDefaultFilter = async () => {
      try {
        const response = await roomService.getFloors();
        if (response.data && response.data.length > 0) {
          setFloorsData(response.data);
          // Try to find "1" or "Tầng 1", otherwise default to first floor
          const floor1 = response.data.find(
            (f: any) => f.name === "1" || f.name === "Tầng 1",
          );
          const targetId = floor1 ? floor1._id : response.data[0]._id;

          setDefaultFloorId(targetId);
          setFilters((prev) => ({ ...prev, selectedFloors: [targetId] }));
        }
      } catch (error) {
        console.error("Error fetching floors for default filter:", error);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeDefaultFilter();
  }, []);

  // Helper to check conditions
  const showFloorMap = filters.selectedFloors.length === 1;
  const showTypeDetail = showFloorMap && filters.selectedRoomTypes.length === 1;

  // Get floor label from floorsData instead of rooms (works even when no rooms match)
  const currentFloorLabel = showFloorMap
    ? (() => {
        const selectedFloor = floorsData.find(
          (f) => f._id === filters.selectedFloors[0],
        );
        if (selectedFloor) {
          const name = selectedFloor.name;
          // Check if name already starts with "Tầng"
          if (name.toLowerCase().startsWith("tầng")) {
            return name;
          }
          return `Tầng ${name}`;
        }
        // Fallback to room data if floorsData not available
        const roomFloorLabel = rooms.find(
          (r) => r.floorId?._id === filters.selectedFloors[0],
        )?.floorLabel;
        return roomFloorLabel || "";
      })()
    : "";

  useEffect(() => {
    if (!isInitialized) return; // Wait for default filter to be set

    fetchRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.selectedFloors.join(","),
    filters.selectedRoomTypes.join(","),
    filters.selectedStatus.join(","),
    isInitialized,
  ]);

  const fetchRooms = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await roomService.getRooms();

      // Backend returns { count, data } format
      if (response.data) {
        let filteredRooms = response.data || [];

        // Transform backend data to match frontend expectations
        const transformedRooms = filteredRooms.map((room: any) => ({
          ...room,
          title: room.name,
          floor: room.floorId?.name || "N/A",
          floorLabel: (room.floorId?.name || "")
            .toLowerCase()
            .startsWith("tầng")
            ? room.floorId?.name
            : `Tầng ${room.floorId?.name || "N/A"}`,
          price: room.roomTypeId?.currentPrice || 0,
          priceLabel: room.roomTypeId?.currentPrice
            ? `${(room.roomTypeId.currentPrice / 1000000).toFixed(1)}M`
            : "Chưa có giá",
          area: room.roomTypeId?.area || 30,
          capacity: room.roomTypeId?.personMax || 2,
          description: room.description || room.roomTypeId?.description || "",
          amenities: [],
          images: room.roomTypeId?.images || [],
        }));

        let currentFloorRooms: Room[] = [];
        let displayRooms = transformedRooms;

        // 1. Filter theo tầng (Primary Structure)
        if (filters.selectedFloors.length > 0) {
          displayRooms = displayRooms.filter((room: any) =>
            filters.selectedFloors.includes(room.floorId?._id),
          );
          // Save these rooms as the "Structure" for the map
          // If only 1 floor is selected, this is our map layout source
          if (filters.selectedFloors.length === 1) {
            currentFloorRooms = [...displayRooms];
          }
        }

        // 2. Filter theo loại phòng (Visual Filter)
        if (filters.selectedRoomTypes.length > 0) {
          displayRooms = displayRooms.filter((room: any) =>
            filters.selectedRoomTypes.includes(room.roomTypeId?._id),
          );
        }

        // 3. Filter theo tình trạng (Visual Filter)
        if (filters.selectedStatus.length > 0) {
          displayRooms = displayRooms.filter((room: any) =>
            filters.selectedStatus.includes(room.status),
          );
        }

        setRooms(displayRooms);
        setFloorLayoutRooms(currentFloorRooms);
      } else {
        setError("Không thể tải danh sách phòng");
      }
    } catch (err) {
      console.error("Error fetching rooms:", err);
      setError("Đã xảy ra lỗi khi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setFilters({
      selectedFloors: defaultFloorId ? [defaultFloorId] : [],
      selectedRoomTypes: [],
      selectedStatus: [],
    });
  };

  return (
    <div className="room-list-page">
      <div className="container">
        <div className="content-layout">
          <aside className="filters-sidebar">
            <RoomFilters
              selectedFloors={filters.selectedFloors}
              onFloorsChange={(value) =>
                setFilters({ ...filters, selectedFloors: value })
              }
              selectedRoomTypes={filters.selectedRoomTypes}
              onRoomTypesChange={(value) =>
                setFilters({ ...filters, selectedRoomTypes: value })
              }
              selectedStatus={filters.selectedStatus}
              onStatusChange={(value) =>
                setFilters({ ...filters, selectedStatus: value })
              }
              onResetFilters={handleResetFilters}
            />
          </aside>

          <main className="rooms-content">
            {/* Show loading until initialized to prevent flash of unfiltered content */}
            {!isInitialized && (
              <div className="loading">
                <p>Đang tải dữ liệu...</p>
              </div>
            )}

            {loading || !isInitialized ? (
              <div className="loading">
                <p>Đang tải dữ liệu...</p>
              </div>
            ) : error ? (
              <div className="error-state">
                <p>{error}</p>
                <button onClick={fetchRooms} className="btn-retry">
                  Thử lại
                </button>
              </div>
            ) : (
              <>
                {/* Case: Floor selected + Room Type selected + No rooms match -> Show "No rooms found" instead of empty map */}
                {showFloorMap &&
                filters.selectedRoomTypes.length > 0 &&
                rooms.length === 0 ? (
                  <div className="empty-state">
                    <p>Không có phòng loại này tại {currentFloorLabel}</p>
                  </div>
                ) : showTypeDetail ? (
                  <div
                    className="split-view-container"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1fr) 320px",
                      gap: "1rem",
                      alignItems: "start",
                    }}
                  >
                    {currentFloorLabel.includes("2") ? (
                      <FloorMapLevel2
                        rooms={
                          floorLayoutRooms.length > 0 ? floorLayoutRooms : rooms
                        }
                        highlightedRooms={rooms}
                        floorName={currentFloorLabel || `Tầng`}
                        compact={true}
                      />
                    ) : currentFloorLabel.includes("3") ? (
                      <FloorMapLevel3
                        rooms={
                          floorLayoutRooms.length > 0 ? floorLayoutRooms : rooms
                        }
                        highlightedRooms={rooms}
                        floorName={currentFloorLabel || `Tầng`}
                        compact={true}
                      />
                    ) : currentFloorLabel.includes("4") ? (
                      <FloorMapLevel4
                        rooms={
                          floorLayoutRooms.length > 0 ? floorLayoutRooms : rooms
                        }
                        highlightedRooms={rooms}
                        floorName={currentFloorLabel || `Tầng`}
                        compact={true}
                      />
                    ) : currentFloorLabel.includes("5") ? (
                      <FloorMapLevel5
                        rooms={
                          floorLayoutRooms.length > 0 ? floorLayoutRooms : rooms
                        }
                        highlightedRooms={rooms}
                        floorName={currentFloorLabel || `Tầng`}
                        compact={true}
                      />
                    ) : (
                      <FloorMap
                        rooms={
                          floorLayoutRooms.length > 0 ? floorLayoutRooms : rooms
                        }
                        highlightedRooms={rooms}
                        floorName={currentFloorLabel || `Tầng`}
                      />
                    )}
                    <RoomTypeDetail room={rooms[0]} />
                  </div>
                ) : showFloorMap ? (
                  currentFloorLabel.includes("2") ? (
                    <FloorMapLevel2
                      rooms={
                        floorLayoutRooms.length > 0 ? floorLayoutRooms : rooms
                      }
                      highlightedRooms={rooms}
                      floorName={currentFloorLabel || `Tầng`}
                    />
                  ) : currentFloorLabel.includes("3") ? (
                    <FloorMapLevel3
                      rooms={
                        floorLayoutRooms.length > 0 ? floorLayoutRooms : rooms
                      }
                      highlightedRooms={rooms}
                      floorName={currentFloorLabel || `Tầng`}
                    />
                  ) : currentFloorLabel.includes("4") ? (
                    <FloorMapLevel4
                      rooms={
                        floorLayoutRooms.length > 0 ? floorLayoutRooms : rooms
                      }
                      highlightedRooms={rooms}
                      floorName={currentFloorLabel || `Tầng`}
                    />
                  ) : currentFloorLabel.includes("5") ? (
                    <FloorMapLevel5
                      rooms={
                        floorLayoutRooms.length > 0 ? floorLayoutRooms : rooms
                      }
                      highlightedRooms={rooms}
                      floorName={currentFloorLabel || `Tầng`}
                    />
                  ) : (
                    <FloorMap
                      rooms={
                        floorLayoutRooms.length > 0 ? floorLayoutRooms : rooms
                      }
                      highlightedRooms={rooms}
                      floorName={currentFloorLabel || `Tầng`}
                    />
                  )
                ) : (
                  <div className="room-grid">
                    {rooms.map((room) => (
                      <RoomCard key={room._id} room={room} />
                    ))}
                  </div>
                )}
              </>
            )}

            {!loading && !error && rooms.length === 0 && !showFloorMap && (
              <div className="empty-state">
                <p>Không tìm thấy phòng phù hợp</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

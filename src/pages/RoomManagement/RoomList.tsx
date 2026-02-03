import { useState, useEffect } from "react";
import { roomService } from "../../services/roomService";
import FloorMap from "./RoomList/components/FloorMap";
import FloorMapLevel2 from "./RoomList/components/FloorMapLevel2";
import RoomFilters from "./RoomList/components/Room-filters";
import RoomCard from "./RoomList/components/Room-card";
import RoomTypeDetail from "./RoomList/components/RoomTypeDetail";
import "./RoomList/RoomList.css";

interface Room {
  _id: string;
  name: string;
  status: string;
  floorId?: { _id: string; name: string };
  roomTypeId?: { _id: string; currentPrice: number; area: number; personMax: number; description: string; images: string[] };
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

  useEffect(() => {
    const initializeDefaultFilter = async () => {
      try {
        const response = await roomService.getFloors();
        if (response.data && response.data.length > 0) {
          // Try to find "1" or "Tầng 1", otherwise default to first floor
          const floor1 = response.data.find((f: any) => f.name === "1" || f.name === "Tầng 1");
          const targetId = floor1 ? floor1._id : response.data[0]._id;

          setDefaultFloorId(targetId);
          setFilters(prev => ({ ...prev, selectedFloors: [targetId] }));
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

  const currentFloorLabel = showFloorMap
    ? rooms.find(r => r.floorId?._id === filters.selectedFloors[0])?.floorLabel || ""
    : "";

  useEffect(() => {
    if (!isInitialized) return; // Wait for default filter to be set

    fetchRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.selectedFloors.join(","),
    filters.selectedRoomTypes.join(","),
    filters.selectedStatus.join(","),
    isInitialized
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
        filteredRooms = filteredRooms.map((room: any) => ({
          ...room,
          title: room.name,
          floor: room.floorId?.name || "N/A",
          floorLabel: (room.floorId?.name || "").toLowerCase().startsWith("tầng")
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

        // Filter theo tầng
        if (filters.selectedFloors.length > 0) {
          filteredRooms = filteredRooms.filter((room: any) =>
            filters.selectedFloors.includes(room.floorId?._id),
          );
        }

        // Filter theo loại phòng
        if (filters.selectedRoomTypes.length > 0) {
          filteredRooms = filteredRooms.filter((room: any) =>
            filters.selectedRoomTypes.includes(room.roomTypeId?._id),
          );
        }

        // Filter theo tình trạng
        if (filters.selectedStatus.length > 0) {
          filteredRooms = filteredRooms.filter((room: any) =>
            filters.selectedStatus.includes(room.status),
          );
        }

        setRooms(filteredRooms);
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
            {!isInitialized ? (
              <div className="loading">
                <p>Đang tải dữ liệu...</p>
              </div>
            ) : (
              <div className="results-info">
                <p>
                  Hiển thị <strong>{rooms.length}</strong> kết quả
                  {showFloorMap && <span> - Chế độ xem sơ đồ</span>}
                  {showTypeDetail && <span> & Chi tiết loại phòng</span>}
                </p>
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
                {/* 
                  SPLIT VIEW: If Map active AND Type selected -> Show Map + Detail 
                  MAP ONLY: If Map active but NO Type selected -> Show Map
                  GRID: Standard list
                */}

                {showTypeDetail ? (
                  <div className="split-view-container" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1rem' }}>
                    {currentFloorLabel.includes("2") ? (
                      <FloorMapLevel2
                        rooms={rooms}
                        floorName={currentFloorLabel || `Tầng`}
                      />
                    ) : (
                      <FloorMap
                        rooms={rooms}
                        floorName={currentFloorLabel || `Tầng`}
                      />
                    )}
                    <RoomTypeDetail room={rooms[0]} />
                  </div>
                ) : showFloorMap ? (
                  currentFloorLabel.includes("2") ? (
                    <FloorMapLevel2
                      rooms={rooms}
                      floorName={currentFloorLabel || `Tầng`}
                    />
                  ) : (
                    <FloorMap
                      rooms={rooms}
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

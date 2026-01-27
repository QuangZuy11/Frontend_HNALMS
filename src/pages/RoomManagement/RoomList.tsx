import { useState, useEffect } from "react";
import { roomService } from "../../services/roomService";
import RoomFilters from "./RoomList/components/Room-filters";
import RoomCard from "./RoomList/components/Room-card";
import "./RoomList/RoomList.css";

export default function RoomList() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    priceRange: [3000000, 5000000],
    selectedFloors: [],
    minArea: 30,
    showAvailableOnly: false,
    sortBy: "newest",
  });

  useEffect(() => {
    fetchRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.priceRange[0],
    filters.priceRange[1],
    filters.selectedFloors.length,
    filters.selectedFloors.join(","),
    filters.minArea,
    filters.showAvailableOnly,
    filters.sortBy,
  ]);

  const fetchRooms = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        status: filters.showAvailableOnly ? "available" : "all",
        floor: "all", // Lấy tất cả phòng từ backend
      };

      const response = await roomService.getRooms(params);

      if (response.success) {
        let filteredRooms = response.data || [];

        // Filter phía frontend theo nhiều tầng
        if (filters.selectedFloors.length > 0) {
          filteredRooms = filteredRooms.filter((room) =>
            filters.selectedFloors.includes(room.floor),
          );
        }

        // Filter theo diện tích tối thiểu
        filteredRooms = filteredRooms.filter(
          (room) => room.area >= filters.minArea,
        );

        // Filter theo khoảng giá
        filteredRooms = filteredRooms.filter(
          (room) =>
            room.price >= filters.priceRange[0] &&
            room.price <= filters.priceRange[1],
        );

        // Sắp xếp
        switch (filters.sortBy) {
          case "price-low":
            filteredRooms.sort((a, b) => a.price - b.price);
            break;
          case "price-high":
            filteredRooms.sort((a, b) => b.price - a.price);
            break;
          case "area-large":
            filteredRooms.sort((a, b) => b.area - a.area);
            break;
          case "floor-high":
            filteredRooms.sort((a, b) => b.floor - a.floor);
            break;
          default:
            // newest - giữ nguyên thứ tự từ backend
            break;
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
      priceRange: [3000000, 5000000],
      selectedFloors: [],
      minArea: 30,
      showAvailableOnly: false,
      sortBy: "newest",
    });
  };

  return (
    <div className="room-list-page">
      <div className="container">
        <div className="content-layout">
          <aside className="filters-sidebar">
            <div className="sidebar-header-info">
              <h1 className="sidebar-title">Tầng & Phòng</h1>
              <p className="sidebar-stats">
                Tổng cộng: <strong>{rooms.length}</strong> phòng |{" "}
                <strong>
                  {rooms.filter((r) => r.status === "Trống").length}
                </strong>{" "}
                phòng trống
              </p>
            </div>
            <RoomFilters
              priceRange={filters.priceRange}
              onPriceRangeChange={(value) =>
                setFilters({ ...filters, priceRange: value })
              }
              selectedFloors={filters.selectedFloors}
              onFloorsChange={(value) =>
                setFilters({ ...filters, selectedFloors: value })
              }
              minArea={filters.minArea}
              onMinAreaChange={(value) =>
                setFilters({ ...filters, minArea: value })
              }
              showAvailableOnly={filters.showAvailableOnly}
              onShowAvailableOnlyChange={(value) =>
                setFilters({ ...filters, showAvailableOnly: value })
              }
              sortBy={filters.sortBy}
              onSortByChange={(value) =>
                setFilters({ ...filters, sortBy: value })
              }
              onResetFilters={handleResetFilters}
            />
          </aside>

          <main className="rooms-content">
            <div className="results-info">
              <p>
                Hiển thị <strong>{rooms.length}</strong> kết quả
              </p>
            </div>

            {loading ? (
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
              <div className="room-grid">
                {rooms.map((room) => (
                  <RoomCard key={room._id} room={room} />
                ))}
              </div>
            )}

            {!loading && !error && rooms.length === 0 && (
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

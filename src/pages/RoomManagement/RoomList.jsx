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
    selectedFloor: null,
    minArea: 30,
    showAvailableOnly: false,
    sortBy: "newest",
  });

  useEffect(() => {
    fetchRooms();
  }, [filters]);

  const fetchRooms = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        status: filters.showAvailableOnly ? "available" : "all",
        floor: filters.selectedFloor || "all",
      };

      const response = await roomService.getRooms(params);

      if (response.success) {
        setRooms(response.data || []);
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

  return (
    <div className="room-list-page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Tầng & Phòng</h1>
          <p className="page-description">
            Tổng cộng: <strong>{rooms.length}</strong> phòng |{" "}
            <strong>{rooms.filter((r) => r.status === "Trống").length}</strong>{" "}
            phòng trống
          </p>
        </div>

        <div className="content-layout">
          <aside className="filters-sidebar">
            <RoomFilters
              priceRange={filters.priceRange}
              onPriceRangeChange={(value) =>
                setFilters({ ...filters, priceRange: value })
              }
              selectedFloor={filters.selectedFloor}
              onFloorChange={(value) =>
                setFilters({ ...filters, selectedFloor: value })
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

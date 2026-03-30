import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Box, Typography, CircularProgress } from "@mui/material";
import { Building } from "lucide-react";
import { roomService } from "../../services/roomService";
import FloorMap from "../RoomManagement/RoomList/components/FloorMap";
import FloorMapLevel2 from "../RoomManagement/RoomList/components/FloorMapLevel2";
import FloorMapLevel3 from "../RoomManagement/RoomList/components/FloorMapLevel3";
import FloorMapLevel4 from "../RoomManagement/RoomList/components/FloorMapLevel4";
import FloorMapLevel5 from "../RoomManagement/RoomList/components/FloorMapLevel5";
import "./ContractFloorMap.css";
import toastr from "toastr";
import "toastr/build/toastr.min.css";

interface Room {
  _id: string;
  name: string;
  status: string;
  floorId?: {
    _id: string;
    name: string;
  };
  roomTypeId?: {
    _id: string;
    typeName?: string;
    name?: string;
    currentPrice?: any;
  };
  price?: number;
  contractStartDate?: string; // Ngày bắt đầu hợp đồng tương lai (nếu có)
  contractEndDate?: string;   // Ngày kết thúc hợp đồng
  [key: string]: any;
}

interface Floor {
  _id: string;
  name: string;
  floorNumber?: number;
}

const DepositFloorMap = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine base path (owner or manager)
  const basePath = location.pathname.startsWith("/owner")
    ? "/owner"
    : "/manager";
  const [floors, setFloors] = useState<Floor[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch floors and rooms
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [floorsRes, roomsRes] = await Promise.all([
          roomService.getFloors(),
          roomService.getRooms(),
        ]);

        // Sort floors by name/number
        const sortedFloors = (floorsRes.data || []).sort(
          (a: Floor, b: Floor) => {
            const numA = parseInt(a.name) || a.floorNumber || 0;
            const numB = parseInt(b.name) || b.floorNumber || 0;
            return numA - numB;
          },
        );

        setFloors(sortedFloors);

        // Transform rooms to extract price properly
        const transformedRooms = (roomsRes.data || []).map((room: any) => {
          let priceNum = 0;
          if (
            room.roomTypeId &&
            typeof room.roomTypeId.currentPrice === "object" &&
            room.roomTypeId.currentPrice.$numberDecimal
          ) {
            priceNum = parseFloat(room.roomTypeId.currentPrice.$numberDecimal);
          } else if (typeof room.roomTypeId?.currentPrice === "number") {
            priceNum = room.roomTypeId.currentPrice;
          } else if (typeof room.price === "number") {
            priceNum = room.price;
          }
          return {
            ...room,
            price: priceNum,
          };
        });

        setRooms(transformedRooms);

        // Select first floor by default
        if (sortedFloors.length > 0) {
          setSelectedFloor(sortedFloors[0]._id);
        }
      } catch (err: any) {
        console.error("Error fetching data:", err);
        setError(err.message || "Không thể tải dữ liệu");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Get rooms for selected floor
  const getRoomsForFloor = (floorId: string) => {
    return rooms.filter((room) => room.floorId?._id === floorId);
  };

  // Helper function to get floor number/name without "Tầng" prefix
  const getFloorNumber = (floorName: string) => {
    if (!floorName) return "";
    // Remove "Tầng " prefix if exists
    return floorName.replace(/^Tầng\s*/i, "");
  };

  // Handle room selection - navigate to create deposit page
  const handleRoomSelect = (room: Room) => {
    // Only allow selecting available or deposited rooms for creating deposit
    if (room.status === "Available" || room.status === "Trống") {
      navigate(`${basePath}/deposits/create/${room._id}`);
    } else if (room.status === "Deposited") {
      // Kiểm tra nếu phòng có hợp đồng tương lai > 30 ngày từ hôm nay
      // thì cho phép cọc tiếp (short-term rental)
      if (room.contractStartDate) {
        const futureStartDate = new Date(room.contractStartDate);
        const today = new Date();
        const daysUntilFutureContract = Math.ceil(
          (futureStartDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntilFutureContract >= 30) {
          // Cho phép cọc tiếp cho giai đoạn ngắn hạn
          const futureDate = futureStartDate.toLocaleDateString("vi-VN");
          toastr.info(
            `Phòng này đã có người đặt cọc từ ngày ${futureDate}. Bạn có thể đặt cọc cho giai đoạn ngắn hạn trước đó.`
          );
          navigate(`${basePath}/deposits/create/${room._id}`);
        } else {
          // Thời gian quá ngắn, không cho phép cọc
          toastr.warning(
            `Phòng này đã có người đặt cọc và sẽ có người vào ở trong vòng ${daysUntilFutureContract} ngày. Không thể tạo cọc mới.`
          );
        }
      } else {
        // Phòng Deposited nhưng chưa ký hợp đồng (đang chờ ký)
        toastr.warning("Phòng này đã có tiền cọc và đang chờ ký hợp đồng.");
      }
    } else {
      // Room is occupied
      toastr.error("Phòng này đã có hợp đồng. Vui lòng chọn phòng trống để tạo cọc.");
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "50vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ textAlign: "center", py: 4, color: "error.main" }}>
        <Typography variant="h6">Lỗi tải dữ liệu</Typography>
        <Typography>{error}</Typography>
      </Box>
    );
  }

  const currentFloorRooms = getRoomsForFloor(selectedFloor);
  const currentFloor = floors.find((f) => f._id === selectedFloor);

  return (
    <div className="contract-container">
      {/* Page Header */}
      <h2 className="contract-page-title">Tạo Cọc Phòng</h2>
      <p className="contract-page-subtitle" style={{ marginBottom: 20 }}>
        Chọn phòng trống trên sơ đồ tầng để tạo đơn cọc mới
      </p>

      {/* Floor Filter Pills */}
      <div className="contract-floor-pills">
        {floors.map((floor) => (
          <button
            key={floor._id}
            className={`floor-pill${selectedFloor === floor._id ? " active" : ""}`}
            onClick={() => setSelectedFloor(floor._id)}
          >
            <Building size={14} />
            Tầng {getFloorNumber(floor.name)}
          </button>
        ))}
      </div>

      {/* Floor Map */}
      <div className="contract-floor-map">
        {currentFloorRooms.length > 0 ? (
          // Render floor-specific map based on floor name
          getFloorNumber(currentFloor?.name || "") === "1" ? (
            <FloorMap
              rooms={currentFloorRooms}
              floorName={`TẦNG ${getFloorNumber(currentFloor?.name || "")}`}
              onRoomSelect={handleRoomSelect}
              legendType="deposit"
            />
          ) : getFloorNumber(currentFloor?.name || "") === "2" ? (
            <FloorMapLevel2
              rooms={currentFloorRooms}
              floorName={`TẦNG ${getFloorNumber(currentFloor?.name || "")}`}
              onRoomSelect={handleRoomSelect}
              legendType="deposit"
            />
          ) : getFloorNumber(currentFloor?.name || "") === "3" ? (
            <FloorMapLevel3
              rooms={currentFloorRooms}
              floorName={`TẦNG ${getFloorNumber(currentFloor?.name || "")}`}
              onRoomSelect={handleRoomSelect}
              legendType="deposit"
            />
          ) : getFloorNumber(currentFloor?.name || "") === "4" ? (
            <FloorMapLevel4
              rooms={currentFloorRooms}
              floorName={`TẦNG ${getFloorNumber(currentFloor?.name || "")}`}
              onRoomSelect={handleRoomSelect}
              legendType="deposit"
            />
          ) : getFloorNumber(currentFloor?.name || "") === "5" ? (
            <FloorMapLevel5
              rooms={currentFloorRooms}
              floorName={`TẦNG ${getFloorNumber(currentFloor?.name || "")}`}
              onRoomSelect={handleRoomSelect}
              legendType="deposit"
            />
          ) : (
            <FloorMap
              rooms={currentFloorRooms}
              floorName={`TẦNG ${getFloorNumber(currentFloor?.name || "")}`}
              onRoomSelect={handleRoomSelect}
              legendType="deposit"
            />
          )
        ) : (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">
              Không có phòng nào ở tầng này
            </Typography>
          </Box>
        )}
      </div>

      {/* Room Stats */}
    </div>
  );
};

export default DepositFloorMap;

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FileText, Home, Clock, Building } from "lucide-react";

// Floor Maps
import FloorMap from "../RoomManagement/RoomList/components/FloorMap";
import FloorMapLevel2 from "../RoomManagement/RoomList/components/FloorMapLevel2";
import FloorMapLevel3 from "../RoomManagement/RoomList/components/FloorMapLevel3";
import FloorMapLevel4 from "../RoomManagement/RoomList/components/FloorMapLevel4";
import FloorMapLevel5 from "../RoomManagement/RoomList/components/FloorMapLevel5";
import "./ContractFloorMap.css";

const API_URL = "http://localhost:9999/api";

const ContractList = ({ readOnly = false }: { readOnly?: boolean }) => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [floors, setFloors] = useState<any[]>([]);
  const [activeFloorTab, setActiveFloorTab] = useState(0);

  useEffect(() => {
    // Fetch rooms, contracts, and floors in parallel
    Promise.all([
      axios.get(`${API_URL}/rooms`),
      axios.get(`${API_URL}/contracts`),
      axios.get(`${API_URL}/floors`),
    ])
      .then(([roomsRes, contractsRes, floorsRes]) => {
        const rawRooms = roomsRes.data.data || [];
        const mappedRooms = rawRooms.map((room: any) => {
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
            priceLabel:
              priceNum > 0
                ? `${(priceNum / 1000000).toFixed(1)}M`
                : "Chưa có giá",
            floorLabel: room.floorId?.name || "N/A",
          };
        });
        setRooms(mappedRooms);

        if (contractsRes.data.success) {
          setContracts(contractsRes.data.data || []);
        }

        const rawFloors = floorsRes.data.data || floorsRes.data || [];
        setFloors(rawFloors);
      })
      .catch((err) => console.error("Error fetching data:", err));
  }, []);

  // Build a map: roomId -> contractId (only active contracts)
  const roomContractMap: Record<string, string> = {};
  contracts.forEach((c: any) => {
    if (c.status === "active" && c.roomId?._id) {
      roomContractMap[c.roomId._id] = c._id;
    }
  });

  // When a room is clicked:
  // - Has active contract → go to contract detail
  // - Available/Deposited → go to create contract
  const handleRoomSelect = (room: any) => {
    const contractId = roomContractMap[room._id];
    if (contractId) {
      // Room has active contract → view it
      navigate(`${contractId}`);
    } else if (
      !readOnly &&
      (room.status === "Available" || room.status === "Deposited")
    ) {
      // Room is available → create new contract (only if not readOnly)
      navigate("create", { state: { roomId: room._id } });
    }
  };

  const activeContracts = contracts.filter(
    (c: any) => c.status === "active",
  ).length;
  const availableRooms = rooms.filter(
    (r: any) => r.status === "Available",
  ).length;
  const depositedRooms = rooms.filter(
    (r: any) => r.status === "Deposited",
  ).length;

  return (
    <div className="contract-container">
      <div className="contract-list-header">
        <div>
          <h2 className="contract-page-title">Quản lý Hợp đồng</h2>
          <p className="contract-page-subtitle">
            Xem và quản lý hợp đồng theo sơ đồ tầng
          </p>
        </div>
        {!readOnly && (
          <div className="stats-summary">
            <div className="stat-item">
              <FileText size={16} className="stat-icon icon-primary" />
              <div className="stat-text">
                <span className="stat-value">{activeContracts}</span>
                <span className="stat-label">Hợp đồng</span>
              </div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <Home size={16} className="stat-icon icon-accent" />
              <div className="stat-text">
                <span className="stat-value">{availableRooms}</span>
                <span className="stat-label">Phòng trống</span>
              </div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <Clock size={16} className="stat-icon icon-warning" />
              <div className="stat-text">
                <span className="stat-value">{depositedRooms}</span>
                <span className="stat-label">Đã cọc</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floor Filter Pills */}
      <div className="contract-floor-pills">
        {floors.map((floor, idx) => (
          <button
            key={floor._id || idx}
            className={`floor-pill${activeFloorTab === idx ? " active" : ""}`}
            onClick={() => setActiveFloorTab(idx)}
          >
            <Building size={14} />
            {floor.name}
          </button>
        ))}
      </div>

      {/* Floor Map Content */}
      <div className="contract-floor-map">
        {floors.map((floor, idx) => {
          if (activeFloorTab !== idx) return null;

          const floorRooms = rooms.filter((r: any) => {
            const fId = typeof r.floorId === "object" ? r.floorId?._id : r.floorId;
            return fId === floor._id;
          });

          const floorNameLower = floor.name.toLowerCase();

          if (floorNameLower.includes("2")) {
             return <FloorMapLevel2 key={floor._id} rooms={floorRooms} onRoomSelect={handleRoomSelect} legendType="contract" />;
          } else if (floorNameLower.includes("3")) {
             return <FloorMapLevel3 key={floor._id} rooms={floorRooms} onRoomSelect={handleRoomSelect} legendType="contract" />;
          } else if (floorNameLower.includes("4")) {
             return <FloorMapLevel4 key={floor._id} rooms={floorRooms} onRoomSelect={handleRoomSelect} legendType="contract" />;
          } else if (floorNameLower.includes("5")) {
             return <FloorMapLevel5 key={floor._id} rooms={floorRooms} onRoomSelect={handleRoomSelect} legendType="contract" />;
          }

          // Use default generic component for Level 1 and any newly added unknown floors
          return <FloorMap key={floor._id} rooms={floorRooms} floorName={floor.name} onRoomSelect={handleRoomSelect} legendType="contract" />;
        })}
      </div>
    </div>
  );
};

export default ContractList;

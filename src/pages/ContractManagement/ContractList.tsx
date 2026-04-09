import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FileText, Home, Clock, Building, Eye, PlusCircle                                                         } from "lucide-react";

// Floor Maps
import FloorMap from "../RoomManagement/RoomList/components/FloorMap";
import FloorMapLevel2 from "../RoomManagement/RoomList/components/FloorMapLevel2";
import FloorMapLevel3 from "../RoomManagement/RoomList/components/FloorMapLevel3";
import FloorMapLevel4 from "../RoomManagement/RoomList/components/FloorMapLevel4";
import FloorMapLevel5 from "../RoomManagement/RoomList/components/FloorMapLevel5";
import "./ContractFloorMap.css";
import {
  hasSuccessorContractAfterDeclinedTenant,
  isContractStartedByLocalCalendar,
} from "../../utils/contractDates";

const API_URL = "http://localhost:9999/api";

interface RoomActionPopup {
  show: boolean;
  room: any;
  position: { x: number; y: number };
  contracts: any[];      // Danh sách hợp đồng của phòng
  deposits: any[];       // Danh sách cọc lẻ (chưa gắn HĐ)
}

/**
 * Hiện nút "Tạo hợp đồng, cọc mới":
 * - Không có cọc lẻ chờ ký (phải ký qua từng cọc).
 * - Không chặn khi HĐ active hiện tại có renewal declined (đang chờ trả phòng / ký HĐ lấp khe).
 * - HĐ active nhưng ngày bắt đầu còn trong tương lai: thường chặn (đã có HĐ xếp hàng),
 *   trừ phòng `contractRenewalStatus === "declined"` — vẫn cho tạo HĐ/cọc cho giai đoạn trước HĐ tương lai.
 * - Nếu đã có HĐ kế tiếp (sau ngày kết thúc HĐ đang ở) thì không cho (khách A đã ký xong).
 */
/** dd/mm/yy — đồng bộ với FloorMap */
function formatDdMmYy(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear().toString().slice(-2)}`;
}

function allowCreateNewContractOption(
  room: any,
  roomContracts: any[],
  roomDeposits: any[],
) {
  if (roomDeposits.length > 0) return false;
  if (hasSuccessorContractAfterDeclinedTenant(room, roomContracts)) return false;
  const blocked = roomContracts.some((c: any) => {
    if (c.status !== "active") return false;
    if (!isContractStartedByLocalCalendar(c.startDate)) {
      if (room?.contractRenewalStatus === "declined") return false;
      return true;
    }
    if (c.renewalStatus === "declined") return false;
    return true;
  });
  return !blocked;
}

const ContractList = ({ readOnly = false }: { readOnly?: boolean }) => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [floors, setFloors] = useState<any[]>([]);
  const [activeFloorTab, setActiveFloorTab] = useState(0);
  const [actionPopup, setActionPopup] = useState<RoomActionPopup>({
    show: false,
    room: null,
    position: { x: 0, y: 0 },
    contracts: [],
    deposits: [],
  });
  const popupRef = useRef<HTMLDivElement>(null);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setActionPopup({ show: false, room: null, position: { x: 0, y: 0 } });
      }
    };
    if (actionPopup.show) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [actionPopup.show]);

  useEffect(() => {
    // Fetch rooms, contracts, deposits, and floors in parallel
    Promise.all([
      axios.get(`${API_URL}/rooms`),
      axios.get(`${API_URL}/contracts`),
      axios.get(`${API_URL}/deposits`),
      axios.get(`${API_URL}/floors`),
    ])
      .then(([roomsRes, contractsRes, depositsRes, floorsRes]) => {
        const rawRooms = roomsRes.data.data || [];
        const allContracts = contractsRes.data.data || [];
        const allDeposits = depositsRes.data.data || depositsRes.data || [];

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

          // Find future contracts for this room (active but startDate > today)
          const futureContract = allContracts.find((c: any) => {
            const roomId = c.roomId?._id || c.roomId;
            return (
              roomId === room._id &&
              c.status === "active" &&
              !isContractStartedByLocalCalendar(c.startDate)
            );
          });

          return {
            ...room,
            price: priceNum,
            priceLabel:
              priceNum > 0
                ? `${(priceNum / 1000000).toFixed(1)}M`
                : "Chưa có giá",
            floorLabel: room.floorId?.name || "N/A",
            hasFloatingDeposit: room.hasFloatingDeposit || false,
            contractStartDate: room.contractStartDate || null,
            futureContractId: futureContract?._id || null,
            futureContractStartDate: futureContract?.startDate || room.contractStartDate || null,
          };
        });
        setRooms(mappedRooms);

        if (contractsRes.data.success) {
          setContracts(allContracts);
        }

        setDeposits(allDeposits);

        const rawFloors = floorsRes.data.data || floorsRes.data || [];
        setFloors(rawFloors);
      })
      .catch((err) => console.error("Error fetching data:", err));
  }, []);

  // Build a map: roomId -> contractId (only active contracts that have started)
  const roomContractMap: Record<string, string> = {};
  contracts.forEach((c: any) => {
    const roomId = c.roomId?._id || c.roomId;
    if (
      c.status === "active" &&
      roomId &&
      isContractStartedByLocalCalendar(c.startDate)
    ) {
      roomContractMap[roomId] = c._id;
    }
  });

  // When a room is clicked:
  // - Has contracts or deposits → show popup with options
  // - Has active contract → go to contract detail
  // - Available/Deposited → go to create contract
  const handleRoomSelect = (room: any, event?: React.MouseEvent) => {
    // Lấy tất cả hợp đồng của phòng này
    const roomContracts = contracts.filter((c: any) => {
      const roomId = c.roomId?._id || c.roomId;
      return roomId === room._id;
    });

    // Lấy tất cả cọc lẻ của phòng này (cọc có status "Held" và không gắn với hợp đồng nào trong danh sách)
    const contractIds = roomContracts.map((c: any) => c._id);
    const roomDeposits = deposits.filter((d: any) => {
      const depositRoomId = d.room?._id || d.room;
      // Cọc thuộc phòng này
      if (depositRoomId !== room._id) return false;
      // Cọc phải đang được giữ
      if (d.status !== "Held") return false;
      // Cọc không gắn với hợp đồng nào trong danh sách (cọc lẻ)
      if (!d.contractId) return true;
      const cid = typeof d.contractId === "object" ? d.contractId._id : d.contractId;
      return !contractIds.includes(cid);
    });

    // Nếu có hợp đồng hoặc cọc lẻ → hiện popup
    if (roomContracts.length > 0 || roomDeposits.length > 0) {
      const rect = (event?.currentTarget as HTMLElement)?.getBoundingClientRect();
      const x = rect ? rect.left + rect.width / 2 : event?.clientX || 200;
      const y = rect ? rect.top : event?.clientY || 200;

      setActionPopup({
        show: true,
        room,
        position: { x, y },
        contracts: roomContracts,
        deposits: roomDeposits,
      });
      return;
    }

    // Case: Room is Available → go to create contract
    if (!readOnly && room.status === "Available") {
      navigate("create", { state: { roomId: room._id } });
      return;
    }

    // Case: Room has active contract (currently running) → view it
    const contractId = roomContractMap[room._id];
    if (contractId) {
      navigate(`${contractId}`);
    }
  };

  // Xem chi tiết hợp đồng
  const handleViewContract = (contractId: string) => {
    navigate(`${contractId}`);
    setActionPopup({ show: false, room: null, position: { x: 0, y: 0 }, contracts: [], deposits: [] });
  };

  // Tạo hợp đồng mới cho cọc lẻ
  const handleCreateFromDeposit = (depositId: string) => {
    if (actionPopup.room) {
      navigate("create", { state: { roomId: actionPopup.room._id, depositId } });
    }
    setActionPopup({ show: false, room: null, position: { x: 0, y: 0 }, contracts: [], deposits: [] });
  };

  // Tạo hợp đồng mới (không có cọc)
  const handleCreateNewContract = () => {
    if (actionPopup.room) {
      navigate("create", { state: { roomId: actionPopup.room._id } });
    }
    setActionPopup({ show: false, room: null, position: { x: 0, y: 0 }, contracts: [], deposits: [] });
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

          // Pass event to handleRoomSelect for popup positioning
          const onRoomSelect = (room: any, e?: React.MouseEvent) => handleRoomSelect(room, e);

          if (floorNameLower.includes("2")) {
             return <FloorMapLevel2 key={floor._id} rooms={floorRooms} onRoomSelect={onRoomSelect} legendType="contract" />;
          } else if (floorNameLower.includes("3")) {
             return <FloorMapLevel3 key={floor._id} rooms={floorRooms} onRoomSelect={onRoomSelect} legendType="contract" />;
          } else if (floorNameLower.includes("4")) {
             return <FloorMapLevel4 key={floor._id} rooms={floorRooms} onRoomSelect={onRoomSelect} legendType="contract" />;
          } else if (floorNameLower.includes("5")) {
             return <FloorMapLevel5 key={floor._id} rooms={floorRooms} onRoomSelect={onRoomSelect} legendType="contract" />;
          }

          // Use default generic component for Level 1 and any newly added unknown floors
          return <FloorMap key={floor._id} rooms={floorRooms} floorName={floor.name} onRoomSelect={onRoomSelect} legendType="contract" />;
        })}
      </div>

      {/* Action Popup for rooms with multiple options */}
      {actionPopup.show && actionPopup.room && (
        <div
          ref={popupRef}
          className="room-action-popup"
          style={{
            position: "fixed",
            left: actionPopup.position.x,
            top: actionPopup.position.y - 10,
            transform: "translate(-50%, -100%)",
            zIndex: 1000,
          }}
        >
          <div className="popup-arrow"></div>
          <div className="popup-header">
            <span className="popup-room-name">{actionPopup.room.name}</span>
            <span className="popup-badge">
              {actionPopup.contracts.length + actionPopup.deposits.length} lựa chọn
            </span>
          </div>
          <div className="popup-options">
            {/* Hiện các hợp đồng */}
            {actionPopup.contracts.map((contract: any) => {
              const isActive =
                contract.status === "active" &&
                isContractStartedByLocalCalendar(contract.startDate);
              const isPending =
                contract.status === "active" &&
                !isContractStartedByLocalCalendar(contract.startDate);
              const showDeclinedRenewal =
                isActive &&
                (contract.renewalStatus === "declined" ||
                  actionPopup.room?.contractRenewalStatus === "declined");
              const statusLine = isActive
                ? "Đang hiệu lực"
                : isPending
                  ? `Sắp tới (bắt đầu ${formatDdMmYy(contract.startDate)})`
                  : contract.status === "Pending"
                    ? "Đang chờ ký"
                    : contract.status === "terminated"
                      ? "Đã chấm dứt"
                      : "Chưa có hiệu lực";
              return (
                <button
                  key={contract._id}
                  className={`popup-option popup-option-contract ${isActive ? "option-view-active" : "option-view"}`}
                  onClick={() => handleViewContract(contract._id)}
                >
                  <FileText size={16} />
                  <div className="option-text">
                    <span className="option-title">HĐ: {contract.contractCode}</span>
                    <span className="option-dates">
                      Bắt đầu: {formatDdMmYy(contract.startDate)} · Kết thúc:{" "}
                      {formatDdMmYy(contract.endDate)}
                    </span>
                    <span className="option-desc option-desc-with-status">
                      <span>{statusLine}</span>
                      {showDeclinedRenewal && (
                        <span className="popup-declined-renewal-tag">Từ chối gia hạn</span>
                      )}
                    </span>
                  </div>
                </button>
              );
            })}
            {/* Hiện các cọc lẻ */}
            {actionPopup.deposits.map((deposit: any, idx: number) => (
              <button
                key={deposit._id}
                className="popup-option option-create"
                onClick={() => handleCreateFromDeposit(deposit._id)}
              >
                <PlusCircle size={16} />
                <div className="option-text">
                  <span className="option-title">Cọc lẻ #{idx + 1} - Ký HĐ</span>
                  <span className="option-desc">
                    {deposit.name || "Chưa có tên"} - {deposit.amount?.toLocaleString("vi-VN") || "---"}đ
                  </span>
                </div>
              </button>
            ))}
            {!readOnly &&
              allowCreateNewContractOption(
                actionPopup.room,
                actionPopup.contracts,
                actionPopup.deposits,
              ) && (
              <button
                className="popup-option option-create-new"
                onClick={handleCreateNewContract}
              >
                <PlusCircle size={16} />
                <div className="option-text">
                  <span className="option-title">Tạo hợp đồng, cọc mới</span>
                  <span className="option-desc">Cho phòng này</span>
                </div>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractList;

import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FileText,
  Home,
  Clock,
  Building,
  Eye,
  PlusCircle,
  List as ListIcon,
  Map as MapIcon,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Banknote,
} from "lucide-react";

// Floor Maps
import FloorMap from "../RoomManagement/RoomList/components/FloorMap";
import FloorMapLevel2 from "../RoomManagement/RoomList/components/FloorMapLevel2";
import FloorMapLevel3 from "../RoomManagement/RoomList/components/FloorMapLevel3";
import FloorMapLevel4 from "../RoomManagement/RoomList/components/FloorMapLevel4";
import FloorMapLevel5 from "../RoomManagement/RoomList/components/FloorMapLevel5";
import "./ContractFloorMap.css";
import "../RoomManagement/ManageRoom/ManageRoom.css";
import {
  hasSuccessorContractAfterDeclinedTenant,
  isContractStartedByLocalCalendar,
} from "../../utils/contractDates";

const API_URL = "http://localhost:9999/api";

type PopupPlacement = "above" | "below";

interface RoomActionPopup {
  show: boolean;
  room: any;
  position: { x: number; anchorTop: number; anchorBottom: number };
  placement: PopupPlacement;
  contracts: any[]; // Danh sách hợp đồng của phòng
  deposits: any[]; // Danh sách cọc lẻ (chưa gắn HĐ)
}

const EMPTY_ACTION_POPUP: RoomActionPopup = {
  show: false,
  room: null,
  position: { x: 0, anchorTop: 0, anchorBottom: 0 },
  placement: "above",
  contracts: [],
  deposits: [],
};

/** Tránh popup mở phía trên khi ô phòng sát mép trên viewport (đè lên chrome / header app). */
function computePopupAnchor(event?: React.MouseEvent): {
  x: number;
  anchorTop: number;
  anchorBottom: number;
  placement: PopupPlacement;
} {
  const rect = event?.currentTarget
    ? (event.currentTarget as HTMLElement).getBoundingClientRect()
    : null;
  const fallbackY = event?.clientY ?? 200;
  const xRaw = rect ? rect.left + rect.width / 2 : (event?.clientX ?? 200);
  const anchorTop = rect?.top ?? fallbackY - 24;
  const anchorBottom = rect?.bottom ?? fallbackY + 24;
  const halfMin = 140;
  const x =
    typeof window !== "undefined"
      ? Math.min(window.innerWidth - halfMin - 8, Math.max(halfMin + 8, xRaw))
      : xRaw;
  const VIEWPORT_TOP_SAFE = 8;
  const ESTIMATED_POPUP_HEIGHT = 340;
  const placement: PopupPlacement =
    anchorTop >= ESTIMATED_POPUP_HEIGHT + VIEWPORT_TOP_SAFE ? "above" : "below";
  return { x, anchorTop, anchorBottom, placement };
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
  if (hasSuccessorContractAfterDeclinedTenant(room, roomContracts))
    return false;
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
  const [actionPopup, setActionPopup] =
    useState<RoomActionPopup>(EMPTY_ACTION_POPUP);
  const popupRef = useRef<HTMLDivElement>(null);

  const [viewMode, setViewMode] = useState<"list" | "map">("map");
  const [expandedFloors, setExpandedFloors] = useState<string[]>([]);
  const [expandedRooms, setExpandedRooms] = useState<string[]>([]);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setActionPopup(EMPTY_ACTION_POPUP);
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
            futureContractStartDate:
              futureContract?.startDate || room.contractStartDate || null,
          };
        });
        setRooms(mappedRooms);

        if (contractsRes.data.success) {
          setContracts(allContracts);
        }

        setDeposits(allDeposits);

        const rawFloors = floorsRes.data.data || floorsRes.data || [];
        setFloors(rawFloors);
        setExpandedFloors(rawFloors.map((f: any) => f._id));
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
      const cid =
        typeof d.contractId === "object" ? d.contractId._id : d.contractId;
      return !contractIds.includes(cid);
    });

    // Nếu có hợp đồng hoặc cọc lẻ → hiện popup
    if (roomContracts.length > 0 || roomDeposits.length > 0) {
      const { x, anchorTop, anchorBottom, placement } =
        computePopupAnchor(event);

      setActionPopup({
        show: true,
        room,
        position: { x, anchorTop, anchorBottom },
        placement,
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
    setActionPopup(EMPTY_ACTION_POPUP);
  };

  // Tạo hợp đồng mới cho cọc lẻ
  const handleCreateFromDeposit = (depositId: string) => {
    if (actionPopup.room) {
      navigate("create", {
        state: { roomId: actionPopup.room._id, depositId },
      });
    }
    setActionPopup(EMPTY_ACTION_POPUP);
  };

  // Tạo hợp đồng mới (không có cọc)
  const handleCreateNewContract = () => {
    if (actionPopup.room) {
      navigate("create", { state: { roomId: actionPopup.room._id } });
    }
    setActionPopup(EMPTY_ACTION_POPUP);
  };

  const toggleFloor = (floorId: string) => {
    setExpandedFloors((prev) =>
      prev.includes(floorId)
        ? prev.filter((id) => id !== floorId)
        : [...prev, floorId],
    );
  };

  const toggleRoom = (roomId: string) => {
    setExpandedRooms((prev) =>
      prev.includes(roomId)
        ? prev.filter((id) => id !== roomId)
        : [...prev, roomId],
    );
  };

  const renderStatus = (room: any) => {
    if (room.status === "Available") {
      return (
        <span className="status-badge available">
          <CheckCircle size={12} /> Trống
        </span>
      );
    }
    if (room.status === "Occupied") {
      return (
        <span className="status-badge occupied">
          <AlertCircle size={12} /> Đang thuê
        </span>
      );
    }
    if (room.status === "Deposited") {
      if (room.contractRenewalStatus === "declined") {
        const stillOccupied = contracts.some((c: any) => {
          const rid = c.roomId?._id || c.roomId;
          if (rid !== room._id || c.status !== "active") return false;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const started = isContractStartedByLocalCalendar(c.startDate);
          const endD = new Date(c.endDate);
          endD.setHours(0, 0, 0, 0);
          return started && endD >= today && c.isActivated !== false;
        });
        if (stillOccupied) {
          return (
            <span className="status-badge occupied">
              <AlertCircle size={12} /> Đang thuê
            </span>
          );
        }
      }
      return (
        <span className="status-badge deposited">
          <Banknote size={12} /> Đã cọc
        </span>
      );
    }
    return <span>{room.status}</span>;
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
    <div className="contract-container room-container">
      <div className="page-header">
        <div>
          <h2 className="page-title">Quản lý Hợp đồng</h2>
          <p className="page-subtitle">
            Xem và quản lý hợp đồng theo sơ đồ và danh sách
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

      <div
        className="toolbar-actions"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          alignItems: "center",
          justifyContent: "flex-end",
          marginBottom: "1rem",
        }}
      >
        <div
          style={{
            display: "flex",
            background: "#fff",
            borderRadius: "8px",
            border: "1px solid #ddd",
            padding: "4px",
            marginRight: "auto",
          }}
        >
          <button
            onClick={() => setViewMode("map")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              background: viewMode === "map" ? "#3579C6" : "transparent",
              color: viewMode === "map" ? "#fff" : "#666",
              fontWeight: viewMode === "map" ? "bold" : "normal",
            }}
          >
            <MapIcon size={16} /> Sơ đồ
          </button>
          <button
            onClick={() => setViewMode("list")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              background: viewMode === "list" ? "#3579C6" : "transparent",
              color: viewMode === "list" ? "#fff" : "#666",
              fontWeight: viewMode === "list" ? "bold" : "normal",
            }}
          >
            <ListIcon size={16} /> Danh sách
          </button>
        </div>
      </div>

      {viewMode === "list" ? (
        <div className="floor-list-container">
          {floors.length === 0 && (
            <div className="empty-floor">Chưa có dữ liệu tầng.</div>
          )}

          {floors.map((floor) => {
            const floorRooms = rooms.filter((r) => {
              const fId =
                typeof r.floorId === "object" ? r.floorId?._id : r.floorId;
              return fId === floor._id;
            });

            const isExpanded = expandedFloors.includes(floor._id);

            return (
              <div key={floor._id} className="floor-group">
                <div
                  className={`floor-header ${isExpanded ? "active" : ""}`}
                  onClick={() => toggleFloor(floor._id)}
                >
                  <div className="floor-title">
                    {isExpanded ? (
                      <ChevronDown size={20} />
                    ) : (
                      <ChevronRight size={20} />
                    )}
                    <span>{floor.name}</span>
                    <span className="room-count-badge">
                      {floorRooms.length} phòng
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="floor-body">
                    {floorRooms.length > 0 ? (
                      <table className="room-table">
                        <thead>
                          <tr>
                            <th style={{ width: "120px" }}>Mã phòng</th>
                            <th style={{ width: "150px" }}>Tên phòng</th>
                            <th style={{ width: "150px" }}>Trạng thái phòng</th>
                            <th style={{ width: "200px" }}>Hợp đồng/Cọc</th>
                            <th
                              style={{
                                width: readOnly ? "100px" : "140px",
                                textAlign: "center",
                                whiteSpace: "nowrap",
                              }}
                            >
                              THAO TÁC
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {floorRooms.map((room) => {
                            const roomContracts = contracts.filter((c: any) => {
                              const roomId = c.roomId?._id || c.roomId;
                              return roomId === room._id;
                            });

                            const contractIds = roomContracts.map(
                              (c: any) => c._id,
                            );
                            const roomDeposits = deposits.filter((d: any) => {
                              const depositRoomId = d.room?._id || d.room;
                              if (depositRoomId !== room._id) return false;
                              if (d.status !== "Held") return false;
                              if (!d.contractId) return true;
                              const cid =
                                typeof d.contractId === "object"
                                  ? d.contractId._id
                                  : d.contractId;
                              return !contractIds.includes(cid);
                            });

                            const totalOptions =
                              roomContracts.length + roomDeposits.length;
                            const isRoomExpanded = expandedRooms.includes(
                              room._id,
                            );

                            return (
                              <React.Fragment key={room._id}>
                                <tr
                                  onClick={() =>
                                    totalOptions > 0 && toggleRoom(room._id)
                                  }
                                  style={{
                                    cursor:
                                      totalOptions > 0 ? "pointer" : "default",
                                  }}
                                >
                                  <td
                                    style={{
                                      fontFamily: "monospace",
                                      color: "#64748b",
                                      fontWeight: 600,
                                    }}
                                  >
                                    {room.roomCode || "---"}
                                  </td>
                                  <td className="font-bold">{room.name}</td>
                                  <td>{renderStatus(room)}</td>
                                  <td>
                                    {totalOptions === 0 ? (
                                      <span className="text-muted-italic">
                                        Trống
                                      </span>
                                    ) : (
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "8px",
                                          color: "#3579c6",
                                          fontWeight: 600,
                                        }}
                                      >
                                        {totalOptions} lựa chọn
                                        {isRoomExpanded ? (
                                          <ChevronDown size={16} />
                                        ) : (
                                          <ChevronRight size={16} />
                                        )}
                                      </div>
                                    )}
                                  </td>
                                  <td>
                                    <div className="action-group">
                                      <button
                                        className="btn-icon-sm view"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRoomSelect(room, e);
                                        }}
                                        title="Xử lý"
                                      >
                                        <Eye size={16} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                                {isRoomExpanded && totalOptions > 0 && (
                                  <tr
                                    style={{
                                      backgroundColor: "#fafbfc",
                                      borderBottom: "2px solid #e2e8f0",
                                    }}
                                  >
                                    <td colSpan={5} style={{ padding: "0" }}>
                                      <div
                                        style={{
                                          padding: "20px 24px",
                                          borderTop: "1px dashed #cbd5e1",
                                        }}
                                      >
                                        <h4
                                          style={{
                                            margin: "0 0 16px 0",
                                            fontSize: "14px",
                                            color: "#475569",
                                            fontWeight: 600,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                          }}
                                        >
                                          <ListIcon size={16} /> Danh sách Hợp
                                          đồng / Cọc lẻ của {room.name}
                                        </h4>
                                        <div
                                          style={{
                                            display: "grid",
                                            gridTemplateColumns:
                                              "repeat(auto-fill, minmax(280px, 1fr))",
                                            gap: "16px",
                                          }}
                                        >
                                          {roomContracts.map(
                                            (contract: any) => {
                                              const isActive =
                                                contract.status === "active" &&
                                                isContractStartedByLocalCalendar(
                                                  contract.startDate,
                                                );
                                              const isPending =
                                                contract.status === "active" &&
                                                !isContractStartedByLocalCalendar(
                                                  contract.startDate,
                                                );
                                              const showDeclinedRenewal =
                                                isActive &&
                                                (contract.renewalStatus ===
                                                  "declined" ||
                                                  room?.contractRenewalStatus ===
                                                    "declined");
                                              const statusLine = isActive
                                                ? "Đang hiệu lực"
                                                : isPending
                                                  ? `Sắp tới`
                                                  : contract.status ===
                                                      "Pending"
                                                    ? "Đang chờ ký"
                                                    : contract.status ===
                                                        "terminated"
                                                      ? "Đã chấm dứt"
                                                      : "Chưa có hiệu lực";

                                              return (
                                                <div
                                                  key={contract._id}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleViewContract(
                                                      contract._id,
                                                    );
                                                  }}
                                                  className="rd-panel"
                                                  style={{
                                                    padding: "16px",
                                                    backgroundColor: "#ffffff",
                                                    border: `1px solid ${isActive ? "#93bbdf" : "#e2e8f0"}`,
                                                    borderLeft: isActive
                                                      ? "4px solid #3579c6"
                                                      : isPending
                                                        ? "4px solid #f59e0b"
                                                        : "4px solid #94a3b8",
                                                    borderRadius: "8px",
                                                    cursor: "pointer",
                                                    boxShadow:
                                                      "0 1px 2px rgba(0,0,0,0.05)",
                                                    transition:
                                                      "transform 0.2s, box-shadow 0.2s",
                                                    display: "flex",
                                                    flexDirection: "row",
                                                    alignItems: "flex-start",
                                                    gap: "12px",
                                                    margin: 0,
                                                  }}
                                                  onMouseEnter={(e) => {
                                                    e.currentTarget.style.transform =
                                                      "translateY(-2px)";
                                                    e.currentTarget.style.boxShadow =
                                                      "0 4px 6px rgba(0,0,0,0.05)";
                                                  }}
                                                  onMouseLeave={(e) => {
                                                    e.currentTarget.style.transform =
                                                      "none";
                                                    e.currentTarget.style.boxShadow =
                                                      "0 1px 2px rgba(0,0,0,0.05)";
                                                  }}
                                                >
                                                  <div
                                                    style={{
                                                      padding: "10px",
                                                      backgroundColor: isActive
                                                        ? "#eff6ff"
                                                        : "#f8fafc",
                                                      borderRadius: "50%",
                                                      color: isActive
                                                        ? "#3579c6"
                                                        : "#64748b",
                                                    }}
                                                  >
                                                    <FileText size={20} />
                                                  </div>
                                                  <div
                                                    style={{
                                                      flex: 1,
                                                      display: "flex",
                                                      flexDirection: "column",
                                                      gap: "6px",
                                                    }}
                                                  >
                                                    <div
                                                      style={{
                                                        display: "flex",
                                                        justifyContent:
                                                          "space-between",
                                                        alignItems:
                                                          "flex-start",
                                                      }}
                                                    >
                                                      <span
                                                        style={{
                                                          fontWeight: 700,
                                                          color: "#1e293b",
                                                          fontSize: "14px",
                                                        }}
                                                      >
                                                        HĐ:{" "}
                                                        {contract.contractCode}
                                                      </span>
                                                      <span
                                                        style={{
                                                          fontSize: "11px",
                                                          fontWeight: 600,
                                                          padding: "2px 8px",
                                                          borderRadius: "12px",
                                                          backgroundColor:
                                                            isActive
                                                              ? "#dbeafe"
                                                              : isPending
                                                                ? "#fef3c7"
                                                                : "#f1f5f9",
                                                          color: isActive
                                                            ? "#1d4ed8"
                                                            : isPending
                                                              ? "#d97706"
                                                              : "#64748b",
                                                          whiteSpace: "nowrap",
                                                        }}
                                                      >
                                                        {statusLine}
                                                      </span>
                                                    </div>
                                                    <div
                                                      style={{
                                                        fontSize: "12px",
                                                        color: "#64748b",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "12px",
                                                      }}
                                                    >
                                                      <span>
                                                        Bắt đầu:{" "}
                                                        <strong
                                                          style={{
                                                            color: "#475569",
                                                          }}
                                                        >
                                                          {formatDdMmYy(
                                                            contract.startDate,
                                                          )}
                                                        </strong>
                                                      </span>
                                                      <span
                                                        style={{
                                                          color: "#cbd5e1",
                                                        }}
                                                      >
                                                        |
                                                      </span>
                                                      <span>
                                                        Kết thúc:{" "}
                                                        <strong
                                                          style={{
                                                            color: "#475569",
                                                          }}
                                                        >
                                                          {formatDdMmYy(
                                                            contract.endDate,
                                                          )}
                                                        </strong>
                                                      </span>
                                                    </div>
                                                    {showDeclinedRenewal && (
                                                      <span
                                                        style={{
                                                          display:
                                                            "inline-block",
                                                          fontSize: "11px",
                                                          color: "#ef4444",
                                                          backgroundColor:
                                                            "#fee2e2",
                                                          padding: "2px 6px",
                                                          borderRadius: "4px",
                                                          fontWeight: 600,
                                                          width: "fit-content",
                                                          marginTop: "4px",
                                                        }}
                                                      >
                                                        Từ chối gia hạn
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              );
                                            },
                                          )}

                                          {roomDeposits.map(
                                            (deposit: any, idx: number) => (
                                              <div
                                                key={deposit._id}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleCreateFromDeposit(
                                                    deposit._id,
                                                  );
                                                }}
                                                className="rd-panel"
                                                style={{
                                                  padding: "16px",
                                                  backgroundColor: "#ffffff",
                                                  border: "1px solid #e2e8f0",
                                                  borderLeft:
                                                    "4px solid #10b981",
                                                  borderRadius: "8px",
                                                  cursor: "pointer",
                                                  boxShadow:
                                                    "0 1px 2px rgba(0,0,0,0.05)",
                                                  transition:
                                                    "transform 0.2s, box-shadow 0.2s",
                                                  display: "flex",
                                                  flexDirection: "row",
                                                  alignItems: "flex-start",
                                                  gap: "12px",
                                                  margin: 0,
                                                }}
                                                onMouseEnter={(e) => {
                                                  e.currentTarget.style.transform =
                                                    "translateY(-2px)";
                                                  e.currentTarget.style.boxShadow =
                                                    "0 4px 6px rgba(0,0,0,0.05)";
                                                }}
                                                onMouseLeave={(e) => {
                                                  e.currentTarget.style.transform =
                                                    "none";
                                                  e.currentTarget.style.boxShadow =
                                                    "0 1px 2px rgba(0,0,0,0.05)";
                                                }}
                                              >
                                                <div
                                                  style={{
                                                    padding: "10px",
                                                    backgroundColor: "#ecfdf5",
                                                    borderRadius: "50%",
                                                    color: "#10b981",
                                                  }}
                                                >
                                                  <Banknote size={20} />
                                                </div>
                                                <div
                                                  style={{
                                                    flex: 1,
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    gap: "6px",
                                                  }}
                                                >
                                                  <div
                                                    style={{
                                                      display: "flex",
                                                      justifyContent:
                                                        "space-between",
                                                      alignItems: "flex-start",
                                                    }}
                                                  >
                                                    <span
                                                      style={{
                                                        fontWeight: 700,
                                                        color: "#1e293b",
                                                        fontSize: "14px",
                                                      }}
                                                    >
                                                      Cọc lẻ #{idx + 1}
                                                    </span>
                                                    <span
                                                      style={{
                                                        fontSize: "11px",
                                                        fontWeight: 600,
                                                        color: "#10b981",
                                                        backgroundColor:
                                                          "#d1fae5",
                                                        padding: "2px 8px",
                                                        borderRadius: "12px",
                                                        whiteSpace: "nowrap",
                                                      }}
                                                    >
                                                      Ký Hợp đồng
                                                    </span>
                                                  </div>
                                                  <div
                                                    style={{
                                                      fontSize: "12px",
                                                      color: "#64748b",
                                                      display: "flex",
                                                      flexDirection: "column",
                                                    }}
                                                  >
                                                    <span>
                                                      Khách:{" "}
                                                      <strong
                                                        style={{
                                                          color: "#475569",
                                                        }}
                                                      >
                                                        {deposit.name ||
                                                          "Chưa có tên"}
                                                      </strong>
                                                    </span>
                                                    <span>
                                                      Tiền cọc:{" "}
                                                      <strong
                                                        style={{
                                                          color: "#059669",
                                                          fontSize: "13px",
                                                        }}
                                                      >
                                                        {deposit.amount?.toLocaleString(
                                                          "vi-VN",
                                                        )}{" "}
                                                        đ
                                                      </strong>
                                                    </span>
                                                  </div>
                                                </div>
                                              </div>
                                            ),
                                          )}

                                          {!readOnly &&
                                            allowCreateNewContractOption(
                                              room,
                                              roomContracts,
                                              roomDeposits,
                                            ) && (
                                              <div
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  navigate(
                                                    "/manager/contracts/create",
                                                    {
                                                      state: {
                                                        roomId: room._id,
                                                      },
                                                    },
                                                  );
                                                }}
                                                className="rd-panel"
                                                style={{
                                                  padding: "16px",
                                                  backgroundColor: "#f8fafc",
                                                  border: "2px dashed #cbd5e1",
                                                  borderRadius: "8px",
                                                  cursor: "pointer",
                                                  transition:
                                                    "background-color 0.2s",
                                                  display: "flex",
                                                  flexDirection: "column",
                                                  alignItems: "center",
                                                  justifyContent: "center",
                                                  gap: "8px",
                                                  margin: 0,
                                                  minHeight: "100px",
                                                }}
                                                onMouseEnter={(e) => {
                                                  e.currentTarget.style.backgroundColor =
                                                    "#f1f5f9";
                                                }}
                                                onMouseLeave={(e) => {
                                                  e.currentTarget.style.backgroundColor =
                                                    "#f8fafc";
                                                }}
                                              >
                                                <PlusCircle
                                                  size={24}
                                                  color="#64748b"
                                                />
                                                <span
                                                  style={{
                                                    fontSize: "14px",
                                                    fontWeight: 600,
                                                    color: "#475569",
                                                  }}
                                                >
                                                  Tạo Hợp đồng, Cọc mới
                                                </span>
                                              </div>
                                            )}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <div className="empty-floor">
                        Chưa có phòng nào ở tầng này.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="floor-map-view">
          {/* Floor Filter Pills */}
          <div className="room-floor-pills">
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
          <div
            className="contract-floor-map"
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              overflow: "hidden",
              minHeight: "400px",
              background: "#fff",
              padding: "16px",
            }}
          >
            {floors.map((floor, idx) => {
              if (activeFloorTab !== idx) return null;

              const floorRooms = rooms.filter((r: any) => {
                const fId =
                  typeof r.floorId === "object" ? r.floorId?._id : r.floorId;
                return fId === floor._id;
              });

              const floorNameLower = floor.name.toLowerCase();

              // Pass event to handleRoomSelect for popup positioning
              const onRoomSelect = (room: any, e?: React.MouseEvent) =>
                handleRoomSelect(room, e);

              if (floorNameLower.includes("2")) {
                return (
                  <FloorMapLevel2
                    key={floor._id}
                    rooms={floorRooms}
                    onRoomSelect={onRoomSelect}
                    legendType="contract"
                  />
                );
              } else if (floorNameLower.includes("3")) {
                return (
                  <FloorMapLevel3
                    key={floor._id}
                    rooms={floorRooms}
                    onRoomSelect={onRoomSelect}
                    legendType="contract"
                  />
                );
              } else if (floorNameLower.includes("4")) {
                return (
                  <FloorMapLevel4
                    key={floor._id}
                    rooms={floorRooms}
                    onRoomSelect={onRoomSelect}
                    legendType="contract"
                  />
                );
              } else if (floorNameLower.includes("5")) {
                return (
                  <FloorMapLevel5
                    key={floor._id}
                    rooms={floorRooms}
                    onRoomSelect={onRoomSelect}
                    legendType="contract"
                  />
                );
              }

              // Use default generic component for Level 1 and any newly added unknown floors
              return (
                <FloorMap
                  key={floor._id}
                  rooms={floorRooms}
                  floorName={floor.name}
                  onRoomSelect={onRoomSelect}
                  legendType="contract"
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Action Popup for rooms with multiple options */}
      {actionPopup.show && actionPopup.room && (
        <div
          ref={popupRef}
          className={`room-action-popup room-action-popup--${actionPopup.placement}`}
          style={{
            position: "fixed",
            left: actionPopup.position.x,
            top:
              actionPopup.placement === "above"
                ? actionPopup.position.anchorTop - 10
                : actionPopup.position.anchorBottom + 10,
            transform:
              actionPopup.placement === "above"
                ? "translate(-50%, -100%)"
                : "translate(-50%, 0)",
            zIndex: 1000,
          }}
        >
          <div className="popup-arrow"></div>
          <div className="popup-header">
            <span className="popup-room-name">{actionPopup.room.name}</span>
            <span className="popup-badge">
              {actionPopup.contracts.length + actionPopup.deposits.length} lựa
              chọn
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
                    <span className="option-title">
                      HĐ: {contract.contractCode}
                    </span>
                    <span className="option-dates">
                      Bắt đầu: {formatDdMmYy(contract.startDate)} · Kết thúc:{" "}
                      {formatDdMmYy(contract.endDate)}
                    </span>
                    <span className="option-desc option-desc-with-status">
                      <span>{statusLine}</span>
                      {showDeclinedRenewal && (
                        <span className="popup-declined-renewal-tag">
                          Từ chối gia hạn
                        </span>
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
                  <span className="option-title">
                    Cọc lẻ #{idx + 1} - Ký HĐ
                  </span>
                  <span className="option-desc">
                    {deposit.name || "Chưa có tên"} -{" "}
                    {deposit.amount?.toLocaleString("vi-VN") || "---"}đ
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

import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import { Building as BuildingIcon } from "lucide-react";

import toastr from "toastr";
import "toastr/build/toastr.min.css";

// Floor Maps
import FloorMap from "../RoomList/components/FloorMap";
import FloorMapLevel2 from "../RoomList/components/FloorMapLevel2";
import FloorMapLevel3 from "../RoomList/components/FloorMapLevel3";
import FloorMapLevel4 from "../RoomList/components/FloorMapLevel4";
import FloorMapLevel5 from "../RoomList/components/FloorMapLevel5";
import "../RoomList/components/FloorMap.css";
import {
  Plus, Edit, Trash2, Eye, ChevronDown, ChevronRight, CheckCircle,
  AlertCircle, Banknote, X, Building, Home, Tag, Power, Download,
  FileSpreadsheet, List as ListIcon, Map as MapIcon, User, Users,
  FileText, Phone, Mail, CreditCard, Zap, Gavel, DoorOpen,
} from "lucide-react";
import "./ManageRoom.css";
import LiquidationWizard from "./LiquidationWizard";
import { isContractStartedByLocalCalendar } from "../../../utils/contractDates";
import { AppModal } from "../../../components/common/Modal";

const API_BASE_URL = "http://localhost:9999/api";

// --- INTERFACES ---
interface Floor {
  _id: string;
  name: string;
}

interface RoomType {
  _id: string;
  typeName: string;
  currentPrice: number;
  personMax: number;
  images: string[];
}

interface Room {
  _id: string;
  roomCode: string;
  name: string;
  floorId: string | Floor;
  roomTypeId: string | RoomType;
  status: "Available" | "Occupied" | "Maintenance" | "Deposited";
  description?: string;
  isActive: boolean;
  contractRenewalStatus?: string | null;
}

interface ManageRoomProps {
  readOnly?: boolean;
}

const ManageRoom: React.FC<ManageRoomProps> = ({ readOnly = false }) => {
  // --- States ---
  const [rooms, setRooms] = useState<Room[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(false);
  const [contracts, setContracts] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);

  // View Mode
  const [viewMode, setViewMode] = useState<"list" | "map">("map");
  const [activeMapFloor, setActiveMapFloor] = useState(0);

  // Ref cho input file ẩn
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State đóng/mở tầng
  const [expandedFloors, setExpandedFloors] = useState<string[]>([]);

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    action: "TOGGLE_ACTIVE" | "DELETE" | null;
    targetRoom: Room | null;
    message: string;
  }>({ isOpen: false, action: null, targetRoom: null, message: "" });

  const [isEditing, setIsEditing] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [viewingRoom, setViewingRoom] = useState<Room | null>(null);
  const [roomBookServices, setRoomBookServices] = useState<any[]>([]);
  const [prepaidInvoice, setPrepaidInvoice] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(
    null,
  );
  const [selectedDepositId, setSelectedDepositId] = useState<string | null>(null);
  const [availableContracts, setAvailableContracts] = useState<any[]>([]);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // State cho dropdown chọn hiển thị (hợp đồng/cọc)
  const [displayMode, setDisplayMode] = useState<"active" | "inactive" | "deposit">("active");
  const [allRoomContracts, setAllRoomContracts] = useState<any[]>([]);
  const [roomDeposits, setRoomDeposits] = useState<any[]>([]);

  // State cho Liquidation Wizard
  const [showLiquidationWizard, setShowLiquidationWizard] = useState(false);

  // Form Data
  const [formData, setFormData] = useState({
    roomCode: "",
    name: "",
    floorId: "",
    roomTypeId: "",
    status: "Available",
    description: "",
    isActive: true,
  });

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = currentUser?.role || '';
  const canModify = userRole === 'owner' && !readOnly;
  // Manager và Owner đều có thể thanh lý hợp đồng
  const canLiquidate = userRole === 'manager' || userRole === 'owner';

  // --- FETCH DATA ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const [roomsRes, floorsRes, typesRes, contractsRes, depositsRes] =
        await Promise.all([
          axios.get(`${API_BASE_URL}/rooms`),
          axios.get(`${API_BASE_URL}/floors`),
          axios.get(`${API_BASE_URL}/roomtypes`),
          axios.get(`${API_BASE_URL}/contracts`),
          axios
            .get(`${API_BASE_URL}/deposits`, { withCredentials: true })
            .catch(() => ({ data: { success: false, data: [] } })),
        ]);

      setRooms(roomsRes.data.data || roomsRes.data || []);
      const floorsData = floorsRes.data.data || floorsRes.data || [];
      setFloors(floorsData);
      setRoomTypes(typesRes.data.data || typesRes.data || []);
      if (contractsRes.data.success) {
        setContracts(contractsRes.data.data || []);
      }
      if (depositsRes.data?.success) {
        setDeposits(depositsRes.data.data || []);
      }

      setExpandedFloors(floorsData.map((f: Floor) => f._id));
    } catch (error) {
      console.error("Lỗi tải dữ liệu:", error);
      toastr.error("Không thể tải dữ liệu từ máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    toastr.options = {
      closeButton: true,
      progressBar: true,
      positionClass: "toast-top-right",
      timeOut: 3000,
    };
    fetchData();
  }, []);

  const getRoomTypeDetail = (idOrObj: string | RoomType | any) => {
    if (typeof idOrObj === "object" && idOrObj !== null) {
      if (idOrObj.typeName) return idOrObj as RoomType;
      return roomTypes.find((t) => t._id === idOrObj._id);
    }
    return roomTypes.find((t) => t._id === idOrObj);
  };

  const getFloorName = (idOrObj: string | Floor) => {
    if (typeof idOrObj === "object") return idOrObj.name;
    return floors.find((f) => f._id === idOrObj)?.name || "---";
  };

  const getDepositForRoom = (roomId: string) => {
    return (
      deposits.find(
        (d: any) =>
          d.status === "Held" && (d.room?._id === roomId || d.room === roomId),
      ) || null
    );
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "---";
    return new Date(dateStr).toLocaleDateString("vi-VN");
  };

  const mappedRoomsForMap = useMemo(() => {
    return rooms.map((room: any) => {
      let priceNum = 0;
      const rType =
        typeof room.roomTypeId === "object"
          ? room.roomTypeId
          : getRoomTypeDetail(room.roomTypeId);

      if (
        rType &&
        typeof rType.currentPrice === "object" &&
        rType.currentPrice.$numberDecimal
      ) {
        priceNum = parseFloat(rType.currentPrice.$numberDecimal);
      } else if (typeof rType?.currentPrice === "number") {
        priceNum = rType.currentPrice;
      } else if (typeof room.price === "number") {
        priceNum = room.price;
      }

      return {
        ...room,
        price: priceNum,
        priceLabel:
          priceNum > 0 ? `${(priceNum / 1000000).toFixed(1)}M` : "Chưa có giá",
        floorLabel: getFloorName(room.floorId),
      };
    });
  }, [rooms, roomTypes, floors]);

  const totalFloors = floors.length;
  const totalRooms = rooms.length;
  const totalTypes = roomTypes.length;

  const toggleFloor = (floorId: string) => {
    setExpandedFloors((prev) =>
      prev.includes(floorId)
        ? prev.filter((id) => id !== floorId)
        : [...prev, floorId],
    );
  };

  const formatCurrency = (amount: any) => {
    let value = 0;
    if (amount && typeof amount === "object" && amount.$numberDecimal) {
      value = parseFloat(amount.$numberDecimal);
    } else {
      value = Number(amount);
    }
    if (isNaN(value)) return "0 ₫";

    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);
  };

  // [SỬA ĐỔI] Truyền cả object room vào để kiểm tra isActive
  const renderStatus = (room: Room) => {
    // Ưu tiên hiển thị trạng thái "Vô hiệu hóa" nếu phòng không Active
    if (!room.isActive) {
      return (
        <span className="status-badge" style={{ backgroundColor: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
          <Power size={12} /> Vô hiệu hóa
        </span>
      );
    }

    switch (room.status) {
      case "Available":
        return (
          <span className="status-badge available">
            <CheckCircle size={12} /> Trống
          </span>
        );
      case "Occupied":
        return (
          <span className="status-badge occupied">
            <AlertCircle size={12} /> Đang thuê
          </span>
        );
      case "Deposited": {
        // Phòng DB = Deposited (vd: khách B đã cọc) nhưng khách A vẫn đang ở + đã declined → hiển thị Đang thuê
        if (room.contractRenewalStatus === "declined") {
          const stillOccupied = contracts.some((c: any) => {
            const rid = c.roomId?._id || c.roomId;
            if (rid !== room._id || c.status !== "active") return false;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const started = isContractStartedByLocalCalendar(c.startDate);
            const endD = new Date(c.endDate);
            endD.setHours(0, 0, 0, 0);
            const notEnded = endD >= today;
            return started && notEnded && c.isActivated !== false;
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
      default:
        return <span>{room.status}</span>;
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/excel/template`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "Mau_Nhap_Phong.xlsx");
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toastr.success("Tải file mẫu thành công!");
    } catch (error) {
      toastr.error("Lỗi tải file mẫu.");
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = "";

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE_URL}/excel/import`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toastr.success(res.data.message || "Nhập file thành công!");
      fetchData();
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || "Lỗi khi nhập file.";
      const detailErrors = error.response?.data?.errors;

      if (detailErrors && detailErrors.length > 0) {
        toastr.error(
          `${msg}<br/>- ${detailErrors.join("<br/>- ")}`,
          "Lỗi Import",
          { timeOut: 10000, escapeHtml: false },
        );
      } else {
        toastr.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    if (floors.length === 0 || roomTypes.length === 0) {
      toastr.warning(
        "Vui lòng tạo Tầng và Loại phòng trước khi thêm phòng mới!",
      );
      return;
    }
    setIsEditing(false);
    setCurrentRoom(null);
    setFormData({
      roomCode: "",
      name: "",
      floorId: floors[0]?._id || "",
      roomTypeId: roomTypes[0]?._id || "",
      status: "Available",
      description: "",
      isActive: true,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (room: Room) => {
    setIsEditing(true);
    setCurrentRoom(room);
    setFormData({
      roomCode: room.roomCode || "",
      name: room.name,
      floorId:
        typeof room.floorId === "object" ? room.floorId._id : room.floorId,
      roomTypeId:
        typeof room.roomTypeId === "object"
          ? room.roomTypeId._id
          : room.roomTypeId,
      status: room.status,
      description: room.description || "",
      isActive: room.isActive,
    });
    setShowModal(true);
  };

  const fetchContractDetails = async (contractId: string) => {
    try {
      setLoadingDetail(true);
      setRoomBookServices([]);
      setPrepaidInvoice(null);

      const [contractRes, incurredRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/contracts/${contractId}`),
        axios
          .get(`${API_BASE_URL}/invoices/incurred?type=prepaid`)
          .catch(() => ({ data: { success: false, data: [] } })),
      ]);
      if (contractRes.data.success && contractRes.data.data?.bookServices) {
        setRoomBookServices(contractRes.data.data.bookServices);
      }
      if (incurredRes.data.success) {
        const allIncurred: any[] = incurredRes.data.data || [];
        const prepaid = allIncurred.find(
          (inv: any) =>
            inv.contractId === contractId || inv.contractId?._id === contractId,
        );
        setPrepaidInvoice(prepaid || null);
      }
    } catch (err) {
      console.error("Error fetching contract detail:", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleContractChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const contractId = e.target.value;
    setSelectedContractId(contractId);
    if (contractId) {
      fetchContractDetails(contractId);
    }
  };

  // Xử lý thay đổi dropdown chọn hợp đồng/cọc
  const handleContractSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;

    if (value.startsWith("deposit_")) {
      // Chọn cọc lẻ
      const depositId = value.replace("deposit_", "");
      setSelectedDepositId(depositId);
      setSelectedContractId(null);
      setRoomBookServices([]);
      setPrepaidInvoice(null);
    } else if (value) {
      // Chọn hợp đồng
      const contractId = value;
      setSelectedContractId(contractId);
      setSelectedDepositId(null);
      fetchContractDetails(contractId);
    } else {
      // Chưa chọn gì
      setSelectedContractId(null);
      setSelectedDepositId(null);
      setRoomBookServices([]);
      setPrepaidInvoice(null);
    }
  };

  const handleViewDetail = async (room: Room) => {
    setViewingRoom(room);
    setShowDetailModal(true);
    setRoomBookServices([]);
    setPrepaidInvoice(null);
    setSelectedContractId(null);
    setSelectedDepositId(null);

    // Lấy TẤT CẢ hợp đồng của phòng (active + inactive + pending)
    const roomContracts = contracts.filter(
      (c: any) =>
        (c.roomId?._id === room._id || c.roomId === room._id),
    );

    // Lấy TẤT CẢ cọc của phòng (cọc đang giữ + cọc lẻ chưa gắn HĐ)
    const roomDeposits = deposits.filter(
      (d: any) =>
        d.status === "Held" && (d.room?._id === room._id || d.room === room._id),
    );

    setAllRoomContracts(roomContracts);
    setRoomDeposits(roomDeposits);

    // Lấy danh sách hợp đồng active trước, nếu không có thì lấy inactive
    const activeContracts = roomContracts.filter(c => c.status === "active");
    const inactiveContracts = roomContracts.filter(c => c.status !== "active");
    const hasContracts = roomContracts.length > 0;
    const hasDepositOnly = roomDeposits.length > 0 && !hasContracts;

    if (hasContracts) {
      // Ưu tiên hợp đồng active, nếu không có thì lấy inactive
      const defaultContract = activeContracts.length > 0 ? activeContracts[0] : inactiveContracts[0];
      setAvailableContracts(roomContracts);
      setSelectedContractId(defaultContract._id);
      setSelectedDepositId(null);
      await fetchContractDetails(defaultContract._id);
    } else if (hasDepositOnly) {
      // Không có hợp đồng, chỉ có cọc lẻ - hiện cọc đầu tiên
      setAvailableContracts([]);
      setSelectedContractId(null);
      setSelectedDepositId(roomDeposits[0]._id);
    } else {
      // Không có gì
      setAvailableContracts([]);
      setSelectedContractId(null);
      setSelectedDepositId(null);
    }
  };

  const handleToggleActive = (room: Room) => {
    const action = room.isActive ? "vô hiệu hóa" : "kích hoạt";
    setConfirmModal({
      isOpen: true,
      action: "TOGGLE_ACTIVE",
      targetRoom: room,
      message: `Bạn có chắc muốn ${action} phòng ${room.name} không?`,
    });
  };

  const handleDelete = (room: Room) => {
    setConfirmModal({
      isOpen: true,
      action: "DELETE",
      targetRoom: room,
      message: `Bạn có chắc chắn muốn xóa phòng ${room.name}? Hành động này không thể hoàn tác.`,
    });
  };

  const executeConfirmAction = async () => {
    if (!confirmModal.targetRoom) return;
    const room = confirmModal.targetRoom;

    if (confirmModal.action === "TOGGLE_ACTIVE") {
      try {
        const actionText = room.isActive ? "vô hiệu hóa" : "kích hoạt";
        await axios.put(`${API_BASE_URL}/rooms/${room._id}`, {
          isActive: !room.isActive,
        });
        toastr.success(`Đã ${actionText} phòng ${room.name} thành công!`);
        fetchData();
      } catch (error: any) {
        toastr.error("Lỗi cập nhật trạng thái: " + error.message);
      }
    } else if (confirmModal.action === "DELETE") {
      try {
        await axios.delete(`${API_BASE_URL}/rooms/${room._id}`);
        toastr.success("Xóa phòng thành công!");
        fetchData();
      } catch (e: any) {
        toastr.error(
          "Lỗi xóa phòng: " + (e.response?.data?.message || e.message),
        );
      }
    }

    // Đóng modal sau khi xử lý xong
    setConfirmModal({
      isOpen: false,
      action: null,
      targetRoom: null,
      message: "",
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && currentRoom) {
        await axios.put(`${API_BASE_URL}/rooms/${currentRoom._id}`, formData);
        toastr.success("Cập nhật thông tin phòng thành công!");
      } else {
        await axios.post(`${API_BASE_URL}/rooms`, formData);
        toastr.success("Thêm phòng mới thành công!");
      }
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      toastr.error(
        "Lỗi lưu dữ liệu: " + (error.response?.data?.message || error.message),
      );
    }
  };

  return (
    <div className="room-container">
      <div className="page-header">
        <div className="room-title-row" style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          <div className="room-title-icon" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            width: '48px', 
            height: '48px', 
            borderRadius: '12px', 
            background: 'linear-gradient(135deg, #3579c6 0%, #2a5fa3 100%)',
            color: '#ffffff',
            flexShrink: 0,
            boxShadow: '0 4px 14px rgba(53, 121, 198, 0.3)'
          }} aria-hidden>
            <DoorOpen size={22} strokeWidth={2} />
          </div>
          <div className="room-title-text">
            <h2>
              {!canModify ? "Danh sách phòng" : "Quản lý danh sách phòng"}
            </h2>
            <p className="page-subtitle">
              {!canModify
                ? "Xem thông tin phòng theo tầng"
                : "Nhóm theo tầng - Xem dạng bảng"}
            </p>
          </div>
        </div>

        <div className="stats-summary">
          <div className="stat-item">
            <Building size={16} className="stat-icon icon-primary" />
            <div className="stat-text">
              <span className="stat-value">{totalFloors}</span>
              <span className="stat-label">Tầng</span>
            </div>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <Home size={16} className="stat-icon icon-accent" />
            <div className="stat-text">
              <span className="stat-value">{totalRooms}</span>
              <span className="stat-label">Phòng</span>
            </div>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <Tag size={16} className="stat-icon icon-success" />
            <div className="stat-text">
              <span className="stat-value">{totalTypes}</span>
              <span className="stat-label">Loại phòng</span>
            </div>
          </div>
        </div>
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
        </div>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {canModify && (
            <>
              <button className="btn-secondary" onClick={handleDownloadTemplate}>
                <Download size={18} /> Tải mẫu Excel
              </button>

              <button className="btn-success" onClick={triggerFileInput}>
                <FileSpreadsheet size={18} /> Nhập Excel
              </button>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
              />

              <button className="btn-primary" onClick={handleOpenAdd}>
                <Plus size={18} /> Thêm phòng mới
              </button>
            </>
          )}
        </div>
      </div>

      {viewMode === "list" ? (
        <div className="floor-list-container">
          {floors.length === 0 && !loading && (
            <div className="empty-floor">Chưa có dữ liệu tầng.</div>
          )}

          {floors.map((floor) => {
            const floorRooms = rooms.filter((r) => {
              const fId =
                typeof r.floorId === "object" ? r.floorId._id : r.floorId;
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
                            <th style={{ width: "100px" }}>Mã phòng</th>
                            <th style={{ width: "150px" }}>Tên phòng</th>
                            <th style={{ width: "150px" }}>Loại phòng</th>
                            <th style={{ width: "120px" }}>Giá niêm yết</th>
                            <th style={{ width: "120px" }}>Trạng thái</th>
                            <th>Mô tả</th>
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
                            const typeDetail = getRoomTypeDetail(
                              room.roomTypeId,
                            );

                            return (
                              // [SỬA ĐỔI] Xóa bỏ style={{ opacity: rowOpacity }} để không làm mờ hàng nữa
                              <tr key={room._id}>
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

                                <td>
                                  {typeDetail ? (
                                    typeDetail.typeName
                                  ) : (
                                    <span style={{ color: "red" }}>Lỗi</span>
                                  )}
                                </td>

                                <td className="text-price">
                                  {typeDetail
                                    ? formatCurrency(typeDetail.currentPrice)
                                    : "---"}
                                </td>

                                {/* [SỬA ĐỔI] Gọi hàm renderStatus truyền cả room vào */}
                                <td>{renderStatus(room)}</td>

                                <td className="text-desc">
                                  {room.description || (
                                    <span className="text-muted-italic">
                                      Không có mô tả
                                    </span>
                                  )}
                                </td>

                                <td>
                                  <div className="action-group">
                                    {canModify && (
                                      <button
                                        className={`btn-icon-sm power ${room.isActive ? "active" : "inactive"}`}
                                        onClick={() => handleToggleActive(room)}
                                        title={
                                          room.isActive
                                            ? "Vô hiệu hóa"
                                            : "Kích hoạt lại"
                                        }
                                      >
                                        <Power size={16} />
                                      </button>
                                    )}

                                    <button
                                      className="btn-icon-sm view"
                                      onClick={() => handleViewDetail(room)}
                                      title="Chi tiết"
                                    >
                                      <Eye size={16} />
                                    </button>

                                    {canModify && (
                                      <>
                                        <button
                                          className="btn-icon-sm edit"
                                          onClick={() => handleOpenEdit(room)}
                                          title="Sửa"
                                        >
                                          <Edit size={16} />
                                        </button>
                                        <button
                                          className="btn-icon-sm delete"
                                          onClick={() => handleDelete(room)}
                                          title="Xóa"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
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
          <div className="room-floor-pills">
            {floors.map((floor, idx) => (
              <button
                key={floor._id || idx}
                className={`floor-pill${activeMapFloor === idx ? " active" : ""}`}
                onClick={() => setActiveMapFloor(idx)}
              >
                <BuildingIcon size={14} />
                {floor.name}
              </button>
            ))}
          </div>

          <div
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              overflow: "hidden",
              minHeight: "400px",
              background: "#fff",
            }}
          >
            {floors.map((floor, idx) => {
              if (activeMapFloor !== idx) return null;

              const floorRooms = mappedRoomsForMap.filter((r) => {
                const fId =
                  typeof r.floorId === "object" ? r.floorId?._id : r.floorId;
                return fId === floor._id;
              });

              const floorNameLower = floor.name.toLowerCase();

              if (floorNameLower.includes("2")) {
                return (
                  <FloorMapLevel2
                    key={floor._id}
                    rooms={floorRooms}
                    onRoomSelect={(room) =>
                      readOnly
                        ? handleViewDetail(room as any)
                        : handleOpenEdit(room as any)
                    }
                  />
                );
              } else if (floorNameLower.includes("3")) {
                return (
                  <FloorMapLevel3
                    key={floor._id}
                    rooms={floorRooms}
                    onRoomSelect={(room) =>
                      readOnly
                        ? handleViewDetail(room as any)
                        : handleOpenEdit(room as any)
                    }
                  />
                );
              } else if (floorNameLower.includes("4")) {
                return (
                  <FloorMapLevel4
                    key={floor._id}
                    rooms={floorRooms}
                    onRoomSelect={(room) =>
                      readOnly
                        ? handleViewDetail(room as any)
                        : handleOpenEdit(room as any)
                    }
                  />
                );
              } else if (floorNameLower.includes("5")) {
                return (
                  <FloorMapLevel5
                    key={floor._id}
                    rooms={floorRooms}
                    onRoomSelect={(room) =>
                      readOnly
                        ? handleViewDetail(room as any)
                        : handleOpenEdit(room as any)
                    }
                  />
                );
              }

              return (
                <FloorMap
                  key={floor._id}
                  floorName={floor.name}
                  rooms={floorRooms}
                  onRoomSelect={(room) =>
                    readOnly
                      ? handleViewDetail(room as any)
                      : handleOpenEdit(room as any)
                  }
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Xác Nhận Xóa/Kích hoạt */}
      {confirmModal.isOpen && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div
            className="modal-content"
            style={{ width: "400px", textAlign: "center", padding: "24px" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  background:
                    confirmModal.action === "DELETE" ? "#fee2e2" : "#fef3c7",
                  padding: "12px",
                  borderRadius: "50%",
                }}
              >
                <AlertCircle
                  size={32}
                  color={
                    confirmModal.action === "DELETE" ? "#ef4444" : "#d97706"
                  }
                />
              </div>
            </div>
            <h3 style={{ marginTop: 0, color: "#1e293b", fontSize: "18px" }}>
              Xác nhận thao tác
            </h3>
            <p
              style={{
                color: "#475569",
                margin: "16px 0 24px 0",
                lineHeight: "1.5",
              }}
            >
              {confirmModal.message}
            </p>
            <div
              style={{ display: "flex", justifyContent: "center", gap: "12px" }}
            >
              <button
                className="btn-secondary"
                onClick={() =>
                  setConfirmModal({
                    isOpen: false,
                    action: null,
                    targetRoom: null,
                    message: "",
                  })
                }
              >
                Hủy bỏ
              </button>
              <button
                style={{
                  padding: "8px 24px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: 600,
                  border: "none",
                  background:
                    confirmModal.action === "DELETE" ? "#ef4444" : "#3b82f6",
                  color: "white",
                }}
                onClick={executeConfirmAction}
                disabled={loading}
              >
                {loading ? "Đang xử lý..." : "Đồng ý"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Thêm/Sửa Phòng */}
      <AppModal
        open={Boolean(canModify && showModal)}
        onClose={() => setShowModal(false)}
        title={isEditing ? "Cập nhật Phòng" : "Thêm Phòng Mới"}
        icon={isEditing ? <Edit size={18} /> : <Plus size={18} />}
        color="blue"
        size="lg"
        headerClassName="mr-app-modal-header"
        footer={
          <>
            <button
              type="button"
              className="ms-btn ms-btn--ghost"
              onClick={() => setShowModal(false)}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              form="mr-room-form"
              className="ms-btn ms-btn--primary"
            >
              {isEditing ? <CheckCircle size={16} /> : <Plus size={16} />}
              {isEditing ? "Cập nhật" : "Thêm phòng"}
            </button>
          </>
        }
      >
        <form id="mr-room-form" onSubmit={handleSave}>
          <div className="room-form-grid">
            <div className="room-form-field">
              <label className="room-form-label">
                <span className="room-form-label-icon"><CreditCard size={14} /></span>
                Mã phòng <span className="required">*</span>
              </label>
              <div className="room-form-input-wrap">
                <input
                  type="text"
                  className="room-form-input"
                  value={formData.roomCode}
                  onChange={(e) =>
                    setFormData({ ...formData, roomCode: e.target.value })
                  }
                  required
                  placeholder="VD: R101"
                />
              </div>
            </div>

            <div className="room-form-field">
              <label className="room-form-label">
                <span className="room-form-label-icon"><Home size={14} /></span>
                Tên hiển thị <span className="required">*</span>
              </label>
              <div className="room-form-input-wrap">
                <input
                  type="text"
                  className="room-form-input"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  placeholder="VD: Phòng 101"
                />
              </div>
            </div>

            <div className="room-form-field">
              <label className="room-form-label">
                <span className="room-form-label-icon"><Building size={14} /></span>
                Tầng
              </label>
              <div className="room-form-select-wrap">
                <select
                  className="room-form-select"
                  value={formData.floorId}
                  onChange={(e) =>
                    setFormData({ ...formData, floorId: e.target.value })
                  }
                >
                  {floors.map((f) => (
                    <option key={f._id} value={f._id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="room-form-field">
              <label className="room-form-label">
                <span className="room-form-label-icon"><Tag size={14} /></span>
                Loại phòng
              </label>
              <div className="room-form-select-wrap">
                <select
                  className="room-form-select"
                  value={formData.roomTypeId}
                  onChange={(e) =>
                    setFormData({ ...formData, roomTypeId: e.target.value })
                  }
                >
                  {roomTypes.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.typeName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {isEditing && (
              <div className="room-form-field room-form-field--full">
                <div className="room-form-toggle">
                  <div className="room-form-toggle-info">
                    <span className="room-form-toggle-title">Trạng thái hoạt động</span>
                    <span className="room-form-toggle-desc">
                      Phòng sẽ {formData.isActive ? "hiển thị và có thể sử dụng" : "bị vô hiệu hóa"}
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formData.isActive}
                    className={`room-form-toggle-switch ${formData.isActive ? "active" : ""}`}
                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                  >
                    <span className="room-form-toggle-thumb" />
                  </button>
                </div>
              </div>
            )}

            <div className="room-form-field room-form-field--full">
              <label className="room-form-label">
                <span className="room-form-label-icon"><FileText size={14} /></span>
                Mô tả
              </label>
              <div className="room-form-textarea-wrap">
                <textarea
                  className="room-form-textarea"
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Nhập mô tả ngắn gọn về phòng..."
                />
              </div>
            </div>
          </div>
        </form>
      </AppModal>

      {/* Modal Xem Chi Tiết Phòng */}
      {showDetailModal &&
        viewingRoom &&
        (() => {
          const roomContract =
            availableContracts.find((c) => c._id === selectedContractId) ||
            null;
          return (
            <AppModal
              open={showDetailModal && Boolean(viewingRoom)}
              onClose={() => setShowDetailModal(false)}
              title={`Chi tiết Phòng: ${viewingRoom.name}`}
              icon={<Eye size={18} />}
              color="blue"
              size="xl"
              headerClassName="mr-app-modal-header mr-app-modal-header--detail"
              footer={
                <>
                  <button
                    type="button"
                    className="ms-btn ms-btn--ghost"
                    onClick={() => {
                      setShowDetailModal(false);
                      setDisplayMode("active");
                      setAllRoomContracts([]);
                      setRoomDeposits([]);
                    }}
                  >
                    Đóng
                  </button>

                  {canModify && (
                    <button
                      type="button"
                      className="ms-btn ms-btn--primary"
                      onClick={() => {
                        setShowDetailModal(false);
                        handleOpenEdit(viewingRoom);
                      }}
                    >
                      <CheckCircle size={16} /> Chỉnh sửa
                    </button>
                  )}

                  {/* Nút Thanh lý — hiện cho cả manager và owner khi hợp đồng đang active */}
                  {canLiquidate && selectedContractId && (() => {
                    const selContract = availableContracts.find(
                      (c: any) => c._id === selectedContractId
                    );
                    if (selContract?.status === "active") {
                      return (
                        <button
                          type="button"
                          className="ms-btn ms-btn--danger"
                          onClick={() => setShowLiquidationWizard(true)}
                        >
                          <Gavel size={16} /> Thanh lý HĐ
                        </button>
                      );
                    }
                    return null;
                  })()}
                </>
              }
            >

                {/* Dropdown chọn hợp đồng */}
                {(() => {
                  const activeContracts = allRoomContracts.filter(c => c.status === "active");
                  const inactiveContracts = allRoomContracts.filter(c => c.status !== "active");
                  const depositCount = roomDeposits.length;
                  const totalContracts = activeContracts.length + inactiveContracts.length;
                  const hasAnyContract = totalContracts > 0;

                  // Lọc cọc lẻ: cọc KHÔNG gắn với bất kỳ hợp đồng nào trong danh sách
                  // Lấy tất cả depositId từ các hợp đồng
                  const depositIdsFromContracts: string[] = [];
                  allRoomContracts.forEach((contract: any) => {
                    if (contract.depositId) {
                      const did = typeof contract.depositId === "object"
                        ? contract.depositId._id
                        : contract.depositId;
                      if (did) depositIdsFromContracts.push(did);
                    }
                    // Cũng kiểm tra trường deposit
                    if (contract.deposit) {
                      const did = typeof contract.deposit === "object"
                        ? contract.deposit._id
                        : contract.deposit;
                      if (did && !depositIdsFromContracts.includes(did)) {
                        depositIdsFromContracts.push(did);
                      }
                    }
                  });

                  // Cọc lẻ = cọc không nằm trong danh sách depositId từ hợp đồng VÀ không có contractId
                  const depositLeList = roomDeposits.filter((d: any) => {
                    // Không có contractId = cọc lẻ
                    if (!d.contractId) return true;
                    // Hoặc contractId không nằm trong danh sách hợp đồng
                    const cid = typeof d.contractId === "object" ? d.contractId._id : d.contractId;
                    const contractExists = allRoomContracts.some((c: any) => c._id === cid);
                    return !contractExists;
                  });

                  // Chỉ hiện dropdown nếu có dữ liệu
                  const hasAnyData = totalContracts > 0 || depositLeList.length > 0;

                  return hasAnyData ? (
                    <div className="rd-display-selector">
                      <label className="rd-display-label">
                        <FileText size={14} />
                        Chọn hợp đồng:
                      </label>
                      <select
                        value={selectedContractId ? selectedContractId : (selectedDepositId ? `deposit_${selectedDepositId}` : "")}
                        onChange={handleContractSelectChange}
                        className="rd-display-select"
                      >
                        {activeContracts.length > 0 && (
                          <optgroup label="Hợp đồng đang hiệu lực">
                            {activeContracts.map((contract: any) => (
                              <option key={contract._id} value={contract._id}>
                                {contract.contractCode} - {contract.tenantId?.username || "---"} ({formatDate(contract.startDate)} → {formatDate(contract.endDate)})
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {inactiveContracts.length > 0 && (
                          <optgroup label="Hợp đồng chưa/không còn hiệu lực">
                            {inactiveContracts.map((contract: any) => (
                              <option key={contract._id} value={contract._id}>
                                {contract.contractCode} - {contract.tenantId?.username || "---"} ({formatDate(contract.startDate)} → {formatDate(contract.endDate)})
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {/* Hiện cọc lẻ (chưa gắn hợp đồng) */}
                        {depositLeList.length > 0 && (
                          <optgroup label="Cọc lẻ chưa có hợp đồng">
                            {depositLeList.map((deposit: any, idx: number) => {
                              const depositIdx = roomDeposits.findIndex((d: any) => d._id === deposit._id);
                              return (
                                <option key={deposit._id} value={`deposit_${deposit._id}`}>
                                  Cọc #{depositIdx + 1} - {deposit.name || "---"} ({formatCurrency(deposit.amount)})
                                </option>
                              );
                            })}
                          </optgroup>
                        )}
                      </select>
                      <span className="rd-display-hint">
                        {hasAnyContract
                          ? `Có ${totalContracts} hợp đồng (${activeContracts.length} đang hiệu lực, ${inactiveContracts.length} không hiệu lực)${depositLeList.length > 0 ? `, ${depositLeList.length} cọc lẻ` : ""}`
                          : `Có ${depositLeList.length} cọc lẻ chưa có hợp đồng`
                        }
                      </span>
                    </div>
                  ) : (
                    <div className="rd-no-data-notice">
                      Phòng này hiện chưa có hợp đồng hay cọc lẻ nào.
                    </div>
                  );
                })()}

                <div className="rd-two-panel">
                  {/* === CỘT TRÁI: Thông tin phòng + Hợp đồng === */}
                  <div className="rd-panel">
                    <div className="rd-section-title">
                      <Home size={16} />
                      <span>Thông tin Phòng</span>
                    </div>
                    <div className="rd-grid">
                      <div className="rd-field">
                        <label>Mã phòng:</label>
                        <span>{viewingRoom.roomCode || "---"}</span>
                      </div>

                      {/* [SỬA ĐỔI] Gọi hàm renderStatus truyền cả object viewingRoom vào */}
                      <div className="rd-field">
                        <label>Trạng thái:</label>
                        <span>{renderStatus(viewingRoom)}</span>
                      </div>

                      <div className="rd-field">
                        <label>Kích hoạt:</label>
                        <span
                          style={{
                            color: viewingRoom.isActive ? "green" : "red",
                            fontWeight: 600,
                          }}
                        >
                          {viewingRoom.isActive
                            ? "Đang hoạt động"
                            : "Vô hiệu hóa"}
                        </span>
                      </div>
                      <div className="rd-field">
                        <label>Thuộc Tầng:</label>
                        <span>{getFloorName(viewingRoom.floorId)}</span>
                      </div>
                      <div className="rd-field">
                        <label>Loại phòng:</label>
                        <span>
                          {getRoomTypeDetail(viewingRoom.roomTypeId)
                            ?.typeName || "---"}
                        </span>
                      </div>
                      <div className="rd-field">
                        <label>Giá niêm yết:</label>
                        <span className="text-price">
                          {getRoomTypeDetail(viewingRoom.roomTypeId)
                            ? formatCurrency(
                              getRoomTypeDetail(viewingRoom.roomTypeId)!
                                .currentPrice,
                            )
                            : "---"}
                        </span>
                      </div>
                    </div>

                    {(() => {
                      // Xác định cọc được hiển thị
                      let roomDeposit: any = null;
                      let isDepositLe = false; // Cờ đánh dấu cọc lẻ

                      if (selectedDepositId) {
                        // Chọn cọc lẻ từ dropdown
                        roomDeposit = roomDeposits.find((d: any) => d._id === selectedDepositId);
                        isDepositLe = true;
                      } else if (roomContract?.depositId) {
                        // Hợp đồng có cọc - lấy cọc từ hợp đồng
                        roomDeposit = typeof roomContract.depositId === "object"
                          ? roomContract.depositId
                          : roomDeposits.find((d: any) => d._id === roomContract.depositId);
                      } else if (selectedContractId) {
                        // Có hợp đồng nhưng không có cọc cụ thể - thử lấy cọc mặc định
                        roomDeposit = getDepositForRoom(viewingRoom._id);
                      }

                      if (!roomDeposit) return null;
                      return (
                        <>
                          <div
                            className="rd-section-title"
                            style={{ marginTop: 16 }}
                          >
                            <Banknote size={16} />
                            <span>Thông tin Tiền cọc{isDepositLe ? " (Cọc lẻ)" : ""}</span>
                          </div>
                          <div className="rd-grid">
                            <div className="rd-field full">
                              <label>Người cọc:</label>
                              <span style={{ fontWeight: 600 }}>
                                {roomDeposit.name || "---"}
                              </span>
                            </div>
                            <div className="rd-field">
                              <label>SĐT:</label>
                              <span>{roomDeposit.phone || "---"}</span>
                            </div>
                            <div className="rd-field">
                              <label>Ngày cọc:</label>
                              <span>
                                {roomDeposit.createdAt
                                  ? formatDate(roomDeposit.createdAt)
                                  : "---"}
                              </span>
                            </div>
                            <div className="rd-field">
                              <label>Đã thu cọc:</label>
                              <span className="text-price">
                                {formatCurrency(roomDeposit.amount)}
                              </span>
                            </div>
                            <div className="rd-field">
                              <label>Trạng thái:</label>
                              <span className="status-badge deposited">
                                <Banknote size={12} />
                                {roomDeposit.status === "Held"
                                  ? "Đang giữ"
                                  : roomDeposit.status}
                              </span>
                            </div>
                          </div>
                        </>
                      );
                    })()}

                    {roomContract && (
                      <>
                        <div
                          className="rd-section-title"
                          style={{ marginTop: 16 }}
                        >
                          <FileText size={16} />
                          <span>Hợp đồng</span>
                        </div>
                        <div className="rd-grid">
                          <div className="rd-field">
                            <label>Mã HĐ:</label>
                            <span
                              style={{
                                fontFamily: "monospace",
                                fontWeight: 600,
                              }}
                            >
                              {roomContract.contractCode}
                            </span>
                          </div>
                          <div className="rd-field">
                            <label>Trạng thái:</label>
                            <span
                              className={`rd-contract-status rd-status-${roomContract.status}`}
                            >
                              {roomContract.status === "active"
                                ? "Đang hiệu lực"
                                : roomContract.status === "Pending"
                                  ? "Sắp tới"
                                  : roomContract.status === "terminated"
                                    ? "Đã chấm dứt"
                                    : roomContract.status === "expired"
                                      ? "Hết hạn"
                                      : roomContract.status}
                            </span>
                          </div>
                          <div className="rd-field">
                            <label>Thời hạn:</label>
                            <span>{roomContract.duration} tháng</span>
                          </div>
                          <div className="rd-field">
                            <label>Bắt đầu:</label>
                            <span>{formatDate(roomContract.startDate)}</span>
                          </div>
                          <div className="rd-field">
                            <label>Kết thúc:</label>
                            <span>{formatDate(roomContract.endDate)}</span>
                          </div>
                        </div>

                        {/* THÔNG TIN TRẢ TRƯỚC */}
                        {prepaidInvoice && (
                          <>
                            <div
                              className="rd-section-title"
                              style={{ marginTop: 16 }}
                            >
                              <CreditCard size={16} />
                              <span>Tiền phòng trả trước</span>
                            </div>
                            <div className="rd-grid">
                              <div className="rd-field">
                                <label>Số tháng trả trước:</label>
                                <span style={{ fontWeight: 700 }}>
                                  {prepaidInvoice.title?.match(
                                    /(\d+)\s*tháng/,
                                  )?.[1] || "---"}{" "}
                                  tháng
                                </span>
                              </div>
                              <div className="rd-field">
                                <label>Số tiền đã nộp:</label>
                                <span className="text-price">
                                  {formatCurrency(prepaidInvoice.totalAmount)}
                                </span>
                              </div>
                              {roomContract.startDate &&
                                roomContract.rentPaidUntil && (
                                  <div className="rd-field full">
                                    <label>Thời gian đã trả:</label>
                                    <span
                                      style={{
                                        fontWeight: 600,
                                        color: "#2563eb",
                                      }}
                                    >
                                      {formatDate(roomContract.startDate)} →{" "}
                                      {formatDate(roomContract.rentPaidUntil)}
                                    </span>
                                  </div>
                                )}
                            </div>
                          </>
                        )}
                      </>
                    )}

                  </div>

                  {/* === CỘT PHẢI: Người thuê + Dịch vụ === */}
                  <div className="rd-panel">
                    {roomContract ? (
                      <>
                        <div className="rd-section-title">
                          <User size={16} />
                          <span>Người thuê chính</span>
                        </div>
                        <div className="rd-grid">
                          <div className="rd-field full">
                            <label>
                              <User size={12} style={{ marginRight: 4 }} />
                              Họ tên:
                            </label>
                            <span>
                              {roomContract.tenantId?.username || "---"}
                            </span>
                          </div>
                          <div className="rd-field">
                            <label>
                              <Phone size={12} style={{ marginRight: 4 }} />
                              SĐT:
                            </label>
                            <span>
                              {roomContract.tenantId?.phoneNumber || "---"}
                            </span>
                          </div>
                          <div className="rd-field">
                            <label>
                              <Mail size={12} style={{ marginRight: 4 }} />
                              Email:
                            </label>
                            <span
                              style={{ fontSize: 12, wordBreak: "break-all" }}
                            >
                              {roomContract.tenantId?.email || "---"}
                            </span>
                          </div>
                        </div>

                        {/* Người ở cùng */}
                        {roomContract.coResidents &&
                          roomContract.coResidents.length > 0 && (
                            <>
                              <div
                                className="rd-section-title"
                                style={{ marginTop: 16 }}
                              >
                                <Users size={16} />
                                <span>
                                  Người ở cùng (
                                  {roomContract.coResidents.length})
                                </span>
                              </div>
                              <div className="rd-co-residents-list">
                                {roomContract.coResidents.map(
                                  (person: any, idx: number) => (
                                    <div
                                      key={idx}
                                      className="rd-co-resident-card"
                                    >
                                      <span className="rd-co-resident-name">
                                        {person.fullName}
                                      </span>
                                      <div className="rd-co-resident-row">
                                        {person.phone && (
                                          <span className="rd-co-resident-info">
                                            <Phone size={11} /> {person.phone}
                                          </span>
                                        )}
                                        {person.cccd && (
                                          <span className="rd-co-resident-info">
                                            <CreditCard size={11} />{" "}
                                            {person.cccd}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ),
                                )}
                              </div>
                            </>
                          )}

                        {/* Dịch vụ đã đăng ký */}
                        <div
                          className="rd-section-title"
                          style={{ marginTop: 16 }}
                        >
                          <Zap size={16} />
                          <span>Dịch vụ tùy chọn đã đăng ký</span>
                        </div>
                        {loadingDetail ? (
                          <p style={{ color: "#94a3b8", fontSize: 13 }}>
                            Đang tải...
                          </p>
                        ) : roomBookServices.length > 0 ? (
                          <div className="rd-services-list">
                            {roomBookServices.map((svc: any, idx: number) => (
                              <div key={idx} className="rd-service-tag">
                                <span className="rd-service-tag-name">
                                  {svc.name}
                                </span>
                                <span className="rd-service-tag-price">
                                  {svc.currentPrice
                                    ? formatCurrency(svc.currentPrice)
                                    : ""}
                                  {svc.quantity > 1 ? ` ×${svc.quantity}` : ""}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p
                            className="text-muted-italic"
                            style={{ fontSize: 13 }}
                          >
                            Chưa đăng ký dịch vụ nào
                          </p>
                        )}

                        {/* Ảnh hợp đồng bản cứng */}
                        {roomContract?.images && roomContract.images.length > 0 && (
                          <>
                            <div
                              className="rd-section-title"
                              style={{ marginTop: 16 }}
                            >
                              <FileText size={16} />
                              <span>Ảnh hợp đồng bản cứng ({roomContract.images.length})</span>
                            </div>
                            <div className="rd-images-grid">
                              {roomContract.images.map((url: string, idx: number) => (
                                <div
                                  key={idx}
                                  className="rd-image-item"
                                  onClick={() => setLightboxImage(url)}
                                >
                                  <img src={url} alt={`Hợp đồng ${idx + 1}`} />
                                  <span className="rd-image-label">Ảnh {idx + 1}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <div className="rd-empty-contract">
                        <FileText size={20} style={{ color: "#94a3b8" }} />
                        <span>Phòng hiện chưa có hợp đồng</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Lightbox xem ảnh phóng to */}
                {lightboxImage && (
                  <div className="rd-lightbox" onClick={() => setLightboxImage(null)}>
                    <button
                      className="rd-lightbox-close"
                      onClick={() => setLightboxImage(null)}
                    >
                      <X size={24} />
                    </button>
                    <img
                      src={lightboxImage}
                      alt="Ảnh phóng to"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}
            </AppModal>
          );
        })()}

      {/* ── Liquidation Wizard ── */}
      {showLiquidationWizard && selectedContractId && (() => {
        const selContract = availableContracts.find(
          (c: any) => c._id === selectedContractId
        );
        if (!selContract) return null;

        // Lấy giá phòng từ roomType
        let roomPriceNum = 0;
        if (viewingRoom) {
          const rType = getRoomTypeDetail(viewingRoom.roomTypeId);
          if (rType) {
            const cp = (rType as any).currentPrice;
            roomPriceNum = typeof cp === "object" && cp?.$numberDecimal
              ? parseFloat(cp.$numberDecimal)
              : Number(cp) || 0;
          }
        }

        // Lấy số tiền cọc
        let depositAmt = 0;
        if (selContract.depositId) {
          const dep = typeof selContract.depositId === "object"
            ? selContract.depositId
            : roomDeposits.find((d: any) => d._id === selContract.depositId);
          depositAmt = dep?.amount ? Number(dep.amount) : 0;
        }

        return (
          <LiquidationWizard
            contract={selContract}
            roomPrice={roomPriceNum}
            depositAmount={depositAmt}
            onClose={() => setShowLiquidationWizard(false)}
            onSuccess={() => {
              setShowLiquidationWizard(false);
              setShowDetailModal(false);
              setAllRoomContracts([]);
              setRoomDeposits([]);
              toastr.success("Thanh lý hợp đồng thành công! Phòng đã được giải phóng.");
              fetchData();
            }}
          />
        );
      })()}
    </div>
  );
};

export default ManageRoom;

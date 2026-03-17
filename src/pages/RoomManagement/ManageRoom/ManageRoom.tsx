import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import { Building as BuildingIcon } from "lucide-react";

// [MỚI] Import toastr và CSS của toastr
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
  Plus,
  Edit,
  Trash2,
  Eye,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Banknote,
  X,
  Building,
  Home,
  Tag,
  Power,
  Download,
  FileSpreadsheet,
  List as ListIcon,
  Map as MapIcon,
  User,
  Users,
  Calendar,
  FileText,
  Phone,
  Mail,
  CreditCard,
  Zap,
} from "lucide-react";
import "./ManageRoom.css";

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
}

// Props interface để phân quyền
interface ManageRoomProps {
  readOnly?: boolean; // true = chỉ xem (Manager), false = full quyền (Owner)
}

const ManageRoom: React.FC<ManageRoomProps> = ({ readOnly = false }) => {
  // --- States ---
  const [rooms, setRooms] = useState<Room[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(false);
  const [contracts, setContracts] = useState<any[]>([]);

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

  const [isEditing, setIsEditing] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [viewingRoom, setViewingRoom] = useState<Room | null>(null);
  const [roomBookServices, setRoomBookServices] = useState<any[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

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

  // --- FETCH DATA ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const [roomsRes, floorsRes, typesRes, contractsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/rooms`),
        axios.get(`${API_BASE_URL}/floors`),
        axios.get(`${API_BASE_URL}/roomtypes`),
        axios.get(`${API_BASE_URL}/contracts`),
      ]);

      setRooms(roomsRes.data.data || roomsRes.data || []);
      const floorsData = floorsRes.data.data || floorsRes.data || [];
      setFloors(floorsData);
      setRoomTypes(typesRes.data.data || typesRes.data || []);
      if (contractsRes.data.success) {
        setContracts(contractsRes.data.data || []);
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
    // [MỚI] Cấu hình toastr khi component mount
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

  // Get active contract for a room
  const getContractForRoom = (roomId: string) => {
    return (
      contracts.find(
        (c: any) => c.status === "active" && c.roomId?._id === roomId,
      ) || null
    );
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "---";
    return new Date(dateStr).toLocaleDateString("vi-VN");
  };

  // Prepare rooms for map view with parsed prices to avoid NaNk
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

  // --- TÍNH TOÁN THỐNG KÊ ---
  const totalFloors = floors.length;
  const totalRooms = rooms.length;
  const totalTypes = roomTypes.length;

  // --- HANDLERS ---
  const toggleFloor = (floorId: string) => {
    setExpandedFloors((prev) =>
      prev.includes(floorId)
        ? prev.filter((id) => id !== floorId)
        : [...prev, floorId],
    );
  };

  const formatCurrency = (amount: any) => {
    let value = 0;

    // Kiểm tra nếu dữ liệu là object Decimal128 của MongoDB
    if (amount && typeof amount === "object" && amount.$numberDecimal) {
      value = parseFloat(amount.$numberDecimal);
    }
    // Nếu là số hoặc chuỗi số bình thường
    else {
      value = Number(amount);
    }

    // Nếu vẫn không phải số thì trả về 0đ
    if (isNaN(value)) return "0 ₫";

    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);
  };

  const renderStatus = (status: string) => {
    switch (status) {
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
      case "Deposited":
        return (
          <span className="status-badge deposited">
            <Banknote size={12} /> Đã cọc
          </span>
        );
      case "Deposited":
        return (
          <span className="status-badge deposited">
            <AlertCircle size={12} /> Đã Cọc
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  // --- HANDLERS EXCEL ---

  // 1. Tải mẫu Excel
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

  // 2. Kích hoạt input file
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // 3. Upload file Excel
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset value để cho phép chọn lại file cũ
    e.target.value = "";

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE_URL}/excel/import`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toastr.success(res.data.message || "Nhập file thành công!");
      fetchData(); // Load lại dữ liệu sau khi nhập
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

  // --- CRUD HANDLERS ---
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

  const handleViewDetail = async (room: Room) => {
    setViewingRoom(room);
    setShowDetailModal(true);
    setRoomBookServices([]);
    // If room has an active contract, fetch its detail (with bookServices)
    const contract = getContractForRoom(room._id);
    if (contract) {
      try {
        setLoadingDetail(true);
        const res = await axios.get(
          `${API_BASE_URL}/contracts/${contract._id}`,
        );
        if (res.data.success && res.data.data?.bookServices) {
          setRoomBookServices(res.data.data.bookServices);
        }
      } catch (err) {
        console.error("Error fetching contract detail:", err);
      } finally {
        setLoadingDetail(false);
      }
    }
  };

  const handleToggleActive = async (room: Room) => {
    const action = room.isActive ? "vô hiệu hóa" : "kích hoạt";
    if (!window.confirm(`Bạn có chắc muốn ${action} phòng ${room.name} không?`))
      return;

    try {
      await axios.put(`${API_BASE_URL}/rooms/${room._id}`, {
        isActive: !room.isActive,
      });
      toastr.success(`Đã ${action} phòng ${room.name} thành công!`);
      fetchData();
    } catch (error: any) {
      toastr.error("Lỗi cập nhật trạng thái: " + error.message);
    }
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

  const handleDelete = async (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa phòng này?")) {
      try {
        await axios.delete(`${API_BASE_URL}/rooms/${id}`);
        toastr.success("Xóa phòng thành công!");
        fetchData();
      } catch (e: any) {
        toastr.error(
          "Lỗi xóa phòng: " + (e.response?.data?.message || e.message),
        );
      }
    }
  };

  return (
    <div className="room-container">
      <div className="page-header">
        <div>
          <h2 className="page-title">
            {readOnly ? "Danh sách phòng" : "Quản lý danh sách phòng"}
          </h2>
          <p className="page-subtitle">
            {readOnly
              ? "Xem thông tin phòng theo tầng"
              : "Nhóm theo tầng - Xem dạng bảng"}
          </p>
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

      {/* THANH CÔNG CỤ (TOOLBAR) - Ẩn khi readOnly */}
      {!readOnly && (
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
          {/* VIEW TOGGLE */}
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
          </div>
        </div>
      )}

      {/* VIEW TOGGLE KHI READONLY CHỈ CÓ NÚT TOGGLE */}
      {readOnly && (
        <div
          style={{
            display: "flex",
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
        </div>
      )}

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
                            {/* <th style={{ width: "120px" }}>Trạng thái</th> */}
                            <th>Mô tả</th>
                            <th
                              style={{
                                width: readOnly ? "80px" : "140px",
                                textAlign: "center",
                              }}
                            >
                              Thao tác
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {floorRooms.map((room) => {
                            const typeDetail = getRoomTypeDetail(
                              room.roomTypeId,
                            );
                            const rowOpacity = room.isActive ? 1 : 0.5;

                            return (
                              <tr
                                key={room._id}
                                style={{ opacity: rowOpacity }}
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

                                <td>{renderStatus(room.status)}</td>

                                <td className="text-desc">
                                  {room.description || (
                                    <span className="text-muted-italic">
                                      Không có mô tả
                                    </span>
                                  )}
                                </td>

                                <td>
                                  <div className="action-group">
                                    {!readOnly && (
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

                                    {!readOnly && (
                                      <button
                                        className="btn-icon-sm edit"
                                        onClick={() => handleOpenEdit(room)}
                                        title="Sửa"
                                      >
                                        <Edit size={16} />
                                      </button>
                                    )}

                                    {!readOnly && (
                                      <button
                                        className="btn-icon-sm delete"
                                        onClick={() => handleDelete(room._id)}
                                        title="Xóa"
                                      >
                                        <Trash2 size={16} />
                                      </button>
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
            {floors.map(
              (floor, idx) => (
                <button
                  key={floor._id || idx}
                  className={`floor-pill${activeMapFloor === idx ? " active" : ""}`}
                  onClick={() => setActiveMapFloor(idx)}
                >
                  <BuildingIcon size={14} />
                  {floor.name}
                </button>
              ),
            )}
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
                const fId = typeof r.floorId === "object" ? r.floorId?._id : r.floorId;
                return fId === floor._id;
              });

              const floorNameLower = floor.name.toLowerCase();

              if (floorNameLower.includes("2")) {
                return (
                  <FloorMapLevel2
                    key={floor._id}
                    rooms={floorRooms}
                    onRoomSelect={(room) =>
                      readOnly ? handleViewDetail(room as any) : handleOpenEdit(room as any)
                    }
                  />
                );
              } else if (floorNameLower.includes("3")) {
                return (
                  <FloorMapLevel3
                    key={floor._id}
                    rooms={floorRooms}
                    onRoomSelect={(room) =>
                      readOnly ? handleViewDetail(room as any) : handleOpenEdit(room as any)
                    }
                  />
                );
              } else if (floorNameLower.includes("4")) {
                return (
                  <FloorMapLevel4
                    key={floor._id}
                    rooms={floorRooms}
                    onRoomSelect={(room) =>
                      readOnly ? handleViewDetail(room as any) : handleOpenEdit(room as any)
                    }
                  />
                );
              } else if (floorNameLower.includes("5")) {
                return (
                  <FloorMapLevel5
                    key={floor._id}
                    rooms={floorRooms}
                    onRoomSelect={(room) =>
                      readOnly ? handleViewDetail(room as any) : handleOpenEdit(room as any)
                    }
                  />
                );
              }

              // Generic fallback (Level 1 or newly added floors)
              return (
                <FloorMap
                  key={floor._id}
                  floorName={floor.name}
                  rooms={floorRooms}
                  onRoomSelect={(room) =>
                    readOnly ? handleViewDetail(room as any) : handleOpenEdit(room as any)
                  }
                />
              );
            })}
          </div>
        </div>
      )}

      {/* --- MODAL ADD/EDIT --- Ẩn khi readOnly */}
      {!readOnly && showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{isEditing ? "Sửa Phòng" : "Thêm Phòng Mới"}</h3>
              <button onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-row">
                <div className="form-group">
                  <label>
                    Mã phòng <span style={{ color: "red" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.roomCode}
                    onChange={(e) =>
                      setFormData({ ...formData, roomCode: e.target.value })
                    }
                    required
                    placeholder="VD: R101"
                  />
                </div>
                <div className="form-group">
                  <label>
                    Tên hiển thị <span style={{ color: "red" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    placeholder="VD: Phòng 101"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Tầng</label>
                  <select
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
                <div className="form-group">
                  <label>Loại phòng</label>
                  <select
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
              {/* <div className="form-group">
                <label>Trạng thái</label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as any })
                  }
                >
                  <option value="Available">Trống</option>
                  <option value="Occupied">Đang thuê</option>
                  <option value="Deposited">Đã cọc</option>
                </select>
              </div> */}

              {isEditing && (
                <div
                  className="form-group"
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <input
                    type="checkbox"
                    id="chkActive"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                    style={{ width: "auto", margin: 0 }}
                  />
                  <label
                    htmlFor="chkActive"
                    style={{ margin: 0, cursor: "pointer" }}
                  >
                    Đang hoạt động (Active)
                  </label>
                </div>
              )}

              <div className="form-group">
                <label>Mô tả</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn-primary">
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL XEM CHI TIẾT --- */}
      {showDetailModal &&
        viewingRoom &&
        (() => {
          const roomContract = getContractForRoom(viewingRoom._id);
          return (
            <div className="rd-overlay" style={{ zIndex: 1100 }}>
              <div className="rd-content">
                <div className="rd-header">
                  <h3>Chi tiết Phòng: {viewingRoom.name}</h3>
                  <button onClick={() => setShowDetailModal(false)}>
                    <X size={20} />
                  </button>
                </div>

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
                      <div className="rd-field">
                        <label>Trạng thái:</label>
                        <span>{renderStatus(viewingRoom.status)}</span>
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
                      </>
                    ) : (
                      <div className="rd-empty-contract">
                        <FileText size={20} style={{ color: "#94a3b8" }} />
                        <span>Phòng hiện chưa có hợp đồng</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rd-actions">
                  <button
                    className="btn-secondary"
                    onClick={() => setShowDetailModal(false)}
                  >
                    Đóng
                  </button>
                  {!readOnly && (
                    <button
                      className="btn-primary"
                      onClick={() => {
                        setShowDetailModal(false);
                        handleOpenEdit(viewingRoom);
                      }}
                    >
                      <Edit size={16} /> Chỉnh sửa
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
};

export default ManageRoom;

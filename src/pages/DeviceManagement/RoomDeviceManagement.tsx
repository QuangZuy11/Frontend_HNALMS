import React, { useState, useEffect, useMemo } from "react";
import {
  Plus, Edit, Trash2, Cpu, PackageSearch,
  Search, Filter, ArrowUpDown, AlertTriangle, X,
  CheckCircle, FileText, LayoutGrid, Sparkles,
} from "lucide-react";
import { AppModal } from "../../components/common/Modal";
import { Pagination } from "../../components/common/Pagination";
import { useToast } from "../../components/common/Toast";
import { roomDeviceService } from "../../services/roomDeviceService";
import type { RoomDevice, Device, RoomType } from "../../services/roomDeviceService";
import "./RoomDeviceManagement.css";

const CONDITION_OPTIONS = ["Good", "Fair", "Poor", "Damaged", "New"];

const getConditionBadge = (condition: string) => {
  switch (condition) {
    case "Good":
    case "New":
      return "rdm-badge rdm-badge-good";
    case "Fair":
      return "rdm-badge rdm-badge-fair";
    case "Poor":
    case "Damaged":
      return "rdm-badge rdm-badge-poor";
    default:
      return "rdm-badge rdm-badge-default";
  }
};

const conditionLabel: Record<string, string> = {
  Good: "Tốt",
  New: "Mới",
  Fair: "Khá",
  Poor: "Kém",
  Damaged: "Hỏng",
};

interface AddFormData {
  deviceId: string;
  quantity: number;
  condition: string;
}

interface EditFormData {
  quantity: number;
  condition: string;
}

const RoomDeviceManagement: React.FC = () => {
  const { showToast } = useToast();

  // ── Core state ──────────────────────────────────────────────
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [roomDevices, setRoomDevices] = useState<RoomDevice[]>([]);
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingRefs, setLoadingRefs] = useState(true);

  // ── Filter & Sort state ─────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCondition, setFilterCondition] = useState("ALL");
  const [sortOption, setSortOption] = useState("default");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // ── Modal state ─────────────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RoomDevice | null>(null);
  const [itemToDelete, setItemToDelete] = useState<RoomDevice | null>(null);

  const [addForm, setAddForm] = useState<AddFormData>({
    deviceId: "",
    quantity: 1,
    condition: "Good",
  });

  const [editForm, setEditForm] = useState<EditFormData>({
    quantity: 1,
    condition: "Good",
  });

  // ── Initialise reference data ────────────────────────────────
  useEffect(() => {
    fetchReferenceData();
  }, []);

  const fetchReferenceData = async () => {
    setLoadingRefs(true);
    try {
      const [rtRes, devRes] = await Promise.all([
        roomDeviceService.getRoomTypes(),
        roomDeviceService.getDevices(),
      ]);
      const rtList: RoomType[] = rtRes.data || rtRes || [];
      const devList: Device[] = devRes.data || devRes || [];
      setRoomTypes(rtList);
      setDevices(devList);
      if (rtList.length > 0) {
        setSelectedRoomTypeId(rtList[0]._id);
      }
    } catch {
      showToast("error", "Lỗi kết nối", "Không thể tải dữ liệu tham chiếu!");
    } finally {
      setLoadingRefs(false);
    }
  };

  // ── Fetch room devices when room type changes ─────────────────
  useEffect(() => {
    if (selectedRoomTypeId) {
      fetchRoomDevices(selectedRoomTypeId);
    } else {
      setRoomDevices([]);
    }
    setCurrentPage(1);
  }, [selectedRoomTypeId]);

  const fetchRoomDevices = async (roomTypeId: string) => {
    setLoading(true);
    try {
      const res = await roomDeviceService.getByRoomType(roomTypeId);
      setRoomDevices(res.data || []);
    } catch {
      showToast("error", "Lỗi kết nối", "Không thể tải danh sách thiết bị loại phòng!");
    } finally {
      setLoading(false);
    }
  };

  // ── Reset page on filter change ──────────────────────────────
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCondition, sortOption]);

  // ── Already-added device IDs (prevent duplicate select) ──────
  const addedDeviceIds = useMemo(
    () => new Set(roomDevices.map((rd) => rd.deviceId?._id)),
    [roomDevices]
  );

  const availableDevices = useMemo(
    () => devices.filter((d) => !addedDeviceIds.has(d._id)),
    [devices, addedDeviceIds]
  );

  // ── Processed list (filter + sort) ──────────────────────────
  const processedRoomDevices = useMemo(() => {
    let result = [...roomDevices];

    // 1. Search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((rd) => {
        const name = rd.deviceId?.name?.toLowerCase() || "";
        const brand = rd.deviceId?.brand?.toLowerCase() || "";
        const model = rd.deviceId?.model?.toLowerCase() || "";
        const category = rd.deviceId?.category?.toLowerCase() || "";
        return name.includes(term) || brand.includes(term) || model.includes(term) || category.includes(term);
      });
    }

    // 2. Filter condition
    if (filterCondition !== "ALL") {
      result = result.filter((rd) => rd.condition === filterCondition);
    }

    // 3. Sort
    switch (sortOption) {
      case "name-asc":
        result.sort((a, b) => (a.deviceId?.name || "").localeCompare(b.deviceId?.name || ""));
        break;
      case "name-desc":
        result.sort((a, b) => (b.deviceId?.name || "").localeCompare(a.deviceId?.name || ""));
        break;
      case "qty-asc":
        result.sort((a, b) => a.quantity - b.quantity);
        break;
      case "qty-desc":
        result.sort((a, b) => b.quantity - a.quantity);
        break;
      default:
        break;
    }

    return result;
  }, [roomDevices, searchTerm, filterCondition, sortOption]);

  const totalPages = Math.ceil(processedRoomDevices.length / itemsPerPage);
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return processedRoomDevices.slice(start, start + itemsPerPage);
  }, [processedRoomDevices, currentPage]);

  // ── Selected room type label ─────────────────────────────────
  const selectedRoomTypeName = useMemo(() => {
    const rt = roomTypes.find((r) => r._id === selectedRoomTypeId);
    return rt?.typeName ?? "";
  }, [roomTypes, selectedRoomTypeId]);

  // ── Stats ────────────────────────────────────────────────────
  const totalQuantity = useMemo(
    () => roomDevices.reduce((sum, rd) => sum + rd.quantity, 0),
    [roomDevices]
  );
  const deviceTypeCount = roomDevices.length;
  const goodCount = useMemo(
    () => roomDevices.filter((rd) => rd.condition === "Good" || rd.condition === "New").length,
    [roomDevices]
  );

  // ── ADD ──────────────────────────────────────────────────────
  const handleOpenAdd = () => {
    if (!selectedRoomTypeId) {
      showToast("warning", "Chú ý", "Vui lòng chọn loại phòng trước!");
      return;
    }
    setAddForm({ deviceId: availableDevices[0]?._id ?? "", quantity: 1, condition: "Good" });
    setShowAddModal(true);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.deviceId) {
      showToast("warning", "Chú ý", "Vui lòng chọn thiết bị!");
      return;
    }
    try {
      await roomDeviceService.create({
        roomTypeId: selectedRoomTypeId,
        deviceId: addForm.deviceId,
        quantity: addForm.quantity,
        condition: addForm.condition,
      });
      showToast("success", "Thành công", "Thêm thiết bị vào loại phòng thành công!");
      setShowAddModal(false);
      fetchRoomDevices(selectedRoomTypeId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Có lỗi xảy ra khi thêm thiết bị";
      showToast("error", "Lỗi hệ thống", msg);
    }
  };

  // ── EDIT ─────────────────────────────────────────────────────
  const handleOpenEdit = (record: RoomDevice) => {
    setEditingRecord(record);
    setEditForm({ quantity: record.quantity, condition: record.condition });
    setShowEditModal(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    if (editForm.quantity < 1) {
      showToast("warning", "Chú ý", "Số lượng phải >= 1!");
      return;
    }
    try {
      await roomDeviceService.update(editingRecord._id, {
        quantity: editForm.quantity,
        condition: editForm.condition,
      });
      showToast("success", "Thành công", "Cập nhật thiết bị thành công!");
      setShowEditModal(false);
      setEditingRecord(null);
      fetchRoomDevices(selectedRoomTypeId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Có lỗi xảy ra khi cập nhật";
      showToast("error", "Lỗi hệ thống", msg);
    }
  };

  // ── DELETE ───────────────────────────────────────────────────
  const handleDeleteClick = (record: RoomDevice) => {
    setItemToDelete(record);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await roomDeviceService.remove(itemToDelete._id);
      showToast("success", "Thành công", "Xóa thiết bị khỏi loại phòng thành công!");

      if (currentItems.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }

      fetchRoomDevices(selectedRoomTypeId);
      setShowDeleteModal(false);
      setItemToDelete(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Có lỗi xảy ra khi xóa thiết bị";
      showToast("error", "Lỗi", msg);
    }
  };

  // ── Loading screen ────────────────────────────────────────────
  if (loadingRefs) {
    return (
      <div className="rdm-container">
        <div className="rdm-empty">
          <PackageSearch size={48} />
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rdm-container">
      {/* ── PAGE HEADER ── */}
      <div className="rdm-page-header">
        <div className="rdm-header-top">
          <div className="rdm-title-block">
            <div className="rdm-title-row">
              <div className="rdm-title-icon" aria-hidden>
                <Cpu size={22} strokeWidth={2} />
              </div>
              <div className="rdm-title-text">
                <h2>Quản lý Thiết bị theo Loại phòng</h2>
                <p className="rdm-subtitle">
                  Cấu hình tiêu chuẩn thiết bị cho từng loại phòng trong toà nhà.
                </p>
              </div>
            </div>
          </div>

          <div className="rdm-header-aside">
            {selectedRoomTypeId && !loading && roomDevices.length > 0 && (
              <div className="rdm-stats-summary">
                <div className="rdm-stat-item">
                  <FileText size={16} className="rdm-stat-icon rdm-icon-accent" />
                  <div className="rdm-stat-text">
                    <span className="rdm-stat-value">{deviceTypeCount}</span>
                    <span className="rdm-stat-label">Loại thiết bị</span>
                  </div>
                </div>
                <div className="rdm-stat-divider" />
                <div className="rdm-stat-item">
                  <LayoutGrid size={16} className="rdm-stat-icon rdm-icon-primary" />
                  <div className="rdm-stat-text">
                    <span className="rdm-stat-value">{totalQuantity}</span>
                    <span className="rdm-stat-label">Tổng số lượng</span>
                  </div>
                </div>
                <div className="rdm-stat-divider" />
                <div className="rdm-stat-item">
                  <Sparkles size={16} className="rdm-stat-icon rdm-icon-warning" />
                  <div className="rdm-stat-text">
                    <span className="rdm-stat-value">{goodCount}</span>
                    <span className="rdm-stat-label">Tình trạng tốt</span>
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              className="rdm-btn-primary-cta"
              onClick={handleOpenAdd}
              disabled={!selectedRoomTypeId || availableDevices.length === 0}
            >
              <Plus size={18} />
              Thêm thiết bị
            </button>
          </div>
        </div>
      </div>

      {/* ── TOOLBAR ── */}
      <div className="rdm-toolbar">
        <div className="rdm-toolbar-left">
          <div className="rdm-search-box">
            <Search size={18} className="rdm-search-icon" />
            <input
              type="text"
              className="rdm-search-input"
              placeholder="Tìm tên, hãng, model..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="rdm-control-group">
            <Filter size={16} className="rdm-toolbar-icon" aria-hidden />
            <select
              className="rdm-custom-select"
              value={filterCondition}
              onChange={(e) => setFilterCondition(e.target.value)}
            >
              <option value="ALL">Tất cả tình trạng</option>
              {CONDITION_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {conditionLabel[opt]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="rdm-toolbar-right">
          <ArrowUpDown size={16} className="rdm-toolbar-icon" aria-hidden />
          <select
            className="rdm-custom-select"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
          >
            <option value="default">Mặc định</option>
            <option value="name-asc">Tên: A - Z</option>
            <option value="name-desc">Tên: Z - A</option>
            <option value="qty-asc">Số lượng: Thấp - Cao</option>
            <option value="qty-desc">Số lượng: Cao - Thấp</option>
          </select>
        </div>
      </div>

      {/* ── ROOM TYPE SELECTOR ── */}
      <div className="rdm-roomtype-bar">
        <label htmlFor="roomtype-select" className="rdm-roomtype-label">
          Loại phòng:
        </label>
        <select
          id="roomtype-select"
          className="rdm-roomtype-select"
          value={selectedRoomTypeId}
          onChange={(e) => setSelectedRoomTypeId(e.target.value)}
        >
          {roomTypes.length === 0 && (
            <option value="">-- Chưa có loại phòng --</option>
          )}
          {roomTypes.map((rt) => (
            <option key={rt._id} value={rt._id}>
              {rt.typeName}{rt.personMax ? ` (tối đa ${rt.personMax} người)` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* ── TABLE ── */}
      <div className="rdm-table-container">
        {!selectedRoomTypeId ? (
          <div className="rdm-empty">
            <PackageSearch size={48} />
            <p>Vui lòng chọn loại phòng để xem danh sách thiết bị</p>
          </div>
        ) : loading ? (
          <div className="rdm-empty">
            <Cpu size={48} />
            <p>Đang tải danh sách thiết bị...</p>
          </div>
        ) : processedRoomDevices.length === 0 ? (
          <div className="rdm-empty">
            <PackageSearch size={48} />
            <p>
              {searchTerm || filterCondition !== "ALL"
                ? "Không tìm thấy thiết bị phù hợp."
                : `Loại phòng "${selectedRoomTypeName}" chưa có thiết bị nào.`}
            </p>
          </div>
        ) : (
          <>
            <table className="rdm-table">
              <thead>
                <tr>
                  <th className="rdm-th-stt">STT</th>
                  <th className="rdm-th-name">Thiết bị & Mô tả</th>
                  <th className="rdm-th-info">Model / Hãng</th>
                  <th className="rdm-th-category">Danh mục</th>
                  <th className="rdm-th-qty">Số lượng</th>
                  <th className="rdm-th-condition">Tình trạng</th>
                  <th className="rdm-th-actions">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((rd, idx) => (
                  <tr key={rd._id}>
                    <td className="rdm-td-stt">
                      {(currentPage - 1) * itemsPerPage + idx + 1}
                    </td>
                    <td className="rdm-td-name">
                      <div className="rdm-main-text">{rd.deviceId?.name}</div>
                      <div className="rdm-desc-text">
                        {rd.deviceId?.description || rd.deviceId?.unit || "Chưa có mô tả"}
                      </div>
                    </td>
                    <td className="rdm-td-info">
                      <div className="rdm-main-text">{rd.deviceId?.model || "—"}</div>
                      <div className="rdm-brand-text">{rd.deviceId?.brand}</div>
                    </td>
                    <td className="rdm-td-category">
                      <span className="rdm-category-badge">
                        {rd.deviceId?.category || "Chung"}
                      </span>
                    </td>
                    <td className="rdm-td-qty">{rd.quantity}</td>
                    <td className="rdm-td-condition">
                      <span className={getConditionBadge(rd.condition)}>
                        {conditionLabel[rd.condition] ?? rd.condition}
                      </span>
                    </td>
                    <td className="rdm-td-actions">
                      <div className="rdm-table-actions">
                        <button
                          className="rdm-btn-icon rdm-btn-edit"
                          title="Chỉnh sửa"
                          onClick={() => handleOpenEdit(rd)}
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          className="rdm-btn-icon rdm-btn-delete"
                          title="Xóa"
                          onClick={() => handleDeleteClick(rd)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={processedRoomDevices.length}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>

      {/* ── MODALS ── */}

      {/* 1. ADD MODAL */}
      <AppModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Thêm thiết bị vào loại phòng"
        icon={<Plus size={18} />}
        color="blue"
        size="md"
        footer={
          <>
            <button type="button" className="ms-btn ms-btn--ghost" onClick={() => setShowAddModal(false)}>
              Hủy bỏ
            </button>
            <button
              type="submit"
              form="rdm-add-form"
              className="ms-btn ms-btn--primary"
              disabled={availableDevices.length === 0}
            >
              <Plus size={16} />
              Thêm thiết bị
            </button>
          </>
        }
      >
        <form id="rdm-add-form" onSubmit={handleAdd}>
          {/* Loại phòng (readonly) */}
          <div className="ms-field">
            <label className="ms-label">Loại phòng</label>
            <input
              type="text"
              className="ms-input"
              value={selectedRoomTypeName}
              readOnly
              style={{ background: "#f8fafc", color: "#64748b" }}
            />
          </div>

          {/* Thiết bị */}
          <div className="ms-field" style={{ marginTop: "16px" }}>
            <label className="ms-label">
              Thiết bị <span className="ms-label-required">*</span>
            </label>
            {availableDevices.length === 0 ? (
              <p style={{ color: "#ef4444", fontSize: 13, margin: 0 }}>
                Tất cả thiết bị đã được thêm vào loại phòng này.
              </p>
            ) : (
              <select
                className="ms-input"
                required
                value={addForm.deviceId}
                onChange={(e) => setAddForm({ ...addForm, deviceId: e.target.value })}
                style={{ appearance: "auto" }}
              >
                <option value="">-- Chọn thiết bị --</option>
                {availableDevices.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                    {d.brand ? ` — ${d.brand}` : ""}
                    {d.model ? ` (${d.model})` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Số lượng + Tình trạng */}
          <div className="ms-field-row" style={{ marginTop: "16px" }}>
            <div className="ms-field">
              <label className="ms-label">
                Số lượng <span className="ms-label-required">*</span>
              </label>
              <input
                type="number"
                className="ms-input"
                min={1}
                required
                value={addForm.quantity}
                onChange={(e) => setAddForm({ ...addForm, quantity: Number(e.target.value) })}
              />
            </div>
            <div className="ms-field">
              <label className="ms-label">Tình trạng</label>
              <select
                className="ms-input"
                value={addForm.condition}
                onChange={(e) => setAddForm({ ...addForm, condition: e.target.value })}
                style={{ appearance: "auto" }}
              >
                {CONDITION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {conditionLabel[opt]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </form>
      </AppModal>

      {/* 2. EDIT MODAL */}
      <AppModal
        open={showEditModal}
        onClose={() => { setShowEditModal(false); setEditingRecord(null); }}
        title="Cập nhật thiết bị"
        icon={<Edit size={18} />}
        color="blue"
        size="md"
        footer={
          <>
            <button
              type="button"
              className="ms-btn ms-btn--ghost"
              onClick={() => { setShowEditModal(false); setEditingRecord(null); }}
            >
              Hủy bỏ
            </button>
            <button type="submit" form="rdm-edit-form" className="ms-btn ms-btn--primary">
              <CheckCircle size={16} />
              Cập nhật
            </button>
          </>
        }
      >
        <form id="rdm-edit-form" onSubmit={handleEdit}>
          {/* Thiết bị (readonly) */}
          <div className="ms-field">
            <label className="ms-label">Thiết bị</label>
            <input
              type="text"
              className="ms-input"
              value={
                `${editingRecord?.deviceId?.name ?? ""}${
                  editingRecord?.deviceId?.brand ? ` — ${editingRecord.deviceId.brand}` : ""
                }${editingRecord?.deviceId?.model ? ` (${editingRecord.deviceId.model})` : ""}`
              }
              readOnly
              style={{ background: "#f8fafc", color: "#64748b" }}
            />
          </div>

          {/* Số lượng + Tình trạng */}
          <div className="ms-field-row" style={{ marginTop: "16px" }}>
            <div className="ms-field">
              <label className="ms-label">
                Số lượng <span className="ms-label-required">*</span>
              </label>
              <input
                type="number"
                className="ms-input"
                min={1}
                required
                value={editForm.quantity}
                onChange={(e) => setEditForm({ ...editForm, quantity: Number(e.target.value) })}
              />
            </div>
            <div className="ms-field">
              <label className="ms-label">Tình trạng</label>
              <select
                className="ms-input"
                value={editForm.condition}
                onChange={(e) => setEditForm({ ...editForm, condition: e.target.value })}
                style={{ appearance: "auto" }}
              >
                {CONDITION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {conditionLabel[opt]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </form>
      </AppModal>

      {/* 3. DELETE MODAL */}
      <AppModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Xác nhận xóa"
        icon={<AlertTriangle size={18} />}
        color="red"
        size="sm"
        footer={
          <>
            <button type="button" className="ms-btn ms-btn--ghost" onClick={() => setShowDeleteModal(false)}>
              Hủy bỏ
            </button>
            <button type="button" className="ms-btn ms-btn--danger" onClick={handleConfirmDelete}>
              <Trash2 size={16} /> Đồng ý xóa
            </button>
          </>
        }
      >
        <div className="ms-delete-notice">
          <div className="ms-delete-notice-icon">
            <AlertTriangle size={28} color="#f59e0b" />
          </div>
          <p className="ms-delete-notice-text">
            Bạn có chắc muốn xóa thiết bị <b>{itemToDelete?.deviceId?.name}</b> khỏi loại phòng này?
            Toàn bộ dữ liệu này sẽ không thể phục hồi.
          </p>
        </div>
      </AppModal>
    </div>
  );
};

export default RoomDeviceManagement;

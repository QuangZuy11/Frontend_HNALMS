import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Edit,
  Trash2,
  X,
  Cpu,
  PackageSearch,
  ChevronDown,
} from "lucide-react";
import toastr from "toastr";
import "toastr/build/toastr.min.css";
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
  // ── Core state ──────────────────────────────────────────────
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [roomDevices, setRoomDevices] = useState<RoomDevice[]>([]);
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingRefs, setLoadingRefs] = useState(true);

  // ── Modal state ──────────────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RoomDevice | null>(null);

  const [addForm, setAddForm] = useState<AddFormData>({
    deviceId: "",
    quantity: 1,
    condition: "Good",
  });

  const [editForm, setEditForm] = useState<EditFormData>({
    quantity: 1,
    condition: "Good",
  });

  // ── Initialise toastr & reference data ──────────────────────
  useEffect(() => {
    toastr.options = {
      closeButton: true,
      progressBar: true,
      positionClass: "toast-top-right",
      timeOut: 3000,
    };
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
      toastr.error("Không thể tải dữ liệu tham chiếu");
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
  }, [selectedRoomTypeId]);

  const fetchRoomDevices = async (roomTypeId: string) => {
    setLoading(true);
    try {
      const res = await roomDeviceService.getByRoomType(roomTypeId);
      setRoomDevices(res.data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể tải danh sách thiết bị loại phòng";
      toastr.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Already-added device IDs (prevent duplicate select) ──────
  const addedDeviceIds = useMemo(
    () => new Set(roomDevices.map((rd) => rd.deviceId?._id)),
    [roomDevices]
  );

  const availableDevices = useMemo(
    () => devices.filter((d) => !addedDeviceIds.has(d._id)),
    [devices, addedDeviceIds]
  );

  // ── Selected room type label ─────────────────────────────────
  const selectedRoomTypeName = useMemo(() => {
    const rt = roomTypes.find((r) => r._id === selectedRoomTypeId);
    return rt?.typeName ?? "";
  }, [roomTypes, selectedRoomTypeId]);

  // ── ADD ──────────────────────────────────────────────────────
  const handleOpenAdd = () => {
    if (!selectedRoomTypeId) {
      toastr.warning("Vui lòng chọn loại phòng trước");
      return;
    }
    setAddForm({ deviceId: availableDevices[0]?._id ?? "", quantity: 1, condition: "Good" });
    setShowAddModal(true);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.deviceId) {
      toastr.warning("Vui lòng chọn thiết bị");
      return;
    }
    try {
      await roomDeviceService.create({
        roomTypeId: selectedRoomTypeId,
        deviceId: addForm.deviceId,
        quantity: addForm.quantity,
        condition: addForm.condition,
      });
      toastr.success("Thêm thiết bị vào loại phòng thành công!");
      setShowAddModal(false);
      fetchRoomDevices(selectedRoomTypeId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Có lỗi xảy ra khi thêm thiết bị";
      toastr.error(msg);
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
      toastr.warning("Số lượng phải >= 1");
      return;
    }
    try {
      await roomDeviceService.update(editingRecord._id, {
        quantity: editForm.quantity,
        condition: editForm.condition,
      });
      toastr.success("Cập nhật thiết bị thành công!");
      setShowEditModal(false);
      setEditingRecord(null);
      fetchRoomDevices(selectedRoomTypeId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Có lỗi xảy ra khi cập nhật";
      toastr.error(msg);
    }
  };

  // ── DELETE ───────────────────────────────────────────────────
  const handleDelete = async (record: RoomDevice) => {
    const deviceName = record.deviceId?.name ?? "thiết bị";
    if (!window.confirm(`Bạn có chắc muốn xoá "${deviceName}" khỏi loại phòng này?`)) return;
    try {
      await roomDeviceService.remove(record._id);
      toastr.success("Xoá thiết bị khỏi loại phòng thành công!");
      fetchRoomDevices(selectedRoomTypeId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi khi xoá thiết bị";
      toastr.error(msg);
    }
  };

  // ── Stats ────────────────────────────────────────────────────
  const totalQuantity = useMemo(
    () => roomDevices.reduce((sum, rd) => sum + rd.quantity, 0),
    [roomDevices]
  );

  const goodCount = useMemo(
    () =>
      roomDevices.filter(
        (rd) => rd.condition === "Good" || rd.condition === "New"
      ).length,
    [roomDevices]
  );

  // ── Render ───────────────────────────────────────────────────
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
      {/* Header */}
      <div className="rdm-header">
        <h2>Quản lý Thiết bị theo Loại phòng</h2>
        <p>
          Cấu hình tiêu chuẩn thiết bị cho từng loại phòng trong toà nhà
        </p>
      </div>

      {/* Toolbar */}
      <div className="rdm-toolbar">
        <label htmlFor="roomtype-select">Loại phòng:</label>
        <select
          id="roomtype-select"
          className="rdm-select"
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

        <div className="rdm-toolbar-right">
          <button
            className="rdm-btn rdm-btn-primary"
            onClick={handleOpenAdd}
            disabled={!selectedRoomTypeId || availableDevices.length === 0}
          >
            <Plus size={18} />
            Thêm thiết bị
          </button>
        </div>
      </div>

      {/* Stats row */}
      {selectedRoomTypeId && !loading && roomDevices.length > 0 && (
        <div className="rdm-stats-row">
          <div className="rdm-stat-card">
            <div className="rdm-stat-label">Loại thiết bị</div>
            <div className="rdm-stat-value">{roomDevices.length}</div>
          </div>
          <div className="rdm-stat-card">
            <div className="rdm-stat-label">Tổng số lượng</div>
            <div className="rdm-stat-value">{totalQuantity}</div>
          </div>
          <div className="rdm-stat-card">
            <div className="rdm-stat-label">Tình trạng tốt</div>
            <div className="rdm-stat-value">{goodCount}</div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rdm-table-wrap">
        {!selectedRoomTypeId ? (
          <div className="rdm-empty">
            <ChevronDown size={48} />
            <p>Vui lòng chọn loại phòng để xem danh sách thiết bị</p>
          </div>
        ) : loading ? (
          <div className="rdm-empty">
            <Cpu size={48} />
            <p>Đang tải danh sách thiết bị...</p>
          </div>
        ) : roomDevices.length === 0 ? (
          <div className="rdm-empty">
            <PackageSearch size={48} />
            <p>
              Loại phòng <strong>{selectedRoomTypeName}</strong> chưa có thiết
              bị nào.
            </p>
          </div>
        ) : (
          <table className="rdm-table">
            <thead>
              <tr>
                <th style={{ width: "5%" }}>#</th>
                <th style={{ width: "30%" }}>Tên thiết bị</th>
                <th style={{ width: "18%" }}>Model / Hãng</th>
                <th style={{ width: "13%" }}>Danh mục</th>
                <th style={{ width: "10%", textAlign: "center" }}>Số lượng</th>
                <th style={{ width: "12%", textAlign: "center" }}>
                  Tình trạng
                </th>
                <th style={{ width: "12%", textAlign: "center" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {roomDevices.map((rd, idx) => (
                <tr key={rd._id}>
                  <td style={{ color: "#94a3b8", fontSize: 13 }}>{idx + 1}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{rd.deviceId?.name}</div>
                    <div className="rdm-text-secondary">
                      {rd.deviceId?.unit ?? ""}
                    </div>
                  </td>
                  <td>
                    <div>{rd.deviceId?.model || "—"}</div>
                    <div className="rdm-text-secondary">
                      {rd.deviceId?.brand}
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        background: "#e0f2fe",
                        color: "#0284c7",
                        padding: "3px 8px",
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {rd.deviceId?.category || "Chung"}
                    </span>
                  </td>
                  <td style={{ textAlign: "center", fontWeight: 600 }}>
                    {rd.quantity}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span className={getConditionBadge(rd.condition)}>
                      {conditionLabel[rd.condition] ?? rd.condition}
                    </span>
                  </td>
                  <td>
                    <div className="rdm-actions" style={{ justifyContent: "center" }}>
                      <button
                        className="rdm-icon-btn"
                        title="Chỉnh sửa"
                        onClick={() => handleOpenEdit(rd)}
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className="rdm-icon-btn delete"
                        title="Xoá"
                        onClick={() => handleDelete(rd)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── ADD MODAL ── */}
      {showAddModal && (
        <div className="rdm-modal-overlay">
          <div className="rdm-modal">
            <div className="rdm-modal-header">
              <h3>Thêm thiết bị vào loại phòng</h3>
              <button
                className="rdm-modal-close"
                onClick={() => setShowAddModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAdd}>
              <div className="rdm-modal-body">
                {/* Type info (readonly) */}
                <div className="rdm-form-group">
                  <label>Loại phòng</label>
                  <input
                    className="rdm-form-input"
                    value={selectedRoomTypeName}
                    readOnly
                    style={{ background: "#f8fafc", color: "#64748b" }}
                  />
                </div>

                {/* Device selector */}
                <div className="rdm-form-group">
                  <label>
                    Thiết bị <span>*</span>
                  </label>
                  {availableDevices.length === 0 ? (
                    <p style={{ color: "#ef4444", fontSize: 13, margin: 0 }}>
                      Tất cả thiết bị đã được thêm vào loại phòng này.
                    </p>
                  ) : (
                    <select
                      className="rdm-form-select"
                      required
                      value={addForm.deviceId}
                      onChange={(e) =>
                        setAddForm({ ...addForm, deviceId: e.target.value })
                      }
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

                {/* Quantity */}
                <div className="rdm-form-group">
                  <label>
                    Số lượng <span>*</span>
                  </label>
                  <input
                    className="rdm-form-input"
                    type="number"
                    min={1}
                    required
                    value={addForm.quantity}
                    onChange={(e) =>
                      setAddForm({
                        ...addForm,
                        quantity: Number(e.target.value),
                      })
                    }
                  />
                  <span className="rdm-form-hint">
                    Số lượng thiết bị tiêu chuẩn cho mỗi phòng thuộc loại này
                  </span>
                </div>

                {/* Condition */}
                <div className="rdm-form-group">
                  <label>
                    Tình trạng <span>*</span>
                  </label>
                  <select
                    className="rdm-form-select"
                    value={addForm.condition}
                    onChange={(e) =>
                      setAddForm({ ...addForm, condition: e.target.value })
                    }
                  >
                    {CONDITION_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {conditionLabel[c] ?? c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rdm-modal-footer">
                <button
                  type="button"
                  className="rdm-btn rdm-btn-outline"
                  onClick={() => setShowAddModal(false)}
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="rdm-btn rdm-btn-primary"
                  disabled={availableDevices.length === 0}
                >
                  <Plus size={16} />
                  Thêm thiết bị
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ── */}
      {showEditModal && editingRecord && (
        <div className="rdm-modal-overlay">
          <div className="rdm-modal">
            <div className="rdm-modal-header">
              <h3>Cập nhật thiết bị</h3>
              <button
                className="rdm-modal-close"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingRecord(null);
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEdit}>
              <div className="rdm-modal-body">
                {/* Device info (readonly) */}
                <div className="rdm-form-group">
                  <label>Thiết bị</label>
                  <input
                    className="rdm-form-input"
                    value={`${editingRecord.deviceId?.name ?? ""}${
                      editingRecord.deviceId?.brand
                        ? ` — ${editingRecord.deviceId.brand}`
                        : ""
                    }${
                      editingRecord.deviceId?.model
                        ? ` (${editingRecord.deviceId.model})`
                        : ""
                    }`}
                    readOnly
                    style={{ background: "#f8fafc", color: "#64748b" }}
                  />
                </div>

                {/* Quantity */}
                <div className="rdm-form-group">
                  <label>
                    Số lượng <span>*</span>
                  </label>
                  <input
                    className="rdm-form-input"
                    type="number"
                    min={1}
                    required
                    value={editForm.quantity}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        quantity: Number(e.target.value),
                      })
                    }
                  />
                </div>

                {/* Condition */}
                <div className="rdm-form-group">
                  <label>
                    Tình trạng <span>*</span>
                  </label>
                  <select
                    className="rdm-form-select"
                    value={editForm.condition}
                    onChange={(e) =>
                      setEditForm({ ...editForm, condition: e.target.value })
                    }
                  >
                    {CONDITION_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {conditionLabel[c] ?? c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rdm-modal-footer">
                <button
                  type="button"
                  className="rdm-btn rdm-btn-outline"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingRecord(null);
                  }}
                >
                  Huỷ
                </button>
                <button type="submit" className="rdm-btn rdm-btn-primary">
                  <Edit size={16} />
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomDeviceManagement;

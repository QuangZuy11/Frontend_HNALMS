import React, { useState, useEffect } from "react";
import AppModal from "../../../../components/common/Modal/AppModal";
import { liquidationService } from "../../../../services/liquidationService";
import { serviceService } from "../../../../services/serviceService";
import api from "../../../../services/api";
import axios from "axios";
import { useToast } from "../../../../components/common/Toast";
import { Upload, X } from "lucide-react";
import "./BulkLiquidationModal.css";

const API_BASE_URL = "http://localhost:9999/api";

interface Room {
  _id: string;
  name: string;
  title: string;
  activeContractId?: string;
  [key: string]: any;
}

interface BulkLiquidationModalProps {
  open: boolean;
  rooms: Room[];
  onClose: () => void;
  onSuccess: () => void;
}

interface RoomMeterState {
  roomId: string;
  roomName: string;
  contractId: string;
  electricOld: number;
  electricNew: string;
  waterOld: number;
  waterNew: string;
}

export default function BulkLiquidationModal({
  open,
  rooms,
  onClose,
  onSuccess,
}: BulkLiquidationModalProps) {
  const { showToast } = useToast();
  
  const [loadingServices, setLoadingServices] = useState(false);
  const [servicesData, setServicesData] = useState<{ electricId: string, waterId: string } | null>(null);
  
  const [loadingMeters, setLoadingMeters] = useState(false);
  const [roomStates, setRoomStates] = useState<RoomMeterState[]>([]);
  
  const [liquidationDate, setLiquidationDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("Thanh lý trước hạn do sự cố bất khả kháng");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [errorLogs, setErrorLogs] = useState<string[]>([]);
  
  // Image Upload
  const [images, setImages] = useState<string[]>([]);
  const [imageLocalPreviews, setImageLocalPreviews] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // 1. Fetch Services (Electricity / Water IDs)
  useEffect(() => {
    if (open) {
      fetchServices();
      setLiquidationDate(new Date().toISOString().slice(0, 10));
      setNote("Thanh lý trước hạn do sự cố bất khả kháng");
      setErrorLogs([]);
      setProgress({ current: 0, total: 0 });
      setImages([]);
      setImageLocalPreviews([]);
    }
  }, [open]);

  const fetchServices = async () => {
    try {
      setLoadingServices(true);
      const res = await serviceService.getServices({ status: "Hoạt động" });
      const services = res.data || [];
      
      let electricId = "";
      let waterId = "";
      
      services.forEach((s: any) => {
        const name = s.serviceName?.toLowerCase() || s.name?.toLowerCase() || "";
        if (name.includes("điện")) electricId = s._id;
        else if (name.includes("nước")) waterId = s._id;
      });
      
      if (!electricId || !waterId) {
        showToast("error", "Hệ thống chưa có dịch vụ Điện hoặc Nước hợp lệ.");
      } else {
        setServicesData({ electricId, waterId });
        // After getting services, fetch meter readings
        fetchMetersForRooms(electricId, waterId);
      }
    } catch (err) {
      showToast("error", "Lỗi khi lấy danh sách dịch vụ.");
    } finally {
      setLoadingServices(false);
    }
  };

  // 2. Fetch Latest Meters for Each Selected Room
  const fetchMetersForRooms = async (electricId: string, waterId: string) => {
    setLoadingMeters(true);
    try {
      const states: RoomMeterState[] = [];
      
      for (const room of rooms) {
        if (!room.activeContractId) continue;
        
        let electricOld = 0;
        let waterOld = 0;
        
        try {
          const resElec = await api.get(`/meter-readings/latest`, {
            params: { roomId: room._id, utilityId: electricId }
          });
          if (resElec.data?.data) {
            electricOld = resElec.data.data.newIndex || 0;
          }
        } catch (e) {
          console.error("Lỗi lấy chỉ số điện phòng " + (room.name || room.title));
        }
        
        try {
          const resWater = await api.get(`/meter-readings/latest`, {
            params: { roomId: room._id, utilityId: waterId }
          });
          if (resWater.data?.data) {
            waterOld = resWater.data.data.newIndex || 0;
          }
        } catch (e) {
          console.error("Lỗi lấy chỉ số nước phòng " + (room.name || room.title));
        }
        
        states.push({
          roomId: room._id,
          roomName: room.name || room.title,
          contractId: room.activeContractId,
          electricOld,
          electricNew: String(electricOld), // default same as old
          waterOld,
          waterNew: String(waterOld),
        });
      }
      
      setRoomStates(states);
    } catch (err) {
      showToast("error", "Có lỗi xảy ra khi lấy chỉ số đồng hồ cũ.");
    } finally {
      setLoadingMeters(false);
    }
  };

  const handleInputChange = (roomId: string, field: 'electricNew' | 'waterNew', value: string) => {
    setRoomStates(prev => prev.map(rs => 
      rs.roomId === roomId ? { ...rs, [field]: value } : rs
    ));
  };

  const handleImageFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingImages(true);

    const localUrls: string[] = [];
    Array.from(files).forEach((f) => {
      localUrls.push(URL.createObjectURL(f));
    });
    setImageLocalPreviews((prev) => [...prev, ...localUrls]);

    try {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append("images", f));
      const res = await axios.post(
        `${API_BASE_URL}/liquidations/upload-images`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      if (res.data.success) {
        setImages((prev) => [...prev, ...res.data.data]);
      }
    } catch (e: any) {
      showToast("error", "Lỗi upload ảnh: " + (e.response?.data?.message || e.message));
      setImageLocalPreviews((prev) =>
        prev.slice(0, prev.length - localUrls.length)
      );
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImageLocalPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // 3. Submit
  const handleSubmit = async () => {
    if (!servicesData) {
      showToast("error", "Thiếu ID dịch vụ điện/nước.");
      return;
    }
    
    if (!liquidationDate) {
      showToast("error", "Vui lòng chọn ngày thanh lý.");
      return;
    }
    
    if (images.length === 0) {
      showToast("error", "Phải có ít nhất 1 ảnh bằng chứng.");
      return;
    }
    
    // Validate indices
    for (const rs of roomStates) {
      const eNew = Number(rs.electricNew);
      const wNew = Number(rs.waterNew);
      
      if (isNaN(eNew) || eNew < rs.electricOld) {
        showToast("error", `Phòng ${rs.roomName}: Số điện mới không hợp lệ (phải >= ${rs.electricOld})`);
        return;
      }
      if (isNaN(wNew) || wNew < rs.waterOld) {
        showToast("error", `Phòng ${rs.roomName}: Số nước mới không hợp lệ (phải >= ${rs.waterOld})`);
        return;
      }
    }

    setIsSubmitting(true);
    setProgress({ current: 0, total: roomStates.length });
    setErrorLogs([]);
    
    let successCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < roomStates.length; i++) {
      const rs = roomStates[i];
      try {
        await liquidationService.create({
          contractId: rs.contractId,
          liquidationType: "force_majeure",
          liquidationDate,
          note,
          images,
          electricServiceId: servicesData.electricId,
          waterServiceId: servicesData.waterId,
          electricNewIndex: Number(rs.electricNew),
          waterNewIndex: Number(rs.waterNew)
        });
        successCount++;
      } catch (err: any) {
        errors.push(`Phòng ${rs.roomName}: ${err.response?.data?.message || err.message || "Lỗi không xác định"}`);
      }
      
      setProgress({ current: i + 1, total: roomStates.length });
    }
    
    setIsSubmitting(false);
    
    if (errors.length > 0) {
      setErrorLogs(errors);
      if (successCount > 0) {
        showToast("warning", `Đã tạo yêu cầu thanh lý cho ${successCount}/${roomStates.length} phòng. Có ${errors.length} lỗi.`);
      } else {
        showToast("error", `Tạo yêu cầu thanh lý thất bại cho tất cả các phòng.`);
      }
    } else {
      showToast("success", `Đã tạo yêu cầu thanh lý cho ${successCount} phòng. Đang chờ chủ nhà duyệt.`);
      onSuccess();
    }
  };

  const isReady = !loadingServices && !loadingMeters && servicesData && roomStates.length > 0;

  return (
    <AppModal
      open={open}
      onClose={isSubmitting ? () => {} : onClose}
      title="Thanh Lý Bất Khả Kháng Hàng Loạt"
      size="xl"
      footer={
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={onClose} 
            disabled={isSubmitting}
          >
            Hủy
          </button>
          <button 
            type="button" 
            className="btn-danger" 
            onClick={handleSubmit} 
            disabled={!isReady || isSubmitting || roomStates.length === 0}
            style={{ backgroundColor: "#ef4444", color: "white", padding: "8px 16px", borderRadius: "6px", fontWeight: "bold" }}
          >
            {isSubmitting ? "Đang xử lý..." : "Xác nhận thanh lý"}
          </button>
        </div>
      }
    >
      <div className="blm-container">
        {loadingServices || loadingMeters ? (
          <div className="blm-loading">
            <div className="blm-spinner"></div>
            <p className="blm-loading-text">Đang lấy thông tin chỉ số điện nước...</p>
          </div>
        ) : !isReady ? (
          <div className="blm-error">
            Không thể tải dữ liệu hoặc danh sách phòng trống.
          </div>
        ) : (
          <div className="blm-content">
            {/* Common Info */}
            <div className="blm-section">
              <h3 className="blm-section-title">Thông tin chung</h3>
              <div className="blm-grid">
                <div className="blm-input-group">
                  <label className="blm-label">
                    Ngày thanh lý <span className="blm-required">*</span>
                  </label>
                  <input
                    type="date"
                    className="blm-input"
                    value={liquidationDate}
                    onChange={(e) => setLiquidationDate(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="blm-input-group">
                  <label className="blm-label">
                    Lý do <span className="blm-required">*</span>
                  </label>
                  <input
                    type="text"
                    className="blm-input"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              
              <div className="blm-grid" style={{ marginTop: "16px" }}>
                <div className="blm-input-group" style={{ gridColumn: "1 / -1" }}>
                  <label className="blm-label">
                    Ảnh bằng chứng <span className="blm-required">*</span>
                  </label>
                  <div
                    className="blm-upload-zone"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleImageFiles(e.target.files)}
                      style={{ display: "none" }}
                    />
                    <Upload size={24} color="#64748b" style={{ margin: "0 auto 8px auto" }} />
                    <div style={{ color: "#475569", fontSize: "14px" }}>
                      <strong>Bấm để chọn ảnh</strong> hoặc kéo thả vào đây
                    </div>
                  </div>

                  {uploadingImages && (
                    <div style={{ color: "#3b82f6", fontSize: "14px", marginTop: "8px", fontWeight: 500 }}>
                      Đang tải ảnh lên...
                    </div>
                  )}

                  {imageLocalPreviews.length > 0 && (
                    <div className="blm-image-previews">
                      {imageLocalPreviews.map((url, i) => (
                        <div key={i} className="blm-image-preview-item">
                          <img src={url} alt={`Ảnh ${i + 1}`} />
                          <button
                            type="button"
                            className="blm-image-remove-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeImage(i);
                            }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Room List with Meters */}
            <div className="blm-section" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px 0 20px" }}>
                <h3 className="blm-section-title">
                  <span>Chỉ số Điện / Nước chốt</span>
                  <span className="blm-badge">
                    {roomStates.length} phòng
                  </span>
                </h3>
              </div>
              
              <div className="blm-table-container">
                <table className="blm-table">
                  <thead>
                    <tr>
                      <th>Phòng</th>
                      <th>Điện cũ</th>
                      <th>Điện mới (chốt)</th>
                      <th>Nước cũ</th>
                      <th>Nước mới (chốt)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roomStates.map((rs) => (
                      <tr key={rs.roomId}>
                        <td>
                          {rs.roomName}
                        </td>
                        <td>
                          {rs.electricOld}
                        </td>
                        <td>
                          <input 
                            type="number"
                            className="blm-table-input"
                            value={rs.electricNew}
                            onChange={(e) => handleInputChange(rs.roomId, 'electricNew', e.target.value)}
                            min={rs.electricOld}
                            disabled={isSubmitting}
                          />
                        </td>
                        <td>
                          {rs.waterOld}
                        </td>
                        <td>
                          <input 
                            type="number"
                            className="blm-table-input"
                            value={rs.waterNew}
                            onChange={(e) => handleInputChange(rs.roomId, 'waterNew', e.target.value)}
                            min={rs.waterOld}
                            disabled={isSubmitting}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Progress Bar during submit */}
            {isSubmitting && (
              <div className="blm-progress-container">
                <div className="blm-progress-header">
                  <span>Đang xử lý thanh lý...</span>
                  <span>{progress.current} / {progress.total}</span>
                </div>
                <div className="blm-progress-track">
                  <div 
                    className="blm-progress-bar" 
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Error Logs if partial failure */}
            {errorLogs.length > 0 && !isSubmitting && (
              <div className="blm-error-container">
                <p className="blm-error-title">Lỗi phát sinh ({errorLogs.length}):</p>
                <ul className="blm-error-list">
                  {errorLogs.map((log, idx) => (
                    <li key={idx}>{log}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </AppModal>
  );
}

import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import {
  Plus, Search, Edit, Trash2,
  FileSpreadsheet, Upload, Download,
  X, Laptop, Wrench
} from 'lucide-react';
import toastr from 'toastr';
import 'toastr/build/toastr.min.css';
import { saveAs } from 'file-saver';
import './ManagementDevice.css';

const API_BASE_URL = 'http://localhost:9999/api';

interface Device {
  _id: string;
  name: string;
  brand: string;
  model: string;
  category: string;
  unit: string;
  price: number;
  description: string;
}

const ManagerDevice = () => {
  // --- States ---
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);

  // Form Data
  const [formData, setFormData] = useState<Partial<Device>>({
    name: '', brand: '', model: '', category: '', unit: 'Cái', price: 0, description: ''
  });

  // Import File Ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // --- Config Toastr ---
  useEffect(() => {
    toastr.options = {
      closeButton: true,
      progressBar: true,
      positionClass: "toast-top-right",
      timeOut: 3000,
    };
    fetchDevices();
  }, []);

  // --- API Actions ---

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/devices`);
      setDevices(res.data.data || []);
    } catch (error) {
      console.error(error);
      toastr.error("Không thể tải danh sách thiết bị");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa thiết bị này?")) {
      try {
        await axios.delete(`${API_BASE_URL}/devices/${id}`);
        toastr.success("Xóa thiết bị thành công!");
        fetchDevices();
      } catch (error) {
        toastr.error("Lỗi khi xóa thiết bị");
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && currentId) {
        await axios.put(`${API_BASE_URL}/devices/${currentId}`, formData);
        toastr.success("Cập nhật thiết bị thành công!");
      } else {
        await axios.post(`${API_BASE_URL}/devices`, formData);
        toastr.success("Thêm mới thiết bị thành công!");
      }
      setShowModal(false);
      fetchDevices();
    } catch (error: any) {
      toastr.error(error.response?.data?.message || "Có lỗi xảy ra");
    }
  };

  // --- Excel Functions ---

  const handleDownloadTemplate = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/devices/template`, {
        responseType: 'blob', // Quan trọng: Nhận về dạng file
      });
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, 'Device_Import_Template.xlsx');
      toastr.success("Đã tải xuống file mẫu!");
    } catch (error) {
      toastr.error("Lỗi khi tải file mẫu");
    }
  };

  const handleImportSubmit = async () => {
    if (!selectedFile) {
      toastr.warning("Vui lòng chọn file Excel!");
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE_URL}/devices/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const { successCount, errorCount, errors } = res.data.data;
      
      if (successCount > 0) toastr.success(`Đã thêm thành công ${successCount} thiết bị.`);
      if (errorCount > 0) {
        toastr.warning(`Có ${errorCount} dòng lỗi.`);
        console.warn("Import Errors:", errors);
        alert(`Chi tiết lỗi:\n${errors.join('\n')}`); // Show lỗi chi tiết
      }

      setShowImportModal(false);
      setSelectedFile(null);
      fetchDevices();
    } catch (error: any) {
      toastr.error(error.response?.data?.message || "Lỗi khi import file");
    } finally {
      setLoading(false);
    }
  };

  // --- Helpers ---

  const handleOpenAdd = () => {
    setIsEditing(false);
    setFormData({ name: '', brand: '', model: '', category: '', unit: 'Cái', price: 0, description: '' });
    setShowModal(true);
  };

  const handleOpenEdit = (device: Device) => {
    setIsEditing(true);
    setCurrentId(device._id);
    setFormData({ ...device });
    setShowModal(true);
  };

  const filteredDevices = useMemo(() => {
    return devices.filter(d => 
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.brand.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [devices, searchTerm]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  return (
    <div className="device-container">
      
      {/* HEADER */}
      <div className="page-header">
        <div className="page-title">
          <h2>Quản lý Thiết bị & Tài sản</h2>
          <p className="page-subtitle">Danh mục các thiết bị có thể lắp đặt vào phòng</p>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="actions-bar">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            className="search-input" 
            placeholder="Tìm theo tên, model, hãng..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="button-group">
          <button className="btn btn-outline" onClick={handleDownloadTemplate}>
            <Download size={18} /> Tải mẫu Excel
          </button>
          <button className="btn btn-success" onClick={() => setShowImportModal(true)}>
            <FileSpreadsheet size={18} /> Import Excel
          </button>
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            <Plus size={18} /> Thêm thiết bị
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="table-container">
        <table className="device-table">
          <thead>
            <tr>
              <th style={{width: '25%'}}>Tên thiết bị</th>
              <th style={{width: '15%'}}>Model / Hãng</th>
              <th style={{width: '15%'}}>Danh mục</th>
              <th style={{width: '10%'}}>Đơn vị</th>
              <th style={{width: '15%'}}>Giá niêm yết</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredDevices.length > 0 ? (
              filteredDevices.map((device) => (
                <tr key={device._id}>
                  <td>
                    <div style={{fontWeight: 600}}>{device.name}</div>
                    <div style={{fontSize: 12, color: '#94a3b8', marginTop: 4}}>{device.description}</div>
                  </td>
                  <td>
                    <div>{device.model || '--'}</div>
                    <div style={{fontSize: 12, color: '#64748b'}}>{device.brand}</div>
                  </td>
                  <td>
                    <span style={{background: '#e0f2fe', color: '#0284c7', padding: '4px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600}}>
                      {device.category || 'Chung'}
                    </span>
                  </td>
                  <td>{device.unit}</td>
                  <td className="text-price">{formatCurrency(device.price)}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-icon" onClick={() => handleOpenEdit(device)} title="Sửa">
                        <Edit size={18} />
                      </button>
                      <button className="btn-icon delete" onClick={() => handleDelete(device._id)} title="Xóa">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} style={{textAlign: 'center', padding: '40px', color: '#94a3b8'}}>
                  {loading ? 'Đang tải dữ liệu...' : 'Không tìm thấy thiết bị nào.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- ADD / EDIT MODAL --- */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{isEditing ? 'Cập nhật thông tin' : 'Thêm thiết bị mới'}</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>Tên thiết bị <span style={{color: 'red'}}>*</span></label>
                    <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="VD: Máy lạnh Panasonic 1HP" />
                  </div>
                  <div className="form-group">
                    <label>Thương hiệu</label>
                    <input type="text" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} placeholder="VD: Panasonic" />
                  </div>
                  <div className="form-group">
                    <label>Model / Series</label>
                    <input type="text" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} placeholder="VD: CU/CS-N9WKH-8M" />
                  </div>
                  <div className="form-group">
                    <label>Danh mục</label>
                    <input type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="VD: Điện lạnh" />
                  </div>
                  <div className="form-group">
                    <label>Đơn vị tính</label>
                    <input type="text" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} />
                  </div>
                  <div className="form-group full-width">
                    <label>Giá tiền (VNĐ) <span style={{color: 'red'}}>*</span></label>
                    <input required type="number" min="0" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} />
                  </div>
                  <div className="form-group full-width">
                    <label>Mô tả chi tiết</label>
                    <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Thông số kỹ thuật, ghi chú..." />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Lưu lại</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- IMPORT EXCEL MODAL --- */}
      {showImportModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{width: '500px'}}>
            <div className="modal-header">
              <h3>Import dữ liệu từ Excel</h3>
              <button className="btn-icon" onClick={() => setShowImportModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div 
                className="upload-area"
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  hidden 
                  ref={fileInputRef} 
                  accept=".xlsx, .xls"
                  onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                />
                <Upload size={40} color="#94a3b8" style={{marginBottom: 10}} />
                {selectedFile ? (
                  <div>
                    <p style={{color: '#16a34a', fontWeight: 600}}>{selectedFile.name}</p>
                    <p style={{fontSize: 12, color: '#64748b'}}>Nhấn Import để tiến hành</p>
                  </div>
                ) : (
                  <div>
                    <p style={{fontWeight: 500}}>Click để chọn file Excel</p>
                    <p style={{fontSize: 12, color: '#94a3b8'}}>Chỉ hỗ trợ định dạng .xlsx, .xls</p>
                  </div>
                )}
              </div>
              <div style={{marginTop: 16, fontSize: 13, color: '#64748b'}}>
                <p>Lưu ý:</p>
                <ul style={{paddingLeft: 20, marginTop: 4}}>
                  <li>Sử dụng đúng file mẫu đã tải về.</li>
                  <li>Cột <b>Tên thiết bị</b> là bắt buộc.</li>
                  <li>Dữ liệu sẽ được thêm mới vào hệ thống.</li>
                </ul>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setShowImportModal(false)}>Hủy</button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleImportSubmit}
                disabled={!selectedFile || loading}
              >
                {loading ? 'Đang xử lý...' : 'Tiến hành Import'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ManagerDevice;
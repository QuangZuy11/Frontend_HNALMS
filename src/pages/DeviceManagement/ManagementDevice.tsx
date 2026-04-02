import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import {
  Plus, Search, Edit, Trash2,
  FileSpreadsheet, Upload, Download,
  X, Laptop, Wrench, AlertCircle,
  Filter, ChevronLeft, ChevronRight, AlertTriangle // Thêm icon AlertTriangle cho Modal lỗi
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
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterPrice, setFilterPrice] = useState('ALL');
  
  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);

  // [MỚI] State lưu trữ mảng lỗi khi Import Excel để hiển thị lên Custom Modal
  const [importErrors, setImportErrors] = useState<string[]>([]);

  // State cho Modal Xác nhận xóa
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    action: 'DELETE' | null;
    targetDevice: Device | null;
    message: string;
  }>({ isOpen: false, action: null, targetDevice: null, message: '' });

  // Form Data (Mặc định unit là 'Cái')
  const [formData, setFormData] = useState<Partial<Device>>({
    name: '', brand: '', model: '', category: '', unit: 'Cái', price: 0, description: ''
  });

  // Import File Ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // ==========================================
  // LOGIC PHÂN QUYỀN TỪ LOCAL STORAGE
  // ==========================================
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = currentUser?.role || ''; 
  const canModify = userRole === 'owner';
  // ==========================================

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

  // --- Lấy danh sách danh mục duy nhất từ data để làm Filter ---
  const uniqueCategories = useMemo(() => {
    const cats = new Set(devices.map(d => d.category || 'Chung'));
    return Array.from(cats);
  }, [devices]);

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

  const handleDelete = (device: Device) => {
    setConfirmModal({
      isOpen: true,
      action: 'DELETE',
      targetDevice: device,
      message: `Bạn có chắc chắn muốn xóa thiết bị "${device.name}"? Hành động này không thể hoàn tác.`
    });
  };

  const executeConfirmAction = async () => {
    if (!confirmModal.targetDevice) return;
    
    if (confirmModal.action === 'DELETE') {
      try {
        await axios.delete(`${API_BASE_URL}/devices/${confirmModal.targetDevice._id}`);
        toastr.success("Xóa thiết bị thành công!");
        
        // Nếu xóa phần tử cuối cùng của trang, lùi lại 1 trang
        if (currentItems.length === 1 && currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
        
        fetchDevices();
      } catch (error) {
        toastr.error("Lỗi khi xóa thiết bị");
      }
    }

    setConfirmModal({ isOpen: false, action: null, targetDevice: null, message: '' });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Ép cứng đơn vị tính là "Cái" trước khi gửi lên server
      const payload = { ...formData, unit: 'Cái' };

      if (isEditing && currentId) {
        await axios.put(`${API_BASE_URL}/devices/${currentId}`, payload);
        toastr.success("Cập nhật thiết bị thành công!");
      } else {
        await axios.post(`${API_BASE_URL}/devices`, payload);
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
        responseType: 'blob', 
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
      
      // [SỬA ĐỔI] Hiển thị Custom Modal thay vì alert() mặc định
      if (errorCount > 0) {
        toastr.warning(`Có ${errorCount} dòng lỗi. Vui lòng kiểm tra lại.`);
        setImportErrors(errors); // Kích hoạt hiển thị Modal Lỗi
      } else {
         setShowImportModal(false); // Chỉ đóng modal Import nếu không có lỗi nào
      }

      setSelectedFile(null); // Reset file đã chọn
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

  // Reset page về 1 mỗi khi đổi filter
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory, filterPrice]);

  // Logic Lọc (Filter & Search)
  const filteredDevices = useMemo(() => {
    let result = devices.filter(d => 
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.brand.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (filterCategory !== 'ALL') {
      result = result.filter(d => (d.category || 'Chung') === filterCategory);
    }

    if (filterPrice !== 'ALL') {
      if (filterPrice === 'under1m') result = result.filter(d => d.price < 1000000);
      else if (filterPrice === '1m-5m') result = result.filter(d => d.price >= 1000000 && d.price <= 5000000);
      else if (filterPrice === 'over5m') result = result.filter(d => d.price > 5000000);
    }

    return result;
  }, [devices, searchTerm, filterCategory, filterPrice]);

  // Logic Phân trang
  const totalPages = Math.ceil(filteredDevices.length / itemsPerPage);
  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredDevices.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredDevices, currentPage]);

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

      {/* TOOLBAR LỌC & TÌM KIẾM */}
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px', backgroundColor: '#fff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        
        {/* Nhóm Lọc (Bên trái) */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
          <div className="search-box" style={{ minWidth: '250px', flex: 1 }}>
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              className="search-input" 
              placeholder="Tìm theo tên, model, hãng..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={16} color="#64748b" />
            <select 
              value={filterCategory} 
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', color: '#334155' }}
            >
              <option value="ALL">Tất cả danh mục</option>
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <select 
              value={filterPrice} 
              onChange={(e) => setFilterPrice(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', color: '#334155' }}
            >
              <option value="ALL">Tất cả mức giá</option>
              <option value="under1m">Dưới 1 triệu</option>
              <option value="1m-5m">Từ 1 - 5 triệu</option>
              <option value="over5m">Trên 5 triệu</option>
            </select>
          </div>
        </div>

        {/* Nhóm Nút chức năng (Bên phải) */}
        {canModify && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button 
              className="btn btn-outline" 
              onClick={handleDownloadTemplate}
              style={{ height: '40px', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}
            >
              <Download size={18} /> Tải mẫu
            </button>
            <button 
              className="btn btn-success" 
              onClick={() => setShowImportModal(true)}
              style={{ height: '40px', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}
            >
              <FileSpreadsheet size={18} /> Import
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleOpenAdd}
              style={{ height: '40px', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}
            >
              <Plus size={18} /> Thêm thiết bị
            </button>
          </div>
        )}
      </div>

      {/* TABLE */}
      <div className="table-container">
        <table className="device-table">
          <thead>
            <tr>
              <th style={{width: '5%', textAlign: 'center'}}>STT</th>
              <th style={{width: '25%'}}>Tên thiết bị & Mô tả</th>
              <th style={{width: '15%'}}>Model / Hãng</th>
              <th style={{width: '15%'}}>Danh mục</th>
              <th style={{width: '15%', textAlign: 'right'}}>Giá niêm yết</th>
              {canModify && (
                <th style={{ textAlign: 'center', width: '15%' }}>Thao tác</th> 
              )}
            </tr>
          </thead>
          <tbody>
            {currentItems.length > 0 ? (
              currentItems.map((device, index) => (
                <tr key={device._id}>
                  {/* Cột STT tính toán dựa trên trang hiện tại */}
                  <td style={{ textAlign: 'center', fontWeight: 600, color: '#64748b' }}>
                    {(currentPage - 1) * itemsPerPage + index + 1}
                  </td>
                  
                  <td>
                    <div style={{fontWeight: 600, color: '#1e293b'}}>{device.name}</div>
                    {/* Giới hạn hiển thị mô tả, tự động xuống dòng */}
                    <div style={{fontSize: 12, color: '#64748b', marginTop: 4, wordBreak: 'break-word', lineHeight: '1.4'}}>
                      {device.description || <span style={{fontStyle: 'italic', opacity: 0.7}}>Chưa có mô tả</span>}
                    </div>
                  </td>
                  
                  <td>
                    <div style={{color: '#334155'}}>{device.model || '--'}</div>
                    <div style={{fontSize: 12, color: '#64748b'}}>{device.brand}</div>
                  </td>
                  
                  <td>
                    <span style={{background: '#e0f2fe', color: '#0284c7', padding: '4px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600}}>
                      {device.category || 'Chung'}
                    </span>
                  </td>
                  
                  <td className="text-price" style={{ textAlign: 'right' }}>
                    {formatCurrency(device.price)}
                  </td>
                  
                  {canModify && (
                    <td style={{ textAlign: 'center' }}>
                      <div className="action-buttons" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button className="btn-icon" onClick={() => handleOpenEdit(device)} title="Sửa">
                          <Edit size={18} />
                        </button>
                        <button className="btn-icon delete" onClick={() => handleDelete(device)} title="Xóa">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={canModify ? 6 : 5} style={{textAlign: 'center', padding: '40px', color: '#94a3b8'}}>
                  {loading ? 'Đang tải dữ liệu...' : 'Không tìm thấy thiết bị nào phù hợp.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* PHÂN TRANG (PAGINATION) */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
            <div style={{ fontSize: '14px', color: '#64748b' }}>
              Hiển thị <span style={{ fontWeight: 600, color: '#0f172a' }}>{(currentPage - 1) * itemsPerPage + 1}</span> đến <span style={{ fontWeight: 600, color: '#0f172a' }}>{Math.min(currentPage * itemsPerPage, filteredDevices.length)}</span> trong tổng số <span style={{ fontWeight: 600, color: '#0f172a' }}>{filteredDevices.length}</span> thiết bị
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: currentPage === 1 ? '#f1f5f9' : '#fff', color: currentPage === 1 ? '#94a3b8' : '#334155', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <ChevronLeft size={16} /> Trước
              </button>
              
              {/* Hiển thị số trang */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', fontWeight: 600, color: '#0f172a' }}>
                Trang {currentPage} / {totalPages}
              </div>

              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: currentPage === totalPages ? '#f1f5f9' : '#fff', color: currentPage === totalPages ? '#94a3b8' : '#334155', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}
              >
                Sau <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          CÁC MODAL
          ========================================================================= */}

      {/* --- 1. ADD / EDIT MODAL --- */}
      {canModify && showModal && (
        <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={() => setShowModal(false)}>
          <div className="modal-content" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ flexShrink: 0 }}>
              <h3>{isEditing ? 'Cập nhật thông tin' : 'Thêm thiết bị mới'}</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', margin: 0, padding: 0, flex: 1, overflow: 'hidden' }}>
              <div className="modal-body" style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
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
                    <input type="text" list="category-list" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="VD: Điện lạnh, Nội thất..." />
                    <datalist id="category-list">
                      {uniqueCategories.map(cat => <option key={cat} value={cat} />)}
                    </datalist>
                  </div>
                  <div className="form-group full-width">
                    <label>Giá tiền (VNĐ) <span style={{color: 'red'}}>*</span></label>
                    <input required type="number" min="0" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} />
                  </div>
                  <div className="form-group full-width">
                    <label>Mô tả chi tiết (Tối đa 100 ký tự)</label>
                    <textarea 
                      rows={3} 
                      maxLength={100}
                      value={formData.description} 
                      onChange={e => setFormData({...formData, description: e.target.value})} 
                      placeholder="Thông số kỹ thuật, ghi chú (Tối đa 100 ký tự)..." 
                    />
                    <div style={{ textAlign: 'right', fontSize: '12px', color: (formData.description?.length || 0) === 100 ? '#ef4444' : '#94a3b8' }}>
                      {formData.description?.length || 0}/100
                    </div>
                  </div>
                </div>
              </div>
              
              <div 
                className="modal-footer" 
                style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', margin: 0, flexShrink: 0, background: '#fff', display: 'flex', justifyContent: 'flex-end', gap: '16px' }}
              >
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  onClick={() => setShowModal(false)}
                  style={{ width: '120px', height: '42px', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 0, margin: 0, boxSizing: 'border-box' }}
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{ width: '120px', height: '42px', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 0, margin: 0, boxSizing: 'border-box' }}
                >
                  Lưu lại
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- 2. IMPORT EXCEL MODAL --- */}
      {canModify && showImportModal && (
        <div className="modal-overlay" style={{ zIndex: 1050 }} onClick={() => setShowImportModal(false)}>
          <div className="modal-content" style={{ width: '500px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ flexShrink: 0 }}>
              <h3>Import dữ liệu từ Excel</h3>
              <button className="btn-icon" onClick={() => setShowImportModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ padding: '24px', overflowY: 'auto' }}>
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
                  <li>Cột <b>Đơn vị</b> (nếu có trong mẫu) sẽ tự động được gán là "Cái" trên hệ thống.</li>
                  <li>Dữ liệu sẽ được thêm mới vào hệ thống.</li>
                </ul>
              </div>
            </div>
            <div 
              className="modal-footer" 
              style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', padding: '16px 24px', borderTop: '1px solid #e2e8f0', margin: 0, flexShrink: 0, background: '#fff' }}
            >
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={() => setShowImportModal(false)}
                style={{ width: '120px', height: '42px', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 0, margin: 0, boxSizing: 'border-box' }}
              >
                Hủy
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleImportSubmit}
                disabled={!selectedFile || loading}
                style={{ height: '42px', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 24px', boxSizing: 'border-box' }}
              >
                {loading ? 'Đang xử lý...' : 'Tiến hành Import'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- [MỚI] 2.1 CUSTOM MODAL THÔNG BÁO LỖI IMPORT --- */}
      {importErrors.length > 0 && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setImportErrors([])}>
          <div className="modal-content" style={{ width: '500px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ flexShrink: 0, borderBottom: '1px solid #fee2e2', paddingBottom: '16px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', margin: 0 }}>
                <AlertTriangle size={24} /> Có lỗi xảy ra khi Import
              </h3>
              <button className="btn-icon" onClick={() => setImportErrors([])}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ padding: '24px', overflowY: 'auto', flex: 1, backgroundColor: '#fef2f2' }}>
              <p style={{ color: '#b91c1c', fontWeight: 600, marginBottom: '12px' }}>Vui lòng kiểm tra và sửa lại các lỗi sau trong file Excel:</p>
              <ul style={{ color: '#991b1b', fontSize: '14px', lineHeight: '1.6', paddingLeft: '20px', margin: 0 }}>
                {importErrors.map((err, idx) => (
                  <li key={idx} style={{ marginBottom: '8px' }}>{err}</li>
                ))}
              </ul>
            </div>
            <div 
              className="modal-footer" 
              style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 24px', borderTop: '1px solid #e2e8f0', margin: 0, flexShrink: 0, background: '#fff' }}
            >
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setImportErrors([])}
                style={{ width: '120px', height: '42px', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 0, margin: 0, boxSizing: 'border-box' }}
              >
                Đóng lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- 3. MODAL XÁC NHẬN XÓA --- */}
      {canModify && confirmModal.isOpen && (
        <div className="modal-overlay" style={{ zIndex: 9999 }} onClick={() => setConfirmModal({ isOpen: false, action: null, targetDevice: null, message: '' })}>
          <div className="modal-content" style={{ width: '400px', textAlign: 'center', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <div style={{ background: '#fee2e2', padding: '12px', borderRadius: '50%' }}>
                <AlertCircle size={32} color="#ef4444" />
              </div>
            </div>
            <h3 style={{ marginTop: 0, color: '#1e293b', fontSize: '18px' }}>Xác nhận thao tác</h3>
            <p style={{ color: '#475569', margin: '16px 0 24px 0', lineHeight: '1.5' }}>
              {confirmModal.message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setConfirmModal({ isOpen: false, action: null, targetDevice: null, message: '' })}
                style={{ width: '120px', height: '42px', display: 'flex', justifyContent: 'center', alignItems: 'center', boxSizing: 'border-box' }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                style={{
                  width: '120px', height: '42px', display: 'flex', justifyContent: 'center', alignItems: 'center', boxSizing: 'border-box',
                  borderRadius: '6px', cursor: 'pointer', fontWeight: 600, border: 'none', background: '#ef4444', color: 'white',
                }}
                onClick={executeConfirmAction}
                disabled={loading}
              >
                {loading ? 'Đang xử lý...' : 'Đồng ý'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ManagerDevice;
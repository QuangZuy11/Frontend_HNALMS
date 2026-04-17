import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import {
  Plus, Search, Edit, Trash2,
  FileSpreadsheet, Download,
  Laptop, AlertTriangle, HardDrive, Cpu,
  Filter, ArrowUpDown,
  LayoutGrid, FileText, Sparkles, X, Upload, CheckCircle
} from 'lucide-react';
import { saveAs } from 'file-saver';
import './ManagementDevice.css';

import { AppModal } from '../../components/common/Modal';
import { Pagination } from '../../components/common/Pagination';
import { useToast } from '../../components/common/Toast';

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
  const { showToast } = useToast();

  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);

  // --- Filter & Sort States ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterPrice, setFilterPrice] = useState('ALL');
  const [sortOption, setSortOption] = useState('newest');

  // --- Pagination States ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // --- Modal States ---
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Device | null>(null);

  // Form Data (Mặc định unit là 'Cái')
  const [formData, setFormData] = useState<Partial<Device>>({
    name: '', brand: '', model: '', category: '', unit: 'Cái', price: 0, description: ''
  });

  // Import File Ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = currentUser?.role || '';
  const canModify = userRole === 'owner';

  useEffect(() => {
    fetchDevices();
  }, []);

  const uniqueCategories = useMemo(() => {
    const cats = new Set(devices.map(d => d.category || 'Chung'));
    return Array.from(cats);
  }, [devices]);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/devices`);
      setDevices(res.data.data || []);
    } catch {
      showToast('error', "Lỗi kết nối", "Không thể tải danh sách thiết bị!");
    } finally {
      setLoading(false);
    }
  };

  // Reset trang về 1 khi thay đổi bộ lọc
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory, filterPrice, sortOption]);

  const processedDevices = useMemo(() => {
    let result = [...devices];

    // 1. Tìm kiếm & Lọc Category
    result = result.filter(d => {
      const matchSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.brand.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = filterCategory === 'ALL' || (d.category || 'Chung') === filterCategory;
      return matchSearch && matchCat;
    });

    // 2. Lọc theo Khoảng Giá
    if (filterPrice !== 'ALL') {
      if (filterPrice === 'under1m') result = result.filter(d => d.price < 1000000);
      else if (filterPrice === '1m-5m') result = result.filter(d => d.price >= 1000000 && d.price <= 5000000);
      else if (filterPrice === 'over5m') result = result.filter(d => d.price > 5000000);
    }

    // 3. Sắp xếp
    switch (sortOption) {
      case 'price-asc': result.sort((a, b) => a.price - b.price); break;
      case 'price-desc': result.sort((a, b) => b.price - a.price); break;
      case 'name-asc': result.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'newest': default: break;
    }

    return result;
  }, [devices, searchTerm, filterCategory, filterPrice, sortOption]);

  const totalPages = Math.ceil(processedDevices.length / itemsPerPage);
  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedItems(processedDevices, startIndex, itemsPerPage);
  }, [processedDevices, currentPage]);

  // Helper cho phân trang vì slice cần index
  function processedItems(items: Device[], start: number, limit: number) {
    return items.slice(start, start + limit);
  }

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

  const handleDeleteClick = (device: Device) => {
    setItemToDelete(device);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await axios.delete(`${API_BASE_URL}/devices/${itemToDelete._id}`);
      showToast('success', "Thành công", "Xóa thiết bị thành công!");

      if (currentItems.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }

      fetchDevices();
      setShowDeleteModal(false);
      setItemToDelete(null);
    } catch {
      showToast('error', "Lỗi", "Có lỗi xảy ra khi xóa thiết bị.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...formData, unit: 'Cái' };
      if (isEditing && currentId) {
        await axios.put(`${API_BASE_URL}/devices/${currentId}`, payload);
        showToast('success', "Thành công", "Cập nhật thiết bị thành công!");
      } else {
        await axios.post(`${API_BASE_URL}/devices`, payload);
        showToast('success', "Thành công", "Thêm mới thiết bị thành công!");
      }
      setShowModal(false);
      fetchDevices();
    } catch (err: any) {
      const msg = err.response?.data?.message || "Không thể lưu thông tin thiết bị.";
      showToast('error', "Lỗi hệ thống", msg);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/devices/template`, { responseType: 'blob' });
      saveAs(new Blob([res.data]), 'Device_Import_Template.xlsx');
      showToast('info', "Thông báo", "Đã tải xuống file mẫu!");
    } catch {
      showToast('error', "Lỗi", "Không thể tải file mẫu.");
    }
  };

  const handleImportSubmit = async () => {
    if (!selectedFile) {
      showToast('warning', "Chú ý", "Vui lòng chọn file Excel!");
      return;
    }
    const importData = new FormData();
    importData.append('file', selectedFile);
    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE_URL}/devices/import`, importData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const { successCount, errorCount, errors } = res.data.data;
      if (successCount > 0) showToast('success', "Thành công", `Đã thêm ${successCount} thiết bị.`);
      if (errorCount > 0) {
        showToast('error', "Lỗi Import", `Có ${errorCount} dòng lỗi. Kiểm tra lại dữ liệu.`);
        console.error("Import Errors:", errors);
      }
      setShowImportModal(false);
      setSelectedFile(null);
      fetchDevices();
    } catch {
      showToast('error', "Lỗi hệ thống", "Lỗi khi import file.");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  const totalCount = devices.length;
  const categoryCount = uniqueCategories.length;
  const highValueCount = devices.filter(d => d.price > 5000000).length;

  return (
    <div className="device-container">
      {/* HEADER */}
      <div className="device-header">
        <div className="device-header-top">
          <div className="device-title-block">
            <div className="device-title-row">
              <div className="device-title-icon" style={{ 
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
                <Cpu size={22} strokeWidth={2} />
              </div>
              <div className="device-title-text">
                <h2>Quản lý Thiết bị & Tài sản</h2>
                <p className="device-subtitle">
                  Danh mục các thiết bị, tài sản có thể lắp đặt và quản lý trong tòa nhà.
                </p>
              </div>
            </div>
          </div>

          <div className="device-header-aside">
            <div className="stats-summary">
              <div className="stat-item">
                <FileText size={16} className="stat-icon icon-accent" />
                <div className="stat-text">
                  <span className="stat-value">{totalCount}</span>
                  <span className="stat-label">Tổng số</span>
                </div>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <LayoutGrid size={16} className="stat-icon icon-primary" />
                <div className="stat-text">
                  <span className="stat-value">{categoryCount}</span>
                  <span className="stat-label">Danh mục</span>
                </div>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <Sparkles size={16} className="stat-icon icon-warning" />
                <div className="stat-text">
                  <span className="stat-value">{highValueCount}</span>
                  <span className="stat-label">Giá trị cao</span>
                </div>
              </div>
            </div>

            {canModify && (
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn-outline" onClick={handleDownloadTemplate}>
                  <Download size={18} /> File mẫu
                </button>
                <button type="button" className="btn-success" onClick={() => setShowImportModal(true)}>
                  <FileSpreadsheet size={18} /> Import
                </button>
                <button type="button" className="btn-primary" onClick={handleOpenAdd}>
                  <Plus size={18} /> Thêm Thiết bị
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="device-toolbar">
        <div className="device-toolbar-left">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Tìm tên, model, hãng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="control-group">
            <Filter size={16} className="device-toolbar-icon" aria-hidden />
            <select
              className="custom-select"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="ALL">Tất cả danh mục</option>
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <select
              className="custom-select"
              value={filterPrice}
              onChange={(e) => setFilterPrice(e.target.value)}
            >
              <option value="ALL">Tất cả mức giá</option>
              <option value="under1m">Dưới 1.000.000đ</option>
              <option value="1m-5m">1.000.000đ - 5.000.000đ</option>
              <option value="over5m">Trên 5.000.000đ</option>
            </select>
          </div>
        </div>

        <div className="device-toolbar-right">
          <ArrowUpDown size={16} className="device-toolbar-icon" aria-hidden />
          <select
            className="custom-select"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
          >
            <option value="newest">Mới nhất</option>
            <option value="price-asc">Giá: Thấp đến Cao</option>
            <option value="price-desc">Giá: Cao đến Thấp</option>
            <option value="name-asc">Tên: A - Z</option>
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="device-table-container">
        <table className="device-table">
          <thead>
            <tr>
              <th className="cell-stt">STT</th>
              <th className="cell-name">Thiết bị & Mô tả</th>
              <th className="cell-info">Model / Hãng</th>
              <th className="cell-category">Danh mục</th>
              <th className="cell-price">Giá niêm yết</th>
              <th className="cell-actions">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length > 0 ? (
              currentItems.map((device, index) => (
                <tr key={device._id}>
                  <td className="cell-stt">
                    {(currentPage - 1) * itemsPerPage + index + 1}
                  </td>
                  <td className="cell-name">
                    <div className="main-text">{device.name}</div>
                    <div className="desc-text">
                      {device.description || "Chưa có mô tả"}
                    </div>
                  </td>
                  <td className="cell-info">
                    <div className="main-text">{device.model || '--'}</div>
                    <div className="brand-text">{device.brand}</div>
                  </td>
                  <td className="cell-category">
                    <span className="category-badge">
                      {device.category || 'Chung'}
                    </span>
                  </td>
                  <td className="cell-price">
                    {formatCurrency(device.price)}
                  </td>
                  <td className="cell-actions">
                    <div className="table-actions">
                      {canModify && (
                        <>
                          <button className="btn-icon btn-edit" onClick={() => handleOpenEdit(device)} title="Sửa">
                            <Edit size={16} />
                          </button>
                          <button className="btn-icon btn-delete" onClick={() => handleDeleteClick(device)} title="Xóa">
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="table-empty-cell">
                  {loading ? 'Đang tải dữ liệu...' : 'Không tìm thấy thiết bị nào.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={processedDevices.length}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* MODALS */}

      {/* 1. Modal Thêm/Sửa */}
      <AppModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={isEditing ? 'Cập nhật Thiết bị' : 'Thêm Thiết bị Mới'}
        icon={isEditing ? <Edit size={18} /> : <Plus size={18} />}
        color="blue"
        size="md"
        footer={
          <>
            <button type="button" className="ms-btn ms-btn--ghost" onClick={() => setShowModal(false)}>
              Hủy bỏ
            </button>
            <button type="submit" form="device-form" className="ms-btn ms-btn--primary">
              {isEditing ? <CheckCircle size={16} /> : <Plus size={16} />}
              {isEditing ? 'Cập nhật' : 'Thêm thiết bị'}
            </button>
          </>
        }
      >
        <form id="device-form" onSubmit={handleSubmit}>
          <div className="ms-field">
            <label className="ms-label">Tên thiết bị <span className="ms-label-required">*</span></label>
            <input
              type="text"
              className="ms-input"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="VD: Máy lạnh Panasonic 1HP..."
            />
          </div>

          <div className="ms-field-row" style={{ marginTop: '16px' }}>
            <div className="ms-field">
              <label className="ms-label">Thương hiệu</label>
              <input
                type="text"
                className="ms-input"
                value={formData.brand}
                onChange={e => setFormData({ ...formData, brand: e.target.value })}
                placeholder="VD: Panasonic"
              />
            </div>
            <div className="ms-field">
              <label className="ms-label">Model / Series</label>
              <input
                type="text"
                className="ms-input"
                value={formData.model}
                onChange={e => setFormData({ ...formData, model: e.target.value })}
                placeholder="VD: CU/CS-N9WKH-8M"
              />
            </div>
          </div>

          <div className="ms-field-row" style={{ marginTop: '16px' }}>
            <div className="ms-field">
              <label className="ms-label">Danh mục</label>
              <input
                type="text"
                className="ms-input"
                list="category-list"
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                placeholder="VD: Điện lạnh, Nội thất..."
              />
              <datalist id="category-list">
                {uniqueCategories.map(cat => <option key={cat} value={cat} />)}
              </datalist>
            </div>
            <div className="ms-field">
              <label className="ms-label">Giá niêm yết (VNĐ) <span className="ms-label-required">*</span></label>
              <input
                type="number"
                className="ms-input"
                required
                min="0"
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="ms-field" style={{ marginTop: '16px' }}>
            <label className="ms-label">Mô tả chi tiết</label>
            <textarea
              className="ms-textarea"
              maxLength={100}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Thông số kỹ thuật, ghi chú (Tối đa 100 ký tự)..."
            />
            <div style={{ textAlign: 'right', fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
              {formData.description?.length || 0}/100
            </div>
          </div>
        </form>
      </AppModal>

      {/* 2. Modal Import */}
      <AppModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import dữ liệu từ Excel"
        icon={<FileSpreadsheet size={18} />}
        color="green"
        size="md"
        footer={
          <>
            <button type="button" className="ms-btn ms-btn--ghost" onClick={() => setShowImportModal(false)}>
              Hủy bỏ
            </button>
            <button type="button" className="ms-btn ms-btn--primary" onClick={handleImportSubmit} disabled={!selectedFile || loading}>
              {loading ? 'Đang xử lý...' : 'Tiến hành Import'}
            </button>
          </>
        }
      >
        <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
          <input
            type="file"
            hidden
            ref={fileInputRef}
            accept=".xlsx, .xls"
            onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
          />
          <Upload size={40} color="#94a3b8" style={{ marginBottom: '12px' }} />
          {selectedFile ? (
            <div>
              <p style={{ color: '#059669', fontWeight: 600 }}>{selectedFile.name}</p>
              <p style={{ fontSize: '12px', color: '#64748b' }}>Sẵn sàng để import</p>
            </div>
          ) : (
            <div>
              <p style={{ fontWeight: 500 }}>Click để chọn file Excel</p>
              <p style={{ fontSize: '12px', color: '#94a3b8' }}>Chỉ hỗ trợ .xlsx, .xls</p>
            </div>
          )}
        </div>
        <div style={{ marginTop: '16px', fontSize: '13px', color: '#64748b' }}>
          <p style={{ fontWeight: 600, marginBottom: '4px' }}>Lưu ý:</p>
          <ul style={{ paddingLeft: '20px' }}>
            <li>Sử dụng đúng file mẫu để đảm bảo dữ liệu chính xác.</li>
            <li>Cột <b>Tên thiết bị</b> là thông tin bắt buộc.</li>
            <li>Đơn vị tính mặc định sẽ là "Cái".</li>
          </ul>
        </div>
      </AppModal>

      {/* 3. Modal Xóa */}
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
            Bạn có chắc muốn xóa thiết bị <b>{itemToDelete?.name}</b>? Toàn bộ dữ liệu này sẽ không thể phục hồi.
          </p>
        </div>
      </AppModal>
    </div>
  );
};

export default ManagerDevice;
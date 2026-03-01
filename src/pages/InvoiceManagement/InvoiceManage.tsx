import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  Plus, Search, Droplet, Send, FileText, X, RotateCcw
} from 'lucide-react';

// [MỚI] Import icon cho tính năng Sắp xếp từ MUI
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

import toastr from 'toastr';
import 'toastr/build/toastr.min.css';
import './InvoiceManage.css';

const API_BASE_URL = 'http://localhost:9999/api';

interface InvoiceItem {
  itemName: string;
  oldIndex?: number;
  newIndex?: number;
  usage: number;
  unitPrice: number;
  amount: number;
}

interface Invoice {
  _id: string;
  invoiceCode: string;
  roomId: { _id: string; name: string } | string | any;
  title: string;
  type: 'Periodic' | 'Incurred';
  totalAmount: number;
  status: 'Draft' | 'Unpaid' | 'Paid';
  dueDate: string;
  items?: InvoiceItem[]; 
}

const InvoiceManager = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterType, setFilterType] = useState<string>('All');

  // [MỚI] State lưu trạng thái sắp xếp
  const [sortConfig, setSortConfig] = useState<{ key: string | null, direction: 'asc' | 'desc' }>({ 
    key: null, 
    direction: 'asc' 
  });

  // Modals
  const [showReadingModal, setShowReadingModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false); 
  const [showBulkReadingModal, setShowBulkReadingModal] = useState(false);
  
  const [bulkData, setBulkData] = useState<Record<string, { eOld: number, eNew: number, wOld: number, wNew: number }>>({});
  const [occupiedRooms, setOccupiedRooms] = useState<any[]>([]);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    action: 'GENERATE' | 'RELEASE' | 'UNDO_READING' | null;
    targetId?: string;
    message: string;
  }>({ isOpen: false, action: null, message: '' });

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [services, setServices] = useState<any[]>([]);

  const [dualReadingForm, setDualReadingForm] = useState({
    elecOld: 0, elecNew: 0,
    waterOld: 0, waterNew: 0
  });

  const [latestReadings, setLatestReadings] = useState<{elecId: string | null, waterId: string | null}>({ elecId: null, waterId: null });

  useEffect(() => {
    toastr.options = { closeButton: true, positionClass: "toast-top-right", timeOut: 3000 };
    fetchInvoices();
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/services`);
      setServices(res.data.data || []);
    } catch (error) {
      console.error("Lỗi khi tải danh sách dịch vụ", error);
    }
  };

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/invoices`);
      setInvoices(res.data.data || []);
    } catch (error) { toastr.error("Lỗi tải hóa đơn"); } 
    finally { setLoading(false); }
  };

  const handleGenerateDrafts = async () => {
    try {
      const res = await axios.post(`${API_BASE_URL}/invoices/generate-drafts`);
      toastr.success(res.data.message || "Khởi tạo hóa đơn thành công!");
      fetchInvoices();
    } catch (error: any) { 
      toastr.error(error.response?.data?.message || "Lỗi tạo hóa đơn"); 
    }
  };

  const handleOpenReading = async (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    const rId = typeof invoice.roomId === 'object' ? invoice.roomId._id : invoice.roomId;
    
    setDualReadingForm({ elecOld: 0, elecNew: 0, waterOld: 0, waterNew: 0 });
    setLatestReadings({ elecId: null, waterId: null }); 
    setShowReadingModal(true);

    const elecService = services.find(s => ['điện', 'dien'].includes((s.name || s.serviceName || '').trim().toLowerCase()));
    const waterService = services.find(s => ['nước', 'nuoc'].includes((s.name || s.serviceName || '').trim().toLowerCase()));

    let eOld = 0, wOld = 0;
    let eId = null, wId = null;

    if (elecService) {
      try {
        const resE = await axios.get(`${API_BASE_URL}/meter-readings/latest?roomId=${rId}&utilityId=${elecService._id}`);
        if (resE.data?.data) {
          eOld = resE.data.data.newIndex;
          eId = resE.data.data._id; 
        }
      } catch (error) {}
    }

    if (waterService) {
      try {
        const resW = await axios.get(`${API_BASE_URL}/meter-readings/latest?roomId=${rId}&utilityId=${waterService._id}`);
        if (resW.data?.data) {
          wOld = resW.data.data.newIndex;
          wId = resW.data.data._id; 
        }
      } catch (error) {}
    }

    setDualReadingForm({ elecOld: eOld, elecNew: eOld, waterOld: wOld, waterNew: wOld });
    setLatestReadings({ elecId: eId, waterId: wId });
  };

  const handleSaveReading = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const rId = typeof selectedInvoice?.roomId === 'object' ? selectedInvoice.roomId._id : selectedInvoice?.roomId;
      const elecService = services.find(s => ['điện', 'dien'].includes((s.name || s.serviceName || '').trim().toLowerCase()));
      const waterService = services.find(s => ['nước', 'nuoc'].includes((s.name || s.serviceName || '').trim().toLowerCase()));

      const apiCalls = [];

      if (elecService && dualReadingForm.elecNew >= dualReadingForm.elecOld) {
        apiCalls.push({ roomId: rId, utilityId: elecService._id, oldIndex: dualReadingForm.elecOld, newIndex: dualReadingForm.elecNew });
      }

      if (waterService && dualReadingForm.waterNew >= dualReadingForm.waterOld) {
        apiCalls.push({ roomId: rId, utilityId: waterService._id, oldIndex: dualReadingForm.waterOld, newIndex: dualReadingForm.waterNew });
      }

      if (apiCalls.length === 0) {
        toastr.warning("Vui lòng nhập chỉ số mới lớn hơn chỉ số cũ!");
        return;
      }

      for (const payload of apiCalls) {
        await axios.post(`${API_BASE_URL}/meter-readings`, payload);
      }
      
      toastr.success("Lưu chỉ số điện/nước thành công!");
      setShowReadingModal(false);
      fetchInvoices(); 
    } catch (error: any) { 
      toastr.error(error.response?.data?.message || "Lỗi lưu chỉ số"); 
    }
  };

  const handleUndoReading = async (readingId: string) => {
    try {
      await axios.delete(`${API_BASE_URL}/meter-readings/${readingId}`);
      toastr.success("Đã hoàn tác lần chốt số bị sai. Vui lòng nhập lại số mới.");
      if (selectedInvoice) {
        handleOpenReading(selectedInvoice);
      }
    } catch (error) {
      toastr.error("Không thể hoàn tác lần chốt số này.");
    }
  };

  const handleOpenBulkReading = async () => {
    try {
      const roomsRes = await axios.get(`${API_BASE_URL}/rooms`);
      const allRooms = roomsRes.data.data || [];
      const activeRooms = allRooms.filter((r: any) => r.status === 'Occupied');

      if (activeRooms.length === 0) {
        toastr.warning("Không có phòng nào đang thuê để ghi điện nước!");
        return;
      }

      setOccupiedRooms(activeRooms);
      
      const initialData: any = {};
      activeRooms.forEach((r: any) => {
        initialData[r._id] = { eOld: 0, eNew: 0, wOld: 0, wNew: 0 };
      });
      setBulkData(initialData);
      setShowBulkReadingModal(true);

      const elecService = services.find(s => ['điện', 'dien'].includes((s.name || s.serviceName || '').trim().toLowerCase()));
      const waterService = services.find(s => ['nước', 'nuoc'].includes((s.name || s.serviceName || '').trim().toLowerCase()));

      const updatedData = { ...initialData };

      await Promise.all(activeRooms.map(async (room: any) => {
        if (elecService) {
          try {
            const res = await axios.get(`${API_BASE_URL}/meter-readings/latest?roomId=${room._id}&utilityId=${elecService._id}`);
            if (res.data?.data?.newIndex) {
              updatedData[room._id].eOld = res.data.data.newIndex;
              updatedData[room._id].eNew = res.data.data.newIndex; 
            }
          } catch (e) {}
        }
        if (waterService) {
          try {
            const res = await axios.get(`${API_BASE_URL}/meter-readings/latest?roomId=${room._id}&utilityId=${waterService._id}`);
            if (res.data?.data?.newIndex) {
              updatedData[room._id].wOld = res.data.data.newIndex;
              updatedData[room._id].wNew = res.data.data.newIndex;
            }
          } catch (e) {}
        }
      }));

      setBulkData({...updatedData});
    } catch (error) {
      toastr.error("Không thể lấy dữ liệu phòng");
    }
  };

  const handleSaveBulkReadings = async () => {
    const elecService = services.find(s => ['điện', 'dien'].includes((s.name || s.serviceName || '').trim().toLowerCase()));
    const waterService = services.find(s => ['nước', 'nuoc'].includes((s.name || s.serviceName || '').trim().toLowerCase()));

    const apiCalls = [];

    Object.keys(bulkData).forEach(roomId => {
      const data = bulkData[roomId];
      if (elecService && data.eNew >= data.eOld) {
        apiCalls.push({ roomId, utilityId: elecService._id, oldIndex: data.eOld, newIndex: data.eNew });
      }
      if (waterService && data.wNew >= data.wOld) {
        apiCalls.push({ roomId, utilityId: waterService._id, oldIndex: data.wOld, newIndex: data.wNew });
      }
    });

    if (apiCalls.length === 0) {
      toastr.warning("Chưa có chỉ số mới nào được cập nhật hợp lệ.");
      return;
    }

    try {
      setLoading(true);
      for (const payload of apiCalls) {
        await axios.post(`${API_BASE_URL}/meter-readings`, payload);
      }
      toastr.success(`Đã lưu thành công ${apiCalls.length} bản ghi chỉ số!`);
      setShowBulkReadingModal(false);
    } catch (error: any) {
      toastr.error("Có lỗi xảy ra khi lưu chỉ số hàng loạt.");
    } finally {
      setLoading(false);
    }
  };

  const handleRelease = async (id: string) => {
    try {
      await axios.put(`${API_BASE_URL}/invoices/${id}/release`);
      toastr.success("Phát hành hóa đơn thành công!");
      fetchInvoices();
    } catch (error: any) { toastr.error(error.response?.data?.message || "Lỗi phát hành"); }
  };

  const executeConfirmAction = async () => {
    if (confirmModal.action === 'GENERATE') {
      await handleGenerateDrafts();
    } else if (confirmModal.action === 'RELEASE' && confirmModal.targetId) {
      await handleRelease(confirmModal.targetId);
    } else if (confirmModal.action === 'UNDO_READING' && confirmModal.targetId) {
      await handleUndoReading(confirmModal.targetId);
    }
    setConfirmModal({ isOpen: false, action: null, message: '' });
  };

  const handleViewDetail = async (id: string) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/invoices/${id}`);
      setSelectedInvoice(res.data.data);
      setShowDetailModal(true);
    } catch (error) {
      toastr.error("Không thể lấy chi tiết hóa đơn");
    }
  };

  const formatCurrency = (val: number) => {
    if (isNaN(val) || val === null || val === undefined) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };
  
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('vi-VN');

  // ==========================================
  // [MỚI] HÀM YÊU CẦU SẮP XẾP (Đảo chiều)
  // ==========================================
  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // ==========================================
  // [MỚI] KẾT HỢP VỪA LỌC, TÌM KIẾM & SẮP XẾP DỮ LIỆU
  // ==========================================
  const sortedAndFilteredInvoices = useMemo(() => {
    // 1. Lọc trước
    const filtered = invoices.filter(inv => {
      const matchSearch = 
        inv.invoiceCode.toLowerCase().includes(searchTerm.toLowerCase()) || 
        inv.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === 'All' || inv.status === filterStatus;
      const matchType = filterType === 'All' || inv.type === filterType;
      return matchSearch && matchStatus && matchType;
    });

    // 2. Sắp xếp sau khi đã lọc
    if (sortConfig.key !== null) {
      filtered.sort((a: any, b: any) => {
        let valA = a[sortConfig.key!];
        let valB = b[sortConfig.key!];

        // Nếu là Phòng thì móc tên phòng ra để so sánh chữ cái
        if (sortConfig.key === 'roomId') {
          valA = typeof a.roomId === 'object' ? a.roomId.name : a.roomId;
          valB = typeof b.roomId === 'object' ? b.roomId.name : b.roomId;
        }

        // Nếu là Hạn chót thì ép về dạng Thời gian để so sánh
        if (sortConfig.key === 'dueDate') {
          valA = new Date(valA).getTime();
          valB = new Date(valB).getTime();
        }

        // Logic so sánh (Tăng dần / Giảm dần)
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [invoices, searchTerm, filterStatus, filterType, sortConfig]);

  const elecServiceInfo = services.find(s => ['điện', 'dien'].includes((s.name || s.serviceName || '').trim().toLowerCase()));
  const waterServiceInfo = services.find(s => ['nước', 'nuoc'].includes((s.name || s.serviceName || '').trim().toLowerCase()));

  // ==========================================
  // [MỚI] COMPONENT RENDER TIÊU ĐỀ CỘT CÓ ICON SẮP XẾP
  // ==========================================
  const renderSortableHeader = (label: string, key: string) => {
    const isSorted = sortConfig.key === key;
    return (
      <th 
        onClick={() => requestSort(key)} 
        style={{ cursor: 'pointer', userSelect: 'none' }}
        title="Nhấn để sắp xếp"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {label}
          {isSorted ? (
            sortConfig.direction === 'asc' 
              ? <KeyboardArrowUpIcon fontSize="small" style={{ color: '#2563eb' }} /> 
              : <KeyboardArrowDownIcon fontSize="small" style={{ color: '#2563eb' }} />
          ) : (
            <UnfoldMoreIcon fontSize="small" style={{ color: '#cbd5e1' }} />
          )}
        </div>
      </th>
    );
  };

  return (
    <div className="invoice-container">
      <div className="page-header">
        <div>
          <h2>Quản lý Hóa đơn & Chỉ số</h2>
          <p>Quy trình: Tạo Hóa đơn (Nháp) ➔ Nhập Điện Nước ➔ Phát hành (Chưa thu)</p>
        </div>
      </div>

      <div className="actions-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ position: 'relative', width: '450px' }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: 10, color: '#64748b' }} />
            <input 
              type="text" 
              placeholder="Tìm mã HĐ, tiêu đề..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '10px 10px 10px 36px', borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ width: '200px', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none', background: '#fff', color: '#334155', cursor: 'pointer', boxSizing: 'border-box' }}
          >
            <option value="All">Tất cả trạng thái</option>
            <option value="Draft">Bản Nháp (Chưa gửi)</option>
            <option value="Unpaid">Chưa thu (Đang nợ)</option>
            <option value="Paid">Đã thu (Hoàn tất)</option>
          </select>

          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            style={{ width: '200px', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none', background: '#fff', color: '#334155', cursor: 'pointer', boxSizing: 'border-box' }}
          >
            <option value="All">Tất cả loại HĐ</option>
            <option value="Periodic">Định kỳ (Tháng)</option>
            <option value="Incurred">Phát sinh (Sửa chữa)</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="btn btn-outline" 
            style={{ whiteSpace: 'nowrap', borderColor: '#0ea5e9', color: '#0ea5e9' }} 
            onClick={handleOpenBulkReading}
          >
            <Droplet size={18} /> Ghi Điện Nước Hàng Loạt
          </button>

          <button 
            className="btn btn-primary" 
            style={{ whiteSpace: 'nowrap' }} 
            onClick={() => setConfirmModal({
              isOpen: true, 
              action: 'GENERATE', 
              message: 'Hệ thống sẽ tự động tạo hóa đơn nháp cho tháng hiện tại. Bạn có chắc chắn muốn tiếp tục?'
            })}
          >
            <Plus size={18} /> Tạo Hóa Đơn Tháng Này
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="invoice-table">
          <thead>
            <tr>
              {/* [SỬA LẠI] Dùng hàm gọi Tiêu đề Cột kèm Icon */}
              {renderSortableHeader("Mã HĐ", "invoiceCode")}
              {renderSortableHeader("Phòng", "roomId")}
              {renderSortableHeader("Tiêu đề", "title")}
              {renderSortableHeader("Tổng tiền", "totalAmount")}
              {renderSortableHeader("Hạn chót", "dueDate")}
              {renderSortableHeader("Trạng thái", "status")}
              <th>Thao tác</th> {/* Cột thao tác không cho Sort */}
            </tr>
          </thead>
          <tbody>
            {/* [SỬA LẠI] Render từ mảng đã Sort & Lọc */}
            {sortedAndFilteredInvoices.map((inv) => (
              <tr key={inv._id}>
                <td className="text-code">{inv.invoiceCode}</td>
                <td style={{ fontWeight: 600 }}>{typeof inv.roomId === 'object' ? inv.roomId.name : inv.roomId}</td>
                <td>{inv.title}</td>
                <td className="text-price">{formatCurrency(inv.totalAmount)}</td>
                <td>{formatDate(inv.dueDate)}</td>
                <td>
                  <span className={`status-badge status-${inv.status.toLowerCase()}`}>
                    {inv.status === 'Draft' ? 'Bản Nháp' : inv.status === 'Unpaid' ? 'Chưa thu' : 'Đã thu'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {inv.status === 'Draft' && (
                      <>
                        <button className="btn-icon" title="Nhập Điện/Nước" onClick={() => handleOpenReading(inv)}>
                          <Droplet size={18} color="#0284c7" />
                        </button>
                        
                        <button 
                          className="btn-icon" 
                          title="Phát hành (Release)" 
                          onClick={() => setConfirmModal({
                            isOpen: true, 
                            action: 'RELEASE', 
                            targetId: inv._id, 
                            message: 'Phát hành hóa đơn này? Khách thuê sẽ nhận được thông báo thanh toán qua ứng dụng.'
                          })}
                        >
                          <Send size={18} color="#16a34a" />
                        </button>
                      </>
                    )}
                    <button className="btn-icon" title="Xem chi tiết" onClick={() => handleViewDetail(inv._id)}>
                      <FileText size={18} color="#475569" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            
            {/* Hiển thị khi không có dữ liệu nào khớp với tìm kiếm/lọc */}
            {sortedAndFilteredInvoices.length === 0 && (
               <tr>
                 <td colSpan={7} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                   Không tìm thấy hóa đơn nào khớp với kết quả lọc.
                 </td>
               </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL 2: NHẬP CHỈ SỐ CÁ NHÂN KÈM NÚT SỬA SAI */}
      {showReadingModal && selectedInvoice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '600px' }}>
            <div className="modal-header">
              <h3>Nhập chỉ số - {typeof selectedInvoice.roomId === 'object' ? selectedInvoice.roomId.name : 'Phòng'}</h3>
              <button onClick={() => setShowReadingModal(false)} className="btn-icon"><X size={20}/></button>
            </div>
            <form onSubmit={handleSaveReading}>
              <div className="modal-body">
                
                {/* KHU VỰC ĐIỆN */}
                {elecServiceInfo && (
                  <div style={{ background: '#fffbeb', padding: '16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #fde68a' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h4 style={{ margin: 0, color: '#b45309', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        ⚡ Chỉ số Điện
                        <span style={{ fontSize: '13px', fontWeight: 'normal', color: '#64748b' }}>
                          (Giá: {formatCurrency(elecServiceInfo.currentPrice || elecServiceInfo.price || 0)} / kWh)
                        </span>
                      </h4>
                      
                      {latestReadings.elecId && (
                        <button 
                          type="button" 
                          style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}
                          onClick={() => setConfirmModal({
                            isOpen: true,
                            action: 'UNDO_READING',
                            targetId: latestReadings.elecId || '',
                            message: 'Lần chốt số này bị nhập sai? Bấm Đồng ý để xóa lần chốt cuối cùng đi và tự động lấy lại chỉ số của tháng trước.'
                          })}
                        >
                          <RotateCcw size={14} /> Sửa sai
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Chỉ số tháng cũ</label>
                        <input 
                          type="number" 
                          disabled 
                          value={dualReadingForm.elecOld} 
                          style={{ background: '#f1f5f9', cursor: 'not-allowed' }}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Chỉ số tháng này</label>
                        <input 
                          type="number" 
                          min={dualReadingForm.elecOld} 
                          required 
                          value={dualReadingForm.elecNew} 
                          onChange={e => setDualReadingForm({...dualReadingForm, elecNew: Number(e.target.value)})} 
                        />
                      </div>
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '14px', fontWeight: 600, color: '#b45309' }}>
                      Sử dụng: {Math.max(0, dualReadingForm.elecNew - dualReadingForm.elecOld)} kWh
                    </div>
                  </div>
                )}

                {/* KHU VỰC NƯỚC */}
                {waterServiceInfo && (
                  <div style={{ background: '#f0f9ff', padding: '16px', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h4 style={{ margin: 0, color: '#0369a1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        💧 Chỉ số Nước
                        <span style={{ fontSize: '13px', fontWeight: 'normal', color: '#64748b' }}>
                          (Giá: {formatCurrency(waterServiceInfo.currentPrice || waterServiceInfo.price || 0)} / Khối)
                        </span>
                      </h4>

                      {latestReadings.waterId && (
                        <button 
                          type="button" 
                          style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}
                          onClick={() => setConfirmModal({
                            isOpen: true,
                            action: 'UNDO_READING',
                            targetId: latestReadings.waterId || '',
                            message: 'Lần chốt số này bị nhập sai? Bấm Đồng ý để xóa lần chốt cuối cùng đi và tự động lấy lại chỉ số của tháng trước.'
                          })}
                        >
                          <RotateCcw size={14} /> Sửa sai
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Chỉ số tháng cũ</label>
                        <input 
                          type="number" 
                          disabled 
                          value={dualReadingForm.waterOld} 
                          style={{ background: '#f1f5f9', cursor: 'not-allowed' }}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Chỉ số tháng này</label>
                        <input 
                          type="number" 
                          min={dualReadingForm.waterOld} 
                          required 
                          value={dualReadingForm.waterNew} 
                          onChange={e => setDualReadingForm({...dualReadingForm, waterNew: Number(e.target.value)})} 
                        />
                      </div>
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '14px', fontWeight: 600, color: '#0369a1' }}>
                      Sử dụng: {Math.max(0, dualReadingForm.waterNew - dualReadingForm.waterOld)} Khối
                    </div>
                  </div>
                )}

              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowReadingModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Lưu & Tính tổng tiền</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CHI TIẾT HÓA ĐƠN */}
      {showDetailModal && selectedInvoice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '650px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={20}/> Chi tiết Hóa đơn
              </h3>
              <button onClick={() => setShowDetailModal(false)} className="btn-icon"><X size={20}/></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="detail-row">
                <span className="detail-label">Mã hóa đơn:</span>
                <span className="detail-value text-code">{selectedInvoice.invoiceCode}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Phòng:</span>
                <span className="detail-value" style={{ fontWeight: 'bold' }}>
                  {typeof selectedInvoice.roomId === 'object' ? selectedInvoice.roomId.name : selectedInvoice.roomId}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Tiêu đề:</span>
                <span className="detail-value">{selectedInvoice.title}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Hạn thanh toán:</span>
                <span className="detail-value" style={{ color: '#ef4444' }}>
                  {formatDate(selectedInvoice.dueDate)}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Trạng thái:</span>
                <span className="detail-value" style={{ textAlign: 'left' }}>
                  <span className={`status-badge status-${selectedInvoice.status.toLowerCase()}`}>
                    {selectedInvoice.status === 'Draft' ? 'Bản Nháp' : selectedInvoice.status === 'Unpaid' ? 'Chưa thu' : 'Đã thu'}
                  </span>
                </span>
              </div>

              {selectedInvoice.items && selectedInvoice.items.length > 0 && (
                <div style={{ marginTop: '20px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  <table className="invoice-table" style={{ margin: 0, width: '100%', fontSize: '14px' }}>
                    <thead style={{ background: '#f8fafc' }}>
                      <tr>
                        <th style={{ padding: '10px 12px', textAlign: 'left' }}>Nội dung thu</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center' }}>Số lượng</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Đơn giá</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.items.map((item, index) => (
                        <tr key={index} style={{ borderTop: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '10px 12px' }}>{item.itemName}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>{item.usage}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b' }}>
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>
                            {formatCurrency(item.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              <div className="detail-row" style={{ borderBottom: 'none', marginTop: 12, background: '#f1f5f9', padding: 16, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap' }}>
                <span className="detail-label" style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', width: 'auto', marginRight: '20px' }}>
                  TỔNG THANH TOÁN:
                </span>
                <span className="detail-value text-price" style={{ fontSize: 22, color: '#2563eb', fontWeight: 700, whiteSpace: 'nowrap', textAlign: 'right' }}>
                  {formatCurrency(selectedInvoice.totalAmount)}
                </span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowDetailModal(false)}>Đóng lại</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: HỘP THOẠI XÁC NHẬN CHUYÊN NGHIỆP */}
      {confirmModal.isOpen && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ width: '400px', textAlign: 'center', padding: '24px' }}>
            <h3 style={{ marginTop: 0, color: '#1e293b', fontSize: '18px' }}>Xác nhận thao tác</h3>
            <p style={{ color: '#475569', margin: '16px 0 24px 0', lineHeight: '1.5' }}>
              {confirmModal.message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button 
                className="btn btn-outline" 
                onClick={() => setConfirmModal({ isOpen: false, action: null, message: '' })}
              >
                Hủy bỏ
              </button>
              <button 
                className="btn btn-primary" 
                onClick={executeConfirmAction}
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: GHI CHỈ SỐ HÀNG LOẠT */}
      {showBulkReadingModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '900px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3>⚡ Ghi Chỉ Số Điện Nước Hàng Loạt</h3>
              <button onClick={() => setShowBulkReadingModal(false)} className="btn-icon"><X size={20}/></button>
            </div>
            <div className="modal-body" style={{ padding: '0' }}>
              <div style={{ padding: '16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '14px' }}>
                * Vui lòng nhập <b>chỉ số mới</b> cho các phòng. Hệ thống đã tự động lấy chỉ số cũ của tháng trước. Chỉ những phòng có số mới lớn hơn số cũ mới được lưu.
              </div>
              <table className="invoice-table" style={{ margin: 0 }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={{ width: '20%' }}>Phòng</th>
                    <th style={{ width: '20%' }}>Điện Cũ</th>
                    <th style={{ width: '20%' }}>Điện Mới</th>
                    <th style={{ width: '20%' }}>Nước Cũ</th>
                    <th style={{ width: '20%' }}>Nước Mới</th>
                  </tr>
                </thead>
                <tbody>
                  {occupiedRooms.map(room => (
                    <tr key={room._id}>
                      <td style={{ fontWeight: 'bold', color: '#0f172a' }}>{room.name}</td>
                      <td>
                        <input type="number" disabled value={bulkData[room._id]?.eOld || 0} style={{ width: '80px', padding: '6px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 4, cursor: 'not-allowed' }} />
                      </td>
                      <td>
                        <input type="number" min={bulkData[room._id]?.eOld || 0} value={bulkData[room._id]?.eNew || 0} 
                          onChange={(e) => setBulkData({ ...bulkData, [room._id]: { ...bulkData[room._id], eNew: Number(e.target.value) } })}
                          style={{ width: '100px', padding: '6px', border: '1px solid #3b82f6', borderRadius: 4 }} />
                      </td>
                      <td>
                        <input type="number" disabled value={bulkData[room._id]?.wOld || 0} style={{ width: '80px', padding: '6px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 4, cursor: 'not-allowed' }} />
                      </td>
                      <td>
                        <input type="number" min={bulkData[room._id]?.wOld || 0} value={bulkData[room._id]?.wNew || 0} 
                          onChange={(e) => setBulkData({ ...bulkData, [room._id]: { ...bulkData[room._id], wNew: Number(e.target.value) } })}
                          style={{ width: '100px', padding: '6px', border: '1px solid #0ea5e9', borderRadius: 4 }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0' }}>
              <button className="btn btn-outline" onClick={() => setShowBulkReadingModal(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleSaveBulkReadings} disabled={loading}>
                {loading ? 'Đang lưu...' : 'Lưu TẤT CẢ chỉ số'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default InvoiceManager;
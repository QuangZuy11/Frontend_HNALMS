import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Plus, Search, Droplet, Send, FileText, X
} from 'lucide-react';
import toastr from 'toastr';
import 'toastr/build/toastr.min.css';
import './InvoiceManage.css';

const API_BASE_URL = 'http://localhost:9999/api';

interface Invoice {
  _id: string;
  invoiceCode: string;
  roomId: { _id: string; name: string } | string;
  title: string;
  type: 'Periodic' | 'Incurred';
  totalAmount: number;
  status: 'Draft' | 'Unpaid' | 'Paid';
  dueDate: string;
}

const InvoiceManager = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showReadingModal, setShowReadingModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false); // [MỚI] State mở chi tiết
  
  // Data for Generate Drafts
  const [generateData, setGenerateData] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), dueDate: '' });
  
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [services, setServices] = useState<any[]>([]);

  // State lưu trữ chỉ số Gộp (Điện + Nước)
  const [dualReadingForm, setDualReadingForm] = useState({
    elecOld: 0, elecNew: 0,
    waterOld: 0, waterNew: 0
  });

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

  const handleGenerateDrafts = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_BASE_URL}/invoices/generate-drafts`, generateData);
      toastr.success(res.data.message);
      setShowGenerateModal(false);
      fetchInvoices();
    } catch (error: any) { toastr.error(error.response?.data?.message || "Lỗi tạo hóa đơn"); }
  };

  // Mở form và TỰ ĐỘNG GỌI API LẤY CHỈ SỐ CŨ
  const handleOpenReading = async (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    const rId = typeof invoice.roomId === 'object' ? invoice.roomId._id : invoice.roomId;
    
    // Mở modal trước với số 0 để người dùng không phải đợi
    setDualReadingForm({ elecOld: 0, elecNew: 0, waterOld: 0, waterNew: 0 });
    setShowReadingModal(true);

    // Tìm ID dịch vụ Điện, Nước
    const elecService = services.find(s => ['điện', 'dien'].includes((s.name || s.serviceName || '').trim().toLowerCase()));
    const waterService = services.find(s => ['nước', 'nuoc'].includes((s.name || s.serviceName || '').trim().toLowerCase()));

    let eOld = 0, wOld = 0;

    // Gọi API lấy chỉ số điện cũ
    if (elecService) {
      try {
        const resE = await axios.get(`${API_BASE_URL}/meter-readings/latest?roomId=${rId}&utilityId=${elecService._id}`);
        if (resE.data?.data?.newIndex) eOld = resE.data.data.newIndex;
      } catch (error) { console.log("Phòng chưa có chỉ số điện cũ"); }
    }

    // Gọi API lấy chỉ số nước cũ
    if (waterService) {
      try {
        const resW = await axios.get(`${API_BASE_URL}/meter-readings/latest?roomId=${rId}&utilityId=${waterService._id}`);
        if (resW.data?.data?.newIndex) wOld = resW.data.data.newIndex;
      } catch (error) { console.log("Phòng chưa có chỉ số nước cũ"); }
    }

    // Cập nhật lại form với số cũ
    setDualReadingForm({ elecOld: eOld, elecNew: eOld, waterOld: wOld, waterNew: wOld });
  };

  // Lưu song song Điện và Nước
// Hàm handleSaveReading
  const handleSaveReading = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const rId = typeof selectedInvoice?.roomId === 'object' ? selectedInvoice.roomId._id : selectedInvoice?.roomId;
      const elecService = services.find(s => ['điện', 'dien'].includes((s.name || s.serviceName || '').trim().toLowerCase()));
      const waterService = services.find(s => ['nước', 'nuoc'].includes((s.name || s.serviceName || '').trim().toLowerCase()));

      const apiCalls = [];

      // Kiểm tra nếu có nhập số điện
      if (elecService && dualReadingForm.elecNew > dualReadingForm.elecOld) {
        // [SỬA LẠI] Không đẩy Promise chưa chạy vào mảng nữa, mà tạo object cấu hình
        apiCalls.push({
          roomId: rId,
          utilityId: elecService._id,
          oldIndex: dualReadingForm.elecOld,
          newIndex: dualReadingForm.elecNew
        });
      }

      // Kiểm tra nếu có nhập số nước
      if (waterService && dualReadingForm.waterNew > dualReadingForm.waterOld) {
        apiCalls.push({
          roomId: rId,
          utilityId: waterService._id,
          oldIndex: dualReadingForm.waterOld,
          newIndex: dualReadingForm.waterNew
        });
      }

      if (apiCalls.length === 0) {
        toastr.warning("Vui lòng nhập chỉ số mới lớn hơn chỉ số cũ!");
        return;
      }

      // [SỬA ĐỔI QUAN TRỌNG Ở ĐÂY] Chạy Vòng lặp tuần tự thay vì Promise.all
      // Vòng lặp này đảm bảo API 1 chạy xong, DB lưu xong rồi mới chạy API 2
      for (const payload of apiCalls) {
        await axios.post(`${API_BASE_URL}/meter-readings`, payload);
      }
      
      toastr.success("Lưu chỉ số điện/nước và tính tiền thành công!");
      setShowReadingModal(false);
      fetchInvoices(); 
    } catch (error: any) { 
      toastr.error(error.response?.data?.message || "Lỗi lưu chỉ số"); 
    }
  };

  const handleRelease = async (id: string) => {
    if(!window.confirm("Phát hành hóa đơn này? Khách thuê sẽ nhận được thông báo thanh toán.")) return;
    try {
      await axios.put(`${API_BASE_URL}/invoices/${id}/release`);
      toastr.success("Phát hành hóa đơn thành công!");
      fetchInvoices();
    } catch (error: any) { toastr.error(error.response?.data?.message || "Lỗi phát hành"); }
  };

  // [MỚI] Hàm lấy dữ liệu và mở Modal xem chi tiết hóa đơn
  const handleViewDetail = async (id: string) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/invoices/${id}`);
      setSelectedInvoice(res.data.data);
      setShowDetailModal(true);
    } catch (error) {
      toastr.error("Không thể lấy chi tiết hóa đơn");
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('vi-VN');

  const filteredInvoices = invoices.filter(inv => inv.invoiceCode.includes(searchTerm) || inv.title.includes(searchTerm));

  // --- RENDERING DỮ LIỆU ĐIỆN NƯỚC CHO FORM ---
  const elecServiceInfo = services.find(s => ['điện', 'dien'].includes((s.name || s.serviceName || '').trim().toLowerCase()));
  const waterServiceInfo = services.find(s => ['nước', 'nuoc'].includes((s.name || s.serviceName || '').trim().toLowerCase()));

  return (
    <div className="invoice-container">
      <div className="page-header">
        <div>
          <h2>Quản lý Hóa đơn & Chỉ số</h2>
          <p>Luồng: Tạo Hóa đơn (Nháp) ➔ Nhập Điện Nước ➔ Phát hành (Chưa thu)</p>
        </div>
      </div>

      <div className="actions-bar">
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: 12, top: 10, color: '#64748b' }} />
          <input type="text" placeholder="Tìm kiếm..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '10px 10px 10px 36px', borderRadius: 8, border: '1px solid #e2e8f0' }}/>
        </div>

        <button className="btn btn-primary" onClick={() => setShowGenerateModal(true)}>
          <Plus size={18} /> Tạo Hóa Đơn Tháng
        </button>
      </div>

      <div className="table-container">
        <table className="invoice-table">
          <thead>
            <tr>
              <th>Mã HĐ</th>
              <th>Phòng</th>
              <th>Tiêu đề</th>
              <th>Tổng tiền</th>
              <th>Hạn chót</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map((inv) => (
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
                        <button className="btn-icon" title="Phát hành (Release)" onClick={() => handleRelease(inv._id)}>
                          <Send size={18} color="#16a34a" />
                        </button>
                      </>
                    )}
                    {/* [SỬA ĐỔI] Gắn sự kiện mở chi tiết */}
                    <button className="btn-icon" title="Xem chi tiết" onClick={() => handleViewDetail(inv._id)}>
                      <FileText size={18} color="#475569" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL 1: TẠO HÓA ĐƠN */}
      {showGenerateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Tạo Hóa Đơn Định Kỳ</h3>
              <button onClick={() => setShowGenerateModal(false)} className="btn-icon"><X size={20}/></button>
            </div>
            <form onSubmit={handleGenerateDrafts}>
              <div className="modal-body">
                <p style={{marginBottom: 16, color: '#64748b'}}>Hệ thống sẽ tự động tạo hóa đơn trạng thái <b>Bản Nháp</b> cho tất cả các phòng đang thuê.</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label>Tháng</label>
                    <input type="number" min="1" max="12" required value={generateData.month} onChange={e => setGenerateData({...generateData, month: Number(e.target.value)})} />
                  </div>
                  <div className="form-group">
                    <label>Năm</label>
                    <input type="number" min="2020" required value={generateData.year} onChange={e => setGenerateData({...generateData, year: Number(e.target.value)})} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Hạn thanh toán</label>
                  <input type="date" required value={generateData.dueDate} onChange={e => setGenerateData({...generateData, dueDate: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowGenerateModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Khởi tạo Hóa đơn</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: NHẬP CHỈ SỐ ĐIỆN NƯỚC (FORM GỘP) */}
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
                    <h4 style={{ margin: '0 0 12px 0', color: '#b45309', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      ⚡ Chỉ số Điện
                      <span style={{ fontSize: '13px', fontWeight: 'normal', color: '#64748b' }}>
                        (Giá: {formatCurrency(elecServiceInfo.currentPrice || elecServiceInfo.price || 0)} / kWh)
                      </span>
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Chỉ số tháng cũ</label>
                        <input type="number" min="0" required value={dualReadingForm.elecOld} onChange={e => setDualReadingForm({...dualReadingForm, elecOld: Number(e.target.value)})} />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Chỉ số tháng này</label>
                        <input type="number" min="0" required value={dualReadingForm.elecNew} onChange={e => setDualReadingForm({...dualReadingForm, elecNew: Number(e.target.value)})} />
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
                    <h4 style={{ margin: '0 0 12px 0', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      💧 Chỉ số Nước
                      <span style={{ fontSize: '13px', fontWeight: 'normal', color: '#64748b' }}>
                        (Giá: {formatCurrency(waterServiceInfo.currentPrice || waterServiceInfo.price || 0)} / Khối)
                      </span>
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Chỉ số tháng cũ</label>
                        <input type="number" min="0" required value={dualReadingForm.waterOld} onChange={e => setDualReadingForm({...dualReadingForm, waterOld: Number(e.target.value)})} />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Chỉ số tháng này</label>
                        <input type="number" min="0" required value={dualReadingForm.waterNew} onChange={e => setDualReadingForm({...dualReadingForm, waterNew: Number(e.target.value)})} />
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

      {/* [MỚI] MODAL 3: CHI TIẾT HÓA ĐƠN */}
      {showDetailModal && selectedInvoice && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={20}/> Chi tiết Hóa đơn
              </h3>
              <button onClick={() => setShowDetailModal(false)} className="btn-icon"><X size={20}/></button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <span className="detail-label">Mã hóa đơn:</span>
                <span className="detail-value text-code">{selectedInvoice.invoiceCode}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Phòng:</span>
                <span className="detail-value">
                  {typeof selectedInvoice.roomId === 'object' ? selectedInvoice.roomId.name : selectedInvoice.roomId}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Tiêu đề:</span>
                <span className="detail-value">{selectedInvoice.title}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Loại hóa đơn:</span>
                <span className="detail-value">
                  {selectedInvoice.type === 'Periodic' ? 'Định kỳ' : 'Phát sinh'}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Hạn thanh toán:</span>
                <span className="detail-value" style={{ color: '#ef4444' }}>
                  {formatDate(selectedInvoice.dueDate)}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Trạng thái:</span>
                <span className={`status-badge status-${selectedInvoice.status.toLowerCase()}`}>
                  {selectedInvoice.status === 'Draft' ? 'Bản Nháp' : selectedInvoice.status === 'Unpaid' ? 'Chưa thu' : 'Đã thu'}
                </span>
              </div>
              
              <div className="detail-row" style={{ borderBottom: 'none', marginTop: 12, background: '#f8fafc', padding: 16, borderRadius: 8 }}>
                <span className="detail-label" style={{ fontSize: 16 }}>Tổng thanh toán:</span>
                <span className="detail-value text-price" style={{ fontSize: 20, color: '#2563eb' }}>
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

    </div>
  );
};

export default InvoiceManager;
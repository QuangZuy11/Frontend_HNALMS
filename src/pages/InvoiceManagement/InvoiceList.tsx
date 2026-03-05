import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  Search, FileText, X, CheckCircle, DollarSign
} from 'lucide-react';

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
  isIndex?: boolean;
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

const ITEMS_PER_PAGE = 15; 

const InvoiceList = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Mặc định Kế toán xem hóa đơn Chưa thu (Bỏ qua Draft)
  const [filterStatus, setFilterStatus] = useState<string>('Unpaid');
  const [filterType, setFilterType] = useState<string>('All');

  const [sortConfig, setSortConfig] = useState<{ key: string | null, direction: 'asc' | 'desc' }>({ 
    key: null, 
    direction: 'asc' 
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false); 
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    action: 'PAY_SINGLE' | 'PAY_BULK' | null;
    targetId?: string;
    message: string;
  }>({ isOpen: false, action: null, message: '' });

  useEffect(() => {
    toastr.options = { closeButton: true, positionClass: "toast-top-right", timeOut: 3000 };
    fetchInvoices();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedInvoiceIds([]); 
  }, [searchTerm, filterStatus, filterType, sortConfig]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/invoices`);
      const allData = res.data.data || [];
      
      // LỌC BỎ HOÀN TOÀN BẢN NHÁP (Draft) ĐỐI VỚI KẾ TOÁN
      const validInvoices = allData.filter((inv: Invoice) => inv.status !== 'Draft');
      
      setInvoices(validInvoices);
      setSelectedInvoiceIds([]); 
    } catch (error) { 
      toastr.error("Lỗi tải danh sách hóa đơn"); 
    } finally { 
      setLoading(false); 
    }
  };

  const handlePaymentSingle = async (id: string) => {
    try {
      await axios.put(`${API_BASE_URL}/invoices/${id}/pay`);
      toastr.success("Xác nhận thanh toán thành công!");
      fetchInvoices();
    } catch (error: any) { 
      toastr.error(error.response?.data?.message || "Lỗi cập nhật thanh toán"); 
    }
  };

  const handlePaymentBulk = async () => {
    try {
      let idsToPay = selectedInvoiceIds;
      
      if (idsToPay.length === 0) {
        idsToPay = sortedAndFilteredInvoices.filter(inv => inv.status === 'Unpaid').map(inv => inv._id);
      }

      if (idsToPay.length === 0) {
        toastr.warning("Không có hóa đơn Chưa thu nào để xác nhận.");
        return;
      }

      setLoading(true);
      for (const id of idsToPay) {
        await axios.put(`${API_BASE_URL}/invoices/${id}/pay`);
      }
      
      toastr.success(`Đã xác nhận thanh toán thành công ${idsToPay.length} hóa đơn!`);
      fetchInvoices();
    } catch (error: any) {
      toastr.error("Có lỗi xảy ra trong quá trình xác nhận thanh toán.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPaymentConfirm = () => {
    const unpaidCount = sortedAndFilteredInvoices.filter(inv => inv.status === 'Unpaid').length;
    
    if (selectedInvoiceIds.length > 0) {
      setConfirmModal({
        isOpen: true,
        action: 'PAY_BULK',
        message: `Bạn đang chọn xác nhận thanh toán cho ${selectedInvoiceIds.length} hóa đơn. Hành động này không thể hoàn tác. Tiếp tục?`
      });
    } else {
      if (unpaidCount === 0) {
        toastr.warning("Không có hóa đơn Chưa thu nào trong danh sách lọc hiện tại!");
        return;
      }
      setConfirmModal({
        isOpen: true,
        action: 'PAY_BULK',
        message: `Bạn KHÔNG TÍCH CHỌN hóa đơn nào. Hệ thống sẽ tự động xác nhận thanh toán TẤT CẢ ${unpaidCount} hóa đơn đang báo nợ (Chưa thu) trên màn hình. Bạn có chắc chắn không?`
      });
    }
  };

  const executeConfirmAction = async () => {
    if (confirmModal.action === 'PAY_SINGLE' && confirmModal.targetId) {
      await handlePaymentSingle(confirmModal.targetId);
    } else if (confirmModal.action === 'PAY_BULK') {
      await handlePaymentBulk();
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

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedAndFilteredInvoices = useMemo(() => {
    const filtered = invoices.filter(inv => {
      const matchSearch = 
        inv.invoiceCode.toLowerCase().includes(searchTerm.toLowerCase()) || 
        inv.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === 'All' || inv.status === filterStatus;
      const matchType = filterType === 'All' || inv.type === filterType;
      return matchSearch && matchStatus && matchType;
    });

    if (sortConfig.key !== null) {
      filtered.sort((a: any, b: any) => {
        let valA = a[sortConfig.key!];
        let valB = b[sortConfig.key!];

        if (sortConfig.key === 'roomId') {
          valA = typeof a.roomId === 'object' ? a.roomId.name : a.roomId;
          valB = typeof b.roomId === 'object' ? b.roomId.name : b.roomId;
        }

        if (sortConfig.key === 'dueDate') {
          valA = new Date(valA).getTime();
          valB = new Date(valB).getTime();
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [invoices, searchTerm, filterStatus, filterType, sortConfig]);

  const totalPages = Math.ceil(sortedAndFilteredInvoices.length / ITEMS_PER_PAGE);
  const paginatedInvoices = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedAndFilteredInvoices.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedAndFilteredInvoices, currentPage]);

  const allUnpaidInView = paginatedInvoices.filter(i => i.status === 'Unpaid');
  const isAllSelected = allUnpaidInView.length > 0 && allUnpaidInView.every(inv => selectedInvoiceIds.includes(inv._id));

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const unpaidIdsOnPage = paginatedInvoices.filter(inv => inv.status === 'Unpaid').map(inv => inv._id);
      setSelectedInvoiceIds(prev => [...new Set([...prev, ...unpaidIdsOnPage])]);
    } else {
      const unpaidIdsOnPage = paginatedInvoices.map(inv => inv._id);
      setSelectedInvoiceIds(prev => prev.filter(id => !unpaidIdsOnPage.includes(id)));
    }
  };

  const toggleSelectOne = (id: string, status: string) => {
    if (status !== 'Unpaid') return; 
    setSelectedInvoiceIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const renderStatusBadge = (status: string) => {
    let bgColor = '';
    let textColor = '';
    let text = '';

    switch (status) {
      case 'Unpaid':
        bgColor = '#fef2f2';
        textColor = '#ef4444';
        text = 'Chưa thu';
        break;
      case 'Paid':
        bgColor = '#f0fdf4';
        textColor = '#16a34a';
        text = 'Đã thu';
        break;
      default:
        bgColor = '#f1f5f9';
        textColor = '#64748b';
        text = status;
    }

    return (
      <span style={{
        backgroundColor: bgColor,
        color: textColor,
        padding: '4px 10px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: 600,
        display: 'inline-block',
        whiteSpace: 'nowrap'
      }}>
        {text}
      </span>
    );
  };

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
          <h2>Quản lý Thu chi & Công nợ</h2>
          <p>Nghiệp vụ Kế toán: Tra cứu hóa đơn và xác nhận thanh toán tiền phòng</p>
        </div>
      </div>

      <div className="actions-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ position: 'relative', width: '400px' }}>
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
            style={{ width: '180px', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none', background: '#fff', color: '#334155', cursor: 'pointer', boxSizing: 'border-box' }}
          >
            <option value="All">Tất cả trạng thái</option>
            <option value="Unpaid">Chưa thu (Đang nợ)</option>
            <option value="Paid">Đã thu (Hoàn tất)</option>
          </select>

          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            style={{ width: '180px', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none', background: '#fff', color: '#334155', cursor: 'pointer', boxSizing: 'border-box' }}
          >
            <option value="All">Tất cả loại HĐ</option>
            <option value="Periodic">Định kỳ (Tháng)</option>
            <option value="Incurred">Phát sinh (Sửa chữa)</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="btn btn-success" 
            style={{ whiteSpace: 'nowrap', background: '#10b981', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }} 
            onClick={handleOpenPaymentConfirm}
            disabled={loading}
          >
            <DollarSign size={18} /> Xác Nhận Đã Thu {selectedInvoiceIds.length > 0 ? `(${selectedInvoiceIds.length})` : ''}
          </button>
        </div>
      </div>

      <div className="table-container" style={{ borderRadius: '8px 8px 0 0', borderBottom: 'none' }}>
        <table className="invoice-table">
          <thead>
            <tr>
              <th style={{ width: '40px', textAlign: 'center' }}>
                <input 
                  type="checkbox" 
                  checked={isAllSelected}
                  onChange={toggleSelectAll}
                  style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  disabled={allUnpaidInView.length === 0}
                />
              </th>
              {renderSortableHeader("Mã HĐ", "invoiceCode")}
              {renderSortableHeader("Phòng", "roomId")}
              {renderSortableHeader("Tiêu đề", "title")}
              {renderSortableHeader("Tổng tiền", "totalAmount")}
              {renderSortableHeader("Hạn chót", "dueDate")}
              {renderSortableHeader("Trạng thái", "status")}
              <th style={{ textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {paginatedInvoices.map((inv) => {
              const isUnpaid = inv.status === 'Unpaid';
              return (
                <tr key={inv._id} style={{ background: selectedInvoiceIds.includes(inv._id) ? '#ecfdf5' : 'transparent' }}>
                  <td style={{ textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedInvoiceIds.includes(inv._id)}
                      onChange={() => toggleSelectOne(inv._id, inv.status)}
                      disabled={!isUnpaid}
                      style={{ cursor: isUnpaid ? 'pointer' : 'not-allowed', width: '16px', height: '16px' }}
                    />
                  </td>
                  <td className="text-code">{inv.invoiceCode}</td>
                  <td style={{ fontWeight: 600 }}>{typeof inv.roomId === 'object' ? inv.roomId.name : inv.roomId}</td>
                  <td>{inv.title}</td>
                  <td className="text-price" style={{ color: isUnpaid ? '#ef4444' : '#334155' }}>
                    {formatCurrency(inv.totalAmount)}
                  </td>
                  <td>{formatDate(inv.dueDate)}</td>
                  
                  <td>{renderStatusBadge(inv.status)}</td>
                  
                  <td>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                      {isUnpaid && (
                        <button 
                          className="btn-icon" 
                          title="Xác nhận thanh toán" 
                          onClick={() => setConfirmModal({
                            isOpen: true, 
                            action: 'PAY_SINGLE', 
                            targetId: inv._id, 
                            message: `Xác nhận khách thuê phòng ${typeof inv.roomId === 'object' ? inv.roomId.name : ''} đã thanh toán hóa đơn này?`
                          })}
                        >
                          <CheckCircle size={18} color="#10b981" />
                        </button>
                      )}
                      
                      <button className="btn-icon" title="Xem chi tiết" onClick={() => handleViewDetail(inv._id)}>
                        <FileText size={18} color="#475569" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            
            {paginatedInvoices.length === 0 && (
               <tr>
                 <td colSpan={8} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                   Không tìm thấy hóa đơn nào khớp với kết quả lọc.
                 </td>
               </tr>
            )}
          </tbody>
        </table>
      </div>

      {sortedAndFilteredInvoices.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#fff', border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
          <div style={{ fontSize: '14px', color: '#64748b' }}>
            Hiển thị <b>{(currentPage - 1) * ITEMS_PER_PAGE + 1}</b> đến <b>{Math.min(currentPage * ITEMS_PER_PAGE, sortedAndFilteredInvoices.length)}</b> trong tổng số <b>{sortedAndFilteredInvoices.length}</b> hóa đơn
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: currentPage === 1 ? '#f1f5f9' : '#fff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', color: currentPage === 1 ? '#94a3b8' : '#334155', fontWeight: 500 }}
            >
              Trước
            </button>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', background: '#f1f5f9', padding: '6px 16px', borderRadius: '6px' }}>
              Trang {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: currentPage === totalPages ? '#f1f5f9' : '#fff', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', color: currentPage === totalPages ? '#94a3b8' : '#334155', fontWeight: 500 }}
            >
              Sau
            </button>
          </div>
        </div>
      )}

      {showDetailModal && selectedInvoice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '700px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={20}/> Chi tiết Hóa đơn (Kế toán)
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
                <span className="detail-value" style={{ color: selectedInvoice.status === 'Unpaid' ? '#ef4444' : '#334155', fontWeight: 600 }}>
                  {formatDate(selectedInvoice.dueDate)}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Trạng thái:</span>
                <span className="detail-value" style={{ textAlign: 'left' }}>
                  {renderStatusBadge(selectedInvoice.status)}
                </span>
              </div>

              {selectedInvoice.items && selectedInvoice.items.length > 0 && (
                <div style={{ marginTop: '20px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  <table className="invoice-table" style={{ margin: 0, width: '100%', fontSize: '14px' }}>
                    <thead style={{ background: '#f8fafc' }}>
                      <tr>
                        <th style={{ padding: '10px 12px', textAlign: 'left' }}>Nội dung thu</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center' }}>Số lượng / Chỉ số</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Đơn giá</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.items.map((item, index) => (
                        <tr key={index} style={{ borderTop: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '10px 12px' }}>{item.itemName}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b' }}>
                            {item.isIndex === true ? (
                              <span style={{ fontSize: '13px' }}>
                                Tiêu thụ: <b>{item.usage}</b> <br/> (Cũ: {item.oldIndex} - Mới: {item.newIndex})
                              </span>
                            ) : (
                              <span>{item.usage}</span>
                            )}
                          </td>
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
              
              <div className="detail-row" style={{ borderBottom: 'none', marginTop: 12, background: selectedInvoice.status === 'Paid' ? '#f0fdf4' : '#fef2f2', padding: 16, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', border: `1px solid ${selectedInvoice.status === 'Paid' ? '#bbf7d0' : '#fecaca'}` }}>
                <span className="detail-label" style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', width: 'auto', marginRight: '20px' }}>
                  TỔNG CẦN THU:
                </span>
                <span className="detail-value text-price" style={{ fontSize: 24, color: selectedInvoice.status === 'Paid' ? '#16a34a' : '#dc2626', fontWeight: 700, whiteSpace: 'nowrap', textAlign: 'right' }}>
                  {formatCurrency(selectedInvoice.totalAmount)}
                </span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowDetailModal(false)}>Đóng lại</button>
              {selectedInvoice.status === 'Unpaid' && (
                <button 
                  className="btn btn-success" 
                  style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                  onClick={() => {
                    setShowDetailModal(false);
                    setConfirmModal({
                      isOpen: true,
                      action: 'PAY_SINGLE',
                      targetId: selectedInvoice._id,
                      message: 'Xác nhận hóa đơn này đã được thanh toán?'
                    });
                  }}
                >
                  Xác nhận đã thu tiền
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmModal.isOpen && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ width: '420px', textAlign: 'center', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <div style={{ background: '#d1fae5', padding: '12px', borderRadius: '50%' }}>
                <DollarSign size={32} color="#059669" />
              </div>
            </div>
            <h3 style={{ marginTop: 0, color: '#1e293b', fontSize: '18px' }}>Xác nhận thanh toán</h3>
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
                className="btn btn-success" 
                style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 24px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                onClick={executeConfirmAction}
                disabled={loading}
              >
                {loading ? 'Đang xử lý...' : 'Đồng ý xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default InvoiceList;
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  FileSpreadsheet, Search, Filter, LayoutGrid, ArrowUpDown,
  FileText, CheckCircle, DollarSign, Wrench, AlertCircle
} from 'lucide-react';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';

import { AppModal } from '../../components/common/Modal';
import { Pagination } from '../../components/common/Pagination';
import { useToast } from '../../components/common/Toast';
import './InvoiceList.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:9999/api';

interface InvoiceItem {
  itemName: string;
  usage: number;
  oldIndex?: number;
  newIndex?: number;
  isIndex?: boolean;
  unitPrice: number;
  amount: number;
}

interface Invoice {
  _id: string;
  invoiceCode: string;
  roomId?: any;
  contractId?: any;
  title: string;
  type: 'Periodic' | 'Incurred';
  totalAmount: number;
  status: 'Draft' | 'Unpaid' | 'Paid';
  dueDate: string;
  items?: InvoiceItem[];
  deviceName?: string;
  repairDescription?: string;
  createdAt?: string;
}

const ITEMS_PER_PAGE = 15;

const InvoiceList = () => {
  const { showToast } = useToast();

  // -- State --
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('Unpaid');
  const [filterType, setFilterType] = useState<string>('All');
  const [filterRoom, setFilterRoom] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: string | null, direction: 'asc' | 'desc' }>({
    key: 'createdAt',
    direction: 'desc'
  });

  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    action: 'PAY_SINGLE' | 'PAY_BULK' | null;
    targetId?: string;
    targetType?: string;
    message: string;
  }>({ isOpen: false, action: null, message: '' });

  // -- Initialization --
  useEffect(() => {
    fetchInvoices();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedInvoiceIds([]);
  }, [searchTerm, filterStatus, filterType, filterRoom, sortConfig]);

  // -- Logic --
  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const [periodicRes, incurredRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/invoices/periodic`).catch(() => ({ data: { data: [] } })),
        axios.get(`${API_BASE_URL}/invoices/incurred`).catch(() => ({ data: { data: [] } }))
      ]);

      const periodicData = (periodicRes.data.data || []).map((inv: any) => ({ ...inv, type: 'Periodic' }));
      const incurredData = (incurredRes.data.data || []).map((inv: any) => ({ ...inv, type: 'Incurred' }));

      // Gộp và lọc bỏ bản nháp (Draft) đối với kế toán
      const combined = [...periodicData, ...incurredData].filter(inv => inv.status !== 'Draft');

      setInvoices(combined);
      setSelectedInvoiceIds([]);
    } catch (error) {
      showToast('error', 'Lỗi hệ thống', 'Không thể tải danh sách hóa đơn.');
    } finally {
      setLoading(false);
    }
  };

  const getRoomName = (inv: any) => {
    if (inv?.roomId && typeof inv.roomId === 'object') return inv.roomId.name;
    if (inv?.roomId) return inv.roomId;
    if (inv?.contractId?.roomId && typeof inv.contractId.roomId === 'object') return inv.contractId.roomId.name;
    if (inv?.contractId?.roomId) return inv.contractId.roomId;
    return 'Không xác định';
  };

  const uniqueRooms = useMemo(() => {
    const names = invoices.map(inv => getRoomName(inv));
    return Array.from(new Set(names)).sort();
  }, [invoices]);

  const sortedAndFilteredInvoices = useMemo(() => {
    let filtered = invoices.filter(inv => {
      const matchSearch =
        inv.invoiceCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === 'All' || inv.status === filterStatus;
      const matchType = filterType === 'All' || inv.type === filterType;
      const matchRoom = filterRoom === 'ALL' || getRoomName(inv) === filterRoom;

      return matchSearch && matchStatus && matchType && matchRoom;
    });

    if (sortConfig.key) {
      filtered.sort((a: any, b: any) => {
        let valA = a[sortConfig.key!];
        let valB = b[sortConfig.key!];

        if (sortConfig.key === 'roomId') {
          valA = getRoomName(a);
          valB = getRoomName(b);
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [invoices, searchTerm, filterStatus, filterType, filterRoom, sortConfig]);

  const totalPages = Math.ceil(sortedAndFilteredInvoices.length / ITEMS_PER_PAGE);
  const paginatedInvoices = sortedAndFilteredInvoices.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const allUnpaidInView = paginatedInvoices.filter(inv => inv.status === 'Unpaid');
  const isAllSelected = allUnpaidInView.length > 0 &&
    allUnpaidInView.every(inv => selectedInvoiceIds.includes(inv._id));

  // -- Handlers --
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedInvoiceIds(prev => prev.filter(id => !allUnpaidInView.find(inv => inv._id === id)));
    } else {
      const newIds = allUnpaidInView
        .map(inv => inv._id)
        .filter(id => !selectedInvoiceIds.includes(id));
      setSelectedInvoiceIds(prev => [...prev, ...newIds]);
    }
  };

  const toggleSelectOne = (id: string, status: string) => {
    if (status !== 'Unpaid') return;
    setSelectedInvoiceIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handlePaymentSingle = async (id: string, type: string) => {
    try {
      const endpoint = type === 'Periodic' ? 'periodic' : 'incurred';
      await axios.put(`${API_BASE_URL}/invoices/${endpoint}/${id}/pay`);
      showToast('success', 'Thành công', 'Đã xác nhận thanh toán hóa đơn!');
      fetchInvoices();
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Lỗi cập nhật thanh toán';
      showToast('error', 'Thất bại', msg);
    }
  };

  const handlePaymentBulk = async () => {
    try {
      let idsToPay = selectedInvoiceIds;
      if (idsToPay.length === 0) {
        idsToPay = sortedAndFilteredInvoices.filter(inv => inv.status === 'Unpaid').map(inv => inv._id);
      }

      if (idsToPay.length === 0) {
        showToast('warning', 'Chú ý', 'Không có hóa đơn Chưa thu nào để xác nhận.');
        return;
      }

      setLoading(true);
      for (const id of idsToPay) {
        const inv = invoices.find(i => i._id === id);
        const endpoint = inv?.type === 'Periodic' ? 'periodic' : 'incurred';
        await axios.put(`${API_BASE_URL}/invoices/${endpoint}/${id}/pay`);
      }

      showToast('success', 'Thành công', `Đã xác nhận thanh toán cho ${idsToPay.length} hóa đơn!`);
      fetchInvoices();
    } catch (error: any) {
      showToast('error', 'Lỗi hệ thống', 'Có lỗi xảy ra khi xác nhận thanh toán hàng loạt.');
    } finally {
      setLoading(false);
    }
  };

  const executeConfirmAction = async () => {
    if (confirmModal.action === 'PAY_SINGLE' && confirmModal.targetId && confirmModal.targetType) {
      await handlePaymentSingle(confirmModal.targetId, confirmModal.targetType);
    } else if (confirmModal.action === 'PAY_BULK') {
      await handlePaymentBulk();
    }
    setConfirmModal({ isOpen: false, action: null, message: '' });
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
        showToast('warning', 'Thông báo', 'Không có hóa đơn Chưa thu nào trong danh sách!');
        return;
      }
      setConfirmModal({
        isOpen: true,
        action: 'PAY_BULK',
        message: `Bạn chưa chọn hóa đơn nào. Hệ thống sẽ xác nhận thanh toán TẤT CẢ ${unpaidCount} hóa đơn Chưa thu hiển thị trên màn hình. Tiếp tục?`
      });
    }
  };

  const handleViewDetail = async (invoice: Invoice) => {
    try {
      const endpoint = invoice.type === 'Periodic' ? 'periodic' : 'incurred';
      const res = await axios.get(`${API_BASE_URL}/invoices/${endpoint}/${invoice._id}`);
      setSelectedInvoice({ ...res.data.data, type: invoice.type });
      setShowDetailModal(true);
    } catch (error) {
      showToast('error', 'Lỗi', 'Không thể lấy thông tin chi tiết hóa đơn.');
    }
  };

  // -- Render Helpers --
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

  const renderSortableHeader = (label: string, key: string) => {
    const isSorted = sortConfig.key === key;
    return (
      <th onClick={() => requestSort(key)} style={{ cursor: 'pointer', userSelect: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {label}
          {isSorted ? (
            sortConfig.direction === 'asc'
              ? <KeyboardArrowUpIcon fontSize="small" style={{ color: '#2563eb' }} />
              : <KeyboardArrowDownIcon fontSize="small" style={{ color: '#2563eb' }} />
          ) : <UnfoldMoreIcon fontSize="small" style={{ color: '#cbd5e1' }} />}
        </div>
      </th>
    );
  };

  const renderStatusBadge = (status: string) => {
    const label = status === 'Paid' ? 'Đã thanh toán' : 'Chưa thanh toán';
    const cls = status === 'Paid' ? 'paid' : 'unpaid';
    return <span className={`status-badge ${cls}`}>{label}</span>;
  };

  const renderTypeBadge = (type: string) => {
    const label = type === 'Periodic' ? 'Định kỳ' : 'Phát sinh';
    const cls = type === 'Periodic' ? 'periodic' : 'incurred';
    return <span className={`type-badge ${cls}`}>{label}</span>;
  };

  return (
    <div className="invoice-list-container">
      {/* HEADER */}
      <div className="invoice-header">
        <div className="invoice-header-top">
          <div className="device-title-block">
            <div className="device-title-row">
              <div className="device-title-icon" aria-hidden>
                <FileSpreadsheet size={24} />
              </div>
              <div className="device-title-text">
                <h2>Hóa đơn Kế toán</h2>
                <p className="device-subtitle">Quản lý, đối soát công nợ và xác nhận thanh toán hóa đơn khách thuê.</p>
              </div>
            </div>
          </div>
          <div className="invoice-header-aside">
            <button
              className="btn btn-success"
              onClick={handleOpenPaymentConfirm}
              disabled={loading}
            >
              <CheckCircle size={18} />
              Xác nhận Đã Thu {selectedInvoiceIds.length > 0 ? `(${selectedInvoiceIds.length})` : ''}
            </button>
          </div>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="invoice-toolbar">
        <div className="invoice-toolbar-left">
          <div className="invoice-search-box">
            <Search className="invoice-search-icon" size={18} />
            <input
              type="text"
              placeholder="Tìm mã hóa đơn, tiêu đề..."
              className="invoice-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="invoice-filter-group">
            <div className="invoice-filter-item" title="Lọc theo phòng">
              <LayoutGrid size={16} color="#64748b" />
              <select
                className="invoice-filter-select"
                value={filterRoom}
                onChange={(e) => setFilterRoom(e.target.value)}
              >
                <option value="ALL">Tất cả phòng</option>
                {uniqueRooms.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div className="invoice-filter-item" title="Trạng thái">
              <Filter size={16} color="#64748b" />
              <select
                className="invoice-filter-select"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="All">Tất cả trạng thái</option>
                <option value="Unpaid">Chưa thanh toán</option>
                <option value="Paid">Đã thanh toán</option>
              </select>
            </div>

            <div className="invoice-filter-item" title="Loại hóa đơn">
              <ArrowUpDown size={16} color="#64748b" />
              <select
                className="invoice-filter-select"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="All">Tất cả loại HD</option>
                <option value="Periodic">Định kỳ</option>
                <option value="Incurred">Phát sinh</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="table-container">
        <table className="invoice-table">
          <thead>
            <tr>
              <th style={{ width: '40px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={toggleSelectAll}
                  disabled={allUnpaidInView.length === 0}
                  style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                />
              </th>
              {renderSortableHeader("Mã HĐ", "invoiceCode")}
              {renderSortableHeader("Phòng", "roomId")}
              <th>Phân loại</th>
              {renderSortableHeader("Tiêu đề", "title")}
              {renderSortableHeader("Tổng tiền", "totalAmount")}
              {renderSortableHeader("Hạn chót", "dueDate")}
              {renderSortableHeader("Trạng thái", "status")}
              <th style={{ textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {paginatedInvoices.map((inv) => {
              const isSelected = selectedInvoiceIds.includes(inv._id);
              const isUnpaid = inv.status === 'Unpaid';
              return (
                <tr key={inv._id} style={{ background: isSelected ? '#eff6ff' : 'transparent' }}>
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectOne(inv._id, inv.status)}
                      disabled={!isUnpaid}
                      style={{ cursor: isUnpaid ? 'pointer' : 'not-allowed', width: '16px', height: '16px' }}
                    />
                  </td>
                  <td className="text-code">{inv.invoiceCode}</td>
                  <td style={{ fontWeight: 600 }}>{getRoomName(inv)}</td>
                  <td>{renderTypeBadge(inv.type)}</td>
                  <td>{inv.title}</td>
                  <td style={{ fontWeight: 700, color: isUnpaid ? '#ef4444' : '#0f172a' }}>
                    {formatCurrency(inv.totalAmount)}
                  </td>
                  <td>{formatDate(inv.dueDate)}</td>
                  <td>{renderStatusBadge(inv.status)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                      {isUnpaid && (
                        <button
                          className="btn-icon"
                          title="Thanh toán"
                          onClick={() => setConfirmModal({
                            isOpen: true,
                            action: 'PAY_SINGLE',
                            targetId: inv._id,
                            targetType: inv.type,
                            message: `Xác nhận khách thuê phòng ${getRoomName(inv)} đã thanh toán hóa đơn này?`
                          })}
                        >
                          <CheckCircle size={18} color="#16a34a" />
                        </button>
                      )}
                      <button className="btn-icon" title="Chi tiết" onClick={() => handleViewDetail(inv)}>
                        <FileText size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {paginatedInvoices.length === 0 && (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  Không tìm thấy dữ liệu hóa đơn nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div className="invoice-pagination-wrapper">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={sortedAndFilteredInvoices.length}
          itemsPerPage={ITEMS_PER_PAGE}
        />
      </div>

      {/* MODAL: DETAIL */}
      <AppModal
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        size="lg"
        title={`Chi tiết Hóa đơn ${selectedInvoice?.type === 'Periodic' ? 'Định kỳ' : 'Phát sinh'}`}
        icon={<FileText size={20} />}
        footer={
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-outline" onClick={() => setShowDetailModal(false)}>Đóng lại</button>
            {selectedInvoice?.status === 'Unpaid' && (
              <button
                className="btn btn-success"
                onClick={() => {
                  setShowDetailModal(false);
                  setConfirmModal({
                    isOpen: true,
                    action: 'PAY_SINGLE',
                    targetId: selectedInvoice?._id,
                    targetType: selectedInvoice?.type,
                    message: `Xác nhận khách thuê phòng ${getRoomName(selectedInvoice)} đã thanh toán hóa đơn này?`
                  });
                }}
              >
                Xác nhận đã thu tiền
              </button>
            )}
          </div>
        }
      >
        {selectedInvoice && (
          <div className="modal-body-content" style={{ padding: '4px 0' }}>
            <div className="detail-row">
              <span className="detail-label">Mã hóa đơn:</span>
              <span className="detail-value text-code">{selectedInvoice.invoiceCode}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Phòng:</span>
              <span className="detail-value highlight">{getRoomName(selectedInvoice)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Tiêu đề:</span>
              <span className="detail-value">{selectedInvoice.title}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Hạn thanh toán:</span>
              <span className="detail-value" style={{ color: selectedInvoice.status === 'Unpaid' ? '#ef4444' : 'inherit' }}>
                {formatDate(selectedInvoice.dueDate)}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Trạng thái:</span>
              <span className="detail-value">{renderStatusBadge(selectedInvoice.status)}</span>
            </div>

            {selectedInvoice.type === 'Periodic' && selectedInvoice.items && (
              <div style={{ marginTop: 24, border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                <table className="invoice-table" style={{ margin: 0 }}>
                  <thead style={{ background: '#f8fafc' }}>
                    <tr>
                      <th style={{ padding: '12px' }}>Nội dung thu</th>
                      <th style={{ padding: '12px', textAlign: 'center' }}>Số lượng / Chỉ số</th>
                      <th style={{ padding: '12px', textAlign: 'right' }}>Đơn giá</th>
                      <th style={{ padding: '12px', textAlign: 'right' }}>Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: '12px' }}>{item.itemName}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          {item.isIndex ? (
                            <span style={{ fontSize: 13 }}>
                              Tiêu thụ: <b>{item.usage}</b><br />
                              <span style={{ color: '#64748b' }}>(Cũ: {item.oldIndex} - Mới: {item.newIndex})</span>
                            </span>
                          ) : item.usage}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>{formatCurrency(item.unitPrice)}</td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {selectedInvoice.type === 'Incurred' && (
              <div style={{ marginTop: 24, padding: 16, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontWeight: 700, color: '#0f172a' }}>
                  <Wrench size={16} /> Nguồn gốc phát sinh (Sửa chữa)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px 16px', fontSize: 14 }}>
                  <span style={{ color: '#64748b' }}>Thiết bị lỗi:</span>
                  <span style={{ fontWeight: 600 }}>{selectedInvoice.deviceName || 'Không xác định'}</span>
                  <span style={{ color: '#64748b' }}>Mô tả từ khách:</span>
                  <span style={{ color: '#334155', fontStyle: 'italic' }}>"{selectedInvoice.repairDescription || 'Không có mô tả'}"</span>
                </div>
              </div>
            )}

            <div className={`total-summary-box ${selectedInvoice.status === 'Paid' ? 'paid' : 'unpaid'}`}>
              <span className="total-label">TỔNG CẦN THU:</span>
              <span className="total-value">{formatCurrency(selectedInvoice.totalAmount)}</span>
            </div>
          </div>
        )}
      </AppModal>

      {/* MODAL: CONFIRM */}
      <AppModal
        open={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, action: null, message: '' })}
        title="Xác nhận thao tác"
        icon={<AlertCircle size={20} />}
        color="green"
        size="sm"
        footer={
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', width: '100%' }}>
            <button className="btn btn-outline" onClick={() => setConfirmModal({ isOpen: false, action: null, message: '' })}>Hủy bỏ</button>
            <button className="btn btn-success" onClick={executeConfirmAction} disabled={loading}>
              {loading ? 'Đang xử lý...' : 'Đồng ý xác nhận'}
            </button>
          </div>
        }
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div style={{ background: '#dcfce7', color: '#16a34a', padding: 16, borderRadius: '50%' }}>
              <DollarSign size={40} />
            </div>
          </div>
          <p style={{ color: '#334155', fontSize: 15, lineHeight: 1.6, margin: 0 }}>{confirmModal.message}</p>
        </div>
      </AppModal>
    </div>
  );
};

export default InvoiceList;
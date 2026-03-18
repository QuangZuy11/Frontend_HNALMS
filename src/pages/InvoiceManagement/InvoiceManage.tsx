import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  Plus, Search, Droplet, Send, FileText, X, Edit3, Wrench
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
  contractId?: any; 
  roomId?: any;     
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

const InvoiceManager = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterType, setFilterType] = useState<string>('All'); 

  const [sortConfig, setSortConfig] = useState<{ key: string | null, direction: 'asc' | 'desc' }>({ 
    key: null, 
    direction: 'asc' 
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);

  const [showReadingModal, setShowReadingModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false); 
  const [showBulkReadingModal, setShowBulkReadingModal] = useState(false);
  
  // [CẬP NHẬT] Thêm eReset và wReset vào BulkData
  const [bulkData, setBulkData] = useState<Record<string, { eOld: number, eNew: number, wOld: number, wNew: number, eReset: boolean, wReset: boolean }>>({});
  const [occupiedRooms, setOccupiedRooms] = useState<any[]>([]);
  const [completedRooms, setCompletedRooms] = useState<Record<string, boolean>>({});

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    action: 'GENERATE' | 'RELEASE_SINGLE' | 'RELEASE_BULK' | null;
    targetId?: string;
    targetType?: string;
    message: string;
  }>({ isOpen: false, action: null, message: '' });

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [services, setServices] = useState<any[]>([]);

  // [CẬP NHẬT] Thêm trạng thái Reset cho Modal nhập đơn lẻ
  const [isElecReset, setIsElecReset] = useState(false);
  const [isWaterReset, setIsWaterReset] = useState(false);

  const [dualReadingForm, setDualReadingForm] = useState({
    elecOld: 0, elecNew: 0,
    waterOld: 0, waterNew: 0
  });

  const getRoomName = (inv: any) => {
    if (inv?.roomId && typeof inv.roomId === 'object') return inv.roomId.name;
    if (inv?.roomId) return inv.roomId;
    if (inv?.contractId?.roomId && typeof inv.contractId.roomId === 'object') return inv.contractId.roomId.name;
    return 'Không xác định';
  };

  const getRoomIdStr = (inv: any) => {
    if (inv?.roomId && typeof inv.roomId === 'object') return inv.roomId._id;
    if (inv?.roomId) return inv.roomId;
    if (inv?.contractId?.roomId && typeof inv.contractId.roomId === 'object') return inv.contractId.roomId._id;
    return '';
  };

  useEffect(() => {
    toastr.options = { closeButton: true, positionClass: "toast-top-right", timeOut: 3000 };
    fetchInvoices();
    fetchServices();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedInvoiceIds([]); 
  }, [searchTerm, filterStatus, filterType, sortConfig]);

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
      const [periodicRes, incurredRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/invoices/periodic`).catch(() => ({ data: { data: [] } })),
        axios.get(`${API_BASE_URL}/invoices/incurred`).catch(() => ({ data: { data: [] } }))
      ]);

      const periodicData = (periodicRes.data.data || []).map((inv: any) => ({ ...inv, type: 'Periodic' }));
      const incurredData = (incurredRes.data.data || []).map((inv: any) => ({ ...inv, type: 'Incurred' }));

      const combined = [...periodicData, ...incurredData];
      
      combined.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      setInvoices(combined);
      setSelectedInvoiceIds([]); 
    } catch (error) { 
      toastr.error("Lỗi tải danh sách hóa đơn"); 
    } 
    finally { setLoading(false); }
  };

  const handleGenerateDrafts = async () => {
    try {
      const res = await axios.post(`${API_BASE_URL}/invoices/periodic/generate-drafts`);
      toastr.success(res.data.message || "Khởi tạo hóa đơn thành công!");
      fetchInvoices();
    } catch (error: any) { 
      toastr.error(error.response?.data?.message || "Lỗi tạo hóa đơn"); 
    }
  };

  const handleOpenReading = async (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    const rId = getRoomIdStr(invoice); 
    
    setDualReadingForm({ elecOld: 0, elecNew: 0, waterOld: 0, waterNew: 0 });
    setIsElecReset(false);
    setIsWaterReset(false);
    setShowReadingModal(true);

    const elecService = services.find(s => ['điện', 'dien'].includes((s.name || s.serviceName || '').trim().toLowerCase()));
    const waterService = services.find(s => ['nước', 'nuoc'].includes((s.name || s.serviceName || '').trim().toLowerCase()));

    let eOld = 0, wOld = 0;
    let eCurrent = 0, wCurrent = 0;

    if (elecService && rId) {
      try {
        const resE = await axios.get(`${API_BASE_URL}/meter-readings/latest?roomId=${rId}&utilityId=${elecService._id}`);
        if (resE.data?.data) {
          eOld = resE.data.data.newIndex;
          eCurrent = resE.data.data.newIndex; 
        }
      } catch (error) {}
    }

    if (waterService && rId) {
      try {
        const resW = await axios.get(`${API_BASE_URL}/meter-readings/latest?roomId=${rId}&utilityId=${waterService._id}`);
        if (resW.data?.data) {
          wOld = resW.data.data.newIndex;
          wCurrent = resW.data.data.newIndex; 
        }
      } catch (error) {}
    }

    setDualReadingForm({ elecOld: eOld, elecNew: eCurrent, waterOld: wOld, waterNew: wCurrent });
  };

  const handleSaveReading = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const rId = getRoomIdStr(selectedInvoice);
      if (!rId) {
        toastr.error("Không xác định được phòng để lưu chỉ số.");
        return;
      }

      const elecService = services.find(s => ['điện', 'dien'].includes((s.name || s.serviceName || '').trim().toLowerCase()));
      const waterService = services.find(s => ['nước', 'nuoc'].includes((s.name || s.serviceName || '').trim().toLowerCase()));

      const apiCalls = [];

      // Tính toán tiêu thụ nháp trên Frontend để kiểm tra điều kiện
      const eUsage = isElecReset ? (100000 - dualReadingForm.elecOld + dualReadingForm.elecNew) : (dualReadingForm.elecNew - dualReadingForm.elecOld);
      const wUsage = isWaterReset ? (100000 - dualReadingForm.waterOld + dualReadingForm.waterNew) : (dualReadingForm.waterNew - dualReadingForm.waterOld);

      if (elecService && eUsage > 0) {
        apiCalls.push({ roomId: rId, utilityId: elecService._id, oldIndex: dualReadingForm.elecOld, newIndex: dualReadingForm.elecNew, isReset: isElecReset, maxIndex: 100000 });
      }

      if (waterService && wUsage > 0) {
        apiCalls.push({ roomId: rId, utilityId: waterService._id, oldIndex: dualReadingForm.waterOld, newIndex: dualReadingForm.waterNew, isReset: isWaterReset, maxIndex: 100000 });
      }

      if (apiCalls.length === 0) {
        toastr.warning("Không có chỉ số hợp lệ nào được nhập!");
        return;
      }

      for (const payload of apiCalls) {
        await axios.post(`${API_BASE_URL}/meter-readings`, payload);
      }
      
      toastr.success("Cập nhật chỉ số điện/nước thành công!");
      setShowReadingModal(false);
      fetchInvoices(); 
    } catch (error: any) { 
      toastr.error(error.response?.data?.message || "Lỗi lưu chỉ số"); 
    }
  };

  const handleOpenBulkReading = async () => {
    try {
      const draftRoomIds = invoices
        .filter(inv => inv.status === 'Draft' && inv.type === 'Periodic')
        .map(inv => getRoomIdStr(inv))
        .filter(id => id !== ''); 

      const roomsRes = await axios.get(`${API_BASE_URL}/rooms`);
      const allRooms = roomsRes.data.data || [];

      const activeRooms = allRooms.filter((r: any) => 
        r.status === 'Occupied' || draftRoomIds.includes(r._id)
      );

      if (activeRooms.length === 0) {
        toastr.warning("Không có phòng nào cần ghi điện nước lúc này! (Gợi ý: Hãy bấm 'Tạo HĐ Định kỳ' trước)");
        return;
      }

      setOccupiedRooms(activeRooms);
      
      const initialData: any = {};
      activeRooms.forEach((r: any) => {
        initialData[r._id] = { eOld: 0, eNew: 0, wOld: 0, wNew: 0, eReset: false, wReset: false };
      });
      
      const elecService = services.find(s => ['điện', 'dien'].includes((s.name || s.serviceName || '').trim().toLowerCase()));
      const waterService = services.find(s => ['nước', 'nuoc'].includes((s.name || s.serviceName || '').trim().toLowerCase()));

      const updatedData = { ...initialData };
      const newCompletedStatus: Record<string, boolean> = {}; 
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      await Promise.all(activeRooms.map(async (room: any) => {
        let eDone = false;
        let wDone = false;

        if (elecService) {
          try {
            const res = await axios.get(`${API_BASE_URL}/meter-readings/latest?roomId=${room._id}&utilityId=${elecService._id}`);
            if (res.data?.data) {
              updatedData[room._id].eOld = res.data.data.newIndex;
              updatedData[room._id].eNew = res.data.data.newIndex; 
              
              const createdDate = new Date(res.data.data.createdAt);
              if (createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear) {
                eDone = true;
              }
            }
          } catch (e) {}
        }
        if (waterService) {
          try {
            const res = await axios.get(`${API_BASE_URL}/meter-readings/latest?roomId=${room._id}&utilityId=${waterService._id}`);
            if (res.data?.data) {
              updatedData[room._id].wOld = res.data.data.newIndex;
              updatedData[room._id].wNew = res.data.data.newIndex;

              const createdDate = new Date(res.data.data.createdAt);
              if (createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear) {
                wDone = true;
              }
            }
          } catch (e) {}
        }
        
        if (eDone && wDone) {
          newCompletedStatus[room._id] = true;
        }
      }));

      setBulkData({...updatedData});
      setCompletedRooms(newCompletedStatus); 
      setShowBulkReadingModal(true);
    } catch (error) {
      toastr.error("Không thể lấy dữ liệu phòng");
    }
  };

  const handleSaveBulkReadings = async () => {
    const elecService = services.find(s => ['điện', 'dien'].includes((s.name || s.serviceName || '').trim().toLowerCase()));
    const waterService = services.find(s => ['nước', 'nuoc'].includes((s.name || s.serviceName || '').trim().toLowerCase()));

    const apiCalls = [];

    Object.keys(bulkData).forEach(roomId => {
      if (completedRooms[roomId]) return; 

      const data = bulkData[roomId];
      
      const eUsage = data.eReset ? (100000 - data.eOld + data.eNew) : (data.eNew - data.eOld);
      if (elecService && eUsage > 0) {
        apiCalls.push({ roomId, utilityId: elecService._id, oldIndex: data.eOld, newIndex: data.eNew, isReset: data.eReset, maxIndex: 100000 });
      }

      const wUsage = data.wReset ? (100000 - data.wOld + data.wNew) : (data.wNew - data.wOld);
      if (waterService && wUsage > 0) {
        apiCalls.push({ roomId, utilityId: waterService._id, oldIndex: data.wOld, newIndex: data.wNew, isReset: data.wReset, maxIndex: 100000 });
      }
    });

    if (apiCalls.length === 0) {
      toastr.warning("Không có chỉ số thay đổi nào hợp lệ được ghi nhận.");
      setShowBulkReadingModal(false);
      return;
    }

    try {
      setLoading(true);
      for (const payload of apiCalls) {
        await axios.post(`${API_BASE_URL}/meter-readings`, payload);
      }
      toastr.success(`Đã lưu thành công ${apiCalls.length} bản ghi chỉ số!`);
      setShowBulkReadingModal(false);
      fetchInvoices();
    } catch (error: any) {
      toastr.error("Có lỗi xảy ra khi lưu chỉ số hàng loạt.");
    } finally {
      setLoading(false);
    }
  };

  const handleReleaseSingle = async (id: string, type: string) => {
    try {
      const endpoint = type === 'Periodic' ? 'periodic' : 'incurred';
      await axios.put(`${API_BASE_URL}/invoices/${endpoint}/${id}/release`);
      toastr.success("Phát hành hóa đơn thành công!");
      fetchInvoices();
    } catch (error: any) { toastr.error(error.response?.data?.message || "Lỗi phát hành"); }
  };

  const handleReleaseBulk = async () => {
    try {
      let idsToRelease = selectedInvoiceIds;
      if (idsToRelease.length === 0) {
        idsToRelease = sortedAndFilteredInvoices.filter(inv => inv.status === 'Draft').map(inv => inv._id);
      }

      if (idsToRelease.length === 0) {
        toastr.warning("Không có hóa đơn Nháp nào để phát hành.");
        return;
      }

      setLoading(true);
      for (const id of idsToRelease) {
        const inv = invoices.find(i => i._id === id);
        const endpoint = inv?.type === 'Periodic' ? 'periodic' : 'incurred';
        await axios.put(`${API_BASE_URL}/invoices/${endpoint}/${id}/release`);
      }
      
      toastr.success(`Đã phát hành thành công ${idsToRelease.length} hóa đơn!`);
      fetchInvoices();
    } catch (error: any) {
      toastr.error("Có lỗi xảy ra trong quá trình phát hành.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReleaseConfirm = () => {
    const draftCount = sortedAndFilteredInvoices.filter(inv => inv.status === 'Draft').length;
    
    if (selectedInvoiceIds.length > 0) {
      setConfirmModal({
        isOpen: true,
        action: 'RELEASE_BULK',
        message: `Bạn đang chọn phát hành ${selectedInvoiceIds.length} hóa đơn. Khách thuê sẽ nhận được thông báo. Tiếp tục?`
      });
    } else {
      if (draftCount === 0) {
        toastr.warning("Không có hóa đơn Nháp nào để phát hành!");
        return;
      }
      setConfirmModal({
        isOpen: true,
        action: 'RELEASE_BULK',
        message: `Bạn KHÔNG TÍCH CHỌN hóa đơn nào. Hệ thống sẽ phát hành TẤT CẢ ${draftCount} hóa đơn Nháp. Bạn có chắc chắn không?`
      });
    }
  };

  const executeConfirmAction = async () => {
    if (confirmModal.action === 'GENERATE') {
      await handleGenerateDrafts();
    } else if (confirmModal.action === 'RELEASE_SINGLE' && confirmModal.targetId && confirmModal.targetType) {
      await handleReleaseSingle(confirmModal.targetId, confirmModal.targetType);
    } else if (confirmModal.action === 'RELEASE_BULK') {
      await handleReleaseBulk();
    }
    setConfirmModal({ isOpen: false, action: null, message: '', targetId: undefined, targetType: undefined });
  };

  const handleViewDetail = async (invoice: Invoice) => {
    try {
      const endpoint = invoice.type === 'Periodic' ? 'periodic' : 'incurred';
      const res = await axios.get(`${API_BASE_URL}/invoices/${endpoint}/${invoice._id}`);
      
      setSelectedInvoice({ ...res.data.data, type: invoice.type });
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
          valA = getRoomName(a);
          valB = getRoomName(b);
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

  const allDraftsInView = paginatedInvoices.filter(i => i.status === 'Draft');
  const isAllSelected = allDraftsInView.length > 0 && allDraftsInView.every(inv => selectedInvoiceIds.includes(inv._id));

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const draftIdsOnPage = paginatedInvoices.filter(inv => inv.status === 'Draft').map(inv => inv._id);
      setSelectedInvoiceIds(prev => [...new Set([...prev, ...draftIdsOnPage])]);
    } else {
      const draftIdsOnPage = paginatedInvoices.map(inv => inv._id);
      setSelectedInvoiceIds(prev => prev.filter(id => !draftIdsOnPage.includes(id)));
    }
  };

  const toggleSelectOne = (id: string, status: string) => {
    if (status !== 'Draft') return; 
    setSelectedInvoiceIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const elecServiceInfo = services.find(s => ['điện', 'dien'].includes((s.name || s.serviceName || '').trim().toLowerCase()));
  const waterServiceInfo = services.find(s => ['nước', 'nuoc'].includes((s.name || s.serviceName || '').trim().toLowerCase()));

  const renderStatusBadge = (status: string) => {
    let bgColor = '';
    let textColor = '';
    let text = '';

    switch (status) {
      case 'Draft':
        bgColor = '#f1f5f9';
        textColor = '#64748b';
        text = 'Bản Nháp';
        break;
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

  const renderTypeBadge = (type: string) => {
    if (type === 'Periodic') {
      return <span style={{ color: '#0284c7', fontSize: '13px', fontWeight: 600, background: '#e0f2fe', padding: '2px 8px', borderRadius: '4px' }}>Định kỳ</span>;
    }
    return <span style={{ color: '#d97706', fontSize: '13px', fontWeight: 600, background: '#fef3c7', padding: '2px 8px', borderRadius: '4px' }}>Phát sinh</span>;
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
          <h2>Tổng hợp Hóa đơn Thu chi</h2>
          <p>Quản lý toàn bộ Hóa đơn Định kỳ hàng tháng & Hóa đơn Phát sinh (Sửa chữa, đền bù...)</p>
        </div>
      </div>

      <div className="actions-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ position: 'relative', width: '350px' }}>
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
            <option value="Draft">Bản Nháp (Chưa gửi)</option>
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
            className="btn btn-outline" 
            style={{ whiteSpace: 'nowrap', borderColor: '#0ea5e9', color: '#0ea5e9' }} 
            onClick={handleOpenBulkReading}
          >
            <Droplet size={18} /> Ghi Điện Nước
          </button>

          <button 
            className="btn btn-primary" 
            style={{ whiteSpace: 'nowrap' }} 
            onClick={() => setConfirmModal({
              isOpen: true, 
              action: 'GENERATE', 
              message: 'Hệ thống sẽ tự động rà soát Hợp đồng và tạo Hóa đơn nháp ĐỊNH KỲ cho tháng hiện tại. Bạn có chắc chắn muốn tiếp tục?'
            })}
          >
            <Plus size={18} /> Tạo HĐ Định kỳ
          </button>

          <button 
            className="btn btn-success" 
            style={{ whiteSpace: 'nowrap', background: '#16a34a', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 500 }} 
            onClick={handleOpenReleaseConfirm}
            disabled={loading}
          >
            <Send size={18} /> Phát Hành {selectedInvoiceIds.length > 0 ? `(${selectedInvoiceIds.length})` : ''}
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
                  disabled={allDraftsInView.length === 0}
                />
              </th>
              {renderSortableHeader("Mã HĐ", "invoiceCode")}
              {renderSortableHeader("Phòng", "roomId")}
              <th>Phân loại</th>
              {renderSortableHeader("Tiêu đề", "title")}
              {renderSortableHeader("Tổng tiền", "totalAmount")}
              {renderSortableHeader("Hạn chót", "dueDate")}
              {renderSortableHeader("Trạng thái", "status")}
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {paginatedInvoices.map((inv) => {
              const isDraft = inv.status === 'Draft';
              return (
                <tr key={inv._id} style={{ background: selectedInvoiceIds.includes(inv._id) ? '#f0fdf4' : 'transparent' }}>
                  <td style={{ textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedInvoiceIds.includes(inv._id)}
                      onChange={() => toggleSelectOne(inv._id, inv.status)}
                      disabled={!isDraft}
                      style={{ cursor: isDraft ? 'pointer' : 'not-allowed', width: '16px', height: '16px' }}
                    />
                  </td>
                  <td className="text-code">{inv.invoiceCode}</td>
                  <td style={{ fontWeight: 600 }}>{getRoomName(inv)}</td>
                  <td>{renderTypeBadge(inv.type)}</td>
                  <td>{inv.title}</td>
                  <td className="text-price">{formatCurrency(inv.totalAmount)}</td>
                  <td>{formatDate(inv.dueDate)}</td>
                  
                  <td>{renderStatusBadge(inv.status)}</td>
                  
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {isDraft && inv.type === 'Periodic' && (
                         <button className="btn-icon" title="Sửa Điện/Nước" onClick={() => handleOpenReading(inv)}>
                           <Edit3 size={18} color="#0284c7" />
                         </button>
                      )}
                      
                      {isDraft && (
                          <button 
                            className="btn-icon" 
                            title="Phát hành (Release)" 
                            onClick={() => setConfirmModal({
                              isOpen: true, 
                              action: 'RELEASE_SINGLE', 
                              targetId: inv._id, 
                              targetType: inv.type,
                              message: 'Phát hành hóa đơn này? Khách thuê sẽ nhận được thông báo thanh toán qua ứng dụng.'
                            })}
                          >
                            <Send size={18} color="#16a34a" />
                          </button>
                      )}
                      <button className="btn-icon" title="Xem chi tiết" onClick={() => handleViewDetail(inv)}>
                        <FileText size={18} color="#475569" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            
            {paginatedInvoices.length === 0 && (
               <tr>
                 <td colSpan={9} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
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

      {/* MODAL 1: NHẬP SỐ ĐIỆN NƯỚC ĐƠN LẺ */}
      {showReadingModal && selectedInvoice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '600px' }}>
            <div className="modal-header">
              <h3>Sửa chỉ số - {getRoomName(selectedInvoice)}</h3>
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
                      <label style={{ fontSize: '13px', color: '#dc2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                        <input type="checkbox" checked={isElecReset} onChange={(e) => setIsElecReset(e.target.checked)} style={{ margin: 0, cursor: 'pointer' }} />
                        Đồng hồ quay vòng (Reset)
                      </label>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Chỉ số tháng cũ</label>
                        <input type="number" disabled value={dualReadingForm.elecOld} style={{ background: '#f1f5f9', cursor: 'not-allowed' }} />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Chỉ số tháng này</label>
                        <input type="number" 
                          min={isElecReset ? 0 : dualReadingForm.elecOld} 
                          required 
                          value={dualReadingForm.elecNew} 
                          onChange={e => setDualReadingForm({...dualReadingForm, elecNew: Number(e.target.value)})} 
                        />
                      </div>
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '14px', fontWeight: 600, color: '#b45309' }}>
                      Sử dụng: {Math.max(0, isElecReset ? (100000 - dualReadingForm.elecOld + dualReadingForm.elecNew) : (dualReadingForm.elecNew - dualReadingForm.elecOld))} kWh
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
                      <label style={{ fontSize: '13px', color: '#dc2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                        <input type="checkbox" checked={isWaterReset} onChange={(e) => setIsWaterReset(e.target.checked)} style={{ margin: 0, cursor: 'pointer' }} />
                        Đồng hồ quay vòng (Reset)
                      </label>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Chỉ số tháng cũ</label>
                        <input type="number" disabled value={dualReadingForm.waterOld} style={{ background: '#f1f5f9', cursor: 'not-allowed' }} />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Chỉ số tháng này</label>
                        <input type="number" 
                          min={isWaterReset ? 0 : dualReadingForm.waterOld} 
                          required 
                          value={dualReadingForm.waterNew} 
                          onChange={e => setDualReadingForm({...dualReadingForm, waterNew: Number(e.target.value)})} 
                        />
                      </div>
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '14px', fontWeight: 600, color: '#0369a1' }}>
                      Sử dụng: {Math.max(0, isWaterReset ? (100000 - dualReadingForm.waterOld + dualReadingForm.waterNew) : (dualReadingForm.waterNew - dualReadingForm.waterOld))} Khối
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

      {/* MODAL 2: CHI TIẾT HÓA ĐƠN */}
      {showDetailModal && selectedInvoice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '650px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={20}/> Chi tiết {selectedInvoice.type === 'Periodic' ? 'Hóa đơn Định kỳ' : 'Hóa đơn Phát sinh'}
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
                  {getRoomName(selectedInvoice)}
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
                  {renderStatusBadge(selectedInvoice.status)}
                </span>
              </div>

              {selectedInvoice.type === 'Periodic' && selectedInvoice.items && selectedInvoice.items.length > 0 && (
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
                                Tiêu thụ: <b>{item.usage}</b> <br/> ({item.oldIndex} - {item.newIndex})
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

              {selectedInvoice.type === 'Incurred' && (
                <div style={{ marginTop: '20px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', background: '#f8fafc' }}>
                  <h4 style={{ margin: '0 0 12px 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Wrench size={16} color="#d97706" /> Nguồn gốc phát sinh (Sửa chữa)
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', fontSize: '14px' }}>
                    <span style={{ color: '#64748b' }}>Thiết bị lỗi:</span>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{selectedInvoice.deviceName || "Không xác định"}</span>
                    
                    <span style={{ color: '#64748b' }}>Mô tả từ khách:</span>
                    <span style={{ color: '#334155', fontStyle: 'italic' }}>"{selectedInvoice.repairDescription || "Không có mô tả"}"</span>
                  </div>
                </div>
              )}
              
              <div className="detail-row" style={{ borderBottom: 'none', marginTop: 12, background: '#f1f5f9', padding: 16, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap' }}>
                <span className="detail-label" style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', width: 'auto', marginRight: '20px' }}>
                  TỔNG CẦN THU:
                </span>
                <span className="detail-value text-price" style={{ fontSize: 24, color: '#2563eb', fontWeight: 700, whiteSpace: 'nowrap', textAlign: 'right' }}>
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

      {/* MODAL 3: XÁC NHẬN CHUYÊN NGHIỆP */}
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
                onClick={() => setConfirmModal({ isOpen: false, action: null, message: '', targetId: undefined, targetType: undefined })}
              >
                Hủy bỏ
              </button>
              <button 
                className="btn btn-primary" 
                onClick={executeConfirmAction}
                disabled={loading}
              >
                {loading ? 'Đang xử lý...' : 'Đồng ý'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: GHI CHỈ SỐ HÀNG LOẠT */}
      {showBulkReadingModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '900px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3>⚡ Ghi Chỉ Số Điện Nước Hàng Loạt</h3>
              <button onClick={() => setShowBulkReadingModal(false)} className="btn-icon"><X size={20}/></button>
            </div>
            <div className="modal-body" style={{ padding: '0' }}>
              <div style={{ padding: '16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '14px' }}>
                * Hệ thống tự động bỏ qua nếu số mới không thay đổi. Nếu đồng hồ bị quay vòng (nhảy về 0), hãy tick vào ô <b>"Reset"</b>.
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
                  {occupiedRooms.map(room => {
                    const isDone = completedRooms[room._id]; // Kiểm tra xem phòng này đã chốt chưa

                    return (
                      <tr key={room._id} style={{ opacity: isDone ? 0.6 : 1, background: isDone ? '#f8fafc' : 'white' }}>
                        <td style={{ fontWeight: 'bold', color: '#0f172a', verticalAlign: 'top', paddingTop: '16px' }}>
                          {room.name}
                          {isDone && <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 'normal', marginTop: '4px' }}>✓ Đã chốt</div>}
                        </td>
                        <td style={{ verticalAlign: 'top', paddingTop: '16px' }}>
                          <input type="number" disabled value={bulkData[room._id]?.eOld || 0} style={{ width: '80px', padding: '6px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 4, cursor: 'not-allowed' }} />
                        </td>
                        <td style={{ verticalAlign: 'top', paddingTop: '16px' }}>
                          <input type="number" 
                            disabled={isDone} 
                            min={bulkData[room._id]?.eReset ? 0 : (bulkData[room._id]?.eOld || 0)} 
                            value={bulkData[room._id]?.eNew || 0} 
                            onChange={(e) => setBulkData({ ...bulkData, [room._id]: { ...bulkData[room._id], eNew: Number(e.target.value) } })}
                            style={{ width: '100px', padding: '6px', border: '1px solid #3b82f6', borderRadius: 4, cursor: isDone ? 'not-allowed' : 'text' }} 
                          />
                          {!isDone && (
                            <label style={{ fontSize: '11px', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', marginTop: '8px' }}>
                              <input type="checkbox" checked={bulkData[room._id]?.eReset} onChange={e => setBulkData({...bulkData, [room._id]: {...bulkData[room._id], eReset: e.target.checked}})} style={{ width: '13px', height: '13px', margin: 0, marginRight: '6px' }} />
                              Reset
                            </label>
                          )}
                        </td>
                        <td style={{ verticalAlign: 'top', paddingTop: '16px' }}>
                          <input type="number" disabled value={bulkData[room._id]?.wOld || 0} style={{ width: '80px', padding: '6px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 4, cursor: 'not-allowed' }} />
                        </td>
                        <td style={{ verticalAlign: 'top', paddingTop: '16px' }}>
                          <input type="number" 
                            disabled={isDone} 
                            min={bulkData[room._id]?.wReset ? 0 : (bulkData[room._id]?.wOld || 0)} 
                            value={bulkData[room._id]?.wNew || 0} 
                            onChange={(e) => setBulkData({ ...bulkData, [room._id]: { ...bulkData[room._id], wNew: Number(e.target.value) } })}
                            style={{ width: '100px', padding: '6px', border: '1px solid #0ea5e9', borderRadius: 4, cursor: isDone ? 'not-allowed' : 'text' }} 
                          />
                          {!isDone && (
                            <label style={{ fontSize: '11px', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', marginTop: '8px' }}>
                              <input type="checkbox" checked={bulkData[room._id]?.wReset} onChange={e => setBulkData({...bulkData, [room._id]: {...bulkData[room._id], wReset: e.target.checked}})} style={{ width: '13px', height: '13px', margin: 0, marginRight: '6px' }} />
                              Reset
                            </label>
                          )}
                        </td>
                      </tr>
                    );
                  })}
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
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Download, Search, Filter } from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import toastr from 'toastr';
import './ReportCashFlow.css';

const API_BASE_URL = 'http://localhost:9999/api';
const ITEMS_PER_PAGE = 15; 

const ReportCashFlow = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/finance/cashflow?startDate=${startDate}&endDate=${endDate}`);
      setData(res.data.data);
      setCurrentPage(1); 
    } catch (error) {
      toastr.error("Lỗi lấy báo cáo");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const exportToExcel = () => {
    if (!data || !data.ledger) return;
    
    // [ĐÃ SỬA] Đã xóa cột "Hình thức thanh toán" khỏi mảng dữ liệu xuất Excel
    const excelData = data.ledger.map((item: any) => ({
      "Ngày chứng từ": new Date(item.date).toLocaleDateString('vi-VN'),
      "Mã chứng từ": item.code,
      "Phòng": item.room,
      "Diễn giải": item.description, 
      "Loại": item.transactionType,
      "Hạng mục": item.category,
      "Phát sinh TĂNG (Thu)": item.inflow,
      "Phát sinh GIẢM (Chi)": item.outflow,
      "Trạng thái": item.status === 'Paid' ? 'Đã thu' : item.status === 'Unpaid' ? 'Đang nợ' : item.status
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);

    const range = XLSX.utils.decode_range(ws['!ref'] as string);

    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col }); 
      if (!ws[cellAddress]) continue;

      ws[cellAddress].s = {
        font: { bold: true, color: { rgb: "000000" } },
        fill: { fgColor: { rgb: "FFFF00" } },
        alignment: { horizontal: "center", vertical: "center" }
      };
    }

    // [ĐÃ SỬA] Xóa định dạng độ rộng cho cột "Hình thức TT"
    ws['!cols'] = [
      { wch: 15 }, // Ngày CT
      { wch: 25 }, // Mã CT
      { wch: 12 }, // Phòng
      { wch: 45 }, // Diễn giải
      { wch: 12 }, // Loại
      { wch: 30 }, // Hạng mục
      { wch: 22 }, // Phát sinh TĂNG
      { wch: 22 }, // Phát sinh GIẢM
      { wch: 15 }  // Trạng thái
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bao_Cao_Dong_Tien");
    
    XLSX.writeFile(wb, `Bao_Cao_Dong_Tien_${startDate}_${endDate}.xlsx`);
};

  const ledgerItems = data?.ledger || [];
  const totalPages = Math.ceil(ledgerItems.length / ITEMS_PER_PAGE);
  
  const currentData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return ledgerItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [ledgerItems, currentPage]);

  if (!data && loading) return <div>Đang tải báo cáo...</div>;
  if (!data) return null;

  return (
    <div className="report-container">
      <div className="report-header">
        <h2>Báo Cáo Dòng Tiền & Công Nợ</h2>
        <div className="report-actions">
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="date-input"/>
          <span>đến</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="date-input"/>
          <button onClick={fetchReport} className="btn-primary"><Filter size={16}/> Lọc</button>
          <button onClick={exportToExcel} className="btn-success"><Download size={16}/> Xuất Excel</button>
        </div>
      </div>

      {/* BẢNG CÂN ĐỐI (SUMMARY) */}
      <div className="balance-sheet">
        <div className="balance-item">
          <span className="label">Tổng Phải Thu:</span>
          <span className="value text-blue">{formatCurrency(data.summary.expectedRevenue)}</span>
        </div>
        <div className="balance-item">
          <span className="label">Tổng Thực Thu:</span>
          <span className="value text-green">{formatCurrency(data.summary.actualCollected)}</span>
          <small>Tỉ lệ thu: {data.summary.collectionRate}%</small>
        </div>
        <div className="balance-item">
          <span className="label">Tổng Thực Chi:</span>
          <span className="value text-red">{formatCurrency(data.summary.actualExpense)}</span>
        </div>
        <div className="balance-item highlight">
          <span className="label">TỒN QUỸ (Net):</span>
          <span className="value">{formatCurrency(data.summary.netCashFlow)}</span>
        </div>
        <div className="balance-item warning">
          <span className="label">Công Nợ Tồn Đọng:</span>
          <span className="value text-orange">{formatCurrency(data.summary.totalDebt)}</span>
        </div>
      </div>

      {/* BẢNG SAO KÊ CHI TIẾT (LEDGER) */}
      <div className="ledger-table-container" style={{ borderRadius: '12px 12px 0 0', borderBottom: 'none' }}>
        <table className="ledger-table" style={{ marginBottom: 0 }}>
          <thead>
            <tr>
              <th>Ngày chứng từ</th>
              <th>Mã chứng từ</th>
              <th>Phòng</th>
              <th>Diễn giải</th>
              <th>Loại</th>
              <th>Hạng mục</th>
              {/* Đã xóa <th>Hình thức TT</th> ở đây */}
              <th style={{textAlign: 'right'}}>Tăng (+)</th>
              <th style={{textAlign: 'right'}}>Giảm (-)</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {currentData.length > 0 ? (
              currentData.map((row: any, idx: number) => (
                <tr key={idx}>
                  <td>{new Date(row.date).toLocaleDateString('vi-VN')}</td>
                  <td style={{fontWeight: 600}}>{row.code}</td>
                  <td>{row.room}</td>
                  
                  <td style={{ maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={row.description}>
                    {row.description}
                  </td>

                  <td>
                    <span className={`tag ${row.transactionType === 'THU' ? 'tag-green' : row.transactionType === 'CHI' ? 'tag-red' : 'tag-orange'}`}>
                      {row.transactionType}
                    </span>
                  </td>
                  <td>{row.category}</td>

                  {/* Đã xóa thẻ <td> chứa row.paymentMethod ở đây */}

                  <td style={{textAlign: 'right', color: '#16a34a', fontWeight: 500}}>
                    {row.inflow > 0 ? formatCurrency(row.inflow) : '-'}
                  </td>
                  <td style={{textAlign: 'right', color: '#ef4444', fontWeight: 500}}>
                    {row.outflow > 0 ? formatCurrency(row.outflow) : '-'}
                  </td>
                  <td>{row.status === 'Paid' || row.status === 'Completed' ? 'Hoàn tất' : 'Đang nợ'}</td>
                </tr>
              ))
            ) : (
              <tr>
                {/* [ĐÃ SỬA] colSpan giảm từ 10 xuống 9 vì đã xóa 1 cột */}
                <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  Không có giao dịch nào trong khoảng thời gian này.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* GIAO DIỆN PHÂN TRANG */}
      {ledgerItems.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#fff', border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 12px 12px' }}>
          <div style={{ fontSize: '14px', color: '#64748b' }}>
            Hiển thị <b>{(currentPage - 1) * ITEMS_PER_PAGE + 1}</b> đến <b>{Math.min(currentPage * ITEMS_PER_PAGE, ledgerItems.length)}</b> trong tổng số <b>{ledgerItems.length}</b> bản ghi
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

    </div>
  );
};

export default ReportCashFlow;
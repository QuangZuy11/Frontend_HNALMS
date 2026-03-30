import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Download, Filter, TrendingUp, TrendingDown, DollarSign, PieChart } from 'lucide-react';
import * as XLSX from 'xlsx'; 
import toastr from 'toastr';
import './ReportCashFlow.css'; // Dùng chung file CSS của Cashflow cho đồng bộ giao diện

const API_BASE_URL = 'http://localhost:9999/api';
const ITEMS_PER_PAGE = 15;

const RevenueReport = () => {
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
      const res = await axios.get(`${API_BASE_URL}/finance/revenue?startDate=${startDate}&endDate=${endDate}`);
      setData(res.data.data);
      setCurrentPage(1);
    } catch (error) {
      toastr.error("Lỗi lấy báo cáo doanh thu");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const exportToExcel = () => {
    if (!data || !data.ledger) return;
    const excelData = data.ledger.map((item: any) => ({
      "Ngày Ghi Nhận": new Date(item.date).toLocaleDateString('vi-VN'),
      "Mã Chứng Từ": item.code,
      "Phòng": item.room,
      "Hạng Mục": item.category,
      "Diễn Giải": item.description,
      "Doanh Thu (+)": item.revenue,
      "Chi Phí (-)": item.expense,
      "Tình Trạng Thu Tiền": item.status
    }));
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bao_Cao_KQKD");
    XLSX.writeFile(wb, `Ket_Qua_Kinh_Doanh_${startDate}_${endDate}.xlsx`);
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
        <div>
          <h2>Báo Cáo Kết Quả Kinh Doanh (P&L)</h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
            Phân tích mức độ sinh lời thực tế (Đã loại trừ tiền phòng trả trước kỳ sau)
          </p>
        </div>
        <div className="report-actions">
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="date-input"/>
          <span>đến</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="date-input"/>
          <button onClick={fetchReport} className="btn-primary"><Filter size={16}/> Lọc</button>
          <button onClick={exportToExcel} className="btn-success"><Download size={16}/> Xuất Excel</button>
        </div>
      </div>

      {/* BẢNG CHỈ SỐ LỢI NHUẬN (KPIs) */}
      <div className="balance-sheet">
        <div className="balance-item" style={{ borderColor: '#bfdbfe', background: '#eff6ff' }}>
          <span className="label" style={{ color: '#1d4ed8' }}><TrendingUp size={16} style={{display: 'inline', marginBottom: '-3px'}}/> TỔNG DOANH THU GHI NHẬN</span>
          <span className="value text-blue">{formatCurrency(data.summary.recognizedRevenue)}</span>
          <small>Bao gồm cả hóa đơn đang nợ</small>
        </div>
        <div className="balance-item" style={{ borderColor: '#fecaca', background: '#fef2f2' }}>
          <span className="label" style={{ color: '#b91c1c' }}><TrendingDown size={16} style={{display: 'inline', marginBottom: '-3px'}}/> TỔNG CHI PHÍ GHI NHẬN</span>
          <span className="value text-red">{formatCurrency(data.summary.recognizedExpense)}</span>
          <small>Các khoản đã chi trong kỳ</small>
        </div>
        <div className="balance-item highlight" style={{ background: '#166534', borderColor: '#14532d' }}>
          <span className="label" style={{ color: '#bbf7d0' }}><DollarSign size={16} style={{display: 'inline', marginBottom: '-3px'}}/> LỢI NHUẬN GỘP (NET PROFIT)</span>
          <span className="value text-white">{formatCurrency(data.summary.netProfit)}</span>
          <small style={{ color: '#dcfce7' }}>Lợi nhuận thực tế sinh ra</small>
        </div>
        <div className="balance-item" style={{ borderColor: '#e9d5ff', background: '#faf5ff' }}>
          <span className="label" style={{ color: '#7e22ce' }}><PieChart size={16} style={{display: 'inline', marginBottom: '-3px'}}/> BIÊN LỢI NHUẬN (MARGIN)</span>
          <span className="value" style={{ color: '#9333ea' }}>{data.summary.profitMargin}%</span>
          <small>Tỷ suất sinh lời / Doanh thu</small>
        </div>
      </div>

      {/* BẢNG GHI NHẬN DOANH THU CHI PHÍ */}
      <div className="ledger-table-container" style={{ borderRadius: '12px 12px 0 0', borderBottom: 'none' }}>
        <table className="ledger-table" style={{ marginBottom: 0 }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th>Ngày Ghi Nhận</th>
              <th>Mã CT</th>
              <th>Phòng</th>
              <th>Hạng mục</th>
              <th>Diễn giải</th>
              <th style={{textAlign: 'right'}}>Doanh Thu (+)</th>
              <th style={{textAlign: 'right'}}>Chi Phí (-)</th>
              <th>Trạng thái dòng tiền</th>
            </tr>
          </thead>
          <tbody>
            {currentData.length > 0 ? (
              currentData.map((row: any, idx: number) => (
                <tr key={idx}>
                  <td>{new Date(row.date).toLocaleDateString('vi-VN')}</td>
                  <td style={{fontWeight: 600, color: '#475569'}}>{row.code}</td>
                  <td>{row.room}</td>
                  <td style={{ fontWeight: 500 }}>{row.category}</td>
                  <td style={{ maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={row.description}>
                    {row.description}
                  </td>
                  <td style={{textAlign: 'right', color: '#2563eb', fontWeight: 600}}>
                    {row.revenue > 0 ? formatCurrency(row.revenue) : '-'}
                  </td>
                  <td style={{textAlign: 'right', color: '#ef4444', fontWeight: 600}}>
                    {row.expense > 0 ? formatCurrency(row.expense) : '-'}
                  </td>
                  <td>
                    <span style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', color: row.status === 'Đã thu tiền' || row.status === 'Đã chi' ? '#16a34a' : '#d97706' }}>
                      {row.status === 'Đang ghi công nợ' ? '⚠️' : '✅'} {row.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  Không có phát sinh doanh thu / chi phí nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PHÂN TRANG */}
      {ledgerItems.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#fff', border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 12px 12px' }}>
          <div style={{ fontSize: '14px', color: '#64748b' }}>
            Hiển thị <b>{(currentPage - 1) * ITEMS_PER_PAGE + 1}</b> đến <b>{Math.min(currentPage * ITEMS_PER_PAGE, ledgerItems.length)}</b> trong <b>{ledgerItems.length}</b> bản ghi
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="btn-paginate">Trước</button>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', background: '#f1f5f9', padding: '6px 16px', borderRadius: '6px' }}>
              Trang {currentPage} / {totalPages}
            </span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="btn-paginate">Sau</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RevenueReport;
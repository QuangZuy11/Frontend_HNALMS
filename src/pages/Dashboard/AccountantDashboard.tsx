import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  TrendingUp, TrendingDown, DollarSign, AlertCircle, 
  Wallet, PieChart as PieChartIcon, Calendar
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import toastr from 'toastr';
import 'toastr/build/toastr.min.css';
import './AccountantDashboard.css';

const API_BASE_URL = 'http://localhost:9999/api';
const COLORS = ['#3b82f6', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444'];

const AccountantDashboard = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchDashboardData();
  }, [month, year]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/finance/dashboard?month=${month}&year=${year}`);
      setData(res.data.data);
    } catch (error) {
      toastr.error("Không thể tải dữ liệu tài chính.");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    if (!val) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('vi-VN');

  if (loading && !data) return <div className="p-8 text-center text-slate-500">Đang tải dữ liệu...</div>;
  if (!data) return null;

  return (
    <div className="finance-dashboard">
      {/* HEADER & FILTER */}
      <div className="dash-header">
        <div>
          <h2>Báo Cáo Tài Chính Tòa Nhà</h2>
          <p>Kiểm soát dòng tiền, doanh thu, chi phí và công nợ</p>
        </div>
        <div className="date-filter">
          <Calendar size={18} className="text-slate-400" />
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {Array.from({length: 12}, (_, i) => <option key={i} value={i+1}>Tháng {i+1}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[year-1, year, year+1].map(y => <option key={y} value={y}>Năm {y}</option>)}
          </select>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="summary-grid">
        <div className="summary-card revenue">
          <div className="card-icon"><TrendingUp size={24} /></div>
          <div className="card-info">
            <span>Tổng Thực Thu</span>
            <h3>{formatCurrency(data.summary.totalRevenue)}</h3>
          </div>
        </div>
        <div className="summary-card expense">
          <div className="card-icon"><TrendingDown size={24} /></div>
          <div className="card-info">
            <span>Tổng Thực Chi</span>
            <h3>{formatCurrency(data.summary.totalExpense)}</h3>
          </div>
        </div>
        <div className="summary-card profit">
          <div className="card-icon"><DollarSign size={24} /></div>
          <div className="card-info">
            <span>Lợi Nhuận Gộp (Net)</span>
            <h3>{formatCurrency(data.summary.netProfit)}</h3>
          </div>
        </div>
        <div className="summary-card debt">
          <div className="card-icon"><AlertCircle size={24} /></div>
          <div className="card-info">
            <span>Công Nợ Chưa Thu</span>
            <h3>{formatCurrency(data.summary.totalDebt)}</h3>
          </div>
        </div>
      </div>

      {/* CHARTS SECTION */}
      <div className="charts-grid">
        {/* BAR CHART: DÒNG TIỀN 6 THÁNG */}
        <div className="chart-box">
          <h4 className="box-title"><Wallet size={18}/> Dòng tiền Thu/Chi 6 tháng gần nhất</h4>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} tickFormatter={(val) => `${val / 1000000}M`} />
                <Tooltip formatter={(val: number) => formatCurrency(val)} cursor={{fill: '#f1f5f9'}} />
                <Legend iconType="circle" />
                <Bar dataKey="revenue" name="Thực Thu" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="expense" name="Thực Chi" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PIE CHART: CƠ CẤU DOANH THU */}
        <div className="chart-box">
          <h4 className="box-title"><PieChartIcon size={18}/> Cơ cấu Doanh thu (Tháng {month})</h4>
          <div className="chart-wrapper" style={{ display: 'flex', alignItems: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.revenueBreakdown}
                  cx="50%" cy="50%"
                  innerRadius={60} outerRadius={90}
                  paddingAngle={5} dataKey="value"
                >
                  {data.revenueBreakdown.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: number) => formatCurrency(val)} />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Custom Legend cho Pie Chart */}
            <div className="pie-legend">
              {data.revenueBreakdown.map((entry: any, index: number) => (
                <div key={index} className="legend-item">
                  <span className="legend-dot" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                  <span className="legend-name">{entry.name}</span>
                  <span className="legend-val">{formatCurrency(entry.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* TOP DEBTS TABLE */}
      <div className="table-box">
        <h4 className="box-title"><AlertCircle size={18} color="#ef4444"/> Top 5 Công Nợ Giá Trị Cao Đang Nợ</h4>
        <table className="debt-table">
          <thead>
            <tr>
              <th>Mã Hóa Đơn</th>
              <th>Phân Loại</th>
              <th>Tiêu đề</th>
              <th>Hạn chót</th>
              <th style={{ textAlign: 'right' }}>Số tiền nợ</th>
            </tr>
          </thead>
          <tbody>
            {data.topDebts.length > 0 ? data.topDebts.map((debt: any, idx: number) => (
              <tr key={idx}>
                <td style={{ fontWeight: 600, color: '#334155' }}>{debt.code}</td>
                <td>
                  <span className={`type-badge ${debt.type === 'Định kỳ' ? 'periodic' : 'incurred'}`}>
                    {debt.type}
                  </span>
                </td>
                <td>{debt.title}</td>
                <td style={{ color: '#ef4444' }}>{formatDate(debt.dueDate)}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>{formatCurrency(debt.amount)}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                  Thật tuyệt vời! Không có công nợ nào trong tháng này.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default AccountantDashboard;
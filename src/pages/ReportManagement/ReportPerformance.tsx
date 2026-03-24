import { useState, useEffect, useRef, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
} from "@mui/material";
import { reportService } from "../../services/reportService";
import type { VacancyMonthData, SnapshotData } from "../../services/reportService";
import "./ReportPerformance.css";

const COLORS = {
  occupied: "#1976D2",
  vacant: "#9e9e9e",
};

const PIE_COLORS = ["#1976D2", "#9e9e9e"];

const formatMonth = (monthStr: string) => {
  const [year, mon] = monthStr.split("-");
  return `${MONTH_NAMES[parseInt(mon, 10) - 1]} - ${year}`;
};

const MONTH_NAMES = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];

// Sinh danh sách năm — năm hiện tại và năm trước
const generateYearOptions = () => {
  const now = new Date();
  return [now.getFullYear(), now.getFullYear() - 1];
};

const YEAR_OPTIONS = generateYearOptions();

export default function ReportPerformance() {
  const [monthlyData, setMonthlyData] = useState<VacancyMonthData[]>([]);
  const [snapshot, setSnapshot] = useState<SnapshotData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const selectedMonthRef = useRef(currentMonth);
  const selectedYearRef = useRef(currentYear);

  // MONTH_OPTIONS động: nếu chọn năm hiện tại thì giới hạn tháng <= tháng hiện tại
  const monthOptions = MONTH_NAMES.map((label, index) => {
    const value = index + 1;
    const maxMonth = selectedYear === currentYear ? currentMonth : 12;
    const disabled = value > maxMonth;
    return { value, label, disabled };
  });

  const loadData = useCallback(async (month: number, year: number) => {
    try {
      setError(null);
      const monthStr = `${year}-${String(month).padStart(2, "0")}`;

      // Lấy 6 tháng kết thúc tại selectedMonth
      let barStartYear = year;
      let barStartMonth = month - 5;
      if (barStartMonth <= 0) {
        barStartMonth += 12;
        barStartYear -= 1;
      }
      const apiStartMonth = `${barStartYear}-${String(barStartMonth).padStart(2, "0")}`;
      const apiEndMonth = monthStr;

      const [vacancyRes, snapshotRes] = await Promise.all([
        reportService.getVacancyReport({ startMonth: apiStartMonth, endMonth: apiEndMonth }),
        reportService.getSnapshot({ month: monthStr }),
      ]);

      setMonthlyData(vacancyRes);
      setSnapshot(snapshotRes);
    } catch (err: unknown) {
      console.error("Error loading performance report:", err);
      const error = err as { response?: { data?: { message?: string } } };
      setError(error?.response?.data?.message ?? "Không thể tải dữ liệu báo cáo");
    }
  }, []);

  // Load initial data once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData(currentMonth, currentYear); }, []);

  const handleMonthChange = (month: number) => {
    setSelectedMonth(month);
    selectedMonthRef.current = month;
    loadData(month, selectedYearRef.current);
  };

  const handleYearChange = (year: number) => {
    const newMonth = year === currentYear
      ? Math.min(selectedMonthRef.current, currentMonth)
      : selectedMonthRef.current;
    setSelectedYear(year);
    setSelectedMonth(newMonth);
    selectedYearRef.current = year;
    selectedMonthRef.current = newMonth;
    loadData(newMonth, year);
  };

  const pieData = snapshot
    ? [
        { name: "Đã thuê", value: snapshot.occupied, color: PIE_COLORS[0] },
        { name: "Phòng trống", value: snapshot.vacant, color: PIE_COLORS[1] },
      ]
    : [];

  return (
    <div className="report-performance-container">
      <div className="report-performance-header">
        <h2 className="report-performance-title">Báo Cáo Hiệu Suất</h2>
        <p className="report-performance-subtitle">
          Thống kê tỷ lệ lấp đầy và phòng trống theo tháng
        </p>
      </div>

      {/* Filter row */}
      <div className="report-performance-filters">
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Tháng</InputLabel>
            <Select
              label="Tháng"
              value={selectedMonth}
              onChange={(e) => handleMonthChange(e.target.value as number)}
            >
              {monthOptions.map((opt) => (
                <MenuItem key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Năm</InputLabel>
            <Select
              label="Năm"
              value={selectedYear}
              onChange={(e) => handleYearChange(e.target.value as number)}
            >
              {YEAR_OPTIONS.map((year) => (
                <MenuItem key={year} value={year}>
                  {year}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </div>

      {error ? (
        <div className="report-error">{error}</div>
      ) : (
        <>
          {/* Snapshot cards */}
          {snapshot && (
            <div className="snapshot-cards">
              <div className="snapshot-card">
                <div className="snapshot-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1976D2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                </div>
                <div className="snapshot-label">Tổng phòng</div>
                <div className="snapshot-value">{snapshot.totalRooms}</div>
              </div>
              <div className="snapshot-card">
                <div className="snapshot-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <div className="snapshot-label">Đã thuê</div>
                <div className="snapshot-value occupied">{snapshot.occupied}</div>
              </div>
              <div className="snapshot-card">
                <div className="snapshot-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef6c00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <line x1="9" y1="3" x2="9" y2="21"/>
                  </svg>
                </div>
                <div className="snapshot-label">Phòng trống</div>
                <div className="snapshot-value vacant">{snapshot.vacant}</div>
              </div>
              <div className="snapshot-card">
                <div className="snapshot-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7b1fa2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10"/>
                    <line x1="12" y1="20" x2="12" y2="4"/>
                    <line x1="6" y1="20" x2="6" y2="14"/>
                  </svg>
                </div>
                <div className="snapshot-label">Tỷ lệ lấp đầy</div>
                <div className="snapshot-value rate">{snapshot.occupancyRate}%</div>
              </div>
            </div>
          )}

          {/* Charts row */}
          <div className="charts-row">
            {/* Bar chart */}
            <div className="chart-card bar-chart-card">
              <h3 className="chart-title">Số phòng đang thuê 6 tháng gần nhất</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis
                    dataKey="month"
                    tickFormatter={(v) => {
                      const [, m] = v.split("-");
                      return `T${m}`;
                    }}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const pOccupied = (payload as any[]).find((p) => p.dataKey === "occupied");
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const pVacant = (payload as any[]).find((p) => p.dataKey === "vacant");
                        const occupied = pOccupied?.value ?? 0;
                        const vacant = pVacant?.value ?? 0;
                        return (
                          <div style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 8, padding: "10px 14px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
                            <p style={{ margin: "0 0 6px", fontWeight: 600, fontSize: 13 }}>{formatMonth(String(label ?? ""))}</p>
                            <p style={{ margin: "0 0 3px", fontSize: 12, color: "#1976D2" }}>Đã thuê: {occupied} phòng</p>
                            <p style={{ margin: 0, fontSize: 12, color: "#9e9e9e" }}>Phòng trống: {vacant} phòng</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    formatter={(value: string) =>
                      value === "occupied" ? "Đã thuê" : "Phòng trống"
                    }
                  />
                  <Bar dataKey="occupied" fill={COLORS.occupied} name="occupied" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="vacant" fill={COLORS.vacant} name="vacant" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie chart */}
            <div className="chart-card pie-chart-card">
              <h3 className="chart-title">Tỷ lệ lấp đầy tháng {selectedMonth}/{selectedYear}</h3>
              {snapshot && (
                <>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      <Tooltip formatter={(v: any, n: any) => [`${v} phòng`, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pie-center-label">
                    <div className="pie-center-rate">{snapshot.occupancyRate}%</div>
                    <div className="pie-center-text">Lấp đầy</div>
                  </div>
                  <div className="pie-legend">
                    {pieData.map((entry) => {
                      const pct = snapshot.totalRooms > 0
                        ? Math.round((entry.value / snapshot.totalRooms) * 100)
                        : 0;
                      return (
                        <div key={entry.name} className="pie-legend-item">
                          <span
                            className="pie-legend-dot"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="pie-legend-name">{entry.name}</span>
                          <span className="pie-legend-value">
                            {entry.value} phòng ({pct}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Data table */}
          {monthlyData.length > 0 && (
            <div className="data-table-section">
              <h3 className="chart-title">Chi tiết 6 tháng gần nhất</h3>
              <div className="table-wrapper">
                <table className="performance-table">
                  <thead>
                    <tr>
                      <th>Tháng</th>
                      <th>Đã thuê</th>
                      <th>Phòng trống</th>
                      <th>Tổng</th>
                      <th>Tỷ lệ lấp đầy</th>
                      <th>Tỷ lệ trống</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyData.map((row) => (
                      <tr key={row.month}>
                        <td>{formatMonth(row.month)}</td>
                        <td>
                          <span className="badge occupied">{row.occupied}</span>
                        </td>
                        <td>
                          <span className="badge vacant">{row.vacant}</span>
                        </td>
                        <td>{snapshot?.totalRooms}</td>
                        <td>
                          <div className="rate-bar-wrapper">
                            <div className="rate-bar-bg">
                              <div
                                className="rate-bar occupied"
                                style={{ width: `${row.occupancyRate}%` }}
                              />
                            </div>
                            <span className="rate-text">{row.occupancyRate}%</span>
                          </div>
                        </td>
                        <td>
                          <div className="rate-bar-wrapper">
                            <div className="rate-bar-bg">
                              <div
                                className="rate-bar vacant"
                                style={{ width: `${row.vacancyRate}%` }}
                              />
                            </div>
                            <span className="rate-text">{row.vacancyRate}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

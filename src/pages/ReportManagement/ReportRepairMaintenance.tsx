import { useState, useEffect, useCallback } from "react";
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
import {
  Wrench,
  HardHat,
  AlertTriangle,
  TrendingUp,
  Activity,
} from "lucide-react";
import { reportService } from "../../services/reportService";
import type {
  MaintenanceMonthData,
  MaintenanceSnapshotData,
} from "../../services/reportService";
import "./ReportRepairMaintenance.css";

const MONTH_NAMES = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];

const PIE_COLORS = ["#2e69b1", "#2e7d32"];
const TYPE_COLORS = ["#2e69b1", "#2e7d32"];

const formatMonth = (monthStr: string) => {
  const [year, mon] = monthStr.split("-");
  return `${MONTH_NAMES[parseInt(mon, 10) - 1]} ${year}`;
};

const formatMonthShort = (monthStr: string) => {
  const [, mon] = monthStr.split("-");
  return `T${parseInt(mon, 10)}`;
};

export default function ReportRepairMaintenance() {
  const [monthlyData, setMonthlyData] = useState<MaintenanceMonthData[]>([]);
  const [snapshot, setSnapshot] = useState<MaintenanceSnapshotData | null>(null);
  const [peakMonth, setPeakMonth] = useState<MaintenanceMonthData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;
  const [selectedMonthStr, setSelectedMonthStr] = useState(currentMonthStr);

  // MONTH_OPTIONS động: chỉ hiện 6 tháng gần nhất tính từ tháng hiện tại
  const monthOptions = (() => {
    const opts = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1 - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      opts.push({
        value: `${y}-${String(m).padStart(2, "0")}`,
        label: `${MONTH_NAMES[m - 1]} ${y}`,
      });
    }
    return opts;
  })();

  const loadData = useCallback(async (monthStr: string) => {
    try {
      setError(null);

      // Lấy 6 tháng kết thúc tại selectedMonth
      const [y, m] = monthStr.split("-").map(Number);
      let barStartYear = y;
      let barStartMonth = m - 5;
      if (barStartMonth <= 0) {
        barStartMonth += 12;
        barStartYear -= 1;
      }
      const apiStartMonth = `${barStartYear}-${String(barStartMonth).padStart(2, "0")}`;
      const apiEndMonth = monthStr;

      const [byMonthRes, snapshotRes, peakRes] = await Promise.all([
        reportService.getMaintenanceByMonth({
          startMonth: apiStartMonth,
          endMonth: apiEndMonth,
        }),
        reportService.getMaintenanceSnapshot({ month: monthStr }),
        reportService.getPeakMonth({
          startMonth: apiStartMonth,
          endMonth: apiEndMonth,
        }),
      ]);

      setMonthlyData(byMonthRes);
      setSnapshot(snapshotRes);
      setPeakMonth(peakRes);
    } catch (err: unknown) {
      console.error("Error loading maintenance report:", err);
      const error = err as { response?: { data?: { message?: string } } };
      setError(error?.response?.data?.message ?? "Không thể tải dữ liệu báo cáo");
    }
  }, []);

  // Load initial data on mount
  useEffect(() => { loadData(currentMonthStr); }, [loadData, currentMonthStr]);

  const handleMonthChange = (monthStr: string) => {
    setSelectedMonthStr(monthStr);
    loadData(monthStr);
  };

  // Pie chart data: Sửa chữa vs Bảo trì
  const pieData = snapshot
    ? [
        { name: "Sửa chữa", value: snapshot.repairs, color: PIE_COLORS[0] },
        { name: "Bảo trì", value: snapshot.maintenance, color: PIE_COLORS[1] },
      ]
    : [];

  // Tính % cho pie legend
  const getPct = (value: number, total: number) => {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  };

  // Tính % cho biểu đồ tròn (dựa trên total)
  const peakPct = snapshot && snapshot.total > 0
    ? Math.round((peakMonth?.total ?? 0) / snapshot.total * 100)
    : 0;

  return (
    <div className="rrm-container">
      {/* Header */}
      <div className="rrm-header">
        <h2 className="rrm-title">Thống Kê Sửa Chữa & Bảo Trì</h2>
        <p className="rrm-subtitle">
          Theo dõi số lượng yêu cầu sửa chữa, bảo trì và tháng cao điểm
        </p>
      </div>

      {/* Filter row */}
      <div className="rrm-filters">
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Tháng</InputLabel>
            <Select
              label="Tháng"
              value={selectedMonthStr}
              onChange={(e) => handleMonthChange(e.target.value as string)}
            >
              {monthOptions.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </div>

      {error ? (
        <div className="rrm-error">{error}</div>
      ) : (
        <>
          {/* Snapshot cards */}
          <div className="rrm-snapshot-cards">
            {/* Tổng số */}
            <div className="rrm-card rrm-card-total">
              <div className="rrm-card-icon">
                <Activity size={20} color="#2e69b1" />
              </div>
              <div className="rrm-card-label">Tổng yêu cầu</div>
              <div className="rrm-card-value">{snapshot?.total ?? 0}</div>
              <div className="rrm-card-sub">
                {selectedMonthStr}
              </div>
            </div>

            {/* Sửa chữa */}
            <div className="rrm-card rrm-card-repairs">
              <div className="rrm-card-icon">
                <Wrench size={20} color="#2e69b1" />
              </div>
              <div className="rrm-card-label">Sửa chữa</div>
              <div className="rrm-card-value">{snapshot?.repairs ?? 0}</div>
              <div className="rrm-card-sub">
                {snapshot && getPct(snapshot.repairs, snapshot.total)}% tổng yêu cầu
              </div>
            </div>

            {/* Bảo trì */}
            <div className="rrm-card rrm-card-maintenance">
              <div className="rrm-card-icon">
                <HardHat size={20} color="#2e69b1" />
              </div>
              <div className="rrm-card-label">Bảo trì</div>
              <div className="rrm-card-value">{snapshot?.maintenance ?? 0}</div>
              <div className="rrm-card-sub">
                {snapshot && getPct(snapshot.maintenance, snapshot.total)}% tổng yêu cầu
              </div>
            </div>

            {/* Tháng cao điểm */}
            <div className="rrm-card rrm-card-peak rrm-peak-card">
              <div className="rrm-card-icon">
                <TrendingUp size={20} color="#2e69b1" />
              </div>
              <div className="rrm-card-label">Tháng cao điểm</div>
              <div className="rrm-card-value">
                {peakMonth ? peakMonth.total : 0}
              </div>
              <div className="rrm-card-sub">
                {peakMonth ? formatMonth(peakMonth.month) : "—"}
              </div>
              
            </div>
          </div>

          {/* Charts row */}
          <div className="rrm-charts-row">
            {/* Bar chart - 12 tháng */}
            <div className="rrm-chart-card">
              <h3 className="rrm-chart-title">Số lượng yêu cầu 6 tháng gần nhất</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis
                    dataKey="month"
                    tickFormatter={formatMonthShort}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const pTotal = (payload as any[]).find((p) => p.dataKey === "total");
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const pRepairs = (payload as any[]).find((p) => p.dataKey === "repairs");
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const pMaintenance = (payload as any[]).find((p) => p.dataKey === "maintenance");
                        return (
                          <div style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 8, padding: "10px 14px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
                            <p style={{ margin: "0 0 6px", fontWeight: 600, fontSize: 13 }}>
                              {formatMonth(String(label ?? ""))}
                            </p>
                            <p style={{ margin: "0 0 3px", fontSize: 12, color: "#2e69b1" }}>
                              Tổng: {pTotal?.value ?? 0} yêu cầu
                            </p>
                            <p style={{ margin: "0 0 3px", fontSize: 12, color: "#2e69b1" }}>
                              Sửa chữa: {pRepairs?.value ?? 0}
                            </p>
                            <p style={{ margin: 0, fontSize: 12, color: "#2e7d32" }}>
                              Bảo trì: {pMaintenance?.value ?? 0}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    formatter={(value: string) => {
                      const labels: Record<string, string> = {
                        total: "Tổng yêu cầu",
                        repairs: "Sửa chữa",
                        maintenance: "Bảo trì",
                      };
                      return labels[value] ?? value;
                    }}
                  />
                  <Bar dataKey="repairs" fill={TYPE_COLORS[0]} name="repairs" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="maintenance" fill={TYPE_COLORS[1]} name="maintenance" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="total" fill="transparent" stroke="transparent" name="total" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie chart */}
            <div className="rrm-chart-card">
              <h3 className="rrm-chart-title">
                Tỷ lệ Sửa chữa & Bảo trì tháng {selectedMonthStr}
              </h3>
              {snapshot && (
                <>
                  <div className="rrm-pie-wrapper">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        <Tooltip formatter={(v: any, n: any) => [`${v} yêu cầu`, n]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="rrm-pie-center">
                      <div className="rrm-pie-center-rate">{snapshot.total}</div>
                      <div className="rrm-pie-center-text">yêu cầu</div>
                    </div>
                  </div>

                  {/* Type breakdown legend */}
                  <div className="rrm-type-legend">
                    {pieData.map((entry) => (
                      <div key={entry.name} className="rrm-type-legend-item">
                        <span
                          className="rrm-type-legend-dot"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="rrm-type-legend-name">{entry.name}</span>
                        <span className="rrm-type-legend-value">{entry.value}</span>
                        <span className="rrm-type-legend-pct">
                          {getPct(entry.value, snapshot.total)}%
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Status summary */}
                  <div style={{ marginTop: 20 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 600, color: "#4a5568", margin: "0 0 10px" }}>
                      Trạng thái tháng này
                    </h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                      <div style={{ background: "rgba(46, 105, 177, 0.1)", padding: "8px 10px", borderRadius: 8, textAlign: "center" }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "#2e69b1" }}>{snapshot.pending}</div>
                        <div style={{ fontSize: 11, color: "#888" }}>Chờ xử lý</div>
                      </div>
                      <div style={{ background: "rgba(46, 105, 177, 0.1)", padding: "8px 10px", borderRadius: 8, textAlign: "center" }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "#2e69b1" }}>{snapshot.processing}</div>
                        <div style={{ fontSize: 11, color: "#888" }}>Đang xử lý</div>
                      </div>
                      <div style={{ background: "rgba(46, 105, 177, 0.1)", padding: "8px 10px", borderRadius: 8, textAlign: "center" }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "#2e69b1" }}>{snapshot.done + snapshot.paid}</div>
                        <div style={{ fontSize: 11, color: "#888" }}>Hoàn thành</div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Data table */}
          {monthlyData.length > 0 && (
            <div className="rrm-table-section">
              <h3 className="rrm-chart-title">Chi tiết 6 tháng gần nhất</h3>
              <div className="rrm-table-wrapper">
                <table className="rrm-table">
                  <thead>
                    <tr>
                      <th>Tháng</th>
                      <th>Tổng yêu cầu</th>
                      <th>Sửa chữa</th>
                      <th>Bảo trì</th>
                      <th>Chờ xử lý</th>
                      <th>Đang xử lý</th>
                      <th>Hoàn thành</th>
                      <th>Chưa thanh toán</th>
                      <th>Đã thanh toán</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...monthlyData].reverse().map((row) => {
                      const isPeak = peakMonth && row.month === peakMonth.month;
                      return (
                        <tr key={row.month}>
                          <td>
                            {formatMonth(row.month)}
                          </td>
                          <td>
                            <span className="rrm-badge rrm-badge-total">{row.total}</span>
                          </td>
                          <td>
                            <span className="rrm-badge rrm-badge-repairs">{row.repairs}</span>
                          </td>
                          <td>
                            <span className="rrm-badge rrm-badge-maintenance">{row.maintenance}</span>
                          </td>
                          <td>{row.pending}</td>
                          <td>{row.processing}</td>
                          <td>{row.done}</td>
                          <td>{row.unpaid}</td>
                          <td>{row.paid}</td>
                        </tr>
                      );
                    })}
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

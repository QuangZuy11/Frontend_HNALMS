import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../../services/api";
import "./BuildingOwnerDashboard.css";
import {
  DoorOpen,
  Users,
  FileText,
  AlertTriangle,
  ArrowRight,
  Wallet,
  Building2,
  CheckCircle2,
  Percent,
  Settings,
  Wrench,
  Clock,
  MessageSquare,
} from "lucide-react";

interface DashboardStats {
  totalRooms: number;
  occupiedRooms: number;
  vacantRooms: number;
  maintenanceRooms: number;
  totalTenants: number;
  activeContracts: number;
  expiringContracts: number;
  monthlyRevenue: number;
  collectedRevenue: number;
  uncollectedRevenue: number;
  depositsWithoutContract: number;
  occupancyRate: number;
}

export default function BuildingOwnerDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch rooms, contracts, deposits and requests in parallel
      const [
        roomsRes,
        contractsRes,
        depositsRes,
        invoicesRes,
      ] = await Promise.all([
        api.get("/rooms"),
        api.get("/contracts"),
        api.get("/deposits"),
        api.get("/invoices/periodic").catch(() => ({ data: { data: [] } })),
      ]);

      const rooms = roomsRes.data.data || [];
      const contracts = contractsRes.data.data || [];
      const deposits = depositsRes.data.data || [];
      const invoices = invoicesRes.data.data || [];

      // Room stats based on status field
      const totalRooms = rooms.length;
      const occupiedRooms = rooms.filter(
        (r: any) => r.status === "Occupied",
      ).length;
      const vacantRooms = rooms.filter(
        (r: any) => r.status === "Available" || r.status === "Deposited",
      ).length;
      const maintenanceRooms = rooms.filter(
        (r: any) => r.status === "Maintenance",
      ).length;

      // Contract stats from real data
      const activeContracts = contracts.filter((c: any) => c.status === "active");

      // Expiring contracts: active contracts with endDate within next 30 days
      const now = new Date();
      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(now.getDate() + 30);

      const expiringContracts = activeContracts.filter((c: any) => {
        const endDate = new Date(c.endDate);
        return endDate >= now && endDate <= thirtyDaysLater;
      }).length;

      // Total tenants: count tenant + co-residents from active contracts
      const totalTenants = activeContracts.reduce(
        (sum: number, c: any) => sum + 1 + (c.coResidents ? c.coResidents.length : 0),
        0
      );

      // Monthly Revenue: Sum up the rent part of active contracts
      const monthlyRevenue = activeContracts.reduce((sum: number, c: any) => {
        const rentAmount = c.roomPrice || (c.room && c.room.price) || 0;
        return sum + rentAmount;
      }, 0);

      // Thu tiền phòng dự kiến/tháng is monthlyRevenue.
      // We need to calculate how much of the EXPECTED rent has been collected vs uncollected.
      // If invoices are available, we sum paid invoices for 'collected' and unpaid for 'uncollected'.
      // Otherwise, we default to 0.
      let collectedRevenue = 0;
      let uncollectedRevenue = 0;

      // Lấy hóa đơn của tháng hiện tại
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      const currentMonthInvoices = invoices.filter((inv: any) => {
        if (!inv.createdAt && !inv.issueDate) return false;
        const date = new Date(inv.createdAt || inv.issueDate);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      });

      if (currentMonthInvoices.length > 0) {
        collectedRevenue = currentMonthInvoices
          .filter((inv: any) => inv.status === "Paid" || inv.status === "Đã thanh toán" || inv.status === "Paid")
          .reduce((sum: number, inv: any) => sum + (inv.totalAmount || inv.amount || 0), 0);

        uncollectedRevenue = currentMonthInvoices
          .filter((inv: any) => inv.status === "Draft" || inv.status === "Unpaid" || inv.status === "Chưa thanh toán" || inv.status === "Pending")
          .reduce((sum: number, inv: any) => sum + (inv.totalAmount || inv.amount || 0), 0);
      } else {
        // Fallback: Nếu đầu tháng chưa sinh hóa đơn nào cho tháng này
        // thì toàn bộ tiền phòng dự kiến tháng sẽ coi là "chưa thu".
        uncollectedRevenue = monthlyRevenue;
      }

      // Deposits without contract
      const contractDepositIds = new Set(
        contracts
          .filter((c: any) => c.depositId)
          .map((c: any) =>
            typeof c.depositId === "object" ? c.depositId._id : c.depositId,
          ),
      );
      const depositsWithoutContract = deposits.filter(
        (d: any) => d.status === "Held" && !contractDepositIds.has(d._id),
      ).length;

      setStats({
        totalRooms,
        occupiedRooms,
        vacantRooms,
        maintenanceRooms,
        totalTenants,
        activeContracts: activeContracts.length,
        expiringContracts,
        depositsWithoutContract,
        monthlyRevenue,
        collectedRevenue,
        uncollectedRevenue,
        occupancyRate: totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
      });
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      setStats({
        totalRooms: 0,
        occupiedRooms: 0,
        vacantRooms: 0,
        maintenanceRooms: 0,
        totalTenants: 0,
        activeContracts: 0,
        expiringContracts: 0,
        depositsWithoutContract: 0,
        monthlyRevenue: 0,
        collectedRevenue: 0,
        uncollectedRevenue: 0,
        occupancyRate: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);
  };

  const statCards = [
    { title: "Tổng Phòng", value: stats?.totalRooms || 0, icon: Building2 },
    { title: "Đã Thuê", value: stats?.occupiedRooms || 0, icon: CheckCircle2 },
    { title: "Phòng Trống", value: stats?.vacantRooms || 0, icon: DoorOpen },
    { title: "Tỷ Lệ Lấp Đầy", value: `${stats?.occupancyRate || 0}%`, icon: Percent },
    { title: "Tổng Cọc", value: stats?.depositsWithoutContract || 0, icon: Wallet },
  ];

  const quickActions = [
    { title: "Quản Lý Phòng", href: "/owner/rooms", icon: DoorOpen },
    { title: "Cấu Hình Tòa Nhà", href: "/owner/building-config", icon: Building2 },
    { title: "Quản Lý Tài Khoản", href: "/owner/accounts", icon: Users },
    { title: "Nội Quy Tòa Nhà", href: "/owner/rules", icon: FileText },
  ];

  const roomStatusData = [
    { label: "Đã thuê", value: stats?.occupiedRooms || 0, color: "#3b82f6" },
    { label: "Trống", value: stats?.vacantRooms || 0, color: "#94a3b8" },
    { label: "Bảo trì", value: stats?.maintenanceRooms || 0, color: "#1e293b" },
  ];

  const totalForChart = roomStatusData.reduce((sum, i) => sum + i.value, 0);

  // Alerts
  const alerts = [
    {
      show: (stats?.vacantRooms || 0) > 0,
      icon: DoorOpen,
      title: "Phòng Trống",
      message: `${stats?.vacantRooms || 0} phòng đang trống chờ khách thuê`,
      type: "warning",
    },
    {
      show: (stats?.expiringContracts || 0) > 0,
      icon: Clock,
      title: "Hợp Đồng Sắp Hết Hạn",
      message: `${stats?.expiringContracts || 0} hợp đồng sẽ hết hạn trong 30 ngày`,
      type: "warning",
    },
    {
      show: (stats?.maintenanceRooms || 0) > 0,
      icon: Wrench,
      title: "Phòng Bảo Trì",
      message: `${stats?.maintenanceRooms || 0} phòng đang được sửa chữa`,
      type: "info",
    },
  ].filter((a) => a.show);

  if (loading) {
    return (
      <div className="owner-dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="owner-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <h1>Owner Dashboard</h1>
        <p>Tổng quan quản lý tòa nhà Hoàng Nam</p>
      </header>

      {/* Summary Cards */}
      <section className="summary-cards">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="summary-card">
              <div className="card-icon">
                <Icon />
              </div>
              <div className="card-info">
                <span className="card-value">{stat.value}</span>
                <span className="card-label">{stat.title}</span>
              </div>
            </div>
          );
        })}
      </section>

      {/* Quick Actions */}
      <section className="quick-actions">
        <h3>Thao Tác Nhanh</h3>
        <div className="actions-row">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.title} to={action.href} className="action-btn">
                <Icon />
                <span>{action.title}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Bento Grid */}
      <section className="bento-grid">
        {/* Room Status Chart */}
        <div className="bento-card">
          <div className="bento-header">
            <h3>Trạng Thái Phòng</h3>
            <Link to="/owner/rooms" className="view-link">
              Chi tiết <ArrowRight />
            </Link>
          </div>
          <div className="chart-content">
            <div className="donut-wrapper">
              <svg className="donut-chart" viewBox="0 0 100 100">
                {roomStatusData.reduce(
                  (acc, item) => {
                    const percentage =
                      totalForChart > 0 ? (item.value / totalForChart) * 100 : 0;
                    const offset = acc.offset;
                    acc.offset += percentage;
                    acc.elements.push(
                      <circle
                        key={item.label}
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={item.color}
                        strokeWidth="10"
                        strokeDasharray={`${percentage * 2.51} 251`}
                        strokeDashoffset={-offset * 2.51}
                        transform="rotate(-90 50 50)"
                      />,
                    );
                    return acc;
                  },
                  { offset: 0, elements: [] as React.ReactElement[] },
                ).elements}
              </svg>
              <div className="donut-center">
                <span className="donut-total">{stats?.totalRooms || 0}</span>
                <span className="donut-label">Phòng</span>
              </div>
            </div>
            <div className="chart-legend">
              {roomStatusData.map((item) => {
                const pct = totalForChart > 0 ? Math.round((item.value / totalForChart) * 100) : 0;
                return (
                  <div key={item.label} className="legend-row">
                    <span className="legend-dot" style={{ backgroundColor: item.color }}></span>
                    <span className="legend-text">{item.label}</span>
                    <span className="legend-num">{item.value} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Financial Overview - Swapped to middle */}
        <div className="bento-card">
          <div className="bento-header">
            <h3>Tổng Quan Tài Chính</h3>
          </div>
          <div className="finance-content">
            <div className="revenue-block">
              <Wallet className="revenue-icon" />
              <div className="revenue-info">
                <span className="revenue-value">{formatCurrency(stats?.monthlyRevenue || 0)}</span>
                <span className="revenue-label">Thu tiền phòng dự kiến/tháng</span>
              </div>
            </div>

            <div className="finance-stats">
              <div className="finance-stat">
                <CheckCircle2 className="stat-icon" style={{ color: '#10b981' }} />
                <div className="stat-info">
                  <span className="stat-num" style={{ color: '#10b981' }}>{formatCurrency(stats?.collectedRevenue || 0)}</span>
                  <span className="stat-label">Đã thu</span>
                </div>
              </div>
              <div className="finance-stat">
                <AlertTriangle className="stat-icon" style={{ color: '#f59e0b' }} />
                <div className="stat-info">
                  <span className="stat-num" style={{ color: '#f59e0b' }}>{formatCurrency(stats?.uncollectedRevenue || 0)}</span>
                  <span className="stat-label">Chưa thu</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contracts & Tenants - Swapped to last */}
        <div className="bento-card">
          <div className="bento-header">
            <h3>Hợp Đồng & Cư Dân</h3>
          </div>
          <div className="finance-content">
            <div className="finance-stats full-width">
              <div className="finance-stat">
                <FileText className="stat-icon" />
                <div className="stat-info">
                  <span className="stat-num">{stats?.activeContracts || 0}</span>
                  <span className="stat-label">Hợp đồng hoạt động</span>
                </div>
              </div>
              <div className="finance-stat">
                <AlertTriangle className="stat-icon" />
                <div className="stat-info">
                  <span className="stat-num">{stats?.expiringContracts || 0}</span>
                  <span className="stat-label">Sắp hết hạn</span>
                </div>
              </div>
              <div className="finance-stat">
                <Users className="stat-icon" />
                <div className="stat-info">
                  <span className="stat-num">{stats?.totalTenants || 0}</span>
                  <span className="stat-label">Tổng cư dân</span>
                </div>
              </div>
              <div className="finance-stat">
                <AlertTriangle className="stat-icon" />
                <div className="stat-info">
                  <span className="stat-num">{stats?.maintenanceRooms || 0}</span>
                  <span className="stat-label">Phòng đang bảo trì</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


    </div>
  );
}

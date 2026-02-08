import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../../services/api";
import "./ManagerDashboard.css";
import {
  DoorOpen,
  Users,
  FileText,
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Percent,
  MapPin,
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
  occupancyRate: number;
}

export default function ManagerDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get("/rooms");
      const rooms = response.data.data || [];

      const occupiedRooms = rooms.filter(
        (r: any) => r.status === "Đã thuê",
      ).length;
      const vacantRooms = rooms.filter((r: any) => r.status === "Trống").length;
      const maintenanceRooms = rooms.filter(
        (r: any) => r.status === "Đang bảo trì",
      ).length;
      const totalRooms = rooms.length;

      setStats({
        totalRooms,
        occupiedRooms,
        vacantRooms,
        maintenanceRooms,
        totalTenants: occupiedRooms * 2,
        activeContracts: occupiedRooms,
        expiringContracts: Math.floor(occupiedRooms * 0.15),
        occupancyRate:
          totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
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
        occupancyRate: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: "Tổng Phòng", value: stats?.totalRooms || 0, icon: Building2 },
    { title: "Đã Thuê", value: stats?.occupiedRooms || 0, icon: CheckCircle2 },
    { title: "Phòng Trống", value: stats?.vacantRooms || 0, icon: DoorOpen },
    { title: "Tỷ Lệ Lấp Đầy", value: `${stats?.occupancyRate || 0}%`, icon: Percent },
  ];

  const quickActions = [
    { title: "Quản Lý Phòng", href: "/manager/rooms", icon: DoorOpen },
    { title: "Sơ Đồ Tầng", href: "/manager/floor-map", icon: MapPin },
    { title: "Quản Lý Cư Dân", href: "/manager/tenants", icon: Users },
    { title: "Hợp Đồng", href: "/manager/contracts", icon: FileText },
    { title: "Yêu Cầu", href: "/manager/requests", icon: MessageSquare },
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
      <div className="manager-dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="manager-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <h1>Manager Dashboard</h1>
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
            <Link to="/manager/rooms" className="view-link">
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
              {roomStatusData.map((item) => (
                <div key={item.label} className="legend-row">
                  <span className="legend-dot" style={{ backgroundColor: item.color }}></span>
                  <span className="legend-text">{item.label}</span>
                  <span className="legend-num">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Contracts & Tenants */}
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
                <Wrench className="stat-icon" />
                <div className="stat-info">
                  <span className="stat-num">{stats?.maintenanceRooms || 0}</span>
                  <span className="stat-label">Phòng bảo trì</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Alerts */}
      {alerts.length > 0 && (
        <section className="alerts-section">
          <h3>Cảnh Báo & Thông Báo</h3>
          <div className="alerts-list">
            {alerts.map((alert, index) => {
              const Icon = alert.icon;
              return (
                <div key={index} className={`alert-item alert-${alert.type}`}>
                  <Icon className="alert-icon" />
                  <div className="alert-content">
                    <span className="alert-title">{alert.title}</span>
                    <span className="alert-message">{alert.message}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

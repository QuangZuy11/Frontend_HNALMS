import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../../services/api";
import "./ManagerDashboard.css";
import {
  DoorOpen,
  Users,
  FileText,
  AlertCircle,
  TrendingUp,
  ArrowRight,
} from "lucide-react";

interface DashboardStats {
  totalRooms: number;
  occupiedRooms: number;
  vacantRooms: number;
  totalTenants: number;
  activeContracts: number;
  expiredContracts: number;
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

      // Lấy dữ liệu từ API
      const response = await api.get("/rooms");
      const rooms = response.data.data || [];

      // Tính toán stats
      const occupiedRooms = rooms.filter(
        (r: any) => r.status === "Đã thuê",
      ).length;
      const vacantRooms = rooms.filter((r: any) => r.status === "Trống").length;

      setStats({
        totalRooms: rooms.length,
        occupiedRooms,
        vacantRooms,
        totalTenants: 45, // Mock data
        activeContracts: occupiedRooms,
        expiredContracts: 3, // Mock data
      });
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      // Fallback to default
      setStats({
        totalRooms: 0,
        occupiedRooms: 0,
        vacantRooms: 0,
        totalTenants: 0,
        activeContracts: 0,
        expiredContracts: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Tổng Phòng",
      value: stats?.totalRooms || 0,
      icon: DoorOpen,
      colorClass: "stat-card-blue",
      href: "/rooms",
    },
    {
      title: "Phòng Trống",
      value: stats?.vacantRooms || 0,
      icon: AlertCircle,
      colorClass: "stat-card-orange",
      href: "#",
    },
    {
      title: "Phòng Có Người",
      value: stats?.occupiedRooms || 0,
      icon: Users,
      colorClass: "stat-card-green",
      href: "#",
    },
    {
      title: "Hợp Đồng Hoạt Động",
      value: stats?.activeContracts || 0,
      icon: FileText,
      colorClass: "stat-card-purple",
      href: "#",
    },
  ];

  const quickActions = [
    {
      title: "Thêm Phòng Mới",
      description: "Tạo phòng hoặc tầng mới",
      href: "/rooms#add",
      icon: DoorOpen,
    },
    {
      title: "Quản Lý Trạng Thái",
      description: "Cập nhật tình trạng phòng",
      href: "#",
      icon: AlertCircle,
    },
    {
      title: "Thêm Cư Dân",
      description: "Đăng ký cư dân mới",
      href: "#",
      icon: Users,
    },
    {
      title: "Tạo Hợp Đồng",
      description: "Lập hợp đồng thuê mới",
      href: "#",
      icon: FileText,
    },
  ];

  if (loading) {
    return (
      <div className="manager-dashboard-content">
        <div className="loading-container">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="manager-dashboard-content">
      {/* Page Title */}
      <div className="dashboard-header">
        <div className="dashboard-header-left">
          <h1 className="dashboard-title">Dashboard</h1>
          <p className="dashboard-subtitle">
            Tổng quan quản lý tòa nhà Hoàng Nam
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className={`stat-card ${stat.colorClass}`}
            >
              <div className="stat-card-header">
                <div className="stat-icon-wrapper">
                  <Icon className="stat-icon" />
                </div>
                <TrendingUp className="stat-trend-icon" />
              </div>
              <p className="stat-label">{stat.title}</p>
              <p className="stat-value">{stat.value}</p>
              <Link to={stat.href} className="stat-link">
                Xem chi tiết <ArrowRight className="link-arrow" />
              </Link>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="quick-actions-section">
        <h2 className="section-title">Thao Tác Nhanh</h2>
        <div className="quick-actions-grid">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                to={action.href}
                className="quick-action-card"
              >
                <div className="quick-action-header">
                  <div className="quick-action-icon">
                    <Icon className="icon" />
                  </div>
                </div>
                <h3 className="quick-action-title">{action.title}</h3>
                <p className="quick-action-description">
                  {action.description}
                </p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Info Cards */}
      <div className="info-cards-grid">
        <div className="info-card info-card-orange">
          <div className="info-card-content">
            <div className="info-icon-wrapper info-icon-orange">
              <AlertCircle className="info-icon" />
            </div>
            <div>
              <h3 className="info-title">Phòng Cần Chú Ý</h3>
              <p className="info-text">
                {stats?.vacantRooms || 0} phòng trống đang chờ khách hàng
                mới
              </p>
            </div>
          </div>
        </div>

        <div className="info-card info-card-purple">
          <div className="info-card-content">
            <div className="info-icon-wrapper info-icon-purple">
              <FileText className="info-icon" />
            </div>
            <div>
              <h3 className="info-title">Hợp Đồng Hết Hạn</h3>
              <p className="info-text">
                {stats?.expiredContracts || 0} hợp đồng đã hết hạn cần gia
                hạn
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

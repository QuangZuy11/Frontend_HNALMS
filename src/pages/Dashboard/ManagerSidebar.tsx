import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./ManagerSidebar.css";
import {
  LayoutGrid,
  DoorOpen,
  Users,
  FileText,
  BarChart3,
  LogOut,
  Menu,
  X,
  Bell,
  MessageSquare,
  ScrollText,
} from "lucide-react";

export default function ManagerSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(true);

  const managerName = user?.name || user?.fullname || "Quản Lý";
  const managerRole = user?.role || "manager";

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Quản Trị Viên";
      case "manager":
        return "Quản Lý Chính";
      case "supervisor":
        return "Giám Sát";
      default:
        return "Quản Lý Tòa Nhà";
    }
  };

  const menuItems = [
    {
      label: "Dashboard",
      href: "/managerdashboard",
      icon: LayoutGrid,
    },
    {
      label: "Quản Lý Phòng",
      href: "/rooms",
      icon: DoorOpen,
    },
    {
      label: "Trạng Thái Phòng",
      href: "#",
      icon: BarChart3,
    },
    {
      label: "Quản Lý Cư Dân",
      href: "#",
      icon: Users,
    },
    {
      label: "Quản Lý Hợp Đồng",
      href: "#",
      icon: FileText,
    },
    {
      label: "Quản Lý Rules",
      href: "/manager/rules",
      icon: ScrollText,
    },
    {
      label: "Thông Báo",
      href: "#",
      icon: Bell,
    },
    {
      label: "Yêu Cầu Cư Dân",
      href: "#",
      icon: MessageSquare,
    },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="manager-sidebar-toggle"
        aria-label="Toggle sidebar"
      >
        {isOpen ? (
          <X className="toggle-icon" />
        ) : (
          <Menu className="toggle-icon" />
        )}
      </button>

      {/* Sidebar */}
      <aside
        className={`manager-sidebar ${isOpen ? "sidebar-open" : "sidebar-closed"}`}
      >
        <div className="sidebar-content">
          {/* Manager Info */}
          <div className="sidebar-header">
            <div className="manager-avatar">
              <span className="avatar-text">
                {managerName?.charAt(0).toUpperCase() || "M"}
              </span>
            </div>
            <p className="manager-name">{managerName}</p>
            <div className="manager-role-badge">
              <span className="role-text">{getRoleLabel(managerRole)}</span>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="sidebar-nav">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={(e) => {
                    if (item.href === "#") {
                      e.preventDefault();
                    }
                    // Chỉ đóng sidebar trên mobile
                    if (window.innerWidth < 768) {
                      setIsOpen(false);
                    }
                  }}
                  className={`nav-item ${isActive ? "nav-item-active" : ""}`}
                >
                  <Icon className="nav-icon" />
                  <span className="nav-label">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Logout Button */}
          <button onClick={handleLogout} className="logout-button">
            <LogOut className="logout-icon" />
            <span className="logout-text">Đăng Xuất</span>
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div className="sidebar-overlay" onClick={() => setIsOpen(false)} />
      )}
    </>
  );
}

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Home,
  FileText,
  DollarSign,
  Zap,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Settings,
  LogOut
} from 'lucide-react';
import './ManagerSidebar.css'; // Đảm bảo import file CSS của bạn

// Định nghĩa cấu trúc menu
const MENU_ITEMS = [
  {
    title: "Tổng quan",
    icon: <LayoutDashboard size={20} />,
    path: "/dashboard",
    subItems: []
  },
  {
    title: "Quản lý nhân sự",
    icon: <Users size={20} />,
    path: "/staff",
    subItems: [
      { title: "Quản lý tòa nhà", path: "/staff/managers" },
      { title: "Kế toán", path: "/staff/accountants" },
    ]
  },
  {
    title: "Quản lý Phòng",
    icon: <Home size={20} />,
    path: "/rooms",
    subItems: [
      { title: "Quản lý phòng", path: "/manageroom" },
      { title: "Cấu hình tòa nhà", path: "/buildingconfig" },
      { title: "Nội quy tòa nhà", path: "/rooms/rules" },
    ]
  },
  {
    title: "Cư dân & Hợp đồng",
    icon: <FileText size={20} />,
    path: "/residents",
    subItems: [
      { title: "Danh sách hợp đồng", path: "/residents/contracts" },
      { title: "Danh sách cọc", path: "/residents/deposits" },
      { title: "Danh sách người thuê", path: "/residents/tenants" },
    ]
  },
  {
    title: "Tài chính",
    icon: <DollarSign size={20} />,
    path: "/finance",
    subItems: [
      { title: "Danh sách hóa đơn", path: "/finance/invoices" },
      { title: "Phiếu thu / chi", path: "/finance/transactions" },
      { title: "Báo cáo điện nước", path: "/finance/utility-reports" },
    ]
  },
  {
    title: "Dịch vụ & Tiện ích",
    icon: <Zap size={20} />,
    path: "/services",
    subItems: [
      { title: "Danh sách dịch vụ", path: "/services/list" },
      { title: "Chỉ số điện nước", path: "/services/indexes" },
    ]
  },
  {
    title: "Yêu cầu / CSKH",
    icon: <MessageSquare size={20} />,
    path: "/requests",
    subItems: [
      { title: "Yêu cầu sửa chữa", path: "/requests/repairs" },
      { title: "Danh sách khiếu nại", path: "/requests/complaints" },
      { title: "Yêu cầu chuyển phòng", path: "/requests/transfers" },
      { title: "Yêu cầu trả phòng", path: "/requests/checkouts" },
    ]
  },
];

const ManagerSidebar = () => {
  const [expandedMenus, setExpandedMenus] = useState<{ [key: number]: boolean }>({});
  const [showUserMenu, setShowUserMenu] = useState(false);
  const location = useLocation();

  // Xử lý đóng mở menu con
  const toggleMenu = (index: number) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Dữ liệu giả lập user
  const currentUser = {
    name: "ANHNPT - Nguyễn Phi T...",
    loginTime: "30/01/2026 08:56:03 AM",
    initials: "NT"
  };

  return (
    <aside className="sidebar-container">
      {/* 1. Header Sidebar (Logo) */}
      <div className="sidebar-header">
        <h1 className="brand-logo">HNALMS<span>.</span></h1>
      </div>

      {/* 2. Menu Items (Scrollable) */}
      <div className="sidebar-nav-scroll">
        <nav className="sidebar-nav">
          {MENU_ITEMS.map((item, index) => {
            const hasSubItems = item.subItems.length > 0;
            const isActiveParent = location.pathname.startsWith(item.path);
            const isExpanded = expandedMenus[index] || isActiveParent;

            return (
              <div key={index} className="menu-group">
                {/* Parent Item */}
                <div
                  onClick={() => hasSubItems ? toggleMenu(index) : null}
                  className={`menu-item ${isActiveParent ? 'active' : ''}`}
                >
                  {hasSubItems ? (
                    // Menu cha có submenu -> Dùng div để handle click toggle
                    <div className="menu-link-content">
                      <span className="menu-icon">{item.icon}</span>
                      <span className="menu-title">{item.title}</span>
                      <span className="menu-arrow">
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </span>
                    </div>
                  ) : (
                    // Menu thường -> Dùng Link
                    <Link to={item.path} className="menu-link-content">
                      <span className="menu-icon">{item.icon}</span>
                      <span className="menu-title">{item.title}</span>
                    </Link>
                  )}
                </div>

                {/* Sub Items (Dropdown) */}
                {hasSubItems && isExpanded && (
                  <div className="submenu-container">
                    {item.subItems.map((sub, subIndex) => {
                      const isActiveSub = location.pathname === sub.path;
                      return (
                        <Link
                          key={subIndex}
                          to={sub.path}
                          className={`submenu-item ${isActiveSub ? 'sub-active' : ''}`}
                        >
                          <span className="dot">•</span> {sub.title}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* 3. User Footer */}
      <div className="sidebar-footer">
        {/* Popup Menu */}
        {showUserMenu && (
          <div className="user-popup-menu">
            <button className="popup-item">
              <Settings size={16} /> Tuỳ chỉnh giao diện
            </button>
            <button className="popup-item text-danger">
              <LogOut size={16} /> Đăng xuất
            </button>

          </div>
        )}

        {/* User Info Bar */}
        <div
          className="user-info-bar"
          onClick={() => setShowUserMenu(!showUserMenu)}
        >
          <div className="user-avatar">
            {currentUser.initials}
          </div>

          <div className="user-details">
            <p className="user-name">{currentUser.name}</p>
            <p className="user-time">{currentUser.loginTime}</p>
          </div>

          <div className="user-more-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default ManagerSidebar;
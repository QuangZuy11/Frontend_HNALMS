import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  FileText,
  Receipt,
  Wallet,
  Zap,
  MessageSquare,
  Bell,
  ChevronDown,
  ChevronRight,
  DoorOpen
} from 'lucide-react';
import './ManagerSidebar.css';
import logo from '../../../../assets/images/Logo.png';

// Định nghĩa cấu trúc menu
const MENU_ITEMS = [
  {
    title: "Tổng Quan",
    icon: <LayoutDashboard size={20} />,
    path: "/manager",
    subItems: []
  },
  {
    title: "Cư Dân",
    icon: <Users size={20} />,
    path: "/manager/residents",
    subItems: []
  },
  {
    title: "Quản lý Phòng",
    icon: <DoorOpen size={20} />,
    path: "/manager/rooms",
    subItems: []
  },
  {
    title: "Hợp Đồng",
    icon: <FileText size={20} />,
    path: "/manager/contracts",
    subItems: []
  },
  {
    title: "Danh Sách Cọc",
    icon: <Wallet size={20} />,
    path: "/manager/deposits",
    subItems: []
  },
  {
    title: "Hóa Đơn",
    icon: <Receipt size={20} />,
    path: "/manager/invoices",
    subItems: []
  },
  {
    title: "Điện & Nước",
    icon: <Zap size={20} />,
    path: "/manager/utilities",
    subItems: []
  },
  {
    title: "Dịch Vụ",
    icon: <ShoppingBag size={20} />,
    path: "/manager/services",
    subItems: []
  },
  {
    title: "Yêu Cầu",
    icon: <MessageSquare size={20} />,
    path: "/manager/requests",
    subItems: [
      { title: "Yêu cầu sửa chữa", path: "/manager/requests/repairs" },
      { title: "Yêu cầu bảo trì", path: "/manager/requests/maintenance" },
      { title: "Danh sách khiếu nại", path: "/manager/requests/complaints" },
      { title: "Yêu cầu chuyển phòng", path: "/manager/requests/transfers" },
      { title: "Yêu cầu trả phòng", path: "/manager/requests/checkouts" },
    ]
  },
  {
    title: "Gửi Thông Báo",
    icon: <Bell size={20} />,
    path: "/manager/notifications",
    subItems: []
  },
  {
    title: "Quản lý tài khoản",
    icon: <Users size={20} />,
    path: "/manager/account-management",
    subItems: [
      { title: "Tạo tài khoản", path: "/manager/create-account" },
      { title: "Danh sách tài khoản", path: "/manager/accounts" },
    ]
  },
];

const ManagerSidebar = () => {
  const [expandedMenus, setExpandedMenus] = useState<{ [key: number]: boolean }>({});
  const location = useLocation();

  // Xử lý đóng mở menu con
  const toggleMenu = (index: number) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <aside className="sidebar-container">
      {/* Logo */}
      <div className="sidebar-logo">
        <img src={logo} alt="Hoàng Nam Apartment" className="brand-logo" />
      </div>

      {/* Menu Items (Scrollable) */}
      <div className="sidebar-nav-scroll">
        <nav className="sidebar-nav">
          {MENU_ITEMS.map((item, index) => {
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isActiveParent = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            const isExpanded = expandedMenus[index] || isActiveParent;

            return (
              <div key={index} className="menu-group">
                {/* Parent Item */}
                <div
                  onClick={() => hasSubItems ? toggleMenu(index) : null}
                  className={`menu-item ${isActiveParent && !hasSubItems ? 'active' : ''} ${hasSubItems && isExpanded ? 'expanded' : ''}`}
                >
                  {hasSubItems ? (
                    <div className="menu-link-content">
                      <span className="menu-icon">{item.icon}</span>
                      <span className="menu-title">{item.title}</span>
                      <span className="menu-arrow">
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </span>
                    </div>
                  ) : (
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
    </aside>
  );
};

export default ManagerSidebar;
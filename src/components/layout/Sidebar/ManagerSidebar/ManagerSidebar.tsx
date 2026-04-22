import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileText,
  Receipt,
  Wallet,
  MessageSquare,
  Bell,
  ChevronDown,
  ChevronRight,
  DoorOpen,
  Wrench,
  Frown,
  AlertTriangle,
  ArrowRightLeft,
  LogOut,
  BarChart3,
  Activity,
  SwatchBook,
  Building2,
  ChartBarStacked,
  RefreshCcwDot,
  Settings
} from 'lucide-react';
import './ManagerSidebar.css';
import logo from '../../../../assets/images/Logo.png';

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
    title: "Quản Lý Phòng",
    icon: <Building2 size={20} />,
    path: "/manager",
    subItems: [
      { title: "Danh Sách Phòng", path: "/manager/rooms", icon: <DoorOpen size={16} /> },
      { title: "Cấu hình tòa nhà", path: "/manager/building-config", icon: <Settings size={16} /> },
    ]
  },
  {
    title: "Hợp Đồng",
    icon: <FileText size={20} />,
    path: "/manager/contracts",
    subItems: [
      { title: "Danh Sách HĐ", path: "/manager/contracts", icon: <FileText size={16} /> },
      { title: "Thanh Lý HĐ", path: "/manager/contracts/liquidations", icon: <RefreshCcwDot size={16} /> },
    ]
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
    title: "Dịch Vụ",
    icon: <SwatchBook size={20} />,
    path: "/manager/services",
    subItems: []
  },
  {
    title: "Yêu Cầu",
    icon: <MessageSquare size={20} />,
    path: "/manager/requests",
    subItems: [
      { title: "Sửa Chữa", path: "/manager/requests/repairs", icon: <Wrench size={16} /> },
      //{ title: "Bảo Trì", path: "/manager/requests/maintenance", icon: <RefreshCcwDot size={16} /> },
      { title: "Khiếu Nại", path: "/manager/requests/complaints", icon: <Frown size={16} /> },
      { title: "Chuyển Phòng", path: "/manager/requests/transfers", icon: <ArrowRightLeft size={16} /> },
      { title: "Trả Phòng", path: "/manager/requests/move-outs", icon: <LogOut size={16} /> },
      { title: "Khách Đặt Phòng", path: "/manager/requests/bookings", icon: <FileText size={16} /> },
    ]
  },
  {
    title: "Xử Lý Vi Phạm",
    icon: <AlertTriangle size={20} />,
    path: "/manager/violations",
    subItems: []
  },
  {
    title: "Thống Kê",
    icon: <BarChart3 size={20} />,
    path: "/manager/statistics/performance",
    subItems: [
      { title: "Hiệu Suất", path: "/manager/statistics/performance", icon: <Activity size={16} /> },
      { title: "Sửa Chữa & Bảo Trì", path: "/manager/statistics/repairs", icon: <Wrench size={16} /> },
    ]
  },
  {
    title: "Thông Báo",
    icon: <Bell size={20} />,
    path: "/manager/notifications",
    subItems: []
  },


];

const ManagerSidebar = () => {
  const [expandedMenus, setExpandedMenus] = useState<{ [key: number]: boolean }>({});
  const location = useLocation();

  const toggleMenu = (index: number, currentExpanded: boolean) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [index]: !currentExpanded
    }));
  };

  return (
    <aside className="mgr-sb-container">
      {/* Logo */}
      <div className="mgr-sb-logo">
        <img src={logo} alt="Hoàng Nam Apartment" className="mgr-sb-brand-logo" />
      </div>

      {/* Menu Items (Scrollable) */}
      <div className="mgr-sb-nav-scroll">
        <nav className="mgr-sb-nav">
          {MENU_ITEMS.map((item, index) => {
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isActiveParent = hasSubItems
              ? location.pathname === item.path || location.pathname.startsWith(item.path + '/')
              : location.pathname === item.path;
            const isExpanded = expandedMenus[index] ?? isActiveParent;

            return (
              <div key={index} className="mgr-sb-group">
                {/* Parent Item */}
                <div
                  onClick={() => hasSubItems ? toggleMenu(index, isExpanded) : null}
                  className={`mgr-sb-item ${isActiveParent && !hasSubItems ? 'active' : ''} ${hasSubItems && isExpanded ? 'expanded' : ''}`}
                >
                  {hasSubItems ? (
                    <div className="mgr-sb-link-content">
                      <span className="mgr-sb-icon">{item.icon}</span>
                      <span className="mgr-sb-title">{item.title}</span>
                      <span className="mgr-sb-arrow">
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </span>
                    </div>
                  ) : (
                    <Link to={item.path} className="mgr-sb-link-content">
                      <span className="mgr-sb-icon">{item.icon}</span>
                      <span className="mgr-sb-title">{item.title}</span>
                    </Link>
                  )}
                </div>

                {/* Sub Items (Dropdown) */}
                {hasSubItems && isExpanded && (
                  <div className="mgr-sb-submenu">
                    {item.subItems.map((sub, subIndex) => {
                      const isActiveSub = location.pathname === sub.path;
                      return (
                        <Link
                          key={subIndex}
                          to={sub.path}
                          className={`mgr-sb-sub-item ${isActiveSub ? 'sub-active' : ''}`}
                        >
                          <span className="mgr-sb-sub-icon">{sub.icon}</span>
                          {sub.title}
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

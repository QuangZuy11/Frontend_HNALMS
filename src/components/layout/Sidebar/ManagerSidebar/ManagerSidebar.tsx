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
  HardHat,
  AlertTriangle,
  ArrowRightLeft,
  LogOut,
  BarChart3,
  Activity,
  SwatchBook,
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
      { title: "Yêu cầu sửa chữa", path: "/manager/requests/repairs", icon: <Wrench size={16} /> },
      { title: "Yêu cầu bảo trì", path: "/manager/requests/maintenance", icon: <HardHat size={16} /> },
      { title: "Danh sách khiếu nại", path: "/manager/requests/complaints", icon: <AlertTriangle size={16} /> },
      { title: "Yêu cầu chuyển phòng", path: "/manager/requests/transfers", icon: <ArrowRightLeft size={16} /> },
      { title: "Yêu cầu trả phòng", path: "/manager/requests/checkouts", icon: <LogOut size={16} /> },
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
    path: "/owner/reports",
    subItems: [
      { title: "Hiệu suất", path: "/owner/reports/occupancy", icon: <Activity size={16} /> },
      { title: "Sửa chữa & Bảo trì", path: "/owner/reports/maintenance", icon: <Wrench size={16} /> },
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

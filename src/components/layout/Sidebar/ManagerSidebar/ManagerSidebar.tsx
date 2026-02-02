import { useState } from 'react';
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
} from 'lucide-react';
import './ManagerSidebar.css';
import logo from '../../../../assets/images/Logo.png';

// Định nghĩa cấu trúc menu
const MENU_ITEMS = [
  {
    title: "Tổng quan",
    icon: <LayoutDashboard size={20} />,
    path: "/managerdashboard",
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
            const hasSubItems = item.subItems.length > 0;
            const isActiveParent = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            const isExpanded = expandedMenus[index] || isActiveParent;

            return (
              <div key={index} className="menu-group">
                {/* Parent Item */}
                <div
                  onClick={() => hasSubItems ? toggleMenu(index) : null}
                  className={`menu-item ${isActiveParent ? 'active' : ''}`}
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
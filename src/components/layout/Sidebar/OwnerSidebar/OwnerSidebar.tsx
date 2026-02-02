import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Building2,
    Users,
    FileText,
    DollarSign,
    BarChart3,
    Settings,
    ChevronDown,
    ChevronRight,
} from 'lucide-react';
import './OwnerSidebar.css';
import logo from '../../../../assets/images/Logo.png';

// Định nghĩa cấu trúc menu cho Chủ sở hữu
const MENU_ITEMS = [
    {
        title: "Tổng quan",
        icon: <LayoutDashboard size={20} />,
        path: "/owner/dashboard",
        subItems: []
    },
    {
        title: "Quản lý tòa nhà",
        icon: <Building2 size={20} />,
        path: "/owner/buildings",
        subItems: [
            { title: "Danh sách tòa nhà", path: "/owner/buildings/list" },
            { title: "Cấu hình tòa nhà", path: "/owner/buildings/config" },
            { title: "Nội quy tòa nhà", path: "/owner/buildings/rules" },
        ]
    },
    {
        title: "Quản lý nhân sự",
        icon: <Users size={20} />,
        path: "/owner/staff",
        subItems: [
            { title: "Quản lý tòa nhà", path: "/owner/staff/managers" },
            { title: "Kế toán", path: "/owner/staff/accountants" },
            { title: "Phân quyền", path: "/owner/staff/permissions" },
        ]
    },
    {
        title: "Hợp đồng & Cư dân",
        icon: <FileText size={20} />,
        path: "/owner/contracts",
        subItems: [
            { title: "Danh sách hợp đồng", path: "/owner/contracts/list" },
            { title: "Danh sách cư dân", path: "/owner/contracts/tenants" },
        ]
    },
    {
        title: "Tài chính",
        icon: <DollarSign size={20} />,
        path: "/owner/finance",
        subItems: [
            { title: "Doanh thu", path: "/owner/finance/revenue" },
            { title: "Chi phí", path: "/owner/finance/expenses" },
            { title: "Công nợ", path: "/owner/finance/debt" },
        ]
    },
    {
        title: "Báo cáo & Thống kê",
        icon: <BarChart3 size={20} />,
        path: "/owner/reports",
        subItems: [
            { title: "Báo cáo tổng hợp", path: "/owner/reports/summary" },
            { title: "Báo cáo doanh thu", path: "/owner/reports/revenue" },
            { title: "Báo cáo công suất", path: "/owner/reports/occupancy" },
        ]
    },
    {
        title: "Cài đặt hệ thống",
        icon: <Settings size={20} />,
        path: "/owner/settings",
        subItems: [
            { title: "Cấu hình chung", path: "/owner/settings/general" },
            { title: "Quản lý dịch vụ", path: "/owner/settings/services" },
            { title: "Thông báo", path: "/owner/settings/notifications" },
        ]
    },
];

const OwnerSidebar = () => {
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

export default OwnerSidebar;

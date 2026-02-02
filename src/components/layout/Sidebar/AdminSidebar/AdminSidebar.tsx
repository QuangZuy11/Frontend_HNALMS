import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Settings,
    ChevronDown,
    ChevronRight,
} from 'lucide-react';
// Sử dụng chung CSS với OwnerSidebar
import '../OwnerSidebar/OwnerSidebar.css';
import logo from '../../../../assets/images/Logo.png';

// Định nghĩa cấu trúc menu cho Admin
const MENU_ITEMS = [
    {
        title: "Tổng quan",
        icon: <LayoutDashboard size={20} />,
        path: "/admin",
        subItems: []
    },
    {
        title: "Quản lý tài khoản",
        icon: <Users size={20} />,
        path: "/admin/accounts",
        subItems: [
            { title: "Tạo tài khoản", path: "/admin/create-account" },
            { title: "Danh sách tài khoản", path: "/admin/accounts" },
        ]
    },
    {
        title: "Cài đặt hệ thống",
        icon: <Settings size={20} />,
        path: "/admin/settings",
        subItems: []
    },
];

const AdminSidebar = () => {
    const [expandedMenus, setExpandedMenus] = useState<{ [key: number]: boolean }>({});
    const location = useLocation();

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

            {/* Menu Items */}
            <div className="sidebar-nav-scroll">
                <nav className="sidebar-nav">
                    {MENU_ITEMS.map((item, index) => {
                        const hasSubItems = item.subItems && item.subItems.length > 0;
                        const isActiveParent = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                        const isExpanded = expandedMenus[index] || isActiveParent;

                        return (
                            <div key={index} className="menu-group">
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

export default AdminSidebar;

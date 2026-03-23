import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    FileText,
    Receipt,
    BarChart3,
    ChevronDown,
    ChevronRight,
    FileOutput,
    ArrowUpCircle,
    TrendingUp,
    CreditCard,
    FileInput,
} from 'lucide-react';
import './AccountantSidebar.css';
import logo from '../../../../assets/images/Logo.png';

// Định nghĩa cấu trúc menu cho Kế toán
const MENU_ITEMS = [
    {
        title: "Tổng Quan",
        icon: <LayoutDashboard size={20} />,
        path: "/accountant",
        subItems: []
    },
    {
        title: "Hóa Đơn",
        icon: <Receipt size={20} />,
        path: "/accountant/invoices",
        subItems: []
    },
    {
        title: "Phiếu Thu & Chi",
        icon: <FileText size={20} />,
        path: "/accountant/transactions",
        subItems: [
            { title: "Phiếu Thu", path: "/accountant/transactions/receipts", icon: <FileOutput size={16} /> },
            { title: "Phiếu Chi", path: "/accountant/transactions/payments", icon: <FileInput size={16} /> },
        ]
    },
    {
        title: "Báo Cáo Tài Chính",
        icon: <BarChart3 size={20} />,
        path: "/accountant/reports",
        subItems: [
            { title: "Báo Cáo Doanh Thu", path: "/accountant/reports/revenue", icon: <TrendingUp size={16} /> },
            { title: "Báo Cáo Công Nợ", path: "/accountant/reports/debt", icon: <CreditCard size={16} /> },
        ]
    },

];

const AccountantSidebar = () => {
    const [expandedMenus, setExpandedMenus] = useState<{ [key: number]: boolean }>({});
    const location = useLocation();

    // Xử lý đóng mở menu con
    const toggleMenu = (index: number, currentExpanded: boolean) => {
        setExpandedMenus((prev) => ({
            ...prev,
            [index]: !currentExpanded
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
                        // Fix: items không có subItems chỉ match exact path, tránh highlight sai
                        const isActiveParent = hasSubItems
                            ? location.pathname === item.path || location.pathname.startsWith(item.path + '/')
                            : location.pathname === item.path;
                        // Dùng ?? để toggle thủ công được ưu tiên hơn isActiveParent
                        const isExpanded = expandedMenus[index] ?? isActiveParent;

                        return (
                            <div key={index} className="menu-group">
                                {/* Parent Item */}
                                <div
                                    onClick={() => hasSubItems ? toggleMenu(index, isExpanded) : null}
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
                                                    <span className="submenu-icon">{sub.icon}</span>
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

export default AccountantSidebar;

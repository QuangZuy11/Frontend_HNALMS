import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    FileText,
    DollarSign,
    Receipt,
    BarChart3,
    ChevronDown,
    ChevronRight,
} from 'lucide-react';
import './AccountantSidebar.css';
import logo from '../../../../assets/images/Logo.png';

// Định nghĩa cấu trúc menu cho Kế toán
const MENU_ITEMS = [
    {
        title: "Tổng quan",
        icon: <LayoutDashboard size={20} />,
        path: "/accountant/dashboard",
        subItems: []
    },
    {
        title: "Hóa đơn",
        icon: <Receipt size={20} />,
        path: "/accountant/invoices",
        subItems: [
            { title: "Danh sách hóa đơn", path: "/accountant/invoices/list" },
            { title: "Tạo hóa đơn", path: "/accountant/invoices/create" },
            { title: "Hóa đơn quá hạn", path: "/accountant/invoices/overdue" },
        ]
    },
    {
        title: "Phiếu thu / chi",
        icon: <FileText size={20} />,
        path: "/accountant/transactions",
        subItems: [
            { title: "Phiếu thu", path: "/accountant/transactions/receipts" },
            { title: "Phiếu chi", path: "/accountant/transactions/payments" },
            { title: "Phiếu điều chỉnh", path: "/accountant/transactions/adjustments" },
        ]
    },
    {
        title: "Báo cáo tài chính",
        icon: <BarChart3 size={20} />,
        path: "/accountant/reports",
        subItems: [
            { title: "Báo cáo doanh thu", path: "/accountant/reports/revenue" },
            { title: "Báo cáo công nợ", path: "/accountant/reports/debt" },
            { title: "Báo cáo điện nước", path: "/accountant/reports/utilities" },
        ]
    },
    {
        title: "Chỉ số điện nước",
        icon: <DollarSign size={20} />,
        path: "/accountant/utilities",
        subItems: [
            { title: "Nhập chỉ số", path: "/accountant/utilities/input" },
            { title: "Lịch sử chỉ số", path: "/accountant/utilities/history" },
        ]
    },
];

const AccountantSidebar = () => {
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

export default AccountantSidebar;

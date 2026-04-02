import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Building2,
    Users,
    FileText,
    BarChart3,
    Bell,
    ChevronDown,
    ChevronRight,
    DoorOpen,
    Settings,
    Scale,
    Cpu,
    Layers,
    SwatchBook,
    TrendingUp,
    DollarSign,
    Activity,
    Wrench,
    Computer,
    Receipt
} from 'lucide-react';
import './OwnerSidebar.css';
import logo from '../../../../assets/images/Logo.png';

const MENU_ITEMS = [
    {
        title: "Tổng quan",
        icon: <LayoutDashboard size={20} />,
        path: "/owner",
        subItems: []
    },
    {
        title: "Cấu Hình Tòa Nhà",
        icon: <Building2 size={20} />,
        path: "/owner/buildings",
        subItems: [
            { title: "Danh sách phòng", path: "/owner/rooms", icon: <DoorOpen size={16} /> },
            { title: "Tầng & Loại Phòng", path: "/owner/building-config", icon: <Settings size={16} /> },
        ]
    },
    {
        title: "Nội Quy",
        icon: <Scale size={20} />,
        path: "/owner/rules",
        subItems: [
        ]
    },
    {
        title: "Thiết Bị",
        icon: <Computer size={20} />,
        path: "/owner/devices",
        subItems: [
            { title: "Danh sách thiết bị", path: "/owner/devices", icon: <Cpu size={16} /> },
            { title: "Thiết bị theo loại phòng", path: "/owner/room-devices", icon: <Layers size={16} /> },
        ]
    },
    {
        title: "Dịch Vụ",
        icon: <SwatchBook size={20} />,
        path: "/owner/services",
        subItems: [
        ]
    },
    {
        title: "Nhân Sự",
        icon: <Users size={20} />,
        path: "/owner/accounts",
        subItems: []
    },
    {
        title: "Phiếu Chi",
        icon: <Receipt size={20} />,
        path: "/owner/transactions/payments",
        subItems: []
    },
    {
        title: "Hợp đồng & Cư dân",
        icon: <FileText size={20} />,
        path: "/owner/contracts",
        subItems: [
            { title: "Hợp đồng", path: "/owner/contracts/list", icon: <FileText size={16} /> },
            { title: "Cư dân", path: "/owner/contracts/tenants", icon: <Users size={16} /> },
        ]
    },
    {
        title: "Báo cáo & Thống kê",
        icon: <BarChart3 size={20} />,
        path: "/owner/reports",
        subItems: [
            { title: "Dòng tiền", path: "/owner/reports/summary", icon: <TrendingUp size={16} /> },
            { title: "Doanh thu", path: "/owner/reports/revenue", icon: <DollarSign size={16} /> },
            { title: "Hiệu suất", path: "/owner/reports/statistics/performance", icon: <Activity size={16} /> },
            { title: "Sửa chữa & Bảo trì", path: "/owner/reports/maintenance", icon: <Wrench size={16} /> },
        ]
    },
    {
        title: "Quản lý thông báo",
        icon: <Bell size={20} />,
        path: "/owner/notifications",
        subItems: []
    },
];

const OwnerSidebar = () => {
    const [expandedMenus, setExpandedMenus] = useState<{ [key: number]: boolean }>({});
    const location = useLocation();

    const toggleMenu = (index: number, currentExpanded: boolean) => {
        setExpandedMenus((prev) => ({
            ...prev,
            [index]: !currentExpanded
        }));
    };

    return (
        <aside className="owr-sb-container">
            {/* Logo */}
            <div className="owr-sb-logo">
                <img src={logo} alt="Hoàng Nam Apartment" className="owr-sb-brand-logo" />
            </div>

            {/* Menu Items (Scrollable) */}
            <div className="owr-sb-nav-scroll">
                <nav className="owr-sb-nav">
                    {MENU_ITEMS.map((item, index) => {
                        const hasSubItems = item.subItems && item.subItems.length > 0;
                        const isActiveParent = hasSubItems
                            ? location.pathname === item.path || location.pathname.startsWith(item.path + '/')
                            : location.pathname === item.path;
                        const isExpanded = expandedMenus[index] ?? isActiveParent;

                        return (
                            <div key={index} className="owr-sb-group">
                                {/* Parent Item */}
                                <div
                                    onClick={() => hasSubItems ? toggleMenu(index, isExpanded) : null}
                                    className={`owr-sb-item ${isActiveParent && !hasSubItems ? 'active' : ''} ${hasSubItems && isExpanded ? 'expanded' : ''}`}
                                >
                                    {hasSubItems ? (
                                        <div className="owr-sb-link-content">
                                            <span className="owr-sb-icon">{item.icon}</span>
                                            <span className="owr-sb-title">{item.title}</span>
                                            <span className="owr-sb-arrow">
                                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                            </span>
                                        </div>
                                    ) : (
                                        <Link to={item.path} className="owr-sb-link-content">
                                            <span className="owr-sb-icon">{item.icon}</span>
                                            <span className="owr-sb-title">{item.title}</span>
                                        </Link>
                                    )}
                                </div>

                                {/* Sub Items (Dropdown) */}
                                {hasSubItems && isExpanded && (
                                    <div className="owr-sb-submenu">
                                        {item.subItems.map((sub, subIndex) => {
                                            const isActiveSub = location.pathname === sub.path;
                                            return (
                                                <Link
                                                    key={subIndex}
                                                    to={sub.path}
                                                    className={`owr-sb-sub-item ${isActiveSub ? 'sub-active' : ''}`}
                                                >
                                                    <span className="owr-sb-sub-icon">{sub.icon}</span>
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

export default OwnerSidebar;

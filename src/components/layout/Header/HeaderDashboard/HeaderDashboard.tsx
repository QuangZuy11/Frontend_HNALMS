import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, Settings, LogOut, User } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import './HeaderDashboard.css';

const HeaderDashboard = () => {
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);

    const navigate = useNavigate();
    const { user, logout } = useAuth();

    // Get user display info
    const displayName = user?.fullname || user?.name || user?.email || 'Người dùng';
    const displayEmail = user?.email || '';
    const initials = displayName
        .split(' ')
        .map((n: string) => n[0])
        .slice(-2)
        .join('')
        .toUpperCase();

    // Get profile path based on role
    const getProfilePath = () => {
        const role = user?.role?.toLowerCase();
        switch (role) {
            case 'admin': return '/admin/profile';
            case 'owner': return '/owner/profile';
            case 'manager': return '/manager/profile';
            case 'accountant': return '/accountant/profile';
            default: return '/profile';
        }
    };

    // Handle navigation to profile
    const handleProfileClick = () => {
        setShowUserMenu(false);
        navigate(getProfilePath());
    };

    // Handle logout
    const handleLogout = () => {
        setShowUserMenu(false);
        logout();
        navigate('/homepage');
    };

    // Mock notifications
    const notifications = [
        { id: 1, title: "Yêu cầu sửa chữa mới", time: "5 phút trước", unread: true },
        { id: 2, title: "Hợp đồng sắp hết hạn", time: "1 giờ trước", unread: true },
        { id: 3, title: "Thanh toán thành công", time: "2 giờ trước", unread: false },
    ];

    const unreadCount = notifications.filter(n => n.unread).length;

    return (
        <header className="manager-header">
            {/* Left: Empty space for alignment */}
            <div className="header-left"></div>

            {/* Right: User + Notifications */}
            <div className="header-right">
                {/* User Profile */}
                <div className="user-profile-wrapper">
                    <div
                        className="user-profile"
                        onClick={() => setShowUserMenu(!showUserMenu)}
                    >
                        <div className="user-avatar">
                            {initials}
                        </div>
                        <div className="user-info">
                            <span className="user-name">{displayName}</span>
                            <span className="user-email">{displayEmail}</span>
                        </div>
                        <ChevronDown size={16} className="user-chevron" />
                    </div>

                    {showUserMenu && (
                        <div className="user-dropdown">
                            <button className="dropdown-item" onClick={handleProfileClick}>
                                <User size={16} /> Thông tin cá nhân
                            </button>
                            <button className="dropdown-item">
                                <Settings size={16} /> Cài đặt
                            </button>
                            <div className="dropdown-divider"></div>
                            <button className="dropdown-item text-danger" onClick={handleLogout}>
                                <LogOut size={16} /> Đăng xuất
                            </button>
                        </div>
                    )}
                </div>

                {/* Divider */}
                <div className="header-divider"></div>

                {/* Notifications */}
                <div className="notification-wrapper">
                    <button
                        className="header-icon-btn"
                        onClick={() => setShowNotifications(!showNotifications)}
                    >
                        <span className="bell-icon-wrapper">
                            <Bell />
                        </span>
                        {unreadCount > 0 && (
                            <span className="notification-badge">{unreadCount}</span>
                        )}
                    </button>

                    {showNotifications && (
                        <div className="notification-dropdown">
                            <div className="notification-header">
                                <h4>Thông báo</h4>
                                <span className="mark-read">Đánh dấu đã đọc</span>
                            </div>
                            <div className="notification-list">
                                {notifications.map(notif => (
                                    <div key={notif.id} className={`notification-item ${notif.unread ? 'unread' : ''}`}>
                                        <div className="notif-dot"></div>
                                        <div className="notif-content">
                                            <p className="notif-title">{notif.title}</p>
                                            <span className="notif-time">{notif.time}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button className="view-all-btn">Xem tất cả</button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default HeaderDashboard;

import { useState } from 'react';
import { Bell, ChevronDown, Settings, LogOut, User } from 'lucide-react';
import './HeaderDashboard.css';

const HeaderDashboard = () => {
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);

    // Mock user data
    const currentUser = {
        name: "Nguyễn Phi Trường",
        email: "truongnp@hoangnam.vn",
        initials: "NT",
        avatar: null
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
                            {currentUser.avatar ? (
                                <img src={currentUser.avatar} alt={currentUser.name} />
                            ) : (
                                currentUser.initials
                            )}
                        </div>
                        <div className="user-info">
                            <span className="user-name">{currentUser.name}</span>
                            <span className="user-email">{currentUser.email}</span>
                        </div>
                        <ChevronDown size={16} className="user-chevron" />
                    </div>

                    {showUserMenu && (
                        <div className="user-dropdown">
                            <button className="dropdown-item">
                                <User size={16} /> Thông tin cá nhân
                            </button>
                            <button className="dropdown-item">
                                <Settings size={16} /> Cài đặt
                            </button>
                            <div className="dropdown-divider"></div>
                            <button className="dropdown-item text-danger">
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

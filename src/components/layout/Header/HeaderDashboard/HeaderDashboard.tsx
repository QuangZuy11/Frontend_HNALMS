import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, Settings, LogOut, User } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { notificationService } from '../../../../services/notificationService';
import type { Notification } from '../../../../types/notification.types';
import './HeaderDashboard.css';

const HeaderDashboard = () => {
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [markingAll, setMarkingAll] = useState(false);

    const notifRef = useRef<HTMLDivElement>(null);
    const userRef = useRef<HTMLDivElement>(null);

    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const role = user?.role?.toLowerCase();
    // Only Manager and Accountant receive notifications from Owner
    const canReceiveNotifications = role === 'manager' || role === 'accountant';

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
        switch (role) {
            case 'admin': return '/admin/profile';
            case 'owner': return '/owner/profile';
            case 'manager': return '/manager/profile';
            case 'accountant': return '/accountant/profile';
            default: return '/profile';
        }
    };

    // Get notification page path based on role
    const getNotificationPath = () => {
        switch (role) {
            case 'owner': return '/owner/notifications';
            case 'manager': return '/manager/notifications';
            case 'accountant': return '/accountant/notifications';
            default: return '/';
        }
    };

    // Fetch unread count
    useEffect(() => {
        if (!canReceiveNotifications) return;
        fetchUnreadCount();
        // Poll every 30 seconds
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canReceiveNotifications]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setShowNotifications(false);
            }
            if (userRef.current && !userRef.current.contains(e.target as Node)) {
                setShowUserMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchUnreadCount = async () => {
        try {
            const res = await notificationService.getUnreadCount();
            if (res.success) {
                setUnreadCount(res.data.unread_count);
            }
        } catch {
            // Silently fail - badge just won't update
        }
    };

    const fetchRecentNotifications = async () => {
        try {
            const res = await notificationService.getMyNotifications({ page: 1, limit: 5 });
            if (res.success) {
                setNotifications(res.data.notifications || []);
            }
        } catch {
            // Silently fail
        }
    };

    const handleToggleNotifications = () => {
        const willShow = !showNotifications;
        setShowNotifications(willShow);
        setShowUserMenu(false);
        if (willShow) {
            fetchRecentNotifications();
        }
    };

    const handleMarkAllRead = async () => {
        try {
            setMarkingAll(true);
            await notificationService.markAllAsRead();
            setUnreadCount(0);
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch {
            // Silently fail
        } finally {
            setMarkingAll(false);
        }
    };

    const handleNotificationClick = async (notif: Notification) => {
        // Mark as read if unread
        if (!notif.is_read) {
            try {
                await notificationService.markAsRead(notif._id);
                setUnreadCount(prev => Math.max(0, prev - 1));
                setNotifications(prev =>
                    prev.map(n => n._id === notif._id ? { ...n, is_read: true } : n)
                );
            } catch {
                // Continue navigation even if mark-read fails
            }
        }
        setShowNotifications(false);
        navigate(getNotificationPath());
    };

    const handleViewAll = () => {
        setShowNotifications(false);
        navigate(getNotificationPath());
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

    // Format relative time
    const formatRelativeTime = (dateStr: string) => {
        const now = new Date();
        const date = new Date(dateStr);
        const diffMs = now.getTime() - date.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        const diffHour = Math.floor(diffMs / 3600000);
        const diffDay = Math.floor(diffMs / 86400000);

        if (diffMin < 1) return 'Vừa xong';
        if (diffMin < 60) return `${diffMin} phút trước`;
        if (diffHour < 24) return `${diffHour} giờ trước`;
        if (diffDay < 7) return `${diffDay} ngày trước`;
        return date.toLocaleDateString('vi-VN');
    };

    return (
        <header className="manager-header">
            {/* Left: Empty space for alignment */}
            <div className="header-left"></div>

            {/* Right: User + Notifications */}
            <div className="header-right">
                {/* User Profile */}
                <div className="user-profile-wrapper" ref={userRef}>
                    <div
                        className="user-profile"
                        onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); }}
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
                <div className="notification-wrapper" ref={notifRef}>
                    <button
                        className="header-icon-btn"
                        onClick={handleToggleNotifications}
                    >
                        <span className="bell-icon-wrapper">
                            <Bell />
                        </span>
                        {canReceiveNotifications && unreadCount > 0 && (
                            <span className="header-notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                        )}
                    </button>

                    {showNotifications && (
                        <div className="notification-dropdown">
                            <div className="notif-dropdown-header">
                                <h4>Thông báo</h4>
                                {canReceiveNotifications && unreadCount > 0 && (
                                    <span
                                        className="mark-read"
                                        onClick={handleMarkAllRead}
                                        style={{ opacity: markingAll ? 0.5 : 1, pointerEvents: markingAll ? 'none' : 'auto' }}
                                    >
                                        {markingAll ? 'Đang xử lý...' : 'Đánh dấu đã đọc'}
                                    </span>
                                )}
                            </div>
                            <div className="notification-list">
                                {notifications.length === 0 ? (
                                    <div className="notif-empty">
                                        <p>Không có thông báo nào</p>
                                    </div>
                                ) : (
                                    notifications.map(notif => (
                                        <div
                                            key={notif._id}
                                            className={`notification-item ${!notif.is_read ? 'unread' : ''}`}
                                            onClick={() => handleNotificationClick(notif)}
                                        >
                                            <div className="notif-dot"></div>
                                            <div className="notif-content">
                                                <p className="notif-title">{notif.title}</p>
                                                <span className="notif-time">{formatRelativeTime(notif.createdAt)}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <button className="view-all-btn" onClick={handleViewAll}>
                                Xem tất cả
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default HeaderDashboard;

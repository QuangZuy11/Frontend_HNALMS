import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, X, ArrowRight, Maximize2, Check, Eye } from 'lucide-react';
import { notificationService } from '../../../../services/notificationService';
import type { Notification } from '../../../../types/notification.types';
import './HeaderNotification.css';

interface HeaderNotificationProps {
    role?: string;
}

const HeaderNotification = ({ role }: HeaderNotificationProps) => {
    // Owner, Manager and Accountant receive notifications
    const canReceiveNotifications = ['owner', 'manager', 'accountant'].includes(role || '');

    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [dropdownTab, setDropdownTab] = useState<'ALL' | 'UNREAD'>('ALL');
    const [markingAll, setMarkingAll] = useState(false);

    // "Xem tất cả" modal
    const [showAllModal, setShowAllModal] = useState(false);
    const [allNotifications, setAllNotifications] = useState<Notification[]>([]);
    const [allLoading, setAllLoading] = useState(false);
    const [allPage, setAllPage] = useState(1);
    const [allTotalPages, setAllTotalPages] = useState(1);

    // Detail modal
    const [detailNotification, setDetailNotification] = useState<Notification | null>(null);

    const notifRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const getNotificationPath = () => {
        switch (role) {
            case 'owner': return '/owner/notifications';
            case 'manager': return '/manager/notifications';
            case 'accountant': return '/accountant/notifications';
            default: return '/';
        }
    };

    useEffect(() => {
        if (!canReceiveNotifications) return;
        console.log(`[HeaderNotification] Role: ${role}, canReceive: ${canReceiveNotifications}`);
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
    }, [canReceiveNotifications, role]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchUnreadCount = async () => {
        try {
            const res = await notificationService.getUnreadCount();
            console.log('[HeaderNotification] Unread count response:', res);
            if (res.success) {
                setUnreadCount(res.data.unread_count);
                console.log('[HeaderNotification] Updated unread count:', res.data.unread_count);
            }
        } catch (err) {
            console.error('[HeaderNotification] Error fetching unread count:', err);
        }
    };

    const fetchRecentNotifications = async (tab = dropdownTab) => {
        try {
            const params: Record<string, string | number> = { page: 1, limit: 10 };
            if (tab === 'UNREAD') params.is_read = 'false';
            console.log('[HeaderNotification] Fetching recent notifications with params:', params);
            const res = await notificationService.getMyNotifications(params);
            console.log('[HeaderNotification] Raw response:', res);
            if (res.success) {
                let notifs = res.data.notifications || [];
                console.log('[HeaderNotification] Total notifications:', notifs.length);
                console.log('[HeaderNotification] Role:', role);
                // Owner: chỉ hiển thị thông báo type là 'system' (từ tenant requests)
                // Manager: hiển thị cả 'system' (từ tenant), 'tenant' (từ owner/manager), và 'staff' (từ owner)
                if (role === 'owner') {
                    const beforeFilter = notifs.length;
                    notifs = notifs.filter(n => n.type === 'system');
                    console.log(`[HeaderNotification] Owner - Filtered from ${beforeFilter} to ${notifs.length} notifications (type='system')`);
                } else if (role === 'manager') {
                    const beforeFilter = notifs.length;
                    notifs = notifs.filter(n => n.type === 'system' || n.type === 'tenant' || n.type === 'staff');
                    console.log(`[HeaderNotification] Manager - Showing all notifications (${notifs.length} total, filtered from ${beforeFilter})`);
                }
                console.log('[HeaderNotification] Filtered notifications:', notifs);
                setNotifications(notifs);
            }
        } catch (err) {
            console.error('[HeaderNotification] Error fetching notifications:', err);
        }
    };

    const fetchAllNotifications = async (pg = 1) => {
        try {
            setAllLoading(true);
            console.log('[HeaderNotification] Fetching all notifications, page:', pg);
            const res = await notificationService.getMyNotifications({ page: pg, limit: 10 });
            console.log('[HeaderNotification] All notifications response:', res);
            if (res.success) {
                let notifs = res.data.notifications || [];
                console.log('[HeaderNotification] Total all notifications:', notifs.length);
                // Owner: chỉ hiển thị thông báo type là 'system' (từ tenant requests)
                // Manager: hiển thị cả 'system' (từ tenant), 'tenant' (từ owner/manager), và 'staff' (từ owner)
                if (role === 'owner') {
                    const beforeFilter = notifs.length;
                    notifs = notifs.filter(n => n.type === 'system');
                    console.log(`[HeaderNotification] Owner - Filtered from ${beforeFilter} to ${notifs.length} notifications (type='system')`);
                } else if (role === 'manager') {
                    const beforeFilter = notifs.length;
                    notifs = notifs.filter(n => n.type === 'system' || n.type === 'tenant' || n.type === 'staff');
                    console.log(`[HeaderNotification] Manager - Showing all notifications (${notifs.length} total, filtered from ${beforeFilter})`);
                }
                setAllNotifications(notifs);
                setAllTotalPages(res.data.pagination.total_pages);
                setAllPage(pg);
            }
        } catch (err) {
            console.error('[HeaderNotification] Error fetching all notifications:', err);
        }
        finally { setAllLoading(false); }
    };

    const handleToggleNotifications = () => {
        const willShow = !showNotifications;
        setShowNotifications(willShow);
        if (willShow) fetchRecentNotifications();
    };

    const handleMarkAllRead = async () => {
        try {
            setMarkingAll(true);
            await notificationService.markAllAsRead();
            setUnreadCount(0);
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setAllNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch { /* silent */ }
        finally { setMarkingAll(false); }
    };

    const handleMarkSingleRead = async (notif: Notification, e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (notif.is_read) return;
        try {
            await notificationService.markAsRead(notif._id);
            setUnreadCount(prev => Math.max(0, prev - 1));
            const update = (list: Notification[]) =>
                list.map(n => n._id === notif._id ? { ...n, is_read: true } : n);
            setNotifications(update);
            setAllNotifications(update);
        } catch { /* silent */ }
    };

    const handleViewDetail = (notif: Notification, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setDetailNotification(notif);
        if (!notif.is_read) handleMarkSingleRead(notif);
    };

    const handleViewAll = () => {
        setShowNotifications(false);
        setShowAllModal(true);
        fetchAllNotifications(1);
    };

    // Format relative time (e.g. 1 giờ, 3 giờ trước)
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

    // Date & Time formatter explicitly
    const formatDateTime = (dateStr: string) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' +
            d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const truncate = (text: string, max: number) =>
        text.length > max ? text.substring(0, max) + '...' : text;

    const formatNotificationTitle = (title: string) => {
        // Remove all emojis (at beginning or anywhere) and " từ undefined" at the end
        return title
            .replace(/^\s*[\p{Emoji}\s]+/u, '') // Remove any emoji at start
            .replace(/\s+[\p{Emoji}]+\s*$/u, '') // Remove any emoji at end
            .replace(/ từ undefined$/i, ''); // Remove " từ undefined" at end
    };

    if (!canReceiveNotifications) {
        return null; // Return nothing if role is not manager/accountant
    }

    return (
        <div className="notification-wrapper" ref={notifRef}>
            <button className="header-icon-btn" onClick={handleToggleNotifications}>
                <span className="bell-icon-wrapper"><Bell /></span>
                {unreadCount > 0 && (
                    <span className="header-notification-badge">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {showNotifications && (
                <div className="notification-dropdown">
                    <div className="notif-dropdown-header">
                        <h4>Thông báo</h4>
                        <div className="notif-header-actions">
                            <span className="notif-header-link" onClick={() => { setShowNotifications(false); navigate(getNotificationPath()); }} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Maximize2 size={14} /> Mở toàn màn hình
                            </span>
                        </div>
                    </div>

                    <div className="notif-dropdown-sub-header">
                        <span
                            className={`notif-tab ${dropdownTab === 'ALL' ? 'active' : ''}`}
                            onClick={() => { setDropdownTab('ALL'); fetchRecentNotifications('ALL'); }}
                        >Tất cả</span>
                        <span
                            className={`notif-tab ${dropdownTab === 'UNREAD' ? 'active' : ''}`}
                            onClick={() => { setDropdownTab('UNREAD'); fetchRecentNotifications('UNREAD'); }}
                        >Chưa đọc</span>
                    </div>

                    {unreadCount > 0 && (
                        <div className="notif-mark-all-wrapper">
                            <button
                                className="mark-read-text-btn"
                                onClick={handleMarkAllRead}
                                disabled={markingAll}
                                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                                <CheckCheck size={14} />
                                {markingAll ? 'Đang xử lý...' : 'Đánh dấu tất cả đã đọc'}
                            </button>
                        </div>
                    )}

                    <div className="notification-list">
                        {notifications.length === 0 ? (
                            <div className="notif-empty">
                                <Bell size={32} strokeWidth={1.5} />
                                <p>Không có thông báo nào</p>
                            </div>
                        ) : (
                            notifications.map(notif => (
                                <div
                                    key={notif._id}
                                    className={`notification-item fb-style-item ${!notif.is_read ? 'unread' : ''}`}
                                    onClick={(e) => handleViewDetail(notif, e)}
                                >

                                    <div className="notif-body">
                                        <p className="notif-title">{formatNotificationTitle(notif.title)}</p>
                                        <p className="notif-preview">{truncate(notif.content, 50)}</p>
                                        <span className={`notif-time ${!notif.is_read ? 'unread-time' : ''}`}>{formatRelativeTime(notif.createdAt)}</span>
                                    </div>

                                    <div className="notif-right-col">
                                        {!notif.is_read && <div className="notif-dot"></div>}
                                        <div className="notif-actions-always-visible">
                                            {!notif.is_read && (
                                                <button
                                                    className="notif-action-btn check"
                                                    title="Đánh dấu đã đọc"
                                                    onClick={(e) => handleMarkSingleRead(notif, e)}
                                                >
                                                    <Check size={16} color="#3579c6" strokeWidth={2.5} />
                                                </button>
                                            )}
                                            <button
                                                className="notif-action-btn view"
                                                title="Xem chi tiết"
                                                onClick={(e) => handleViewDetail(notif, e)}
                                            >
                                                <Eye size={16} color="#64748b" strokeWidth={2} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <button className="view-all-btn" onClick={handleViewAll} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        Xem tất cả <ArrowRight size={16} />
                    </button>
                </div>
            )}

            {/* ====== "Xem tất cả" Modal ====== */}
            {showAllModal && createPortal(
                <div className="notif-modal-overlay" onClick={() => setShowAllModal(false)}>
                    <div className="notif-modal notif-modal-lg" onClick={e => e.stopPropagation()}>
                        <div className="notif-modal-header">
                            <h3>Tất cả thông báo</h3>
                            <button className="notif-modal-close" onClick={() => setShowAllModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="notif-modal-body">
                            {allLoading ? (
                                <div className="notif-empty"><p>Đang tải...</p></div>
                            ) : allNotifications.length === 0 ? (
                                <div className="notif-empty">
                                    <Bell size={40} strokeWidth={1.5} />
                                    <p>Không có thông báo nào</p>
                                </div>
                            ) : (
                                <div className="notif-all-list">
                                    {allNotifications.map(notif => (
                                        <div
                                            key={notif._id}
                                            className={`notif-all-item fb-style-item ${!notif.is_read ? 'unread' : ''}`}
                                            onClick={() => handleViewDetail(notif)}
                                        >

                                            <div className="notif-all-body">
                                                <p className="notif-all-title">{formatNotificationTitle(notif.title)}</p>
                                                <p className="notif-all-preview">{truncate(notif.content, 80)}</p>
                                                <span className={`notif-all-time ${!notif.is_read ? 'unread-time' : ''}`}>Ngày gửi: {formatDateTime(notif.createdAt)}</span>
                                            </div>

                                            <div className="notif-right-col">
                                                {!notif.is_read && <div className="notif-dot"></div>}
                                                <div className="notif-actions-always-visible">
                                                    {!notif.is_read && (
                                                        <button
                                                            className="notif-action-btn check"
                                                            title="Đánh dấu đã đọc"
                                                            onClick={(e) => handleMarkSingleRead(notif, e)}
                                                        >
                                                            <Check size={16} color="#c91d26ff" strokeWidth={2.5} />
                                                        </button>
                                                    )}
                                                    <button
                                                        className="notif-action-btn view"
                                                        title="Xem chi tiết"
                                                        onClick={(e) => handleViewDetail(notif, e)}
                                                    >
                                                        <Eye size={16} color="#64748b" strokeWidth={2} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        {allTotalPages > 1 && (
                            <div className="notif-modal-footer">
                                <button
                                    className="notif-page-btn"
                                    disabled={allPage <= 1}
                                    onClick={() => fetchAllNotifications(allPage - 1)}
                                >‹ Trước</button>
                                <span className="notif-page-info">Trang {allPage}/{allTotalPages}</span>
                                <button
                                    className="notif-page-btn"
                                    disabled={allPage >= allTotalPages}
                                    onClick={() => fetchAllNotifications(allPage + 1)}
                                >Sau ›</button>
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}

            {/* ====== Detail Modal ====== */}
            {detailNotification && createPortal(
                <div className="notif-modal-overlay" style={{ zIndex: 1200 }} onClick={() => setDetailNotification(null)}>
                    <div className="notif-modal notif-modal-detail" onClick={e => e.stopPropagation()}>
                        <div className="notif-modal-header">
                            <h3>Chi tiết thông báo</h3>
                            <button className="notif-modal-close" onClick={() => setDetailNotification(null)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="notif-modal-body">
                            <div className="notif-detail-title">{formatNotificationTitle(detailNotification.title)}</div>

                            {/* Meta Info: Người gửi & Thời gian */}
                            <div className="notif-detail-meta-group">
                                <div className="notif-detail-info">
                                    <div className="notif-detail-sender">
                                        <strong>Người gửi:</strong> {
                                            detailNotification.type === 'system' 
                                                ? 'Cư dân (Tenant)' 
                                                : detailNotification.type === 'staff'
                                                ? 'Ban quản lý (Owner)'
                                                : 'Quản lý (Manager)'
                                        }
                                    </div>
                                    <div className="notif-detail-time-row">
                                        <span className="notif-detail-time">{formatDateTime(detailNotification.createdAt)}</span>
                                        <span className={`notif-detail-badge ${detailNotification.is_read ? 'read' : 'unread'}`}>
                                            {detailNotification.is_read ? 'Đã đọc' : 'Chưa đọc'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="notif-detail-content">
                                {detailNotification.type === 'system' ? (
                                    // System notification - Yêu cầu từ tenant
                                    <div style={{ lineHeight: '1.8', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                        {detailNotification.content}
                                    </div>
                                ) : detailNotification.type === 'staff' ? (
                                    // Staff notification - Thông báo từ owner
                                    <div style={{ lineHeight: '1.8', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                        {detailNotification.content}
                                    </div>
                                ) : (
                                    // Tenant notification - Thông báo từ manager
                                    <div dangerouslySetInnerHTML={{ __html: detailNotification.content }} />
                                )}
                            </div>
                        </div>

                        <div className="notif-modal-footer" style={{ justifyContent: 'flex-end' }}>
                            <button className="notif-close-btn" onClick={() => setDetailNotification(null)}>
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default HeaderNotification;

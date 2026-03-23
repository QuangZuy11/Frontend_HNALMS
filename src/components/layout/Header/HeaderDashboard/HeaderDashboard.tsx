import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Settings, LogOut, User } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import HeaderNotification from './HeaderNotification';
import './HeaderDashboard.css';

const HeaderDashboard = () => {
    const [showUserMenu, setShowUserMenu] = useState(false);
    const userRef = useRef<HTMLDivElement>(null);

    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const role = user?.role?.toLowerCase();

    const displayName = user?.fullname || user?.name || user?.email || 'Người dùng';
    
    // Convert role to Vietnamese display name
    const displayRole = (() => {
        switch (role) {
            case 'admin': return 'Quản Trị Viên';
            case 'owner': return 'Chủ Tòa Nhà';
            case 'manager': return 'Quản Lý';
            case 'accountant': return 'Kế Toán';
            case 'tenant': return 'Người Thuê';
            default: return 'Người Dùng';
        }
    })();

    const initials = displayName
        .split(' ')
        .map((n: string) => n[0])
        .slice(-2)
        .join('')
        .toUpperCase();

    const getProfilePath = () => {
        switch (role) {
            case 'admin': return '/admin/profile';
            case 'owner': return '/owner/profile';
            case 'manager': return '/manager/profile';
            case 'accountant': return '/accountant/profile';
            default: return '/profile';
        }
    };

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (userRef.current && !userRef.current.contains(e.target as Node)) {
                setShowUserMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleProfileClick = () => { setShowUserMenu(false); navigate(getProfilePath()); };
    const handleLogout = () => { setShowUserMenu(false); logout(); navigate('/homepage'); };

    return (
        <header className="manager-header">
            <div className="header-left"></div>

            <div className="header-right">
                {/* User Profile */}
                <div className="user-profile-wrapper" ref={userRef}>
                    <div
                        className="user-profile"
                        onClick={() => { setShowUserMenu(!showUserMenu); }}
                    >
                        <div className="user-avatar">{initials}</div>
                        <div className="user-info">
                            <span className="user-name">{displayName}</span>
                            <span className="user-email">{displayRole}</span>
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

                <div className="header-divider"></div>

                {/* Extracted Notifications Component */}
                <HeaderNotification role={role} />
            </div>
        </header>
    );
};

export default HeaderDashboard;

import { useState, useEffect } from 'react';
import { authService } from '../../../services/authService';
import type { User } from '../../../types/auth.types';
import './Profile.css';

interface FormData {
    fullname: string;
    citizen_id: string;
    permanent_address: string;
    dob: string;
    gender: 'male' | 'female' | 'other' | '';
}

export default function ViewProfile() {
    const [profile, setProfile] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeMenu, setActiveMenu] = useState<string>('profile');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [formData, setFormData] = useState<FormData>({
        fullname: '',
        citizen_id: '',
        permanent_address: '',
        dob: '',
        gender: ''
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // Check if token exists
            const token = localStorage.getItem('token');
            if (!token || !token.trim()) {
                setError('Bạn chưa đăng nhập. Vui lòng đăng nhập lại.');
                setLoading(false);
                return;
            }
            
            // Debug log
            console.log('Fetching profile with token:', {
                hasToken: !!token,
                tokenLength: token.length,
                tokenPreview: token.substring(0, 20) + '...'
            });
            
            const response = await authService.getProfile();
            setProfile(response.data);
            
            // Populate form with existing data
            setFormData({
                fullname: response.data.fullname || '',
                citizen_id: response.data.citizen_id || '',
                permanent_address: response.data.permanent_address || '',
                dob: response.data.dob ? new Date(response.data.dob).toISOString().split('T')[0] : '',
                gender: response.data.gender || ''
            });
        } catch (err: unknown) {
            console.error('Error fetching profile:', err);
            const errorResponse = err && typeof err === 'object' && 'response' in err
                ? (err as { response?: { status?: number; data?: { message?: string } } }).response
                : undefined;
            
            if (errorResponse?.status === 401) {
                // Don't clear token here - let user decide
                // The error message will prompt them to login again
                const errorMessage = errorResponse?.data?.message || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
                setError(errorMessage);
                
                // Optionally clear token after showing error
                setTimeout(() => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                }, 2000);
            } else {
                const errorMessage = errorResponse?.data?.message;
                setError(errorMessage || 'Không thể tải thông tin profile');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = () => {
        setIsModalOpen(true);
        setFormError(null);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setFormError(null);
        // Reset form to current profile data
        if (profile) {
            setFormData({
                fullname: profile.fullname || '',
                citizen_id: profile.citizen_id || '',
                permanent_address: profile.permanent_address || '',
                dob: profile.dob ? new Date(profile.dob).toISOString().split('T')[0] : '',
                gender: profile.gender || ''
            });
        }
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        try {
            setSaving(true);
            setFormError(null);
            
            await authService.updateProfile({
                fullname: formData.fullname.trim() || null,
                citizen_id: formData.citizen_id.trim() || null,
                permanent_address: formData.permanent_address.trim() || null,
                dob: formData.dob || null,
                gender: formData.gender || null
            });

            // Refresh profile data
            await fetchProfile();
            
            // Close modal
            setIsModalOpen(false);
        } catch (err: unknown) {
            console.error('Error updating profile:', err);
            const errorMessage = err && typeof err === 'object' && 'response' in err
                ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                : undefined;
            setFormError(errorMessage || 'Không thể cập nhật thông tin');
        } finally {
            setSaving(false);
        }
    };

    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return 'Chưa cập nhật';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('vi-VN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        } catch {
            return 'Chưa cập nhật';
        }
    };

    const getGenderLabel = (gender: string | null | undefined) => {
        switch (gender) {
            case 'male':
                return 'Nam';
            case 'female':
                return 'Nữ';
            case 'other':
                return 'Khác';
            default:
                return 'Chưa cập nhật';
        }
    };

    const getRoleLabel = (role: string) => {
        const roleMap: Record<string, string> = {
            admin: 'Quản trị viên',
            manager: 'Quản lý tòa nhà',
            owner: 'Chủ căn hộ',
            tenant: 'Người thuê',
            accountant: 'Kế toán'
        };
        return roleMap[role] || role;
    };

    if (loading) {
        return (
            <div className="profile-container">
                <div className="profile-loading">
                    <div className="spinner"></div>
                    <p>Đang tải thông tin...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="profile-container">
                <div className="profile-error">
                    <p>{error}</p>
                    <button onClick={fetchProfile} className="btn-retry">
                        Thử lại
                    </button>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="profile-container">
                <div className="profile-error">
                    <p>Không tìm thấy thông tin profile</p>
                </div>
            </div>
        );
    }

    return (
        <div className="profile-container">
            <div className="profile-header">
                <h1>Thông Tin Cá Nhân</h1>
            </div>

            <div className="profile-layout">
                {/* Sidebar Menu */}
                <div className="profile-sidebar">
                    <div className="profile-menu">
                        <button 
                            className={`profile-menu-item ${activeMenu === 'profile' ? 'active' : ''}`}
                            onClick={() => setActiveMenu('profile')}
                        >
                            Thông Tin Cá Nhân
                        </button>
                        {/* Có thể thêm các menu item khác ở đây sau này */}
                    </div>
                </div>

                {/* Main Content */}
                <div className="profile-content">
                    {activeMenu === 'profile' && (
                        <>
                            {/* Thông tin tài khoản */}
                            <div className="profile-section">
                                <h2>Thông Tin Tài Khoản</h2>
                                <div className="profile-grid">
                                    <div className="profile-item">
                                        <label>Email</label>
                                        <p>{profile.email || 'Chưa cập nhật'}</p>
                                    </div>
                                    <div className="profile-item">
                                        <label>Vai trò</label>
                                        <p>{getRoleLabel(profile.role)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Thông tin cá nhân */}
                            <div className="profile-section">
                                <h2>Thông Tin Cá Nhân</h2>
                                <div className="profile-grid">
                                    <div className="profile-item">
                                        <label>Họ và tên</label>
                                        <p>{profile.fullname || 'Chưa cập nhật'}</p>
                                    </div>
                                    <div className="profile-item">
                                        <label>CCCD/CMND</label>
                                        <p>{profile.citizen_id || 'Chưa cập nhật'}</p>
                                    </div>
                                    <div className="profile-item">
                                        <label>Ngày sinh</label>
                                        <p>{formatDate(profile.dob)}</p>
                                    </div>
                                    <div className="profile-item">
                                        <label>Giới tính</label>
                                        <p>{getGenderLabel(profile.gender)}</p>
                                    </div>
                                    <div className="profile-item full-width">
                                        <label>Địa chỉ thường trú</label>
                                        <p>{profile.permanent_address || 'Chưa cập nhật'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Nút Cập nhật thông tin */}
                            <div className="profile-actions">
                                <button className="btn-primary" onClick={handleOpenModal}>
                                    Cập nhật thông tin
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Update Profile Modal */}
            {isModalOpen && (
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Cập Nhật Thông Tin Cá Nhân</h2>
                            <button className="modal-close" onClick={handleCloseModal}>
                                ×
                            </button>
                        </div>

                        <div className="modal-body">
                            {formError && (
                                <div className="form-error">
                                    <p>{formError}</p>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="profile-form">
                                <div className="profile-section">
                                    <h3>Thông Tin Cá Nhân</h3>
                                    <div className="profile-grid">
                                        <div className="profile-item full-width">
                                            <label htmlFor="fullname">Họ và tên *</label>
                                            <input
                                                type="text"
                                                id="fullname"
                                                name="fullname"
                                                value={formData.fullname}
                                                onChange={handleFormChange}
                                                placeholder="Nhập họ và tên"
                                                required
                                                minLength={2}
                                            />
                                        </div>

                                        <div className="profile-item">
                                            <label htmlFor="citizen_id">CCCD/CMND</label>
                                            <input
                                                type="text"
                                                id="citizen_id"
                                                name="citizen_id"
                                                value={formData.citizen_id}
                                                onChange={handleFormChange}
                                                placeholder="Nhập số CCCD/CMND"
                                                minLength={9}
                                            />
                                        </div>

                                        <div className="profile-item">
                                            <label htmlFor="dob">Ngày sinh</label>
                                            <input
                                                type="date"
                                                id="dob"
                                                name="dob"
                                                value={formData.dob}
                                                onChange={handleFormChange}
                                            />
                                        </div>

                                        <div className="profile-item">
                                            <label htmlFor="gender">Giới tính</label>
                                            <select
                                                id="gender"
                                                name="gender"
                                                value={formData.gender}
                                                onChange={handleFormChange}
                                            >
                                                <option value="">Chọn giới tính</option>
                                                <option value="male">Nam</option>
                                                <option value="female">Nữ</option>
                                                <option value="other">Khác</option>
                                            </select>
                                        </div>

                                        <div className="profile-item full-width">
                                            <label htmlFor="permanent_address">Địa chỉ thường trú</label>
                                            <textarea
                                                id="permanent_address"
                                                name="permanent_address"
                                                value={formData.permanent_address}
                                                onChange={handleFormChange}
                                                placeholder="Nhập địa chỉ thường trú"
                                                rows={3}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="modal-actions">
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        className="btn-secondary"
                                        disabled={saving}
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-primary"
                                        disabled={saving}
                                    >
                                        {saving ? 'Đang lưu...' : 'Lưu thông tin'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

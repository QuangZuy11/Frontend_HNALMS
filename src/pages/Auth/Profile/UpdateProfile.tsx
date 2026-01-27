import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../../services/authService';
import './Profile.css';

interface FormData {
    fullname: string;
    citizen_id: string;
    permanent_address: string;
    dob: string;
    gender: 'male' | 'female' | 'other' | '';
}

export default function UpdateProfile() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
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
            const response = await authService.getProfile();
            
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
            const errorMessage = err && typeof err === 'object' && 'response' in err
                ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                : undefined;
            setError(errorMessage || 'Không thể tải thông tin profile');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
            setError(null);
            
            await authService.updateProfile({
                fullname: formData.fullname.trim() || null,
                citizen_id: formData.citizen_id.trim() || null,
                permanent_address: formData.permanent_address.trim() || null,
                dob: formData.dob || null,
                gender: formData.gender || null
            });

            // Redirect to profile page after successful update
            navigate('/profile');
        } catch (err: unknown) {
            console.error('Error updating profile:', err);
            const errorMessage = err && typeof err === 'object' && 'response' in err
                ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                : undefined;
            setError(errorMessage || 'Không thể cập nhật thông tin');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        navigate('/profile');
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

    return (
        <div className="profile-container">
            <div className="profile-header">
                <h1>Cập Nhật Thông Tin Cá Nhân</h1>
                <button onClick={handleCancel} className="btn-cancel">
                    Hủy
                </button>
            </div>

            <div className="profile-content">
                {error && (
                    <div className="form-error">
                        <p>{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="profile-form">
                    <div className="profile-section">
                        <h2>Thông Tin Cá Nhân</h2>
                        <div className="profile-grid">
                            <div className="profile-item full-width">
                                <label htmlFor="fullname">Họ và tên *</label>
                                <input
                                    type="text"
                                    id="fullname"
                                    name="fullname"
                                    value={formData.fullname}
                                    onChange={handleChange}
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
                                    onChange={handleChange}
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
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="profile-item">
                                <label htmlFor="gender">Giới tính</label>
                                <select
                                    id="gender"
                                    name="gender"
                                    value={formData.gender}
                                    onChange={handleChange}
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
                                    onChange={handleChange}
                                    placeholder="Nhập địa chỉ thường trú"
                                    rows={3}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="profile-actions">
                        <button
                            type="button"
                            onClick={handleCancel}
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
    );
}

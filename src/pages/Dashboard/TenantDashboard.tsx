import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function TenantDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '30px',
                    borderBottom: '2px solid #e5e7eb',
                    paddingBottom: '20px'
                }}>
                    <div>
                        <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>
                            Trang Người Thuê
                        </h1>
                        <p style={{ color: '#6b7280' }}>
                            Xin chào, {user?.fullname}
                        </p>
                    </div>
                    <button
                        onClick={handleLogout}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer'
                        }}
                    >
                        Đăng xuất
                    </button>
                </div>

                <div style={{
                    backgroundColor: '#f9fafb',
                    padding: '20px',
                    borderRadius: '8px',
                    marginBottom: '20px'
                }}>
                    <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '10px' }}>
                        Thông tin tài khoản
                    </h2>
                    <p><strong>Email:</strong> {user?.email}</p>
                    <p><strong>Vai trò:</strong> Người thuê (Tenant)</p>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '20px'
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '20px',
                        borderRadius: '8px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '10px' }}>
                            Phòng của tôi
                        </h3>
                        <p style={{ color: '#6b7280' }}>Xem thông tin phòng đang thuê</p>
                    </div>

                    <div style={{
                        backgroundColor: 'white',
                        padding: '20px',
                        borderRadius: '8px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '10px' }}>
                            Hóa đơn
                        </h3>
                        <p style={{ color: '#6b7280' }}>Quản lý và thanh toán hóa đơn</p>
                    </div>

                    <div style={{
                        backgroundColor: 'white',
                        padding: '20px',
                        borderRadius: '8px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '10px' }}>
                            Yêu cầu
                        </h3>
                        <p style={{ color: '#6b7280' }}>Gửi yêu cầu sửa chữa, khiếu nại</p>
                    </div>

                    <div style={{
                        backgroundColor: 'white',
                        padding: '20px',
                        borderRadius: '8px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '10px' }}>
                            Thông báo
                        </h3>
                        <p style={{ color: '#6b7280' }}>Xem thông báo từ ban quản lý</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

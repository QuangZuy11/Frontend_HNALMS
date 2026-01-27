import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Unauthorized() {
    const navigate = useNavigate();
    const { logout } = useAuth();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            textAlign: 'center',
            padding: '20px'
        }}>
            <h1 style={{ fontSize: '48px', fontWeight: 'bold', color: '#ef4444', marginBottom: '20px' }}>
                403
            </h1>
            <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '10px' }}>
                Không có quyền truy cập
            </h2>
            <p style={{ color: '#6b7280', marginBottom: '30px' }}>
                Bạn không có quyền truy cập vào trang này.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                    }}
                >
                    Quay lại
                </button>
                <button
                    onClick={handleLogout}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                    }}
                >
                    Đăng xuất
                </button>
            </div>
        </div>
    );
}

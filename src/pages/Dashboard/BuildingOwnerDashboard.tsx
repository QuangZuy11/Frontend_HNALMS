import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function BuildingOwnerDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                {/* Content sẽ được thêm vào đây */}
            </div>
        </div>
    );
}

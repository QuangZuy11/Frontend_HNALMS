import { useAuth } from "../../context/AuthContext";

export default function AccountantDashboard() {
    const { user } = useAuth();

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                {/* Content sẽ được thêm vào đây */}
            </div>
        </div>
    );
}

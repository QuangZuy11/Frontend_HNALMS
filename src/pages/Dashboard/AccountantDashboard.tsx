import { useAuth } from "../../context/AuthContext";

export default function AccountantDashboard() {
    const { user } = useAuth();

    return (
        <div style={{ padding: '2rem' }}>
            <h1>Trang Kế Toán</h1>
            <p>Xin chào, {user?.fullname || 'Kế toán'}!</p>
            <p>Đây là trang dành cho vai trò Kế toán (Accountant).</p>

            <div style={{ marginTop: '2rem' }}>
                <h2>Chức năng sẽ được phát triển:</h2>
                <ul>
                    <li>Quản lý hóa đơn</li>
                    <li>Báo cáo tài chính</li>
                    <li>Quản lý dòng tiền</li>
                    <li>Theo dõi công nợ</li>
                </ul>
            </div>
        </div>
    );
}

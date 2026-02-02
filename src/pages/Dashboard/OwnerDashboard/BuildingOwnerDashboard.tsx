import OwnerSidebar from '../../../components/layout/Sidebar/OwnerSidebar/OwnerSidebar';
import HeaderDashboard from '../../../components/layout/Header/HeaderDashboard/HeaderDashboard';
import './BuildingOwnerDashboard.css';

export default function BuildingOwnerDashboard() {
    return (
        <div className="owner-dashboard-wrapper">
            <OwnerSidebar />

            <div className="owner-dashboard-body">
                <HeaderDashboard />
                <main className="owner-dashboard-main">
                    <div className="owner-dashboard-content">
                        {/* Page Title */}
                        <div className="dashboard-header">
                            <div className="dashboard-header-left">
                                <h1 className="dashboard-title">Owner Dashboard</h1>
                                <p className="dashboard-subtitle">Trang quản lý dành cho chủ sở hữu tòa nhà</p>
                            </div>
                        </div>

                        {/* Placeholder Content */}
                        <div className="placeholder-content">
                            <p>Nội dung sẽ được phát triển sau...</p>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

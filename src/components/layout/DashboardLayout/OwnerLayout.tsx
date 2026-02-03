import { Outlet } from "react-router-dom";
import OwnerSidebar from "../Sidebar/OwnerSidebar/OwnerSidebar";
import HeaderDashboard from "../Header/HeaderDashboard/HeaderDashboard";
import "./DashboardLayout.css";

export default function OwnerLayout() {
    return (
        <div className="dashboard-layout-wrapper">
            <OwnerSidebar />
            <div className="dashboard-layout-body">
                <HeaderDashboard />
                <main className="dashboard-layout-main">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

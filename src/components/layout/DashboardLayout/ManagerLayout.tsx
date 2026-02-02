import { Outlet } from "react-router-dom";
import ManagerSidebar from "../Sidebar/ManagerSidebar/ManagerSidebar";
import HeaderDashboard from "../Header/HeaderDashboard/HeaderDashboard";
import "./DashboardLayout.css";

export default function ManagerLayout() {
    return (
        <div className="dashboard-layout-wrapper">
            <ManagerSidebar />
            <div className="dashboard-layout-body">
                <HeaderDashboard />
                <main className="dashboard-layout-main">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

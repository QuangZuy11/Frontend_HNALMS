import { Outlet } from "react-router-dom";
import AdminSidebar from "../Sidebar/AdminSidebar/AdminSidebar";
import HeaderDashboard from "../Header/HeaderDashboard/HeaderDashboard";
import "./DashboardLayout.css";

export default function AdminLayout() {
    return (
        <div className="dashboard-layout-wrapper">
            <AdminSidebar />
            <div className="dashboard-layout-body">
                <HeaderDashboard />
                <main className="dashboard-layout-main">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

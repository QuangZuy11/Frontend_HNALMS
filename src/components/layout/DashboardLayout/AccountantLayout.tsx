import { Outlet } from "react-router-dom";
import AccountantSidebar from "../Sidebar/AccountantSidebar/AccountantSidebar";
import HeaderDashboard from "../Header/HeaderDashboard/HeaderDashboard";
import "./DashboardLayout.css";

export default function AccountantLayout() {
    return (
        <div className="dashboard-layout-wrapper">
            <AccountantSidebar />
            <div className="dashboard-layout-body">
                <HeaderDashboard />
                <main className="dashboard-layout-main">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

import ManagerSidebar from "../../components/layout/Sidebar/ManagerSidebar/ManagerSidebar";
import ViewProfile from "../Auth/Profile/ViewProfile";
import "./ManagerDashboard/ManagerDashboard.css";

export default function ManagerProfile() {
  return (
    <div className="manager-dashboard-wrapper">
      <ManagerSidebar />

      <main className="manager-dashboard-main">
        <div className="manager-dashboard-content">
          <ViewProfile />
        </div>
      </main>
    </div>
  );
}

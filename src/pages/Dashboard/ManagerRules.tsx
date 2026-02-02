import ManagerSidebar from "../../components/layout/Sidebar/ManagerSidebar/ManagerSidebar";
import BuildingRulesPublic from "../BuildingInformation/BuildingRulesPublic";
import "./ManagerDashboard/ManagerDashboard.css";

export default function ManagerRules() {
  return (
    <div className="manager-dashboard-wrapper">
      <ManagerSidebar />

      <main className="manager-dashboard-main">
        <div className="manager-dashboard-content">
          <BuildingRulesPublic />
        </div>
      </main>
    </div>
  );
}

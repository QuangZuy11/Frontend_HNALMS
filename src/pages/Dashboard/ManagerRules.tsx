import ManagerSidebar from "./ManagerSidebar";
import BuildingRulesPublic from "../BuildingInformation/BuildingRulesPublic";
import "./ManagerDashboard.css";

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

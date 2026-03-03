import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import "./App.css";

// Context
import { AuthProvider } from "./context/AuthContext";
import { PrivateRoute } from "./routes/PrivateRoute";
import { PublicRoute } from "./routes/PublicRoute";

// Layout Components
import Hero from "./components/layout/Hero/Hero";
import About from "./components/layout/About/About";
import Contact from "./components/layout/Contact/Contact";
import Footer from "./components/layout/Footer/Footer";
import FloatingContact from "./components/layout/Floating-contact/Floating-contact";

// Dashboard Layouts
import {
  OwnerLayout,
  ManagerLayout,
  AdminLayout,
  AccountantLayout,
} from "./components/layout/DashboardLayout";

// Pages - Guest (Public - No Login Required)
import RoomList from "./pages/RoomManagement/RoomList";
import RoomDetail from "./pages/RoomManagement/DetailRoom/RoomDetail";
import BookingPage from "./pages/RoomManagement/Booking/BookingPage";
import BuildingRulesPublic from "./pages/BuildingInformation/BuildingRulesPublic";

// Pages - Auth
import Login from "./pages/Auth/Login/Login";
import ForgotPassword from "./pages/Auth/ForgotPassword/ForgotPassword";
import ChangePassword from "./pages/Auth/ChangePassword";
import Unauthorized from "./pages/Unauthorized";

// Pages - Admin Dashboard
import AdminDashboard from "./pages/Dashboard/AdminDashboard";

// Pages - Owner Dashboard
import BuildingOwnerDashboard from "./pages/Dashboard/OwnerDashboard/BuildingOwnerDashboard";
import BuildingConfig from "./pages/RoomManagement/BuildingConfig/BuildingConfig";
import ManageRoom from "./pages/RoomManagement/ManageRoom/ManageRoom";
import ManageDevice from "./pages/ServiceManagement/ManageService";

// Pages - Manager Dashboard
import ManagerDashboard from "./pages/Dashboard/ManagerDashboard/ManagerDashboard";
import ManagerRules from "./pages/Dashboard/ManagerRules";
import ManagerProfile from "./pages/Dashboard/ManagerProfile";
import ManageService from "./pages/ServiceManagement/ManageService";
import RepairRequestsList from "./pages/RequestManagement/RepairRequestsList";
import MaintenanceRequestsList from "./pages/RequestManagement/MaintenanceRequestsList";
import ManagerInvoice from "./pages/InvoiceManagement/InvoiceManage";
import ComplaintRequestList from "./pages/RequestManagement/ComplaintRequestlist";

// Pages - Accountant Dashboard
import AccountantDashboard from "./pages/Dashboard/AccountantDashboard";
import ManagingIncomeExpenses from "./pages/Accountant/managing_income_expenses/managingIncomeExpenses";

// Pages - Profile (All authenticated roles)
import ViewProfile from "./pages/Auth/Profile/ViewProfile";
import UpdateProfile from "./pages/Auth/Profile/UpdateProfile";

// Pages - Account Management (Owner / Manager / Tenant)
import OwnerAccountList from "./pages/AccountManagement/Owner/OwnerAccountList";
import CreateOwnerAccount from "./pages/AccountManagement/Owner/CreateOwnerAccount";
import OwnerAccountDetail from "./pages/AccountManagement/Owner/OwnerAccountDetail";
import DisableAccount from "./pages/AccountManagement/Owner/DisableAccount";
import ManagerAccountList from "./pages/AccountManagement/Manager/ManagerAccountList";
import CreateManagerAccount from "./pages/AccountManagement/Manager/CreateManagerAccount";
import ManagerAccountDetail from "./pages/AccountManagement/Manager/ManagerAccountDetail";
import TenantAccountList from "./pages/AccountManagement/Tenant/TenantAccountList";
import TenantAccountDetail from "./pages/AccountManagement/Tenant/TenantAccountDetail";
import Header from "./components/layout/Header/Header";

// Pages - Contract Management
import CreateContract from "./pages/ContractManagement/CreateContract";
import ContractList from "./pages/ContractManagement/ContractList";
import ContractDetail from "./pages/ContractManagement/ContractDetail";
import DepositRoom from "./pages/ContractManagement/DepositRoom";
import DepositFloorMap from "./pages/ContractManagement/DepositFloorMap";
import CreateDeposit from "./pages/ContractManagement/CreateDeposit";

// ================= Layout Wrapper =================
function LayoutWrapper() {
  const location = useLocation();

  // Guest routes (public - hiện Footer + FloatingContact)
  const guestRoutes = ["/", "/homepage", "/rooms", "/rules"];
  const isGuestRoute =
    guestRoutes.includes(location.pathname) ||
    location.pathname.startsWith("/rooms/");

  return (
    <>
      <Routes>
        {/* ==================== GUEST ROUTES (No Login Required) ==================== */}
        {/* Redirect root */}
        <Route path="/" element={<Navigate to="/homepage" replace />} />

        {/* Homepage - Redirect authenticated users to their dashboard */}
        <Route
          path="/homepage"
          element={
            <PublicRoute redirectAuthenticated={true}>
              <Header />
              <Hero />
              <About />
              <Contact />
            </PublicRoute>
          }
        />

        {/* Room List & Detail */}
        <Route
          path="/rooms"
          element={
            <>
              <Header />
              <RoomList />
            </>
          }
        />
        <Route
          path="/rooms/:id"
          element={
            <>
              <Header />
              <RoomDetail />
            </>
          }
        />
        <Route
          path="/rooms/:id/booking"
          element={
            <>
              <Header />
              <BookingPage />
            </>
          }
        />

        {/* Building Rules Public */}
        <Route
          path="/rules"
          element={
            <>
              <Header />
              <BuildingRulesPublic />
            </>
          }
        />

        {/* ==================== AUTH ROUTES ==================== */}
        {/* Login - Redirect authenticated users to their dashboard */}
        <Route
          path="/login"
          element={
            <PublicRoute redirectAuthenticated={true}>
              <Login />
            </PublicRoute>
          }
        />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Change Password - All authenticated roles */}
        <Route
          path="/change-password"
          element={
            <PrivateRoute
              allowedRoles={[
                "admin",
                "manager",
                "owner",
                "tenant",
                "accountant",
              ]}
            >
              <ChangePassword />
            </PrivateRoute>
          }
        />

        {/* ==================== ADMIN ROUTES ==================== */}
        <Route
          path="/admin"
          element={
            <PrivateRoute allowedRoles={["admin"]}>
              <AdminLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="accounts" element={<OwnerAccountList />} />
          <Route path="accounts/create" element={<CreateOwnerAccount />} />
          <Route path="accounts/:id" element={<OwnerAccountDetail />} />
          <Route path="accounts/:id/disable" element={<DisableAccount />} />
          <Route path="profile" element={<ViewProfile />} />
          <Route path="profile/update" element={<UpdateProfile />} />
        </Route>

        {/* ==================== OWNER ROUTES ==================== */}
        <Route
          path="/owner"
          element={
            <PrivateRoute allowedRoles={["owner"]}>
              <OwnerLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<BuildingOwnerDashboard />} />
          <Route path="building-config" element={<BuildingConfig />} />
          <Route path="rooms" element={<ManageRoom />} />
          <Route path="accounts" element={<ManagerAccountList />} />
          <Route path="accounts/create" element={<CreateManagerAccount />} />
          <Route path="accounts/:id" element={<ManagerAccountDetail />} />
          <Route path="profile" element={<ViewProfile />} />
          <Route path="profile/update" element={<UpdateProfile />} />
          <Route path="rules" element={<ManagerRules />} />
          <Route path="devices" element={<ManageDevice />} />
          <Route path="contracts" element={<ContractList />} />
          <Route path="contracts/create" element={<CreateContract />} />
          <Route path="contracts/:id" element={<ContractDetail />} />
          {/* Danh sách cư dân (Tenants) cho Owner */}
          <Route path="contracts/tenants" element={<TenantAccountList />} />
          <Route path="deposits" element={<DepositRoom />} />
          <Route path="deposits/floor-map" element={<DepositFloorMap />} />
          <Route path="deposits/create/:id" element={<CreateDeposit />} />
        </Route>

        {/* ==================== MANAGER ROUTES ==================== */}
        <Route
          path="/manager"
          element={
            <PrivateRoute allowedRoles={["manager"]}>
              <ManagerLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<ManagerDashboard />} />
          <Route path="rooms" element={<ManageRoom readOnly={true} />} />
          <Route path="residents" element={<TenantAccountList />} />
          <Route path="residents/:id" element={<TenantAccountDetail />} />
          <Route path="services" element={<ManageService />} />
          <Route path="requests/repairs" element={<RepairRequestsList />} />
          <Route path="requests/maintenance" element={<MaintenanceRequestsList />} />
          <Route path="requests/complaints" element={<ComplaintRequestList />} />
          <Route path="profile" element={<ManagerProfile />} />
          <Route path="contracts" element={<ContractList />} />
          <Route path="contracts/create" element={<CreateContract />} />
          <Route path="contracts/:id" element={<ContractDetail />} />
          <Route path="deposits" element={<DepositRoom />} />
          <Route path="deposits/floor-map" element={<DepositFloorMap />} />
          <Route path="deposits/create/:id" element={<CreateDeposit />} />
          <Route path="invoices" element={<ManagerInvoice />} />
          {/* <Route path="profile/update" element={<UpdateProfile />} /> */}
        </Route>

        {/* ==================== ACCOUNTANT ROUTES ==================== */}
        <Route
          path="/accountant"
          element={
            <PrivateRoute allowedRoles={["accountant"]}>
              <AccountantLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<AccountantDashboard />} />
          <Route path="profile" element={<ViewProfile />} />
          {/* <Route path="profile/update" element={<UpdateProfile />} /> */}
          {/* Phiếu thu / chi */}
          <Route
            path="transactions/payments"
            element={<ManagingIncomeExpenses />}
          />
        </Route>

        {/* ==================== SHARED PROFILE ROUTES (Legacy support) ==================== */}
        <Route
          path="/profile"
          element={
            <PrivateRoute
              allowedRoles={[
                "admin",
                "manager",
                "owner",
                "tenant",
                "accountant",
              ]}
            >
              <ViewProfile />
            </PrivateRoute>
          }
        />

        <Route
          path="/profile/update"
          element={
            <PrivateRoute
              allowedRoles={[
                "admin",
                "manager",
                "owner",
                "tenant",
                "accountant",
              ]}
            >
              <UpdateProfile />
            </PrivateRoute>
          }
        />

        {/* ==================== 404 NOT FOUND ==================== */}
        <Route
          path="*"
          element={
            <div style={{ padding: 40, textAlign: "center" }}>
              <h1>404 - Page Not Found</h1>
            </div>
          }
        />
      </Routes>

      {/* Footer & FloatingContact chỉ hiện cho Guest routes */}
      {isGuestRoute && (
        <>
          <Footer />
          <FloatingContact />
        </>
      )}
    </>
  );
}

// ================= App =================
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <LayoutWrapper />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

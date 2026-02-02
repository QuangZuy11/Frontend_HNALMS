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

// Layout Components
import Hero from "./components/layout/Hero/Hero";
import About from "./components/layout/About/About";
import Contact from "./components/layout/Contact/Contact";
import Footer from "./components/layout/Footer/Footer";
import FloatingContact from "./components/layout/Floating-contact/Floating-contact";

// Pages - Guest (Public - No Login Required)
import RoomList from "./pages/RoomManagement/RoomList";
import RoomDetail from "./pages/RoomManagement/DetailRoom/RoomDetail";
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

// Pages - Manager Dashboard
import ManagerDashboard from "./pages/Dashboard/ManagerDashboard/ManagerDashboard";
import ManagerRules from "./pages/Dashboard/ManagerRules";
import ManagerProfile from "./pages/Dashboard/ManagerProfile";
import ManageService from "./pages/ServiceManagement/ManageService";

// Pages - Accountant Dashboard
import AccountantDashboard from "./pages/Dashboard/AccountantDashboard";

// Pages - Profile (All authenticated roles)
import ViewProfile from "./pages/Auth/Profile/ViewProfile";
import UpdateProfile from "./pages/Auth/Profile/UpdateProfile";

// Pages - Account Management
import CreateAccount from "./pages/Auth/CreateAccount/CreateAccount";
import CreatedAccountsList from "./pages/Auth/CreatedAccountsList/CreatedAccountsList";
import Header from "./components/layout/Header/Header";

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

        {/* Homepage */}
        <Route
          path="/homepage"
          element={
            <>
              <Header />
              <Hero />
              <About />
              <Contact />
            </>
          }
        />

        {/* Room List & Detail */}
        <Route path="/rooms" element={<><Header /><RoomList /></>} />
        <Route path="/rooms/:id" element={<><Header /><RoomDetail /></>} />

        {/* Building Rules Public */}
        <Route path="/rules" element={<><Header /><BuildingRulesPublic /></>} />

        {/* ==================== AUTH ROUTES ==================== */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Change Password - All authenticated roles */}
        <Route
          path="/change-password"
          element={
            <PrivateRoute
              allowedRoles={["admin", "manager", "owner", "tenant", "accountant"]}
            >
              <ChangePassword />
            </PrivateRoute>
          }
        />

        {/* ==================== ADMIN ROUTES ==================== */}
        <Route
          path="/admin/*"
          element={
            <PrivateRoute allowedRoles={["admin"]}>
              <Routes>
                <Route index element={<AdminDashboard />} />
                <Route path="create-account" element={<CreateAccount />} />
                <Route path="accounts" element={<CreatedAccountsList />} />
                <Route path="profile" element={<ViewProfile />} />
                <Route path="profile/update" element={<UpdateProfile />} />
              </Routes>
            </PrivateRoute>
          }
        />

        {/* ==================== OWNER ROUTES ==================== */}
        <Route
          path="/owner/*"
          element={
            <PrivateRoute allowedRoles={["owner"]}>
              <Routes>
                <Route index element={<BuildingOwnerDashboard />} />
                <Route path="building-config" element={<BuildingConfig />} />
                <Route path="rooms" element={<ManageRoom />} />
                <Route path="create-account" element={<CreateAccount />} />
                <Route path="accounts" element={<CreatedAccountsList />} />
                <Route path="profile" element={<ViewProfile />} />
                <Route path="profile/update" element={<UpdateProfile />} />
              </Routes>
            </PrivateRoute>
          }
        />

        {/* ==================== MANAGER ROUTES ==================== */}
        <Route
          path="/manager/*"
          element={
            <PrivateRoute allowedRoles={["manager"]}>
              <Routes>
                <Route index element={<ManagerDashboard />} />
                <Route path="services" element={<ManageService />} />
                <Route path="rules" element={<ManagerRules />} />
                <Route path="create-account" element={<CreateAccount />} />
                <Route path="accounts" element={<CreatedAccountsList />} />
                <Route path="profile" element={<ManagerProfile />} />
                <Route path="profile/update" element={<UpdateProfile />} />
              </Routes>
            </PrivateRoute>
          }
        />

        {/* ==================== ACCOUNTANT ROUTES ==================== */}
        <Route
          path="/accountant/*"
          element={
            <PrivateRoute allowedRoles={["accountant"]}>
              <Routes>
                <Route index element={<AccountantDashboard />} />
                <Route path="profile" element={<ViewProfile />} />
                <Route path="profile/update" element={<UpdateProfile />} />
              </Routes>
            </PrivateRoute>
          }
        />

        {/* ==================== SHARED PROFILE ROUTES (Legacy support) ==================== */}
        <Route
          path="/profile"
          element={
            <PrivateRoute
              allowedRoles={["admin", "manager", "owner", "tenant", "accountant"]}
            >
              <ViewProfile />
            </PrivateRoute>
          }
        />

        <Route
          path="/profile/update"
          element={
            <PrivateRoute
              allowedRoles={["admin", "manager", "owner", "tenant", "accountant"]}
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

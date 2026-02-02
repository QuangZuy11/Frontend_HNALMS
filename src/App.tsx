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
import Header from "./components/layout/Header/Header";
import Hero from "./components/layout/Hero/Hero";
import About from "./components/layout/About/About";
import Contact from "./components/layout/Contact/Contact";
import Footer from "./components/layout/Footer/Footer";
import FloatingContact from "./components/layout/Floating-contact/Floating-contact";

// Pages - Public
import RoomList from "./pages/RoomManagement/RoomList";
import RoomDetail from "./pages/RoomManagement/DetailRoom/RoomDetail";
import BuildingRulesPublic from "./pages/BuildingInformation/BuildingRulesPublic";

// Pages - Auth
import Login from "./pages/Auth/Login/Login";
import ForgotPassword from "./pages/Auth/ForgotPassword/ForgotPassword";
import ChangePassword from "./pages/Auth/ChangePassword";
import Unauthorized from "./pages/Unauthorized";

// Pages - Dashboard
import AdminDashboard from "./pages/Dashboard/AdminDashboard";
import BuildingOwnerDashboard from "./pages/Dashboard/OwnerDashboard/BuildingOwnerDashboard";
import AccountantDashboard from "./pages/Dashboard/AccountantDashboard";
import ManagerDashboard from "./pages/Dashboard/ManagerDashboard/ManagerDashboard";
import ManagerRules from "./pages/Dashboard/ManagerRules";
import ManagerProfile from "./pages/Dashboard/ManagerProfile";

// Profile
import ViewProfile from "./pages/Auth/Profile/ViewProfile";
import UpdateProfile from "./pages/Auth/Profile/UpdateProfile";
import CreateAccount from "./pages/Auth/CreateAccount/CreateAccount";
import CreatedAccountsList from "./pages/Auth/CreatedAccountsList/CreatedAccountsList";

// Pages - Manage
import BuildingConfig from "./pages/RoomManagement/BuildingConfig/BuildingConfig";
import ManageRoom from "./pages/RoomManagement/ManageRoom/ManageRoom";
import ManageService from "./pages/ServiceManagement/ManageService";

// ================= Layout Wrapper =================
function LayoutWrapper() {
  const location = useLocation();

  // Routes được coi là public (hiện Footer + FloatingContact)
  const publicRoutes = ["/", "/homepage", "/rooms", "/rules"];

  const isPublicRoute =
    publicRoutes.includes(location.pathname) ||
    location.pathname.startsWith("/rooms/");

  // Ẩn Header ở chức năng tạo tài khoản và các trang dashboard (có sidebar)
  const hideHeaderPaths = [
    "/create-account",
    "/created-accounts",
    "/admin",
    "/building",
    "/building-owner",
    "/tenant",
    "/accountant",
    "/managerdashboard",
    "/manager",
    "/manageroom",
    "/manageservice",
    "/buildingconfig",
  ];
  const showHeader = !hideHeaderPaths.some(
    (path) =>
      location.pathname === path || location.pathname.startsWith(path + "/")
  );

  return (
    <>
      {showHeader && <Header />}

      <Routes>
        {/* Redirect root */}
        <Route path="/" element={<Navigate to="/homepage" replace />} />

        {/* Homepage */}
        <Route
          path="/homepage"
          element={
            <>
              <Hero />
              <About />
              <Contact />
            </>
          }
        />

        {/* Public Pages */}
        <Route path="/rooms" element={<RoomList />} />
        <Route path="/rooms/:id" element={<RoomDetail />} />
        <Route path="/rules" element={<BuildingRulesPublic />} />
        <Route path="/buildingconfig" element={<BuildingConfig />} />
        <Route path="/manageroom" element={<ManageRoom />} />
        <Route path="/manageservice" element={<ManageService />} />

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
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
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Dashboards */}
        <Route
          path="/admin"
          element={
            <PrivateRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </PrivateRoute>
          }
        />


        <Route
          path="/building-owner"
          element={
            <PrivateRoute allowedRoles={["owner"]}>
              <BuildingOwnerDashboard />
              <BuildingConfig />
              <ManageRoom />
            </PrivateRoute>
          }
        />



        <Route
          path="/accountant"
          element={
            <PrivateRoute allowedRoles={["accountant"]}>
              <AccountantDashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/managerdashboard"
          element={
            <PrivateRoute allowedRoles={["manager", "admin"]}>
              <ManagerDashboard />
              <ManageService />
            </PrivateRoute>
          }
        />

        <Route
          path="/manager/rules"
          element={
            <PrivateRoute allowedRoles={["manager", "admin"]}>
              <ManagerRules />
            </PrivateRoute>
          }
        />

        <Route
          path="/manager/profile"
          element={
            <PrivateRoute allowedRoles={["manager", "admin"]}>
              <ManagerProfile />
            </PrivateRoute>
          }
        />

        {/* Profile */}
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

        {/* Create Account - Admin/Owner/Manager tạo tài khoản theo role */}
        <Route
          path="/create-account"
          element={
            <PrivateRoute allowedRoles={["admin", "owner", "manager"]}>
              <CreateAccount />
            </PrivateRoute>
          }
        />

        {/* Danh sách tài khoản đã tạo - Admin/Owner/Manager */}
        <Route
          path="/created-accounts"
          element={
            <PrivateRoute allowedRoles={["admin", "owner", "manager"]}>
              <CreatedAccountsList />
            </PrivateRoute>
          }
        />

        {/* 404 */}
        <Route
          path="*"
          element={
            <div style={{ padding: 40, textAlign: "center" }}>
              <h1>404 - Page Not Found</h1>
            </div>
          }
        />
      </Routes>

      {isPublicRoute && (
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

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
import BuildingManagerDashboard from "./pages/Dashboard/BuildingManagerDashboard";
import BuildingOwnerDashboard from "./pages/Dashboard/BuildingOwnerDashboard";
import TenantDashboard from "./pages/Dashboard/TenantDashboard";
import AccountantDashboard from "./pages/Dashboard/AccountantDashboard";

// Profile
import ViewProfile from "./pages/Auth/Profile/ViewProfile";
import UpdateProfile from "./pages/Auth/Profile/UpdateProfile";

// ================= Layout Wrapper =================
function LayoutWrapper() {
  const location = useLocation();

  // Routes được coi là public (hiện Footer + FloatingContact)
  const publicRoutes = ["/", "/homepage", "/rooms", "/rules"];

  const isPublicRoute =
    publicRoutes.includes(location.pathname) ||
    location.pathname.startsWith("/rooms/");

  return (
    <>
      <Header />

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
          path="/building"
          element={
            <PrivateRoute allowedRoles={["manager"]}>
              <BuildingManagerDashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/building-owner"
          element={
            <PrivateRoute allowedRoles={["owner"]}>
              <BuildingOwnerDashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/tenant"
          element={
            <PrivateRoute allowedRoles={["tenant"]}>
              <TenantDashboard />
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

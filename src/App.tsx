import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import './App.css'

// Context
import { AuthProvider } from './context/AuthContext'
import { PrivateRoute } from './routes/PrivateRoute'

// Layout Components
// @ts-expect-error - JSX files
import Header from './components/layout/Header/Header'
// @ts-expect-error - JSX files
import Hero from './components/layout/Hero/Hero'
// @ts-expect-error - JSX files
import About from './components/layout/About/About'
// @ts-expect-error - JSX files
import Contact from './components/layout/Contact/Contact'
// @ts-expect-error - JSX files
import Footer from './components/layout/Footer/Footer'
// @ts-expect-error - JSX files
import FloatingContact from './components/layout/Floating-contact/Floating-contact'

// Pages
import TestAPI from './pages/TestAPI'
import Login from './pages/Auth/Login/Login'
import ForgotPassword from './pages/Auth/ForgotPassword/ForgotPassword'
import Unauthorized from './pages/Unauthorized'
// @ts-expect-error - JSX files
import RoomList from './pages/RoomManagement/RoomList'

// Dashboard Pages
import AdminDashboard from './pages/Dashboard/AdminDashboard'
import BuildingManagerDashboard from './pages/Dashboard/BuildingManagerDashboard'
import BuildingOwnerDashboard from './pages/Dashboard/BuildingOwnerDashboard'
import TenantDashboard from './pages/Dashboard/TenantDashboard'
import AccountantDashboard from './pages/Dashboard/AccountantDashboard'
// import ForgotPassword from './pages/Auth/ForgotPassword'
// import ChangePassword from './pages/Auth/ChangePassword'

import ViewProfile from './pages/Auth/Profile/ViewProfile'
import UpdateProfile from './pages/Auth/Profile/UpdateProfile'

// import OwnerAccountList from './pages/AccountManagement/Owner/OwnerAccountList'
// import OwnerAccountDetail from './pages/AccountManagement/Owner/OwnerAccountDetail'
// import CreateOwnerAccount from './pages/AccountManagement/Owner/CreateOwnerAccount'

// import ManagerAccountList from './pages/AccountManagement/Manager/ManagerAccountList'
// import ManagerAccountDetail from './pages/AccountManagement/Manager/ManagerAccountDetail'
// import CreateManagerAccount from './pages/AccountManagement/Manager/CreateManagerAccount'

// import TenantAccountList from './pages/AccountManagement/Tenant/TenantAccountList'
// import TenantAccountDetail from './pages/AccountManagement/Tenant/TenantAccountDetail'

// import ContractList from './pages/ContractManagement/ContractList'
// import ContractDetail from './pages/ContractManagement/ContractDetail'
// import CreateContract from './pages/ContractManagement/CreateContract'
// import UpdateContract from './pages/ContractManagement/UpdateContract'
// import TerminateContract from './pages/ContractManagement/TerminateContract'
// import RenewContract from './pages/ContractManagement/RenewContract'
// import ConfirmRenewal from './pages/ContractManagement/ConfirmRenewal'
// import DepositRoom from './pages/ContractManagement/DepositRoom'

// import RoomList from './pages/RoomManagement/RoomList'
// import RoomDetail from './pages/RoomManagement/RoomDetail'
// import CreateRoom from './pages/RoomManagement/CreateRoom'
// import UpdateRoom from './pages/RoomManagement/UpdateRoom'
// import MyRoom from './pages/RoomManagement/MyRoom'

// import ServiceList from './pages/ServiceManagement/ServiceList'
// import ServiceDetail from './pages/ServiceManagement/ServiceDetail'
// import CreateService from './pages/ServiceManagement/CreateService'
// import UpdateService from './pages/ServiceManagement/UpdateService'

// import InvoiceList from './pages/InvoiceManagement/InvoiceList'
// import InvoiceDetail from './pages/InvoiceManagement/InvoiceDetail'
// import CreateInvoice from './pages/InvoiceManagement/CreateInvoice'
// import PayInvoice from './pages/InvoiceManagement/PayInvoice'

// import Dashboard from './pages/CashFlowManagement/Dashboard'
// import CashFlowReport from './pages/CashFlowManagement/CashFlowReport'
// import DetailedRevenueReport from './pages/CashFlowManagement/DetailedRevenueReport'

// import RequestList from './pages/RequestManagement/RequestList'
// import RequestDetail from './pages/RequestManagement/RequestDetail'
// import CreateRepairRequest from './pages/RequestManagement/CreateRepairRequest'
// import CreateComplaintRequest from './pages/RequestManagement/CreateComplaintRequest'

// import NotificationList from './pages/NotificationManagement/NotificationList'
// import NotificationDetail from './pages/NotificationManagement/NotificationDetail'
// import CreateManagerNotification from './pages/NotificationManagement/CreateManagerNotification'
// import CreateTenantNotification from './pages/NotificationManagement/CreateTenantNotification'

// import BuildingRules from './pages/BuildingInformation/BuildingRules'
// import CreateBuildingRules from './pages/BuildingInformation/CreateBuildingRules'
// import UpdateBuildingRules from './pages/BuildingInformation/UpdateBuildingRules'
// import ManagerContact from './pages/BuildingInformation/ManagerContact'
// import InformationBuilding from './pages/BuildingInformation/InformationBuilding'

// import ReportPerformance from './pages/ReportManagement/ReportPerformance'
// import ReportRevenue from './pages/ReportManagement/ReportRevenue'
// import ReportRepairMaintenance from './pages/ReportManagement/ReportRepairMaintenance'

// Component để kiểm tra route và hiển thị Footer/FloatingContact
function LayoutWrapper() {
  const location = useLocation()
  
  // Các routes công khai cần hiển thị Footer và FloatingContact
  const publicRoutes = ['/homepage', '/rooms', '/']
  const isPublicRoute = publicRoutes.includes(location.pathname)
  
  return (
    <>
      <Header />
      <Routes>
        {/* Default route - redirect to homepage */}
        <Route path="/" element={<Navigate to="/homepage" replace />} />

        {/* Homepage Route */}
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

        {/* Room Management Route */}
        <Route path="/rooms" element={<RoomList />} />

        {/* Test API Route */}
        <Route path="/test-api" element={<TestAPI />} />

        {/* Authentication Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Protected Dashboard Routes */}
          <Route
            path="/admin"
            element={
              <PrivateRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/building"
            element={
              <PrivateRoute allowedRoles={['manager']}>
                <BuildingManagerDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/building-owner"
            element={
              <PrivateRoute allowedRoles={['owner']}>
                <BuildingOwnerDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/tenant"
            element={
              <PrivateRoute allowedRoles={['tenant']}>
                <TenantDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/accountant"
            element={
              <PrivateRoute allowedRoles={['accountant']}>
                <AccountantDashboard />
              </PrivateRoute>
            }
          />
          {/* <Route path="/forgot-password" element={<ForgotPassword />} /> */}
          {/* <Route path="/change-password" element={<ChangePassword />} /> */}

          {/* Profile Routes */}
          <Route
            path="/profile"
            element={
              <PrivateRoute allowedRoles={['admin', 'manager', 'owner', 'tenant', 'accountant']}>
                <ViewProfile />
              </PrivateRoute>
            }
          />
          <Route
            path="/profile/update"
            element={
              <PrivateRoute allowedRoles={['admin', 'manager', 'owner', 'tenant', 'accountant']}>
                <UpdateProfile />
              </PrivateRoute>
            }
          />

          {/* Owner Account Routes */}
          {/* <Route path="/accounts/owners" element={<OwnerAccountList />} /> */}
          {/* <Route path="/accounts/owners/:id" element={<OwnerAccountDetail />} /> */}
          {/* <Route path="/accounts/owners/create" element={<CreateOwnerAccount />} /> */}

          {/* Manager Account Routes */}
          {/* <Route path="/accounts/managers" element={<ManagerAccountList />} /> */}
          {/* <Route path="/accounts/managers/:id" element={<ManagerAccountDetail />} /> */}
          {/* <Route path="/accounts/managers/create" element={<CreateManagerAccount />} /> */}

          {/* Tenant Account Routes */}
          {/* <Route path="/accounts/tenants" element={<TenantAccountList />} /> */}
          {/* <Route path="/accounts/tenants/:id" element={<TenantAccountDetail />} /> */}

          {/* Contract Routes */}
          {/* <Route path="/contracts" element={<ContractList />} /> */}
          {/* <Route path="/contracts/:id" element={<ContractDetail />} /> */}
          {/* <Route path="/contracts/create" element={<CreateContract />} /> */}
          {/* <Route path="/contracts/:id/update" element={<UpdateContract />} /> */}
          {/* <Route path="/contracts/:id/terminate" element={<TerminateContract />} /> */}
          {/* <Route path="/contracts/:id/renew" element={<RenewContract />} /> */}
          {/* <Route path="/contracts/:id/confirm-renewal" element={<ConfirmRenewal />} /> */}
          {/* <Route path="/contracts/deposit" element={<DepositRoom />} /> */}

          {/* Room Routes */}
          {/* <Route path="/rooms" element={<RoomList />} /> */}
          {/* <Route path="/rooms/:id" element={<RoomDetail />} /> */}
          {/* <Route path="/rooms/create" element={<CreateRoom />} /> */}
          {/* <Route path="/rooms/:id/update" element={<UpdateRoom />} /> */}
          {/* <Route path="/my-room" element={<MyRoom />} /> */}

          {/* Service Routes */}
          {/* <Route path="/services" element={<ServiceList />} /> */}
          {/* <Route path="/services/:id" element={<ServiceDetail />} /> */}
          {/* <Route path="/services/create" element={<CreateService />} /> */}
          {/* <Route path="/services/:id/update" element={<UpdateService />} /> */}

          {/* Invoice Routes */}
          {/* <Route path="/invoices" element={<InvoiceList />} /> */}
          {/* <Route path="/invoices/:id" element={<InvoiceDetail />} /> */}
          {/* <Route path="/invoices/create" element={<CreateInvoice />} /> */}
          {/* <Route path="/invoices/:id/pay" element={<PayInvoice />} /> */}

          {/* Cash Flow Routes */}
          {/* <Route path="/dashboard" element={<Dashboard />} /> */}
          {/* <Route path="/cash-flow/report" element={<CashFlowReport />} /> */}
          {/* <Route path="/cash-flow/revenue" element={<DetailedRevenueReport />} /> */}

          {/* Request Routes */}
          {/* <Route path="/requests" element={<RequestList />} /> */}
          {/* <Route path="/requests/:id" element={<RequestDetail />} /> */}
          {/* <Route path="/requests/repair/create" element={<CreateRepairRequest />} /> */}
          {/* <Route path="/requests/complaint/create" element={<CreateComplaintRequest />} /> */}

          {/* Notification Routes */}
          {/* <Route path="/notifications" element={<NotificationList />} /> */}
          {/* <Route path="/notifications/:id" element={<NotificationDetail />} /> */}
          {/* <Route path="/notifications/manager/create" element={<CreateManagerNotification />} /> */}
          {/* <Route path="/notifications/tenant/create" element={<CreateTenantNotification />} /> */}

          {/* Building Information Routes */}
          {/* <Route path="/building/rules" element={<BuildingRules />} /> */}
          {/* <Route path="/building/rules/create" element={<CreateBuildingRules />} /> */}
          {/* <Route path="/building/rules/:id/update" element={<UpdateBuildingRules />} /> */}
          {/* <Route path="/building/contact" element={<ManagerContact />} /> */}
          {/* <Route path="/building/information" element={<InformationBuilding />} /> */}

          {/* Report Routes */}
          {/* <Route path="/reports/performance" element={<ReportPerformance />} /> */}
          {/* <Route path="/reports/revenue" element={<ReportRevenue />} /> */}
          {/* <Route path="/reports/maintenance" element={<ReportRepairMaintenance />} /> */}

          {/* 404 Not Found */}
          <Route path="*" element={<div style={{ padding: '20px', textAlign: 'center' }}><h1>404 - Page Not Found</h1></div>} />
        </Routes>
        {isPublicRoute && (
          <>
            <Footer />
            <FloatingContact />
          </>
        )}
      </>
    )
  }

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <LayoutWrapper />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App

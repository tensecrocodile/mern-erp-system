import { useState } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';

import ProtectedRoute from './components/common/ProtectedRoute';
import RoleGuard, {
  EMPLOYEE_ONLY,
  HR_AND_ABOVE,
  ADMIN_ONLY,
  MANAGEMENT,
  useRole,
} from './components/common/RoleGuard';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import EmployeeLayout from './layouts/EmployeeLayout';
import HRLayout from './layouts/HRLayout';
import AdminLayout from './layouts/AdminLayout';
import { getMenuForRole } from './config/menuConfig';

import Login          from './pages/Login';
import Dashboard      from './pages/Dashboard';
import GeoAttendance  from './pages/GeoAttendance';
import Claims         from './pages/Claims';
import Leaves         from './pages/Leaves';
import Holidays       from './pages/Holidays';
import Meetings       from './pages/Meetings';
import DailyReports   from './pages/DailyReports';
import Approvals      from './pages/Approvals';
import Notifications  from './pages/Notifications';
import Announcements  from './pages/Announcements';
import Payslips       from './pages/Payslips';
import Profile        from './pages/Profile';
import GeoFenceManager from './pages/GeoFenceManager';
import Attendance     from './pages/Attendance';
import Employees      from './pages/Employees';
import TripsLive      from './pages/TripsLive';
import './App.css';

// Manager gets a unique menu (field ops + My Work + Team)
const MANAGER_MENU = getMenuForRole('manager');

const ManagerLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className={`app-layout${collapsed ? ' app-layout--collapsed' : ''}`}>
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
        menuItems={MANAGER_MENU}
      />
      <div className="app-main">
        <Topbar onToggleSidebar={() => setCollapsed((v) => !v)} />
        <main className="page-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

// Picks the correct layout based on the stored role
const LayoutPicker = () => {
  const role = useRole();
  if (role === 'admin' || role === 'super_admin') return <AdminLayout />;
  if (role === 'hr')      return <HRLayout />;
  if (role === 'manager') return <ManagerLayout />;
  return <EmployeeLayout />;
};

const App = () => (
  <div className="app-shell">
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<LayoutPicker />}>

          {/* ── All roles ── */}
          <Route path="/dashboard"     element={<Dashboard />}     />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile"       element={<Profile />}       />
          <Route path="/holidays"      element={<Holidays />}      />
          <Route path="/announcements" element={<Announcements />} />
          <Route path="/attendance"    element={<Attendance />}    />

          {/* ── Claims & Leaves: page is dual-mode (submit vs. review) ── */}
          <Route path="/claims" element={<Claims />} />
          <Route path="/leaves" element={<Leaves />} />

          {/* ── Employee / Manager only ── */}
          <Route path="/geo" element={
            <RoleGuard allow={EMPLOYEE_ONLY}>
              <GeoAttendance />
            </RoleGuard>
          } />
          <Route path="/meetings" element={
            <RoleGuard allow={EMPLOYEE_ONLY}>
              <Meetings />
            </RoleGuard>
          } />
          <Route path="/daily-reports" element={
            <RoleGuard allow={EMPLOYEE_ONLY}>
              <DailyReports />
            </RoleGuard>
          } />
          <Route path="/payslips" element={
            <RoleGuard allow={EMPLOYEE_ONLY}>
              <Payslips />
            </RoleGuard>
          } />

          {/* ── Manager and above ── */}
          <Route path="/approvals" element={
            <RoleGuard allow={MANAGEMENT}>
              <Approvals />
            </RoleGuard>
          } />
          <Route path="/trips-live" element={
            <RoleGuard allow={MANAGEMENT}>
              <TripsLive />
            </RoleGuard>
          } />

          {/* ── HR and above ── */}
          <Route path="/employees" element={
            <RoleGuard allow={HR_AND_ABOVE}>
              <Employees />
            </RoleGuard>
          } />

          {/* ── Admin only ── */}
          <Route path="/geofences" element={
            <RoleGuard allow={ADMIN_ONLY}>
              <GeoFenceManager />
            </RoleGuard>
          } />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  </div>
);

export default App;

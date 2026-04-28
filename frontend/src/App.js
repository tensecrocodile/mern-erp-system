import { useState } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import ProtectedRoute from './components/common/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import GeoAttendance from './pages/GeoAttendance';
import Claims from './pages/Claims';
import Leaves from './pages/Leaves';
import Holidays from './pages/Holidays';
import Meetings from './pages/Meetings';
import DailyReports from './pages/DailyReports';
import Approvals from './pages/Approvals';
import Notifications from './pages/Notifications';
import Announcements from './pages/Announcements';
import Payslips from './pages/Payslips';
import Profile from './pages/Profile';
import GeoFenceManager from './pages/GeoFenceManager';
import Attendance from './pages/Attendance';
import Employees from './pages/Employees';
import TripsLive from './pages/TripsLive';
import './App.css';

const Layout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className={`app-layout${sidebarCollapsed ? ' app-layout--collapsed' : ''}`}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
      />
      <div className="app-main">
        <Topbar onToggleSidebar={() => setSidebarCollapsed((v) => !v)} />
        <main className="page-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const App = () => (
  <div className="app-shell">
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard"     element={<Dashboard />}     />
          <Route path="/geo"           element={<GeoAttendance />} />
          <Route path="/claims"        element={<Claims />}        />
          <Route path="/leaves"        element={<Leaves />}        />
          <Route path="/holidays"      element={<Holidays />}      />
          <Route path="/meetings"      element={<Meetings />}      />
          <Route path="/daily-reports" element={<DailyReports />}  />
          <Route path="/approvals"     element={<Approvals />}     />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/announcements" element={<Announcements />} />
          <Route path="/payslips"      element={<Payslips />}      />
          <Route path="/profile"       element={<Profile />}       />
          <Route path="/attendance"     element={<Attendance />}      />
          <Route path="/employees"     element={<Employees />}       />
          <Route path="/geofences"     element={<GeoFenceManager />} />
          <Route path="/trips-live"    element={<TripsLive />}       />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  </div>
);

export default App;

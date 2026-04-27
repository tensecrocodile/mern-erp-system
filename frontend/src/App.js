import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
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
import './App.css';

const Layout = () => (
  <div className="app-layout">
    <Navbar />
    <div className="content-area">
      <main className="page-main">
        <Outlet />
      </main>
    </div>
  </div>
);

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
          <Route path="/meetings"       element={<Meetings />}       />
          <Route path="/daily-reports" element={<DailyReports />}  />
          <Route path="/approvals"     element={<Approvals />}     />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/announcements" element={<Announcements />} />
          <Route path="/payslips"      element={<Payslips />}      />
          <Route path="/profile"       element={<Profile />}       />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  </div>
);

export default App;

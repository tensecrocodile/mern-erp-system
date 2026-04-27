import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { getMyNotifications } from '../services/notificationsApi';

const Navbar = () => {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef(null);
  const role = localStorage.getItem('role');
  const isPrivileged = role === 'admin' || role === 'manager' || role === 'hr';

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await getMyNotifications();
        const notifications = res.data?.notifications ?? [];
        setUnreadCount(notifications.filter((n) => !n.isRead).length);
      } catch {
        // silent
      }
    };

    fetchUnread();
    intervalRef.current = setInterval(fetchUnread, 30_000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login', { replace: true });
  };

  const link = (to, icon, label, badge) => (
    <NavLink to={to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
      <span className="nav-icon">{icon}</span>
      {label}
      {badge > 0 && (
        <span className="nav-badge">{badge > 99 ? '99+' : badge}</span>
      )}
    </NavLink>
  );

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-name">⚡ ERP System</div>
        <div className="sidebar-brand-tag">Workforce Management</div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section">Main</div>
        {link('/dashboard',     '📊', 'Dashboard')}
        {link('/geo',           '📍', 'Geo Attendance')}

        <div className="sidebar-section">Workspace</div>
        {link('/meetings',      '🤝', 'Meetings')}
        {link('/daily-reports', '📝', 'Daily Reports')}
        {isPrivileged && link('/approvals', '✅', 'Approvals')}

        <div className="sidebar-section">HR</div>
        {link('/claims',        '🧾', 'Claims')}
        {link('/leaves',        '🗓️',  'Leaves')}
        {link('/holidays',      '🎉', 'Holidays')}
        {link('/payslips',      '💰', 'Payslips')}

        <div className="sidebar-section">Company</div>
        {link('/announcements', '📢', 'Announcements')}

        <div className="sidebar-section">Account</div>
        {link('/notifications', '🔔', 'Notifications', unreadCount)}
        {link('/profile',       '👤', 'Profile')}
      </nav>

      <div className="sidebar-footer">
        <button className="btn-logout" type="button" onClick={handleLogout}>
          <span className="nav-icon">🚪</span>
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default Navbar;

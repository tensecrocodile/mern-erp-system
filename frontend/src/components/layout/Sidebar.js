import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { getMyNotifications } from '../services/notificationsApi';

const ROLE_HIERARCHY = {
  super_admin: 5,
  admin: 4,
  hr: 3,
  manager: 2,
  employee: 1,
};

function hasRole(userRole, minRole) {
  return (ROLE_HIERARCHY[userRole] || 0) >= (ROLE_HIERARCHY[minRole] || 0);
}

const NAV_CONFIG = [
  {
    section: 'Overview',
    items: [
      { to: '/dashboard', icon: '▣', label: 'Dashboard', minRole: null },
    ],
  },
  {
    section: 'Field Ops',
    items: [
      { to: '/geo',        icon: '⊙', label: 'Geo Attendance', minRole: null },
      { to: '/attendance', icon: '◷', label: 'Attendance',     minRole: null },
      { to: '/trips-live', icon: '◈', label: 'Live Map',       minRole: 'manager' },
      { to: '/meetings',   icon: '◇', label: 'Client Visits',  minRole: null },
    ],
  },
  {
    section: 'Work',
    items: [
      { to: '/daily-reports', icon: '◫', label: 'Daily Reports', minRole: null },
      { to: '/claims', icon: '▤', label: 'Claims', minRole: null },
      { to: '/leaves', icon: '◰', label: 'Leaves', minRole: null },
      { to: '/holidays', icon: '◆', label: 'Holidays', minRole: null },
      { to: '/payslips', icon: '▥', label: 'Payslips', minRole: null },
    ],
  },
  {
    section: 'Management',
    items: [
      { to: '/approvals',    icon: '✓', label: 'Approvals',    minRole: 'manager' },
      { to: '/employees',    icon: '◉', label: 'Employees',    minRole: 'hr'      },
      { to: '/announcements',icon: '▶', label: 'Announcements',minRole: null      },
    ],
  },
  {
    section: 'Admin',
    items: [
      { to: '/geofences', icon: '⬡', label: 'Geofences', minRole: 'admin' },
    ],
  },
];

const SidebarLink = ({ to, icon, label, badge }) => (
  <NavLink
    to={to}
    className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link--active' : ''}`}
  >
    <span className="sidebar-link-icon">{icon}</span>
    <span className="sidebar-link-label">{label}</span>
    {badge > 0 && (
      <span className="sidebar-badge">{badge > 99 ? '99+' : badge}</span>
    )}
  </NavLink>
);

const Sidebar = ({ collapsed, onToggle }) => {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef(null);
  const role = localStorage.getItem('role') || 'employee';

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

  return (
    <aside className={`sidebar${collapsed ? ' sidebar--collapsed' : ''}`}>
      <div className="sidebar-header">
        {!collapsed && (
          <div className="sidebar-brand">
            <div className="sidebar-brand-logo">GW</div>
            <div>
              <div className="sidebar-brand-name">GeoWorkforce</div>
              <div className="sidebar-brand-tag">Field Management</div>
            </div>
          </div>
        )}
        <button
          type="button"
          className="sidebar-toggle"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      <nav className="sidebar-nav">
        {NAV_CONFIG.map(({ section, items }) => {
          const visibleItems = items.filter(
            (item) => !item.minRole || hasRole(role, item.minRole)
          );

          if (visibleItems.length === 0) return null;

          return (
            <div key={section} className="sidebar-section-group">
              {!collapsed && (
                <div className="sidebar-section-label">{section}</div>
              )}
              {visibleItems.map((item) => (
                <SidebarLink
                  key={item.to}
                  to={item.to}
                  icon={item.icon}
                  label={item.label}
                  badge={item.to === '/notifications' ? unreadCount : 0}
                />
              ))}
            </div>
          );
        })}

        <div className="sidebar-section-group">
          {!collapsed && <div className="sidebar-section-label">Account</div>}
          <SidebarLink to="/notifications" icon="◎" label="Notifications" badge={unreadCount} />
          <SidebarLink to="/profile" icon="◉" label="Profile" />
        </div>
      </nav>

      <div className="sidebar-footer">
        <button
          type="button"
          className="sidebar-logout"
          onClick={handleLogout}
        >
          <span className="sidebar-link-icon">⊗</span>
          {!collapsed && <span className="sidebar-link-label">Sign Out</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

import { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { getMyNotifications } from '../../services/notificationsApi';

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

const Sidebar = ({ collapsed, onToggle, menuItems = [] }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef(null);

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
        {menuItems.map(({ section, items }) => (
          <div key={section} className="sidebar-section-group">
            {!collapsed && (
              <div className="sidebar-section-label">{section}</div>
            )}
            {items.map((item) => (
              <SidebarLink
                key={item.to}
                to={item.to}
                icon={item.icon}
                label={item.label}
                badge={item.to === '/notifications' ? unreadCount : 0}
              />
            ))}
          </div>
        ))}

        <div className="sidebar-section-group">
          {!collapsed && <div className="sidebar-section-label">Account</div>}
          <SidebarLink to="/notifications" icon="◎" label="Notifications" badge={unreadCount} />
          <SidebarLink to="/profile" icon="◉" label="Profile" />
        </div>
      </nav>

    </aside>
  );
};

export default Sidebar;

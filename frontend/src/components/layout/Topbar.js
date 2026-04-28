import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  hr: 'HR',
  manager: 'Manager',
  employee: 'Employee',
};

const Topbar = ({ onToggleSidebar }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const role = localStorage.getItem('role') || 'employee';
  const name = localStorage.getItem('name') || 'User';
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('name');
    navigate('/login', { replace: true });
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="topbar-menu-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          ☰
        </button>
      </div>

      <div className="topbar-right">
        <NavLink
          to="/notifications"
          className="topbar-icon-btn"
          aria-label="Notifications"
        >
          ◎
        </NavLink>

        {/* Profile dropdown trigger */}
        <div className="profile-menu" ref={dropdownRef}>
          <button
            type="button"
            className={`topbar-profile-btn${open ? ' topbar-profile-btn--open' : ''}`}
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-haspopup="true"
          >
            <div className="topbar-avatar">{initials}</div>
            <div className="topbar-user-info">
              <span className="topbar-user-name">{name}</span>
              <span className="topbar-user-role">{ROLE_LABELS[role] || role}</span>
            </div>
            <span className="topbar-chevron" aria-hidden="true">
              {open ? '▴' : '▾'}
            </span>
          </button>

          {open && (
            <div className="profile-dropdown" role="menu">
              {/* Identity header */}
              <div className="profile-dropdown-header">
                <div className="profile-dropdown-avatar">{initials}</div>
                <div>
                  <div className="profile-dropdown-name">{name}</div>
                  <div className="profile-dropdown-role">{ROLE_LABELS[role] || role}</div>
                </div>
              </div>

              <div className="profile-dropdown-divider" />

              <NavLink
                to="/profile"
                className="profile-dropdown-item"
                role="menuitem"
                onClick={() => setOpen(false)}
              >
                <span className="profile-dropdown-icon">◉</span>
                My Profile
              </NavLink>
              <NavLink
                to="/notifications"
                className="profile-dropdown-item"
                role="menuitem"
                onClick={() => setOpen(false)}
              >
                <span className="profile-dropdown-icon">◎</span>
                Notifications
              </NavLink>

              <div className="profile-dropdown-divider" />

              <button
                type="button"
                className="profile-dropdown-item profile-dropdown-item--danger"
                role="menuitem"
                onClick={handleLogout}
              >
                <span className="profile-dropdown-icon">⊗</span>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;

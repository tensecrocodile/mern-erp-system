import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Topbar from '../components/layout/Topbar';
import { getMenuForRole } from '../config/menuConfig';

const MENU = getMenuForRole('hr');

const HRLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className={`app-layout${collapsed ? ' app-layout--collapsed' : ''}`}>
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
        menuItems={MENU}
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

export default HRLayout;

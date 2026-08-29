import { useState } from 'react';
import { PortalProvider, usePortal } from './store';
import { Gate, ManagerAuth, EmployeeAuth } from './components/AuthScreens';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import SheetView from './components/SheetView';
import Settings from './components/Settings';
import Profile from './components/Profile';

export default function App({ portalMode }) {
  return (
    <PortalProvider portalMode={portalMode}>
      <PortalShell />
    </PortalProvider>
  );
}

function PortalShell() {
  const { booted, user, authScreen } = usePortal();
  if (!booted) return null;
  if (!user) {
    if (authScreen === 'manager') return <ManagerAuth />;
    if (authScreen === 'employee') return <EmployeeAuth />;
    return <Gate />;
  }
  return <MainApp />;
}

function MainApp() {
  const { user, activeView, registry, accessibleSheetIds } = usePortal();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isEmployee = user && user.role === 'employee';

  const allowed = accessibleSheetIds(user);
  const entry = registry.find((e) => e.id === activeView);

  let title = 'Dashboard', sub = 'Overview of the Baaz operation';
  if (isEmployee && activeView === 'dashboard') { title = 'Welcome'; sub = 'Your Baaz Portal'; }
  else if (activeView === 'settings') { title = 'Settings'; sub = 'Manage sheets and business details'; }
  else if (activeView === 'profile') { title = 'Profile'; sub = "Update your picture, email, or password"; }
  else if (entry) { title = entry.id === 'daily-report' && isEmployee ? 'My Daily Report' : entry.name; sub = "Sheet — double-click any cell to edit it"; }

  let effectiveView = activeView;
  if (isEmployee && activeView !== 'dashboard' && activeView !== 'profile' && !allowed.includes(activeView)) {
    effectiveView = 'dashboard';
  }

  return (
    <div id="app" className="active">
      <Sidebar sidebarOpen={sidebarOpen} onCloseMobile={() => setSidebarOpen(false)} />
      <div className="main">
        <div className="topbar">
          <div>
            <h1>{title}</h1>
            <div className="sub">{sub}</div>
          </div>
          <div className="mark menu-toggle" style={{ display: 'none', cursor: 'pointer' }} onClick={() => setSidebarOpen((v) => !v)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#c99a3b" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
          </div>
        </div>
        <div className="content">
          {effectiveView === 'dashboard' && <Dashboard />}
          {effectiveView === 'settings' && !isEmployee && <Settings />}
          {effectiveView === 'profile' && <Profile />}
          {effectiveView !== 'dashboard' && effectiveView !== 'settings' && effectiveView !== 'profile' && (
            <SheetView key={effectiveView} sheetId={effectiveView} />
          )}
        </div>
      </div>
    </div>
  );
}

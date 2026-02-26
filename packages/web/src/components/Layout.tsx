import { NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/timeline', label: 'Timeline', icon: '📈' },
  { path: '/upload', label: 'Upload Data', icon: '📤' },
  { path: '/recommendations', label: 'Recommendations', icon: '📋' },
  { path: '/profile', label: 'Profile', icon: '👤' },
];

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h1>PM Valet</h1>
          <p>Preventive Medicine</p>
        </div>
        <nav>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => isActive ? 'active' : ''}
              end={item.path === '/'}
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

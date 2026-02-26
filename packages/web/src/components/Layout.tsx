import { NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { api } from '../services/api.js';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: '~' },
  { path: '/timeline', label: 'Timeline', icon: '#' },
  { path: '/upload', label: 'Upload Data', icon: '+' },
  { path: '/recommendations', label: 'Recommendations', icon: '*' },
  { path: '/profile', label: 'Profile', icon: '@' },
];

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();
    // Poll notifications every 60 seconds
    const interval = setInterval(loadNotifications, 60_000);
    return () => clearInterval(interval);
  }, []);

  async function loadNotifications() {
    try {
      const res = await api.getNotifications();
      const unread = (res.data || []).filter((n) => !n.read).length;
      setUnreadCount(unread);
    } catch {
      // Non-critical
    }
  }

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

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
              {item.path === '/' && unreadCount > 0 && (
                <span className="notification-badge">{unreadCount}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-user">
          {user && (
            <>
              <span className="user-name">{user.displayName || 'User'}</span>
              <span className="user-email">{user.email}</span>
            </>
          )}
          <button className="btn-logout" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </aside>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

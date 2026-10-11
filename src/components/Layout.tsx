import { NavLink, Outlet, useLocation } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/player', label: 'Players' },
  { to: '/team', label: 'Teams' },
  { to: '/game', label: 'Games' },
  { to: '/profile', label: 'Profile' },
];

export default function Layout() {
  const location = useLocation();
  const isProfilePage = location.pathname === '/profile';

  return (
    <div className="app-shell">
      {!isProfilePage && (
        <nav className="app-nav">
          {navItems.map(({ to, label }) => (
            <NavLink key={to} to={to} end={to === '/'}>
              {label}
            </NavLink>
          ))}
        </nav>
      )}
      <main className={`app-main${isProfilePage ? ' profile-main' : ''}`}>
        <Outlet />
      </main>
    </div>
  );
}

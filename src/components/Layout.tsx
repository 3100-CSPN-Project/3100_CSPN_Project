import { NavLink, Outlet, useLocation } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/player', label: 'Players' },
  { to: '/team', label: 'Teams' },
  { to: '/game', label: 'Games' },
  { to: '/profile', label: 'Profile' },
  { to: '/auth', label: 'Log in' }
];

export default function Layout() {
  const location = useLocation();
  const isPrototypePage =
  location.pathname === '/profile' ||
  location.pathname.startsWith('/team/') ||
  location.pathname.startsWith('/player/');

  return (
    <div className="app-shell">
      {!isPrototypePage && (
        <nav className="app-nav">
          <img src={'/src/assets/logo.svg'}/>
          {navItems.map(({ to, label }) => (
            <NavLink key={to} to={to} end={to === '/'}>
              {label}
            </NavLink>
          ))}
        </nav>
      )}
      <main className={`app-main${isPrototypePage ? ' profile-main' : ''}`}>
        <Outlet />
      </main>
    </div>
  );
}

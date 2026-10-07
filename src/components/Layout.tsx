import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/player', label: 'Players' },
  { to: '/team', label: 'Teams' },
  { to: '/game', label: 'Games' },
  { to: '/profile', label: 'Profile' },
];

export default function Layout() {
  return (
    <div className="app-shell">
      <nav className="app-nav">
        {navItems.map(({ to, label }) => (
          <NavLink key={to} to={to} end={to === '/'}>
            {label}
          </NavLink>
        ))}
      </nav>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}

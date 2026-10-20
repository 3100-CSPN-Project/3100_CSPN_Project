import { NavLink, Outlet } from 'react-router-dom';
// trace: Import the bundled logo so Vite can resolve it in development and production.
import logo from '../assets/logo.svg';

// trace: Keep the shared header destinations in one place for every route.
const navItems = [
  { to: '/game', label: 'Games' },
  { to: '/player', label: 'Players' },
  { to: '/team', label: 'Teams' },
  { to: '/profile', label: 'Profile' }
];

function Header() {
  return (
    <header className="site-header">
      {/* trace: Link the site logo directly to the homepage. */}
      <NavLink className="site-logo" to="/" aria-label="CSPN home">
        <img src={logo} alt="CSPN" />
      </NavLink>

      {/* trace: Render the app's destination links in the common header. */}
      <nav className="app-nav" aria-label="Main navigation">
        {navItems.map(({ to, label }) => (
          <NavLink key={to} to={to}>
            {label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}

export default function Layout() {
  return (
    <div className="app-shell">
      {/* trace: Show the same header above every page rendered by the outlet. */}
      <Header />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}

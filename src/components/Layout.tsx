import { NavLink, Outlet, useLocation } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/player', label: 'Players' },
  { to: '/team', label: 'Teams' },
  { to: '/game', label: 'Games' },
  { to: '/profile', label: 'Profile' },
  { to: '/auth', label: 'Log in' }
];

/** Red CSPN bar across the top of every page. */
function Header() {
  return (
    <header className="site-header">
      <div className="site-brand">CSPN</div>

      <nav className="site-leagues">
        <span>MLB</span>
        <span>NBA</span>
        <span>NFL</span>
      </nav>

      <div className="site-profile">
        User profile/
        <br />
        settings
      </div>
    </header>
  );
}

export default function Layout() {
  const { pathname } = useLocation();

  // The prototype pages draw their own headers, so they skip ours.
  const isPrototypePage =
    pathname === '/profile' ||
    pathname.startsWith('/team/') ||
    pathname.startsWith('/player/');

  return (
    <div className="app-shell">
      {!isPrototypePage && (
        <>
          <Header />
          <nav className="app-nav">
            {navItems.map(({ to, label }) => (
              <NavLink key={to} to={to} end={to === '/'}>
                {label}
              </NavLink>
            ))}
          </nav>
        </>
      )}
      <main className={`app-main${isPrototypePage ? ' profile-main' : ''}`}>
        <Outlet />
      </main>
    </div>
  );
}

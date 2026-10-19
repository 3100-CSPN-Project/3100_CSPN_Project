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
//App Header and App Nav are part of the same component
function Header() {
  //change site-leagues to layout-nav-bar
  return (
    <header className="site-header">
      <img src={'/src/assets/logo.svg'} alt={"CSPN Site Logo"}/>

      <nav className="app-nav">
        {navItems.map(({ to, label }) => (
          <NavLink key={to} to={to} end={to === '/'}>
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="site-profile">
        <NavLink to={'/profile'}>
          Profile
        </NavLink>
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
        </>
      )}
      <main className={`app-main${isPrototypePage ? ' profile-main' : ''}`}>
        <Outlet />
      </main>
    </div>
  );
}

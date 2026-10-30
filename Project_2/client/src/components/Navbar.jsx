import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faRightFromBracket, faRocket, faXmark } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { firstName } from '../lib/format.js';
import { SITE_NAME } from '../lib/site.js';

const links = [
  { to: '/planets', label: 'Solar System' },
  { to: '/missions', label: 'Missions' },
  { to: '/launches', label: 'Launches' },
  { to: '/gallery', label: 'Gallery' },
];

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const { notify } = useToast();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile menu whenever the page changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // No navigation here: public pages simply update, and <RequireAuth> moves the visitor off private ones.
  async function handleLogout() {
    try {
      await logout();
      notify('You have been signed out.');
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  return (
    <header className="navbar">
      <div className="container navbar__inner">
        <Link to="/" className="brand">
          <span className="brand__mark">
            <FontAwesomeIcon icon={faRocket} />
          </span>
          {SITE_NAME}
        </Link>

        <button
          type="button"
          className="navbar__toggle"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="site-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <FontAwesomeIcon icon={menuOpen ? faXmark : faBars} />
        </button>

        <div id="site-menu" className={`navbar__menu ${menuOpen ? 'is-open' : ''}`}>
          <nav className="navbar__links" aria-label="Main">
            {links.map(({ to, label }) => (
              <NavLink key={to} to={to}>
                {label}
              </NavLink>
            ))}
          </nav>

          {!loading && (
            <div className="navbar__account">
              {user ? (
                <>
                  <NavLink to="/dashboard" className="navbar__user">
                    <span className="avatar">{user.name.charAt(0).toUpperCase()}</span>
                    {firstName(user.name)}
                  </NavLink>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={handleLogout}>
                    <FontAwesomeIcon icon={faRightFromBracket} /> Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn btn--ghost btn--sm">
                    Sign in
                  </Link>
                  <Link to="/register" className="btn btn--primary btn--sm">
                    Create account
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

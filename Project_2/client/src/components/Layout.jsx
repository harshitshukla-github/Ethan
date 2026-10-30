import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import Footer from './Footer.jsx';
import Navbar from './Navbar.jsx';
import Starfield from './Starfield.jsx';

export default function Layout() {
  const { pathname } = useLocation();

  // A new page should start at the top, as it would with full page loads.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Starfield />
      <Navbar />
      <main id="main" className="app__main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

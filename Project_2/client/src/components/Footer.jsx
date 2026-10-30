import { Link } from 'react-router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpRightFromSquare, faRocket } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext.jsx';
import { SITE_NAME } from '../lib/site.js';

const sources = [
  { href: 'https://images.nasa.gov/', label: 'NASA Image and Video Library' },
  { href: 'https://thespacedevs.com/llapi', label: 'Launch Library 2 by The Space Devs' },
  { href: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/', label: 'NASA Planetary Fact Sheet' },
];

export default function Footer() {
  const { user } = useAuth();

  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div className="footer__about">
          <Link to="/" className="brand">
            <span className="brand__mark">
              <FontAwesomeIcon icon={faRocket} />
            </span>
            {SITE_NAME}
          </Link>
          <p>An atlas of the worlds we have visited, the missions that took us there and the launches still to come.</p>
        </div>

        <nav aria-label="Explore">
          <h2>Explore</h2>
          <ul>
            <li>
              <Link to="/planets">Solar System</Link>
            </li>
            <li>
              <Link to="/missions">Missions</Link>
            </li>
            <li>
              <Link to="/launches">Launches</Link>
            </li>
            <li>
              <Link to="/gallery">Gallery</Link>
            </li>
          </ul>
        </nav>

        <nav aria-label="Account">
          <h2>Account</h2>
          <ul>
            {user ? (
              <li>
                <Link to="/dashboard">Your dashboard</Link>
              </li>
            ) : (
              <>
                <li>
                  <Link to="/login">Sign in</Link>
                </li>
                <li>
                  <Link to="/register">Create account</Link>
                </li>
              </>
            )}
          </ul>
        </nav>

        <nav aria-label="Data sources">
          <h2>Data sources</h2>
          <ul>
            {sources.map(({ href, label }) => (
              <li key={href}>
                <a href={href} target="_blank" rel="noreferrer">
                  {label} <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="footer__external" />
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="container footer__bottom">
        <p>
          © {new Date().getFullYear()} {SITE_NAME}. Built with React, Express and SQLite.
        </p>
      </div>
    </footer>
  );
}

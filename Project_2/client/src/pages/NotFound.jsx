import { Link } from 'react-router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserAstronaut } from '@fortawesome/free-solid-svg-icons';
import { usePageTitle } from '../hooks/usePageTitle.js';

export default function NotFound({ title = 'Lost in space', message = 'The page you are looking for has drifted out of range.' }) {
  usePageTitle('Page not found');

  return (
    <section className="container not-found">
      <FontAwesomeIcon icon={faUserAstronaut} className="not-found__icon" />
      <p className="eyebrow">Error 404</p>
      <h1>{title}</h1>
      <p>{message}</p>
      <Link to="/" className="btn btn--primary">
        Return to base
      </Link>
    </section>
  );
}

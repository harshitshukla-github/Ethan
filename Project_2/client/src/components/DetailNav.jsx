import { Link } from 'react-router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faArrowRight } from '@fortawesome/free-solid-svg-icons';

// Previous / next links at the foot of a planet or mission page.
export default function DetailNav({ basePath, previous, next, label }) {
  return (
    <nav className="detail-nav" aria-label={label}>
      {previous ? (
        <Link to={`${basePath}/${previous.id}`} className="detail-nav__link">
          <FontAwesomeIcon icon={faArrowLeft} />
          <span>
            <small>Previous</small>
            {previous.name}
          </span>
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link to={`${basePath}/${next.id}`} className="detail-nav__link detail-nav__link--next">
          <span>
            <small>Next</small>
            {next.name}
          </span>
          <FontAwesomeIcon icon={faArrowRight} />
        </Link>
      )}
    </nav>
  );
}

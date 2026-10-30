import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowsRotate, faCircleNotch, faSatelliteDish } from '@fortawesome/free-solid-svg-icons';

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="feedback" role="status">
      <FontAwesomeIcon icon={faCircleNotch} spin className="feedback__icon" />
      <p>{label}</p>
    </div>
  );
}

export function ErrorMessage({ error, onRetry }) {
  return (
    <div className="feedback feedback--error" role="alert">
      <FontAwesomeIcon icon={faSatelliteDish} className="feedback__icon" />
      <p>{error?.message ?? 'Something went wrong.'}</p>
      {onRetry && (
        <button type="button" className="btn btn--ghost btn--sm" onClick={onRetry}>
          <FontAwesomeIcon icon={faArrowsRotate} /> Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon, title, children }) {
  return (
    <div className="feedback feedback--empty">
      {icon && <FontAwesomeIcon icon={icon} className="feedback__icon" />}
      <h3>{title}</h3>
      {children}
    </div>
  );
}

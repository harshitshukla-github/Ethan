import { Link } from 'react-router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLocationDot } from '@fortawesome/free-solid-svg-icons';
import { formatPartialDate } from '../lib/format.js';
import { missionIcon } from '../lib/site.js';
import FavoriteButton from './FavoriteButton.jsx';
import StatusBadge from './StatusBadge.jsx';

export default function MissionCard({ mission }) {
  const { id, name, agency, type, status, launchDate, destination, summary } = mission;

  return (
    <article className="card card--link mission-card">
      <div className="mission-card__top">
        <span className="icon-tile" title={type}>
          <FontAwesomeIcon icon={missionIcon(type)} />
        </span>
        <StatusBadge status={status} />
      </div>
      <h3>
        <Link to={`/missions/${id}`} className="stretched-link">
          {name}
        </Link>
      </h3>
      <p className="mission-card__meta">
        {agency} · {formatPartialDate(launchDate)}
      </p>
      <p className="mission-card__summary">{summary}</p>
      <p className="mission-card__destination">
        <FontAwesomeIcon icon={faLocationDot} /> {destination}
      </p>
      <div className="card__action">
        <FavoriteButton type="mission" id={id} name={name} variant="icon" />
      </div>
    </article>
  );
}

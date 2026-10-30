import { Link } from 'react-router';
import { formatNumber } from '../lib/format.js';
import FavoriteButton from './FavoriteButton.jsx';
import PlanetOrb from './PlanetOrb.jsx';

export default function PlanetCard({ planet }) {
  const { id, name, type, tagline, facts } = planet;

  return (
    <article className="card card--link planet-card">
      <div className="planet-card__visual">
        <PlanetOrb id={id} size={104} />
      </div>
      <p className="planet-card__type">{type}</p>
      <h3>
        {/* The link stretches over the whole card; the favorite button sits above it. */}
        <Link to={`/planets/${id}`} className="stretched-link">
          {name}
        </Link>
      </h3>
      <p className="planet-card__tagline">{tagline}</p>
      <dl className="stat-row">
        <div>
          <dt>Diameter</dt>
          <dd>{formatNumber(facts.diameterKm)} km</dd>
        </div>
        <div>
          <dt>Moons</dt>
          <dd>{facts.moons}</dd>
        </div>
        <div>
          <dt>From Sun</dt>
          <dd>{facts.distanceAu} AU</dd>
        </div>
      </dl>
      <div className="card__action">
        <FavoriteButton type="planet" id={id} name={name} variant="icon" />
      </div>
    </article>
  );
}

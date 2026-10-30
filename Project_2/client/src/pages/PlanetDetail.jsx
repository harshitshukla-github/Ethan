import { Link, useParams } from 'react-router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowsDownToLine,
  faCalendarDays,
  faClock,
  faMoon,
  faRulerHorizontal,
  faStar,
  faSun,
  faTemperatureHalf,
  faWeightHanging,
} from '@fortawesome/free-solid-svg-icons';
import DetailNav from '../components/DetailNav.jsx';
import FavoriteButton from '../components/FavoriteButton.jsx';
import { ErrorMessage, Loading } from '../components/Feedback.jsx';
import MissionCard from '../components/MissionCard.jsx';
import PlanetOrb from '../components/PlanetOrb.jsx';
import { useApi } from '../hooks/useApi.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { formatNumber } from '../lib/format.js';
import NotFound from './NotFound.jsx';

const EARTH_DIAMETER_KM = 12756;

const formatTemperature = (celsius) => `${celsius < 0 ? '−' : ''}${Math.abs(celsius)} °C`;

function buildFacts({ id, type, facts }) {
  const isEarth = id === 'earth';
  return [
    {
      icon: faRulerHorizontal,
      label: 'Diameter',
      value: `${formatNumber(facts.diameterKm)} km`,
      note: isEarth ? null : `${(facts.diameterKm / EARTH_DIAMETER_KM).toFixed(2)} × Earth`,
    },
    {
      icon: faWeightHanging,
      label: 'Mass',
      value: isEarth ? '5.97 × 10²⁴ kg' : `${facts.massEarths} × Earth`,
    },
    { icon: faArrowsDownToLine, label: 'Surface gravity', value: `${facts.gravity} m/s²` },
    { icon: faClock, label: 'Length of day', value: facts.dayLength, note: 'sunrise to sunrise' },
    { icon: faCalendarDays, label: 'Length of year', value: facts.yearLength },
    {
      icon: faTemperatureHalf,
      label: 'Average temperature',
      value: formatTemperature(facts.meanTempC),
      note: type.includes('giant') ? 'at the 1-bar pressure level' : null,
    },
    {
      icon: faMoon,
      label: 'Known moons',
      value: facts.moons,
      note: facts.rings ? 'plus a system of rings' : 'and no rings',
    },
    {
      icon: faSun,
      label: 'Distance from the Sun',
      value: `${formatNumber(facts.distanceMkm)} million km`,
      note: `${facts.distanceAu} AU`,
    },
  ];
}

export default function PlanetDetail() {
  const { id } = useParams();
  const { data, error, loading, reload } = useApi(`/planets/${id}`);
  usePageTitle(data?.planet.name ?? 'Solar System');

  if (loading) {
    return (
      <div className="container page">
        <Loading label="Plotting a course…" />
      </div>
    );
  }
  if (error?.status === 404) {
    return <NotFound title="Uncharted world" message="There is no world by that name in this atlas." />;
  }
  if (error) {
    return (
      <div className="container page">
        <ErrorMessage error={error} onRetry={reload} />
      </div>
    );
  }

  const { planet, missions, previous, next } = data;

  return (
    <article className="container page">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/planets">Solar System</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{planet.name}</span>
      </nav>

      <header className="detail-hero">
        <div className="detail-hero__visual">
          <PlanetOrb id={planet.id} className="orb--hero" />
        </div>
        <div className="detail-hero__copy">
          <p className="eyebrow">{planet.type}</p>
          <h1>{planet.name}</h1>
          <p className="detail-hero__tagline">{planet.tagline}</p>
          <p className="detail-hero__summary">{planet.summary}</p>
          <FavoriteButton type="planet" id={planet.id} name={planet.name} />
        </div>
      </header>

      <section aria-labelledby="facts-title">
        <h2 id="facts-title" className="sr-only">
          Vital statistics
        </h2>
        <dl className="fact-grid">
          {buildFacts(planet).map(({ icon, label, value, note }) => (
            <div key={label} className="fact">
              <FontAwesomeIcon icon={icon} className="fact__icon" />
              <dt>{label}</dt>
              <dd>
                {value}
                {note && <small>{note}</small>}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="detail-columns">
        <section>
          <h2>About {planet.name}</h2>
          {planet.description.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </section>
        <aside className="card fun-facts">
          <h2>
            <FontAwesomeIcon icon={faStar} /> Did you know?
          </h2>
          <ul>
            {planet.funFacts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        </aside>
      </div>

      {missions.length > 0 && (
        <section className="section">
          <div className="section__header">
            <h2>Missions connected to {planet.name}</h2>
          </div>
          <div className="grid grid--cards">
            {missions.map((mission) => (
              <MissionCard key={mission.id} mission={mission} />
            ))}
          </div>
        </section>
      )}

      <DetailNav basePath="/planets" previous={previous} next={next} label="More worlds" />
    </article>
  );
}

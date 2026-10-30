import { Link, useParams } from 'react-router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import DetailNav from '../components/DetailNav.jsx';
import FavoriteButton from '../components/FavoriteButton.jsx';
import { ErrorMessage, Loading } from '../components/Feedback.jsx';
import PlanetOrb from '../components/PlanetOrb.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useApi } from '../hooks/useApi.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { formatPartialDate } from '../lib/format.js';
import { missionIcon } from '../lib/site.js';
import NotFound from './NotFound.jsx';

export default function MissionDetail() {
  const { id } = useParams();
  const { data, error, loading, reload } = useApi(`/missions/${id}`);
  usePageTitle(data?.mission.name ?? 'Missions');

  if (loading) {
    return (
      <div className="container page">
        <Loading label="Retrieving mission log…" />
      </div>
    );
  }
  if (error?.status === 404) {
    return <NotFound title="Mission not found" message="There is no mission with that name in the catalog." />;
  }
  if (error) {
    return (
      <div className="container page">
        <ErrorMessage error={error} onRetry={reload} />
      </div>
    );
  }

  const { mission, planets, previous, next } = data;
  const planned = mission.status === 'Planned';
  const keyFacts = [
    { label: planned ? 'Planned launch' : 'Launched', value: formatPartialDate(mission.launchDate) },
    { label: 'Destination', value: mission.destination },
    { label: 'Launch vehicle', value: mission.vehicle },
    { label: 'Operated by', value: mission.agency },
  ];

  return (
    <article className="container page">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/missions">Missions</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{mission.name}</span>
      </nav>

      <header className="mission-hero">
        <span className="icon-tile icon-tile--xl">
          <FontAwesomeIcon icon={missionIcon(mission.type)} />
        </span>
        <div>
          <p className="mission-hero__badges">
            <StatusBadge status={mission.status} />
            <span className="badge badge--muted">{mission.type}</span>
          </p>
          <h1>{mission.name}</h1>
          <p className="detail-hero__summary">{mission.summary}</p>
          <div className="mission-hero__actions">
            <FavoriteButton type="mission" id={mission.id} name={mission.name} />
            <a href={mission.url} target="_blank" rel="noreferrer" className="btn btn--ghost">
              Learn more <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
            </a>
          </div>
        </div>
      </header>

      <dl className="fact-grid fact-grid--compact">
        {keyFacts.map(({ label, value }) => (
          <div key={label} className="fact">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      <div className="detail-columns">
        <section>
          <h2>Mission overview</h2>
          {mission.description.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}

          {planets.length > 0 && (
            <>
              <h2>Worlds involved</h2>
              <ul className="world-links">
                {planets.map((planet) => (
                  <li key={planet.id}>
                    <Link to={`/planets/${planet.id}`} className="world-link">
                      <PlanetOrb id={planet.id} size={36} />
                      <span>
                        {planet.name}
                        <small>{planet.type}</small>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <aside className="card">
          <h2>Timeline</h2>
          <ol className="timeline">
            {mission.highlights.map(({ date, text }) => (
              <li key={`${date}-${text}`}>
                <time dateTime={date}>{formatPartialDate(date)}</time>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </aside>
      </div>

      <DetailNav basePath="/missions" previous={previous} next={next} label="More missions" />
    </article>
  );
}

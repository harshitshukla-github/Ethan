import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarDays, faGlobe, faLocationDot, faRocket, faTowerBroadcast } from '@fortawesome/free-solid-svg-icons';
import Countdown from '../components/Countdown.jsx';
import { EmptyState, ErrorMessage, Loading } from '../components/Feedback.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useApi } from '../hooks/useApi.js';
import { useNow } from '../hooks/useNow.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { formatDateTime, formatMonth, formatRelativeTime, formatUtcDate } from '../lib/format.js';

// Launch providers publish times with varying certainty; a countdown only makes sense for firm ones.
const PRECISE = new Set(['Second', 'Minute', 'Hour']);
const DAY_LEVEL = new Set(['Day', 'Week']);

function describeLaunchTime({ net, netPrecision }) {
  if (PRECISE.has(netPrecision)) return formatDateTime(net);
  if (DAY_LEVEL.has(netPrecision)) return `${formatUtcDate(net)} · time to be confirmed`;
  if (netPrecision === 'Month') return `${formatMonth(net)} · date to be confirmed`;
  return `${new Date(net).getUTCFullYear()} · date to be confirmed`;
}

function LaunchCard({ launch, now, featured = false }) {
  const [expanded, setExpanded] = useState(false);
  const { mission } = launch;
  const Heading = featured ? 'h2' : 'h3';
  const image = featured ? launch.image : launch.thumbnail;

  return (
    <article className={`card launch-card ${featured ? 'launch-card--featured' : ''}`}>
      {image && (
        <figure className="launch-card__media">
          <img src={image} alt="" loading={featured ? 'eager' : 'lazy'} />
          {launch.imageCredit && <figcaption>Photo: {launch.imageCredit}</figcaption>}
        </figure>
      )}

      <div className="launch-card__body">
        <p className="launch-card__badges">
          {featured && <span className="badge badge--accent">Next up</span>}
          <StatusBadge status={launch.statusCode} label={launch.status} />
          {launch.webcastLive && (
            <span className="badge badge--rose">
              <FontAwesomeIcon icon={faTowerBroadcast} /> Live now
            </span>
          )}
        </p>
        <Heading>{mission?.name ?? launch.name}</Heading>
        <p className="launch-card__meta">{[launch.rocket, launch.provider].filter(Boolean).join(' · ')}</p>

        <ul className="launch-card__facts">
          <li>
            <FontAwesomeIcon icon={faCalendarDays} fixedWidth /> {describeLaunchTime(launch)}
          </li>
          {launch.location && (
            <li>
              <FontAwesomeIcon icon={faLocationDot} fixedWidth /> {[launch.pad, launch.location].filter(Boolean).join(', ')}
            </li>
          )}
          {mission?.orbit && (
            <li>
              <FontAwesomeIcon icon={faGlobe} fixedWidth /> {mission.orbit}
              {mission.type && ` · ${mission.type}`}
            </li>
          )}
        </ul>

        {mission?.description && (
          <>
            <p className={`launch-card__description ${expanded ? 'is-expanded' : ''}`}>{mission.description}</p>
            <button type="button" className="text-link" aria-expanded={expanded} onClick={() => setExpanded((open) => !open)}>
              {expanded ? 'Show less' : 'Read more'}
            </button>
          </>
        )}

        {PRECISE.has(launch.netPrecision) && <Countdown target={launch.net} now={now} size={featured ? 'lg' : 'sm'} />}
      </div>
    </article>
  );
}

export default function Launches() {
  usePageTitle('Launches');
  const { data, error, loading, reload } = useApi('/launches');
  const now = useNow();

  const [next, ...later] = data?.launches ?? [];

  return (
    <div className="container page">
      <PageHeader eyebrow="Launches" title="Upcoming rocket launches">
        The next orbital launches from spaceports around the world, shown in your local time. Schedules slip often,
        so times are marked with how firm they are.
      </PageHeader>

      {loading && <Loading label="Contacting launch control…" />}
      {error && <ErrorMessage error={error} onRetry={reload} />}

      {data && !next && (
        <EmptyState icon={faRocket} title="No launches on the schedule">
          <p>Nothing is listed right now. Check back soon.</p>
        </EmptyState>
      )}

      {next && (
        <>
          <LaunchCard launch={next} now={now} featured />
          <div className="grid grid--launches">
            {later.map((launch) => (
              <LaunchCard key={launch.id} launch={launch} now={now} />
            ))}
          </div>
          <p className="data-note">
            Launch data from{' '}
            <a href="https://thespacedevs.com/llapi" target="_blank" rel="noreferrer">
              Launch Library 2 by The Space Devs
            </a>
            , updated {formatRelativeTime(data.fetchedAt, now)}.
            {data.stale && ' The live feed is unreachable, so this is the most recent copy.'}
          </p>
        </>
      )}
    </div>
  );
}

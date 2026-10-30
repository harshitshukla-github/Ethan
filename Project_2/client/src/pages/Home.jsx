import { Link } from 'react-router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRight,
  faEarthAmericas,
  faImages,
  faLocationDot,
  faRocket,
  faSatellite,
} from '@fortawesome/free-solid-svg-icons';
import Countdown from '../components/Countdown.jsx';
import MissionCard from '../components/MissionCard.jsx';
import Orrery from '../components/Orrery.jsx';
import PlanetOrb from '../components/PlanetOrb.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { useNow } from '../hooks/useNow.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { firstName, formatDateTime } from '../lib/format.js';
import { GALLERY_DEFAULT_QUERY, SITE_TAGLINE } from '../lib/site.js';

const FIRST_SPACEFLIGHT_YEAR = 1957;
const PRECISE = new Set(['Second', 'Minute', 'Hour']);

const features = [
  {
    to: '/planets',
    icon: faEarthAmericas,
    title: 'Solar System',
    text: 'Nine worlds drawn and explained, from scorched Mercury to icy Pluto.',
  },
  {
    to: '/missions',
    icon: faSatellite,
    title: 'Missions',
    text: 'The landmark flights of the Space Age, each with a timeline of its key moments.',
  },
  {
    to: '/launches',
    icon: faRocket,
    title: 'Launches',
    text: 'A live schedule of upcoming rocket launches, with countdown clocks.',
  },
  {
    to: '/gallery',
    icon: faImages,
    title: 'Gallery',
    text: "Search NASA's image archive for nebulae, rovers, astronauts and more.",
  },
];

// Countdown to the next launch with a confirmed time. Renders nothing if the schedule is unavailable.
function NextLaunch() {
  const { data, loading } = useApi('/launches');
  const now = useNow();

  if (loading) {
    return <div className="container next-launch next-launch--loading" aria-hidden="true" />;
  }

  const launch = data?.launches.find(
    (candidate) => PRECISE.has(candidate.netPrecision) && new Date(candidate.net).getTime() > now,
  );
  if (!launch) return null;

  return (
    <section className="container next-launch" aria-labelledby="next-launch-title">
      <div className="next-launch__details">
        <p className="next-launch__label">
          <span className="pulse" /> Next launch
        </p>
        <h2 id="next-launch-title">{launch.mission?.name ?? launch.name}</h2>
        <p className="next-launch__meta">{[launch.rocket, launch.provider].filter(Boolean).join(' · ')}</p>
        <p className="next-launch__meta">
          <FontAwesomeIcon icon={faLocationDot} /> {launch.location} · {formatDateTime(launch.net)}
        </p>
      </div>
      <div className="next-launch__clock">
        <Countdown target={launch.net} now={now} size="lg" />
        <Link to="/launches" className="text-link">
          Full launch schedule <FontAwesomeIcon icon={faArrowRight} />
        </Link>
      </div>
    </section>
  );
}

function ArchivePreview() {
  const { data } = useApi(`/gallery?q=${GALLERY_DEFAULT_QUERY}`);
  const images = data?.items.slice(0, 4) ?? [];
  if (images.length === 0) return null;

  return (
    <section className="container section">
      <div className="section__header">
        <div>
          <p className="eyebrow">Gallery</p>
          <h2>From NASA's image archive</h2>
        </div>
        <Link to="/gallery" className="text-link">
          Open the gallery <FontAwesomeIcon icon={faArrowRight} />
        </Link>
      </div>
      <div className="archive-preview">
        {images.map((image) => (
          <Link key={image.id} to="/gallery" className="gallery-tile">
            <img src={image.thumbnail} alt={image.title} loading="lazy" />
            <span className="gallery-tile__title">{image.title}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  usePageTitle(null);
  const { user } = useAuth();
  const planets = useApi('/planets');
  const missions = useApi('/missions');

  const worlds = planets.data?.planets ?? [];
  const allMissions = missions.data?.missions ?? [];
  // Missions arrive oldest first; show the latest ones that have actually flown.
  const latestMissions = allMissions.filter((mission) => mission.status !== 'Planned').slice(-4).reverse();

  const stats = [
    { value: worlds.length || '–', label: 'worlds to explore' },
    { value: allMissions.length || '–', label: 'missions cataloged' },
    { value: new Date().getFullYear() - FIRST_SPACEFLIGHT_YEAR, label: 'years of spaceflight' },
  ];

  return (
    <>
      <section className="container hero">
        <div className="hero__copy">
          <p className="eyebrow">{SITE_TAGLINE}</p>
          <h1>
            Chart humanity's journey <span className="gradient-text">to the stars</span>
          </h1>
          <p className="hero__lede">
            Tour every world in the solar system, follow seven decades of missions from Sputnik to Artemis, and count
            down to the next launch.
          </p>
          <div className="hero__actions">
            <Link to="/planets" className="btn btn--primary btn--lg">
              Explore the solar system <FontAwesomeIcon icon={faArrowRight} />
            </Link>
            <Link to="/missions" className="btn btn--ghost btn--lg">
              Browse missions
            </Link>
          </div>
          <dl className="hero__stats">
            {stats.map(({ value, label }) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <Orrery />
      </section>

      <NextLaunch />

      <section className="container section">
        <div className="section__header">
          <div>
            <p className="eyebrow">Start exploring</p>
            <h2>Four ways into the cosmos</h2>
          </div>
        </div>
        <div className="grid grid--features">
          {features.map(({ to, icon, title, text }) => (
            <article key={to} className="card card--link feature-card">
              <span className="icon-tile icon-tile--lg">
                <FontAwesomeIcon icon={icon} />
              </span>
              <h3>
                <Link to={to} className="stretched-link">
                  {title}
                </Link>
              </h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      {worlds.length > 0 && (
        <section className="container section">
          <div className="section__header">
            <div>
              <p className="eyebrow">Solar System</p>
              <h2>Pick a world</h2>
            </div>
            <Link to="/planets" className="text-link">
              Compare them all <FontAwesomeIcon icon={faArrowRight} />
            </Link>
          </div>
          <ul className="world-strip">
            {worlds.map((world) => (
              <li key={world.id}>
                <Link to={`/planets/${world.id}`} className="world-strip__item">
                  <PlanetOrb id={world.id} size={64} />
                  <span>{world.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {latestMissions.length > 0 && (
        <section className="container section">
          <div className="section__header">
            <div>
              <p className="eyebrow">Missions</p>
              <h2>Latest to fly</h2>
            </div>
            <Link to="/missions" className="text-link">
              All missions <FontAwesomeIcon icon={faArrowRight} />
            </Link>
          </div>
          <div className="grid grid--cards">
            {latestMissions.map((mission) => (
              <MissionCard key={mission.id} mission={mission} />
            ))}
          </div>
        </section>
      )}

      <ArchivePreview />

      <section className="container section">
        <div className="cta">
          {user ? (
            <>
              <h2>Welcome back, {firstName(user.name)}</h2>
              <p>Your saved worlds and missions are waiting in your dashboard.</p>
              <Link to="/dashboard" className="btn btn--primary btn--lg">
                Open your dashboard
              </Link>
            </>
          ) : (
            <>
              <h2>Keep your own mission log</h2>
              <p>Create a free account to save the worlds and missions you want to come back to.</p>
              <div className="cta__actions">
                <Link to="/register" className="btn btn--primary btn--lg">
                  Create account
                </Link>
                <Link to="/login" className="btn btn--ghost btn--lg">
                  Sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}

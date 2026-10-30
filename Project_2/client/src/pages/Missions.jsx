import { useSearchParams } from 'react-router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass, faSatelliteDish } from '@fortawesome/free-solid-svg-icons';
import { EmptyState, ErrorMessage, Loading } from '../components/Feedback.jsx';
import MissionCard from '../components/MissionCard.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { useApi } from '../hooks/useApi.js';
import { usePageTitle } from '../hooks/usePageTitle.js';

const STATUSES = ['All', 'Active', 'Completed', 'Planned'];
const DEFAULTS = { q: '', status: 'All', agency: 'All', sort: 'newest' };

// Joint missions list their partners as "NASA / ESA".
const agenciesOf = (mission) => mission.agency.split(' / ');

export default function Missions() {
  usePageTitle('Missions');
  const { data, error, loading, reload } = useApi('/missions');

  // Filters live in the URL, so a filtered view can be bookmarked, shared and survives the back button.
  const [params, setParams] = useSearchParams();
  const filters = Object.fromEntries(Object.entries(DEFAULTS).map(([key, fallback]) => [key, params.get(key) ?? fallback]));

  function setFilter(key, value) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value === DEFAULTS[key]) next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true },
    );
  }

  const missions = data?.missions ?? [];
  const agencies = [...new Set(missions.flatMap(agenciesOf))].sort();

  const needle = filters.q.trim().toLowerCase();
  const matching = missions.filter(
    (mission) =>
      (filters.status === 'All' || mission.status === filters.status) &&
      (filters.agency === 'All' || agenciesOf(mission).includes(filters.agency)) &&
      (!needle ||
        [mission.name, mission.agency, mission.type, mission.destination, mission.summary].some((text) =>
          text.toLowerCase().includes(needle),
        )),
  );
  // The API returns missions oldest first.
  const visible = filters.sort === 'oldest' ? matching : [...matching].reverse();
  const filtered = params.toString() !== '';

  return (
    <div className="container page">
      <PageHeader eyebrow="Missions" title="Seven decades of exploration">
        From the first beeping satellite to telescopes that see the dawn of time. Search the catalog or filter by
        status and space agency.
      </PageHeader>

      <form className="toolbar" role="search" onSubmit={(event) => event.preventDefault()}>
        <label className="search-box">
          <span className="sr-only">Search missions</span>
          <FontAwesomeIcon icon={faMagnifyingGlass} />
          <input
            type="search"
            placeholder="Search by name, destination, agency…"
            value={filters.q}
            onChange={(event) => setFilter('q', event.target.value)}
          />
        </label>

        <div className="chips" role="group" aria-label="Filter by status">
          {STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              className={`chip ${status === filters.status ? 'is-active' : ''}`}
              aria-pressed={status === filters.status}
              onClick={() => setFilter('status', status)}
            >
              {status}
            </button>
          ))}
        </div>

        <label className="select">
          <span className="sr-only">Space agency</span>
          <select value={filters.agency} onChange={(event) => setFilter('agency', event.target.value)}>
            <option value="All">All agencies</option>
            {agencies.map((agency) => (
              <option key={agency}>{agency}</option>
            ))}
          </select>
        </label>

        <label className="select">
          <span className="sr-only">Sort order</span>
          <select value={filters.sort} onChange={(event) => setFilter('sort', event.target.value)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
      </form>

      {loading && <Loading label="Retrieving mission logs…" />}
      {error && <ErrorMessage error={error} onRetry={reload} />}

      {data && (
        <>
          <p className="result-count" role="status">
            Showing {visible.length} of {missions.length} missions
          </p>
          {visible.length > 0 ? (
            <div className="grid grid--cards">
              {visible.map((mission) => (
                <MissionCard key={mission.id} mission={mission} />
              ))}
            </div>
          ) : (
            <EmptyState icon={faSatelliteDish} title="No missions match those filters">
              <p>Try a different search term or widen the filters.</p>
              {filtered && (
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setParams({}, { replace: true })}>
                  Clear filters
                </button>
              )}
            </EmptyState>
          )}
        </>
      )}
    </div>
  );
}

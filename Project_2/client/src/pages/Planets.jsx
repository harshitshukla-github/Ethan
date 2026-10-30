import { useState } from 'react';
import { ErrorMessage, Loading } from '../components/Feedback.jsx';
import PageHeader from '../components/PageHeader.jsx';
import PlanetCard from '../components/PlanetCard.jsx';
import { useApi } from '../hooks/useApi.js';
import { usePageTitle } from '../hooks/usePageTitle.js';

const TYPES = ['All', 'Terrestrial', 'Gas giant', 'Ice giant', 'Dwarf planet'];

export default function Planets() {
  usePageTitle('Solar System');
  const { data, error, loading, reload } = useApi('/planets');
  const [type, setType] = useState('All');

  const worlds = data?.planets.filter((planet) => type === 'All' || planet.type === type) ?? [];

  return (
    <div className="container page">
      <PageHeader eyebrow="Solar System" title="Nine worlds, one star">
        Eight planets and one much-loved dwarf planet, in order from the Sun. Choose a world to see its vital
        statistics and the missions that have explored it.
      </PageHeader>

      <div className="chips" role="group" aria-label="Filter by type">
        {TYPES.map((option) => (
          <button
            key={option}
            type="button"
            className={`chip ${option === type ? 'is-active' : ''}`}
            aria-pressed={option === type}
            onClick={() => setType(option)}
          >
            {option}
          </button>
        ))}
      </div>

      {loading && <Loading label="Charting the solar system…" />}
      {error && <ErrorMessage error={error} onRetry={reload} />}
      {data && (
        <div className="grid grid--cards">
          {worlds.map((planet) => (
            <PlanetCard key={planet.id} planet={planet} />
          ))}
        </div>
      )}
    </div>
  );
}

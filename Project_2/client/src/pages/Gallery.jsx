import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpRightFromSquare, faImages, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { EmptyState, ErrorMessage, Loading } from '../components/Feedback.jsx';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { api } from '../lib/api.js';
import { formatDate, formatNumber } from '../lib/format.js';
import { GALLERY_DEFAULT_QUERY, GALLERY_TOPICS } from '../lib/site.js';

const EMPTY_RESULTS = { items: [], page: 0, total: 0, hasMore: false };

const searchPath = (query, page) => `/gallery?q=${encodeURIComponent(query)}&page=${page}`;

export default function Gallery() {
  usePageTitle('Gallery');

  // The search term lives in the URL so results can be linked to and the back button works.
  const [params, setParams] = useSearchParams();
  const urlQuery = params.get('q')?.trim() ?? '';
  const query = urlQuery || GALLERY_DEFAULT_QUERY;

  const [draft, setDraft] = useState(urlQuery);
  const [results, setResults] = useState(EMPTY_RESULTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState(null);
  // Guards against a slow "load more" response landing after the search has changed.
  const activeQuery = useRef(query);

  // Keep the search box in step when the URL changes through the back and forward buttons.
  useEffect(() => {
    setDraft(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    activeQuery.current = query;
    const controller = new AbortController();
    setResults(EMPTY_RESULTS);
    setError(null);
    setLoading(true);

    api.get(searchPath(query, 1), { signal: controller.signal }).then(
      (data) => {
        setResults(data);
        setLoading(false);
      },
      (err) => {
        if (err.name === 'AbortError') return;
        setError(err);
        setLoading(false);
      },
    );
    return () => controller.abort();
  }, [query, attempt]);

  async function loadMore() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get(searchPath(query, results.page + 1));
      if (activeQuery.current !== query) return;
      setResults((current) => {
        const seen = new Set(current.items.map((item) => item.id));
        return { ...data, items: [...current.items, ...data.items.filter((item) => !seen.has(item.id))] };
      });
    } catch (err) {
      if (activeQuery.current === query) setError(err);
    } finally {
      if (activeQuery.current === query) setLoading(false);
    }
  }

  function search(term) {
    const text = term.trim();
    setDraft(text);
    setSelected(null);
    setParams(text ? { q: text } : {});
  }

  const firstLoad = loading && results.items.length === 0;

  return (
    <div className="container page">
      <PageHeader eyebrow="Gallery" title="From NASA's image archive">
        Search decades of photographs from NASA's Image and Video Library: nebulae, launches, rovers, astronauts and
        the view back home.
      </PageHeader>

      <form
        className="toolbar"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          search(draft);
        }}
      >
        <label className="search-box">
          <span className="sr-only">Search NASA images</span>
          <FontAwesomeIcon icon={faMagnifyingGlass} />
          <input
            type="search"
            placeholder="Search for anything in space…"
            maxLength={80}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
        </label>
        <button type="submit" className="btn btn--primary">
          Search
        </button>
      </form>

      <div className="chips" role="group" aria-label="Popular topics">
        {GALLERY_TOPICS.map((topic) => {
          const active = topic.toLowerCase() === query.toLowerCase();
          return (
            <button
              key={topic}
              type="button"
              className={`chip ${active ? 'is-active' : ''}`}
              aria-pressed={active}
              onClick={() => search(topic)}
            >
              {topic}
            </button>
          );
        })}
      </div>

      {results.items.length > 0 && (
        <>
          <p className="result-count" role="status">
            {formatNumber(results.total)} images for “{query}”
          </p>
          <ul className="gallery-grid">
            {results.items.map((item) => (
              <li key={item.id}>
                <button type="button" className="gallery-tile" onClick={() => setSelected(item)}>
                  <img src={item.thumbnail} alt={item.title} loading="lazy" />
                  <span className="gallery-tile__title">{item.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {firstLoad && <Loading label="Searching the archive…" />}
      {error && <ErrorMessage error={error} onRetry={results.page === 0 ? () => setAttempt((n) => n + 1) : loadMore} />}

      {!loading && !error && results.items.length === 0 && (
        <EmptyState icon={faImages} title={`No images found for “${query}”`}>
          <p>Try a broader term, or pick one of the topics above.</p>
        </EmptyState>
      )}

      {results.hasMore && !error && !firstLoad && (
        <div className="load-more">
          <button type="button" className="btn btn--ghost" disabled={loading} onClick={loadMore}>
            {loading ? 'Loading…' : 'Load more images'}
          </button>
        </div>
      )}

      <p className="data-note">
        Images courtesy of{' '}
        <a href="https://images.nasa.gov/" target="_blank" rel="noreferrer">
          NASA's Image and Video Library
        </a>
        .
      </p>

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} labelledBy="lightbox-title">
        {selected && (
          <div className="lightbox">
            <div className="lightbox__media">
              <img src={selected.image} alt={selected.title} />
            </div>
            <div className="lightbox__info">
              <h2 id="lightbox-title">{selected.title}</h2>
              <p className="lightbox__meta">
                {[selected.date && formatDate(selected.date), selected.center, selected.credit]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              {selected.description && <p className="lightbox__description">{selected.description}</p>}
              {selected.keywords.length > 0 && (
                <div className="chips" role="group" aria-label="Related searches">
                  {selected.keywords.map((keyword) => (
                    <button key={keyword} type="button" className="chip chip--sm" onClick={() => search(keyword)}>
                      {keyword}
                    </button>
                  ))}
                </div>
              )}
              <a
                href={`https://images.nasa.gov/details/${encodeURIComponent(selected.id)}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn--ghost btn--sm"
              >
                View on images.nasa.gov <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
              </a>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

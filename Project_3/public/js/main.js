import * as api from './api.js';
import { CATEGORIES } from './categories.js';
import { formatDistance, h } from './dom.js';
import { distanceKm, getCurrentPosition } from './geo.js';
import { LocationMap } from './map.js';
import { Sidebar } from './sidebar.js';
import { SuggestForm } from './suggestForm.js';
import { showToast } from './toast.js';

const FAR_AWAY_KM = 50;

const state = {
  locations: [], // verified locations for the active categories, as returned by the API
  visible: [], // after the text search and distance sort
  categories: new Set(), // empty = all categories
  search: '',
  selectedId: null,
  userPosition: null,
};

let listRequest = null;
let detailRequest = null;

const map = new LocationMap(document.getElementById('map'), {
  // Marker click: the map opens its InfoWindow; mirror the selection in the sidebar list.
  onMarkerSelect(id) {
    state.selectedId = id;
    sidebar.highlight(id, { scroll: true, flash: true });
  },
  // "View Details" inside the InfoWindow opens the detail panel in the sidebar.
  onViewDetails(id) {
    openDetail(id, { focusMap: false });
  },
});

const sidebar = new Sidebar({
  onSelect: (id) => openDetail(id, { focusMap: true }),
  onBack: () => showList(),
  onToggleCategory: (category) => toggleCategory(category),
});

const suggestForm = new SuggestForm({
  async onSubmit(payload) {
    const { message } = await api.suggestLocation(payload);
    map.stopPicking();
    return message;
  },
  onCoordsChange: (position) => map.setDraftPosition(position, { pan: true }),
  onUseMyLocation: () => requestPosition(),
});

/* ---------------------------------------------------------------- views */

function switchView(name) {
  if (sidebar.currentView === 'suggest' && name !== 'suggest') map.stopPicking();
  if (name !== 'detail') detailRequest?.abort();
  sidebar.showView(name);
}

function showList() {
  switchView('list');
  if (state.selectedId !== null) sidebar.highlight(state.selectedId, { scroll: true });
}

async function openDetail(id, { focusMap }) {
  state.selectedId = id;
  sidebar.highlight(id);
  if (focusMap) map.focusLocation(id);
  switchView('detail');
  sidebar.showDetailLoading();

  detailRequest?.abort();
  const controller = new AbortController();
  detailRequest = controller;
  try {
    const location = await api.getLocation(id, { signal: controller.signal });
    const distance = state.userPosition
      ? distanceKm(state.userPosition, { lat: location.latitude, lng: location.longitude })
      : undefined;
    sidebar.renderDetail(location, { distanceKm: distance });
  } catch (err) {
    if (err.name === 'AbortError') return;
    sidebar.showDetailError(err.status === 404 ? 'This spot is no longer listed.' : err.message);
  }
}

function openSuggest() {
  switchView('suggest');
  suggestForm.reset();
  map.startPicking((position) => suggestForm.setCoords(position));
  suggestForm.focusFirstField();
}

/* ---------------------------------------------------------------- data + filters */

async function loadLocations() {
  listRequest?.abort();
  const controller = new AbortController();
  listRequest = controller;

  if (state.locations.length === 0) sidebar.showListLoading();
  else sidebar.setListBusy(true);

  try {
    state.locations = await api.getLocations([...state.categories], { signal: controller.signal });
    applyFilters();
  } catch (err) {
    if (err.name === 'AbortError') return;
    state.locations = [];
    state.visible = [];
    map.setLocations([]);
    sidebar.showListError(err.message, loadLocations);
  } finally {
    if (listRequest === controller) {
      listRequest = null;
      sidebar.setListBusy(false);
    }
  }
}

/** Applies the client-side text search and, once we know where the user is, sorts by distance. */
function applyFilters() {
  const term = state.search.trim().toLowerCase();
  let visible = term
    ? state.locations.filter((location) =>
        [location.name, location.address, location.description].some((value) => value?.toLowerCase().includes(term)),
      )
    : state.locations;

  if (state.userPosition) {
    visible = visible
      .map((location) => ({
        ...location,
        distanceKm: distanceKm(state.userPosition, { lat: location.latitude, lng: location.longitude }),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }

  state.visible = visible;
  sidebar.renderList(visible, {
    selectedId: state.selectedId,
    total: state.locations.length,
    search: state.search.trim(),
    sortedByDistance: Boolean(state.userPosition),
  });
  map.setLocations(visible);
}

function toggleCategory(category) {
  if (category === null) state.categories.clear();
  else if (state.categories.has(category)) state.categories.delete(category);
  else state.categories.add(category);

  // Selecting every category is the same as "All".
  if (state.categories.size === CATEGORIES.length) state.categories.clear();

  sidebar.renderFilters(state.categories);
  loadLocations();
}

/* ---------------------------------------------------------------- geolocation */

async function requestPosition() {
  try {
    const position = await getCurrentPosition();
    state.userPosition = position;
    return position;
  } catch (err) {
    showToast(err.message, { tone: 'error', duration: 6000 });
    throw err;
  }
}

async function findNearMe() {
  const button = document.getElementById('near-me-btn');
  const label = button.querySelector('.near-me__label');
  button.disabled = true;
  button.classList.add('is-loading');
  label.textContent = 'Locating…';

  try {
    const position = await requestPosition();
    map.showUserPosition(position);
    if (sidebar.currentView !== 'list') showList();
    applyFilters();

    const nearest = state.visible[0];
    if (!nearest) {
      showToast('Centered on your location.');
    } else if (nearest.distanceKm > FAR_AWAY_KM) {
      showToast(`No listed spots within ${formatDistance(FAR_AWAY_KM)} yet. Know one? Suggest it!`);
    } else {
      showToast(`Nearest: ${nearest.name} (${formatDistance(nearest.distanceKm)})`);
    }
  } catch {
    // requestPosition already showed the reason.
  } finally {
    button.disabled = false;
    button.classList.remove('is-loading');
    label.textContent = 'Find Near Me';
  }
}

/* ---------------------------------------------------------------- map bootstrap */

function showMapStatus(title, ...text) {
  document.getElementById('map-status-title').textContent = title;
  document.getElementById('map-status-text').replaceChildren(...text);
  document.getElementById('map-status').hidden = false;
  document.getElementById('coords-hint').textContent =
    'The map is unavailable, so enter coordinates or use your current location.';
}

async function initMap() {
  let config;
  try {
    config = await api.getConfig();
  } catch (err) {
    showMapStatus('Map unavailable', err.message);
    return;
  }

  const { apiKey, mapId } = config.googleMaps;
  if (!apiKey) {
    showMapStatus(
      'Add your Google Maps API key',
      'Set ',
      h('code', {}, 'GOOGLE_MAPS_API_KEY'),
      ' in the ',
      h('code', {}, '.env'),
      ' file and restart the server. The spot list still works without the map.',
    );
    return;
  }

  try {
    await map.init({
      apiKey,
      mapId,
      onAuthFailure() {
        map.disable();
        showMapStatus(
          'Google Maps rejected the API key',
          'Check that the Maps JavaScript API is enabled for the key, billing is active, and its HTTP referrer restrictions allow ',
          h('code', {}, `${window.location.origin}/*`),
          '.',
        );
      },
    });
  } catch (err) {
    showMapStatus('Map failed to load', err.message);
  }
}

/* ---------------------------------------------------------------- wiring */

let searchTimer;
document.getElementById('search-input').addEventListener('input', (event) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.search = event.target.value;
    applyFilters();
  }, 120);
});

document.getElementById('suggest-btn').addEventListener('click', openSuggest);
document.getElementById('near-me-btn').addEventListener('click', findNearMe);
document.getElementById('suggest-view').addEventListener('click', (event) => {
  if (event.target.closest('[data-action="suggest-another"]')) openSuggest();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && sidebar.currentView === 'detail') showList();
});

sidebar.renderFilters(state.categories);
initMap();
loadLocations();

import { loadGoogleMaps } from './mapsLoader.js';
import { categoryMeta } from './categories.js';
import { h } from './dom.js';

const WORLD_VIEW = { center: { lat: 20, lng: 0 }, zoom: 2 };
const FOCUS_ZOOM = 15;
const NEAR_ME_ZOOM = 14;

const positionOf = (location) => ({ lat: location.latitude, lng: location.longitude });

/** Marker positions may come back as LatLng instances or plain literals depending on API version. */
function toLiteral(position) {
  if (!position) return null;
  return typeof position.lat === 'function'
    ? { lat: position.lat(), lng: position.lng() }
    : { lat: position.lat, lng: position.lng };
}

function createPin(category, { draft = false } = {}) {
  const meta = categoryMeta(category);
  const pin = h(
    'div',
    { class: draft ? 'map-pin map-pin--draft' : 'map-pin', style: draft ? null : { '--pin-color': meta.color } },
    h('span', { class: 'map-pin__icon', html: meta.icon }),
  );
  return { element: h('div', { class: 'map-marker' }, pin), pin };
}

function createInfoContent(location, onViewDetails) {
  const meta = categoryMeta(location.category);
  return h(
    'div',
    { class: 'info-window' },
    h(
      'span',
      { class: 'badge', style: { '--badge-color': meta.color } },
      h('span', { class: 'badge__icon', html: meta.icon }),
      meta.label,
    ),
    h('p', { class: 'info-window__address' }, location.address),
    h('button', { type: 'button', class: 'btn btn--primary btn--sm', onclick: onViewDetails }, 'View Details'),
  );
}

/**
 * Owns the Google Map, its category markers, the shared InfoWindow, the "you are here" dot and
 * the draggable draft pin used by the suggestion form. Talks back to the app via callbacks only.
 */
export class LocationMap {
  #container;
  #callbacks;
  #map = null;
  #lib = null;
  #infoWindow = null;
  #markers = new Map(); // id -> { marker, pin, location }
  #locations = [];
  #activeId = null;
  #hasFittedBounds = false;
  #userMarker = null;
  #draftMarker = null;
  #pickHandler = null;

  /**
   * @param {HTMLElement} container
   * @param {{ onMarkerSelect?: (id: number) => void, onViewDetails?: (id: number) => void }} callbacks
   */
  constructor(container, callbacks = {}) {
    this.#container = container;
    this.#callbacks = callbacks;
  }

  get isReady() {
    return this.#map !== null;
  }

  async init({ apiKey, mapId, onAuthFailure }) {
    try {
      await this.#create({ apiKey, mapId, onAuthFailure });
    } catch (err) {
      this.disable();
      throw err;
    }
  }

  /** Turns every method into a no-op, e.g. after Google rejects the key, so the list keeps working. */
  disable() {
    this.#map = null;
  }

  async #create({ apiKey, mapId, onAuthFailure }) {
    await loadGoogleMaps({ apiKey, onAuthFailure });
    const [{ Map, InfoWindow }, { AdvancedMarkerElement }, { LatLngBounds }] = await Promise.all([
      google.maps.importLibrary('maps'),
      google.maps.importLibrary('marker'),
      google.maps.importLibrary('core'),
    ]);
    this.#lib = { AdvancedMarkerElement, LatLngBounds };

    this.#map = new Map(this.#container, {
      ...WORLD_VIEW,
      mapId,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      clickableIcons: false,
      gestureHandling: 'greedy',
    });

    this.#infoWindow = new InfoWindow({ maxWidth: 280 });
    this.#infoWindow.addListener('closeclick', () => this.#setActivePin(null));

    this.#map.addListener('click', (event) => {
      if (this.#pickHandler && event.latLng) {
        const position = toLiteral(event.latLng);
        this.setDraftPosition(position);
        this.#pickHandler(position);
      } else {
        this.closeInfo();
      }
    });

    this.#renderMarkers();
  }

  /** Replaces the visible set of locations. Markers are diffed by id so filtering doesn't flicker. */
  setLocations(locations) {
    this.#locations = locations;
    if (!this.isReady) return;
    try {
      this.#renderMarkers();
    } catch (err) {
      // The map is an enhancement; a marker failure must not break the sidebar list.
      console.error('[map] Could not render markers:', err);
    }
  }

  #renderMarkers() {
    const { AdvancedMarkerElement } = this.#lib;
    const nextIds = new Set(this.#locations.map((location) => location.id));

    for (const [id, entry] of this.#markers) {
      if (!nextIds.has(id)) {
        entry.marker.map = null;
        this.#markers.delete(id);
      }
    }

    for (const location of this.#locations) {
      const existing = this.#markers.get(location.id);
      if (existing) {
        existing.location = location;
        continue;
      }
      const { element, pin } = createPin(location.category);
      const marker = new AdvancedMarkerElement({
        map: this.#map,
        position: positionOf(location),
        title: location.name,
        content: element,
        gmpClickable: true,
      });
      marker.addEventListener('gmp-click', () => {
        this.openInfo(location.id);
        this.#callbacks.onMarkerSelect?.(location.id);
      });
      this.#markers.set(location.id, { marker, pin, location });
    }

    if (this.#activeId !== null && !this.#markers.has(this.#activeId)) this.closeInfo();

    if (!this.#hasFittedBounds && this.#locations.length > 0 && !this.#userMarker) {
      this.#fitTo(this.#locations);
      this.#hasFittedBounds = true;
    }
  }

  #fitTo(locations) {
    if (locations.length === 1) {
      this.#map.setCenter(positionOf(locations[0]));
      this.#map.setZoom(FOCUS_ZOOM);
      return;
    }
    const bounds = new this.#lib.LatLngBounds();
    for (const location of locations) bounds.extend(positionOf(location));
    this.#map.fitBounds(bounds, 56);
  }

  /** Opens the InfoWindow (name, address, "View Details") on a marker. Returns false if not shown. */
  openInfo(id) {
    const entry = this.#markers.get(id);
    if (!this.isReady || !entry) return false;

    this.#infoWindow.setOptions({
      headerContent: h('h3', { class: 'info-window__title' }, entry.location.name),
      content: createInfoContent(entry.location, () => this.#callbacks.onViewDetails?.(id)),
    });
    this.#infoWindow.open({ anchor: entry.marker, map: this.#map, shouldFocus: false });
    this.#setActivePin(id);
    return true;
  }

  /** Pans/zooms to a location and opens its InfoWindow (used when a sidebar card is clicked). */
  focusLocation(id) {
    const entry = this.#markers.get(id);
    if (!this.isReady || !entry) return;
    this.#map.panTo(positionOf(entry.location));
    if ((this.#map.getZoom() ?? 0) < FOCUS_ZOOM) this.#map.setZoom(FOCUS_ZOOM);
    this.openInfo(id);
  }

  closeInfo() {
    this.#infoWindow?.close();
    this.#setActivePin(null);
  }

  #setActivePin(id) {
    const previous = this.#markers.get(this.#activeId);
    if (previous) {
      previous.pin.classList.remove('is-active');
      previous.marker.zIndex = null;
    }
    this.#activeId = id;
    const current = this.#markers.get(id);
    if (current) {
      current.pin.classList.add('is-active');
      current.marker.zIndex = 1000;
    }
  }

  /** Drops a pulsing "you are here" dot and centers the map on it. */
  showUserPosition(position) {
    if (!this.isReady) return;
    if (this.#userMarker) {
      this.#userMarker.position = position;
    } else {
      this.#userMarker = new this.#lib.AdvancedMarkerElement({
        map: this.#map,
        position,
        title: 'You are here',
        content: h('div', { class: 'user-dot' }),
        zIndex: 2000,
      });
    }
    this.#map.panTo(position);
    this.#map.setZoom(NEAR_ME_ZOOM);
  }

  /** While picking, map clicks and drags of the draft pin report coordinates to `onPick`. */
  startPicking(onPick) {
    this.#pickHandler = onPick;
    if (!this.isReady) return;
    this.closeInfo();
    this.#map.setOptions({ draggableCursor: 'crosshair' });
  }

  stopPicking() {
    this.#pickHandler = null;
    if (this.#draftMarker) {
      this.#draftMarker.map = null;
      this.#draftMarker = null;
    }
    this.#map?.setOptions({ draggableCursor: null });
  }

  setDraftPosition(position, { pan = false } = {}) {
    if (!this.isReady) return;
    if (this.#draftMarker) {
      this.#draftMarker.position = position;
    } else {
      this.#draftMarker = new this.#lib.AdvancedMarkerElement({
        map: this.#map,
        position,
        title: 'New spot (drag to adjust)',
        content: createPin(null, { draft: true }).element,
        gmpDraggable: true,
        zIndex: 3000,
      });
      this.#draftMarker.addEventListener('gmp-dragend', () => {
        this.#pickHandler?.(toLiteral(this.#draftMarker.position));
      });
    }
    if (pan) this.#map.panTo(position);
  }
}

const GEOLOCATION_ERRORS = {
  1: 'Location access was blocked. Allow location for this site in your browser settings, then try again.',
  2: 'Your location is unavailable right now. Check that location services are on and try again.',
  3: 'Finding your location took too long. Please try again.',
};

/** Promise wrapper around navigator.geolocation.getCurrentPosition with friendly error messages. */
export function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!window.isSecureContext) {
      reject(new Error('Location is only available over HTTPS or on localhost.'));
      return;
    }
    if (!('geolocation' in navigator)) {
      reject(new Error('Your browser does not support location services.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy }),
      (err) => reject(new Error(GEOLOCATION_ERRORS[err.code] ?? 'Could not determine your location.')),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000, ...options },
    );
  });
}

const EARTH_RADIUS_KM = 6371;
const toRadians = (degrees) => (degrees * Math.PI) / 180;

/** Great-circle (haversine) distance between two { lat, lng } points, in kilometres. */
export function distanceKm(a, b) {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

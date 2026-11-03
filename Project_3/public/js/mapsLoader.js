const CALLBACK_NAME = '__zeroWasteMapsReady';

let loadPromise = null;

/**
 * Loads the Google Maps JavaScript API once, using `loading=async` so libraries can be pulled in
 * on demand with google.maps.importLibrary(). The key comes from GET /api/config (i.e. the server's
 * .env), never from source code.
 *
 * @param {{ apiKey: string, version?: string, onAuthFailure?: () => void }} options
 */
export function loadGoogleMaps({ apiKey, version = 'weekly', onAuthFailure }) {
  if (loadPromise) return loadPromise;
  if (!apiKey) return Promise.reject(new Error('Missing Google Maps API key.'));

  // Google calls this global when the key is invalid, restricted, or billing is disabled.
  window.gm_authFailure = () => onAuthFailure?.();

  loadPromise = new Promise((resolve, reject) => {
    window[CALLBACK_NAME] = () => {
      delete window[CALLBACK_NAME];
      resolve(window.google.maps);
    };

    const params = new URLSearchParams({ key: apiKey, v: version, loading: 'async', callback: CALLBACK_NAME });
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async = true;
    script.onerror = () => {
      loadPromise = null;
      script.remove();
      reject(new Error('The Google Maps JavaScript API could not be loaded. Check your network connection.'));
    };
    document.head.append(script);
  });

  return loadPromise;
}

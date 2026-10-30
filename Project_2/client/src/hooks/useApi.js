import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api.js';

/**
 * Loads `path` from the API, tracking loading and error state.
 * Pass null to skip the request. `reload` retries after a failure.
 */
export function useApi(path) {
  const [state, setState] = useState({ data: null, error: null, loading: Boolean(path) });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!path) {
      setState({ data: null, error: null, loading: false });
      return undefined;
    }

    const controller = new AbortController();
    setState({ data: null, error: null, loading: true });
    api.get(path, { signal: controller.signal }).then(
      (data) => setState({ data, error: null, loading: false }),
      (error) => {
        if (error.name !== 'AbortError') setState({ data: null, error, loading: false });
      },
    );
    return () => controller.abort();
  }, [path, attempt]);

  const reload = useCallback(() => setAttempt((count) => count + 1), []);

  return { ...state, reload };
}

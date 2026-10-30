import { useEffect } from 'react';
import { SITE_NAME, SITE_TAGLINE } from '../lib/site.js';

export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE_NAME}` : `${SITE_NAME} — ${SITE_TAGLINE}`;
  }, [title]);
}

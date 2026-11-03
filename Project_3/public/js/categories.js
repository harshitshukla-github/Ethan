// Display metadata for each locations.category value. Keys must match src/constants.js.

const svg = (paths) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;

export const CATEGORY_META = Object.freeze({
  compost: {
    label: 'Compost',
    color: '#4f8a2b',
    // Sprout
    icon: svg('<path d="M12 21v-8"/><path d="M12 13c0-5 3.5-8.5 9-9 0 6-3.5 9-9 9z"/><path d="M12 15c0-3.5-2.5-6-7-6.5 0 4.5 2.5 6.5 7 6.5z"/>'),
  },
  electronics: {
    label: 'E-waste',
    color: '#3f5fd1',
    // Plug
    icon: svg('<path d="M9 2v5M15 2v5"/><path d="M6 7h12v4a6 6 0 0 1-12 0z"/><path d="M12 17v5"/>'),
  },
  bulk_goods: {
    label: 'Bulk & refill',
    color: '#c0780f',
    // Jar
    icon: svg('<path d="M8 2.5h8v3.5H8z"/><path d="M7 6h10a2 2 0 0 1 2 2v11a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 19V8a2 2 0 0 1 2-2z"/><path d="M5 12h14"/>'),
  },
  recycling_center: {
    label: 'Recycling center',
    color: '#12867b',
    // Circular arrows
    icon: svg('<path d="M20 12a8 8 0 0 1-14 5.3"/><path d="M4 12a8 8 0 0 1 14-5.3"/><path d="M18 2.5v4.2h-4.2"/><path d="M6 21.5v-4.2h4.2"/>'),
  },
});

export const CATEGORIES = Object.freeze(Object.keys(CATEGORY_META));

const FALLBACK = { label: 'Other', color: '#6b7280', icon: svg('<circle cx="12" cy="12" r="4"/>') };

export function categoryMeta(category) {
  return CATEGORY_META[category] ?? { ...FALLBACK, label: category ?? FALLBACK.label };
}

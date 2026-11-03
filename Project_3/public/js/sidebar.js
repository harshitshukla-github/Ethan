import { CATEGORIES, categoryMeta } from './categories.js';
import { ICONS, formatDate, formatDistance, h, safeHttpUrl, stars } from './dom.js';

const $ = (id) => document.getElementById(id);

function categoryBadge(category) {
  const meta = categoryMeta(category);
  return h(
    'span',
    { class: 'badge', style: { '--badge-color': meta.color } },
    h('span', { class: 'badge__icon', html: meta.icon }),
    meta.label,
  );
}

/** Returns status-box child nodes (falsy parts dropped, since replaceChildren would print "false"). */
function statusBox({ title, text, action, spinner = false }) {
  return [
    spinner && h('div', { class: 'spinner', 'aria-hidden': 'true' }),
    title && h('p', { class: 'status__title' }, title),
    text && h('p', {}, text),
    action && h('button', { type: 'button', class: 'btn btn--ghost btn--sm', onclick: action.onClick }, action.label),
  ].filter(Boolean);
}

/**
 * Renders the left panel: category chips, the location list, the detail view and view switching.
 * It holds no data of its own; main.js passes everything in and receives user intent via callbacks.
 */
export class Sidebar {
  #views = { list: $('list-view'), detail: $('detail-view'), suggest: $('suggest-view') };
  #toolbar = $('list-toolbar');
  #footer = $('sidebar-footer');
  #body = $('sidebar-body');
  #list = $('location-list');
  #listStatus = $('list-status');
  #listCount = $('list-count');
  #chips = $('category-filters');
  #currentView = 'list';
  #listScrollTop = 0;
  #callbacks;

  /**
   * @param {{ onSelect: (id: number) => void, onBack: () => void, onToggleCategory: (c: string|null) => void }} callbacks
   */
  constructor(callbacks) {
    this.#callbacks = callbacks;

    this.#list.addEventListener('click', (event) => {
      const card = event.target.closest('.loc-card');
      if (card) callbacks.onSelect(Number(card.dataset.id));
    });

    this.#chips.addEventListener('click', (event) => {
      const chip = event.target.closest('.chip');
      if (chip) callbacks.onToggleCategory(chip.dataset.category || null);
    });

    document.querySelector('.sidebar').addEventListener('click', (event) => {
      if (event.target.closest('[data-action="back"]')) callbacks.onBack();
    });
  }

  get currentView() {
    return this.#currentView;
  }

  showView(name) {
    if (this.#currentView === 'list') this.#listScrollTop = this.#body.scrollTop;
    this.#currentView = name;
    for (const [key, view] of Object.entries(this.#views)) view.hidden = key !== name;
    this.#toolbar.hidden = name !== 'list';
    this.#footer.hidden = name === 'suggest';
    this.#body.scrollTop = name === 'list' ? this.#listScrollTop : 0;
  }

  renderFilters(activeCategories) {
    const allActive = activeCategories.size === 0;
    const chips = [
      h('button', { type: 'button', class: 'chip chip--all', 'data-category': '', 'aria-pressed': String(allActive) }, 'All'),
      ...CATEGORIES.map((category) => {
        const meta = categoryMeta(category);
        return h(
          'button',
          {
            type: 'button',
            class: 'chip',
            'data-category': category,
            'aria-pressed': String(activeCategories.has(category)),
            style: { '--chip-color': meta.color },
          },
          h('span', { class: 'chip__icon', html: meta.icon }),
          meta.label,
        );
      }),
    ];
    this.#chips.replaceChildren(...chips);
  }

  /** Dims the current list while a refetch (e.g. a category change) is in flight, instead of blanking it. */
  setListBusy(busy) {
    this.#list.classList.toggle('is-busy', busy);
    this.#views.list.setAttribute('aria-busy', String(busy));
  }

  showListLoading() {
    this.#list.replaceChildren();
    this.#listCount.textContent = '';
    this.#listStatus.className = 'status';
    this.#listStatus.replaceChildren(...statusBox({ spinner: true, text: 'Loading spots…' }));
    this.#listStatus.hidden = false;
  }

  showListError(message, onRetry) {
    this.#list.replaceChildren();
    this.#listCount.textContent = '';
    this.#listStatus.className = 'status status--error';
    this.#listStatus.replaceChildren(
      ...statusBox({ title: 'Couldn’t load spots', text: message, action: { label: 'Try again', onClick: onRetry } }),
    );
    this.#listStatus.hidden = false;
  }

  /**
   * @param {Array<object & { distanceKm?: number }>} locations already filtered and sorted
   * @param {{ selectedId: number|null, total: number, search: string, sortedByDistance: boolean }} info
   */
  renderList(locations, { selectedId, total, search, sortedByDistance }) {
    this.#listCount.textContent =
      locations.length === total
        ? `${total} ${total === 1 ? 'spot' : 'spots'}${sortedByDistance ? ' · nearest first' : ''}`
        : `${locations.length} of ${total} match`;

    if (locations.length === 0) {
      this.#list.replaceChildren();
      this.#listStatus.className = 'status';
      this.#listStatus.replaceChildren(
        ...statusBox({
          title: 'No spots found',
          text: search
            ? `Nothing matches “${search}”. Try a different search or category.`
            : 'No verified spots in these categories yet. Know one? Suggest it below.',
        }),
      );
      this.#listStatus.hidden = false;
      return;
    }

    this.#listStatus.hidden = true;
    this.#list.replaceChildren(...locations.map((location) => this.#card(location, location.id === selectedId)));
  }

  #card(location, selected) {
    const meta = categoryMeta(location.category);
    return h(
      'li',
      {},
      h(
        'button',
        {
          type: 'button',
          class: selected ? 'loc-card is-selected' : 'loc-card',
          'data-id': location.id,
          'aria-current': selected ? 'true' : null,
          style: { '--cat-color': meta.color },
        },
        h('span', { class: 'loc-card__icon', html: meta.icon }),
        h(
          'span',
          { class: 'loc-card__body' },
          h('span', { class: 'loc-card__name' }, location.name),
          h('span', { class: 'loc-card__address' }, location.address),
          h(
            'span',
            { class: 'loc-card__meta' },
            h('span', { class: 'loc-card__category' }, meta.label),
            location.review_count > 0 &&
              h(
                'span',
                { class: 'loc-card__rating' },
                stars(location.avg_rating),
                `${location.avg_rating.toFixed(1)} (${location.review_count})`,
              ),
            location.distanceKm !== undefined &&
              h('span', { class: 'loc-card__distance' }, formatDistance(location.distanceKm)),
          ),
        ),
      ),
    );
  }

  /** Highlights a card (e.g. after a marker click) and optionally scrolls it into view. */
  highlight(id, { scroll = false, flash = false } = {}) {
    for (const card of this.#list.querySelectorAll('.loc-card')) {
      const match = Number(card.dataset.id) === id;
      card.classList.toggle('is-selected', match);
      if (match) {
        card.setAttribute('aria-current', 'true');
        if (scroll) card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        if (flash) {
          card.classList.remove('is-flash');
          void card.offsetWidth; // restart the animation
          card.classList.add('is-flash');
        }
      } else {
        card.removeAttribute('aria-current');
      }
    }
  }

  showDetailLoading() {
    this.#views.detail.replaceChildren(
      this.#backButton(),
      h('div', { class: 'status' }, ...statusBox({ spinner: true, text: 'Loading details…' })),
    );
  }

  showDetailError(message) {
    this.#views.detail.replaceChildren(
      this.#backButton(),
      h('div', { class: 'status status--error' }, ...statusBox({ title: 'Couldn’t load this spot', text: message })),
    );
  }

  renderDetail(location, { distanceKm } = {}) {
    const website = safeHttpUrl(location.website);
    const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`;
    const fact = (label, icon, content) =>
      content &&
      h(
        'div',
        { class: 'facts__row' },
        h('dt', {}, h('span', { html: icon }), h('span', { class: 'visually-hidden' }, label)),
        h('dd', {}, content),
      );

    const title = h('h2', { class: 'view__title', tabindex: '-1' }, location.name);

    this.#views.detail.replaceChildren(
      this.#backButton(),
      h(
        'div',
        { class: 'detail__badges' },
        categoryBadge(location.category),
        location.is_verified &&
          h('span', { class: 'badge badge--verified' }, h('span', { html: ICONS.check }), 'Verified'),
      ),
      title,
      location.review_count > 0
        ? h(
            'div',
            { class: 'detail__rating' },
            stars(location.avg_rating),
            h('strong', {}, location.avg_rating.toFixed(1)),
            `· ${location.review_count} ${location.review_count === 1 ? 'review' : 'reviews'}`,
          )
        : h('div', { class: 'detail__rating' }, 'No ratings yet'),
      location.description ? h('p', { class: 'detail__description' }, location.description) : '',
      h(
        'dl',
        { class: 'facts' },
        fact(
          'Address',
          ICONS.pin,
          distanceKm === undefined ? location.address : `${location.address} · ${formatDistance(distanceKm)} away`,
        ),
        fact('Opening hours', ICONS.clock, location.hours),
        fact(
          'Phone',
          ICONS.phone,
          location.phone && h('a', { href: `tel:${location.phone.replace(/[^\d+]/g, '')}` }, location.phone),
        ),
        fact(
          'Website',
          ICONS.globe,
          website && h('a', { href: website, target: '_blank', rel: 'noopener noreferrer' }, new URL(website).hostname),
        ),
      ),
      h(
        'div',
        { class: 'detail__actions' },
        h(
          'a',
          { class: 'btn btn--primary', href: directionsUrl, target: '_blank', rel: 'noopener noreferrer' },
          h('span', { html: ICONS.route }),
          'Get directions',
        ),
      ),
      this.#reviews(location.reviews ?? []),
    );
    title.focus({ preventScroll: true });
  }

  #reviews(reviews) {
    return h(
      'section',
      { class: 'reviews', 'aria-labelledby': 'reviews-heading' },
      h('h3', { class: 'reviews__title', id: 'reviews-heading' }, `Reviews (${reviews.length})`),
      reviews.length === 0
        ? h('p', { class: 'reviews__empty' }, 'No reviews yet.')
        : h(
            'ul',
            { class: 'reviews__list' },
            ...reviews.map((review) =>
              h(
                'li',
                { class: 'review' },
                h(
                  'div',
                  { class: 'review__header' },
                  h('span', { class: 'review__author' }, review.username ?? 'Former member'),
                  stars(review.rating),
                ),
                h('time', { class: 'review__date', datetime: review.created_at }, formatDate(review.created_at)),
                review.comment
                  ? h('p', { class: 'review__comment' }, review.comment)
                  : h('p', { class: 'review__comment review__comment--empty' }, 'Rated without a comment.'),
              ),
            ),
          ),
    );
  }

  #backButton() {
    return h('button', { type: 'button', class: 'back-link', 'data-action': 'back' }, h('span', { html: ICONS.back }), 'Back to list');
  }
}

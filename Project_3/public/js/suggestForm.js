import { CATEGORIES, categoryMeta } from './categories.js';
import { h } from './dom.js';

const OPTIONAL_FIELDS = ['description', 'website', 'phone', 'hours'];

/**
 * The "Suggest a spot" form: serialisation, client-side checks, and showing server-side
 * validation errors next to the right fields. Coordinates can be set from the map.
 */
export class SuggestForm {
  #form = document.getElementById('suggest-form');
  #success = document.getElementById('suggest-success');
  #successText = document.getElementById('suggest-success-text');
  #formError = document.getElementById('suggest-form-error');
  #submit = document.getElementById('suggest-submit');
  #lat = document.getElementById('sg-lat');
  #lng = document.getElementById('sg-lng');

  /**
   * @param {{ onSubmit: (payload: object) => Promise<string>, onCoordsChange: (pos: {lat:number,lng:number}) => void,
   *           onUseMyLocation: () => Promise<{lat:number,lng:number}> }} callbacks
   */
  constructor({ onSubmit, onCoordsChange, onUseMyLocation }) {
    const select = document.getElementById('sg-category');
    select.append(...CATEGORIES.map((category) => h('option', { value: category }, categoryMeta(category).label)));

    this.#form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!this.#checkClientSide()) return;

      this.#setBusy(true);
      try {
        const message = await onSubmit(this.#serialize());
        this.#showSuccess(message);
      } catch (err) {
        this.showErrors(err.message, err.details);
      } finally {
        this.#setBusy(false);
      }
    });

    // Typing coordinates moves the draft pin; ignore half-typed values.
    for (const input of [this.#lat, this.#lng]) {
      input.addEventListener('change', () => {
        const position = this.#coords();
        if (position) onCoordsChange(position);
      });
    }

    const useLocation = document.getElementById('sg-use-location');
    useLocation.addEventListener('click', async () => {
      useLocation.disabled = true;
      try {
        const position = await onUseMyLocation();
        this.setCoords(position);
        onCoordsChange(position);
      } catch {
        // main.js already surfaced the error in a toast.
      } finally {
        useLocation.disabled = false;
      }
    });
  }

  reset() {
    this.#form.reset();
    this.clearErrors();
    this.#form.hidden = false;
    this.#success.hidden = true;
  }

  focusFirstField() {
    document.getElementById('sg-name').focus();
  }

  setCoords({ lat, lng }) {
    this.#lat.value = lat.toFixed(6);
    this.#lng.value = lng.toFixed(6);
    this.#setFieldError('latitude', '');
    this.#setFieldError('longitude', '');
  }

  #coords() {
    const lat = this.#lat.valueAsNumber;
    const lng = this.#lng.valueAsNumber;
    const valid = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
    return valid ? { lat, lng } : null;
  }

  #serialize() {
    const data = Object.fromEntries(new FormData(this.#form));
    const payload = {
      name: data.name.trim(),
      category: data.category,
      address: data.address.trim(),
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
    };
    for (const field of OPTIONAL_FIELDS) {
      const value = data[field]?.trim();
      if (value) payload[field] = value;
    }
    return payload;
  }

  /** Uses the browser's constraint validation for quick feedback; the server re-validates everything. */
  #checkClientSide() {
    this.clearErrors();
    let firstInvalid = null;
    for (const element of this.#form.elements) {
      if (!element.name || element.validity.valid) continue;
      this.#setFieldError(element.name, element.validationMessage);
      firstInvalid ??= element;
    }
    firstInvalid?.focus();
    return firstInvalid === null;
  }

  showErrors(message, details) {
    let firstInvalid = null;
    for (const [field, fieldMessage] of Object.entries(details ?? {})) {
      const element = this.#setFieldError(field, fieldMessage);
      firstInvalid ??= element;
    }
    this.#formError.textContent = message;
    this.#formError.hidden = false;
    firstInvalid?.focus();
  }

  clearErrors() {
    this.#formError.hidden = true;
    for (const element of this.#form.querySelectorAll('[data-error-for]')) {
      this.#setFieldError(element.dataset.errorFor, '');
    }
  }

  #setFieldError(field, message) {
    const input = this.#form.elements.namedItem(field);
    const error = this.#form.querySelector(`[data-error-for="${field}"]`);
    if (error) {
      error.textContent = message;
      error.id ||= `error-${field}`;
    }
    if (input instanceof HTMLElement) {
      if (message) {
        input.setAttribute('aria-invalid', 'true');
        input.setAttribute('aria-errormessage', error?.id ?? '');
      } else {
        input.removeAttribute('aria-invalid');
        input.removeAttribute('aria-errormessage');
      }
    }
    return input instanceof HTMLElement ? input : null;
  }

  #setBusy(busy) {
    this.#submit.disabled = busy;
    this.#submit.textContent = busy ? 'Submitting…' : 'Submit for review';
  }

  #showSuccess(message) {
    this.#successText.textContent = message;
    this.#form.hidden = true;
    this.#success.hidden = false;
    this.#success.focus();
  }
}

const numberFormat = new Intl.NumberFormat();

export const formatNumber = (value) => numberFormat.format(value);

/**
 * Formats an ISO date that may be partial, as mission dates are:
 * '1969-07-20' → '20 Jul 1969', '2028-07' → 'Jul 2028', '2027' → '2027'.
 */
export function formatPartialDate(value) {
  const [year, month, day] = value.split('-');
  if (!month) return year;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day ?? 1)));
  return new Intl.DateTimeFormat(undefined, {
    day: day ? 'numeric' : undefined,
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export const yearOf = (partialDate) => partialDate.slice(0, 4);

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
// For dates published without a time: reading them in local time could shift the day.
const utcDateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' });
const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short',
});
const monthFormat = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' });

export const formatDate = (value) => dateFormat.format(new Date(value));
export const formatUtcDate = (value) => utcDateFormat.format(new Date(value));
export const formatDateTime = (value) => dateTimeFormat.format(new Date(value));
export const formatMonth = (value) => monthFormat.format(new Date(value));

export function splitDuration(milliseconds) {
  const total = Math.max(0, Math.floor(milliseconds / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

export function formatRelativeTime(timestamp, now = Date.now()) {
  const minutes = Math.round((now - timestamp) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return formatDate(timestamp);
}

export const firstName = (fullName) => fullName.split(' ')[0];

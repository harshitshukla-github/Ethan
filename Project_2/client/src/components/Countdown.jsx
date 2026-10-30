import { splitDuration } from '../lib/format.js';

const pad = (value) => String(value).padStart(2, '0');

// Time remaining until `target`. `now` comes from the page's useNow() so all countdowns tick together.
export default function Countdown({ target, now, size = 'md' }) {
  const remaining = new Date(target).getTime() - now;

  if (remaining <= 0) {
    return <p className={`countdown countdown--${size} countdown--done`}>Liftoff time reached</p>;
  }

  const { days, hours, minutes, seconds } = splitDuration(remaining);
  const units = [
    ['days', days],
    ['hrs', pad(hours)],
    ['min', pad(minutes)],
    ['sec', pad(seconds)],
  ];

  return (
    <div
      className={`countdown countdown--${size}`}
      role="timer"
      aria-label={`${days} days, ${hours} hours and ${minutes} minutes until launch`}
    >
      {units.map(([unit, value]) => (
        <span key={unit} className="countdown__unit">
          <span className="countdown__value">{value}</span>
          <span className="countdown__label">{unit}</span>
        </span>
      ))}
    </div>
  );
}

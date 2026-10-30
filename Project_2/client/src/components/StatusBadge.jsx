const tones = {
  // Mission catalog
  Active: 'green',
  Completed: 'blue',
  Planned: 'amber',
  // Launch Library status codes
  Go: 'green',
  Success: 'green',
  'In Flight': 'blue',
  TBC: 'amber',
  TBD: 'muted',
  Hold: 'rose',
  Failure: 'rose',
};

export default function StatusBadge({ status, label = status }) {
  return <span className={`badge badge--${tones[status] ?? 'muted'}`}>{label}</span>;
}

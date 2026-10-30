const ORBITS = ['mercury', 'venus', 'earth', 'mars', 'jupiter'];

// Decorative model of the inner solar system for the home page hero. Animated in CSS.
export default function Orrery() {
  return (
    <div className="orrery" aria-hidden="true">
      <span className="orrery__sun" />
      {ORBITS.map((planet) => (
        <span key={planet} className={`orrery__orbit orrery__orbit--${planet}`}>
          <span className="orrery__planet" />
        </span>
      ))}
    </div>
  );
}

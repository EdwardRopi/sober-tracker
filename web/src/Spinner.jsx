export default function Spinner({ label }) {
  return (
    <div className="spinner-wrap">
      <div className="spinner" />
      {label && <p className="hint">{label}</p>}
    </div>
  );
}

export function StatCard({ title, value, accent, subtitle }) {
  return (
    <article className={`stat-card stat-card--${accent || "blue"}`}>
      <span className="stat-card__title">{title}</span>
      <strong className="stat-card__value">{value}</strong>
      {subtitle ? <span className="stat-card__subtitle">{subtitle}</span> : null}
    </article>
  );
}

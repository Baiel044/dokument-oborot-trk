const icons = {
  requests: (
    <>
      <path d="M12 5.5v13" />
      <path d="M5.5 12h13" />
      <path d="m7.75 7.75 8.5 8.5" />
      <path d="m16.25 7.75-8.5 8.5" />
    </>
  ),
  messages: (
    <>
      <path d="M6 6h12v9H9l-3 3V6Z" />
      <path d="M9 10h6" />
      <path d="M9 13h4" />
    </>
  ),
  documents: (
    <>
      <path d="M7 4h7l3 3v13H7V4Z" />
      <path d="M14 4v4h4" />
      <path d="M10 12h5" />
      <path d="M10 15h5" />
    </>
  ),
  notifications: (
    <>
      <path d="M17 10a5 5 0 0 0-10 0c0 5-2 6-2 7h14c0-1-2-2-2-7Z" />
      <path d="M10 20h4" />
    </>
  ),
};

export function StatCard({ title, value, accent, subtitle, icon, onClick, ariaLabel }) {
  const content = (
    <>
      <span className="stat-card__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">{icons[icon] || icons.documents}</svg>
      </span>
      <span className="stat-card__body">
        <span className="stat-card__title">{title}</span>
        <strong className="stat-card__value">{value}</strong>
        {subtitle ? <span className="stat-card__subtitle">{subtitle}</span> : null}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button
        className={`stat-card stat-card--${accent || "blue"} stat-card--clickable`}
        type="button"
        onClick={onClick}
        aria-label={ariaLabel || title}
      >
        {content}
      </button>
    );
  }

  return (
    <article className={`stat-card stat-card--${accent || "blue"}`}>
      {content}
    </article>
  );
}

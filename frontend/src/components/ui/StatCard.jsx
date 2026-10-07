import { Bell, ChevronRight, FileText, FolderOpen, MessageSquare } from "lucide-react";

const icons = {
  requests: FileText,
  messages: MessageSquare,
  documents: FolderOpen,
  notifications: Bell,
};

export function StatCard({ title, value, accent, subtitle, icon, onClick, ariaLabel }) {
  const Icon = icons[icon] || FolderOpen;
  const content = (
    <>
      <span className="stat-card__top">
        <span className="stat-card__title">{title}</span>
        <span className="stat-card__icon kpi-card-icon" aria-hidden="true">
          <Icon size={20} strokeWidth={2} />
        </span>
      </span>
      <strong className="stat-card__value mono-num">{value}</strong>
      {subtitle || onClick ? (
        <span className="stat-card__subtitle">
          {subtitle}
          {onClick ? <ChevronRight className="stat-card__chevron" size={14} aria-hidden="true" /> : null}
        </span>
      ) : null}
    </>
  );

  const className = `card card-hoverable stat-card stat-card--${accent || "blue"}`;

  if (onClick) {
    return (
      <button className={`${className} stat-card--clickable`} type="button" onClick={onClick} aria-label={ariaLabel || title}>
        {content}
      </button>
    );
  }

  return <article className={className}>{content}</article>;
}

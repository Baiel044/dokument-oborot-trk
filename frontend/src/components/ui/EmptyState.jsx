import { Inbox } from "lucide-react";

export function EmptyState({ title, text, icon: Icon = Inbox }) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon" aria-hidden="true">
        <Icon size={26} />
      </span>
      <h3 className="empty-state-title">{title}</h3>
      {text ? <p className="empty-state-subtitle">{text}</p> : null}
    </div>
  );
}

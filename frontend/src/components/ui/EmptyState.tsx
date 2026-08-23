import Icon, { type IconName } from "./Icon";

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      className="rounded-xl p-12 border text-center transition-theme"
      style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}
    >
      {icon && (
        <div className="mb-4 opacity-20">
          <Icon name={icon} size={48} />
        </div>
      )}
      <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
        {title}
      </h3>
      {description && (
        <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="flex items-center gap-1.5 mx-auto px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
          style={{ backgroundColor: "var(--color-accent)", color: "#000" }}
        >
          <Icon name="plus" size={14} />
          {action.label}
        </button>
      )}
    </div>
  );
}

import Icon, { type IconName } from "./Icon";

interface StatCardProps {
  label: string;
  value: number | string;
  subtitle?: string;
  color: string;
  icon?: IconName;
}

export default function StatCard({ label, value, subtitle, color, icon }: StatCardProps) {
  return (
    <div
      className="relative overflow-hidden rounded-xl py-5 pr-5 pl-6 border transition-theme group hover:-translate-y-0.5"
      style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}
    >
      <span
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <div className="flex items-center justify-between mb-3">
        <div className="eyebrow" style={{ color: "var(--color-text-muted)" }}>
          {label}
        </div>
        {icon && (
          <span className="opacity-30 group-hover:opacity-70 transition-opacity" style={{ color }}>
            <Icon name={icon} size={20} />
          </span>
        )}
      </div>
      <div className="text-3xl font-bold font-mono" style={{ color }}>
        {value}
      </div>
      {subtitle && (
        <div className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

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
      className="rounded-xl p-5 border transition-theme group hover:scale-[1.02]"
      style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className="text-[10px] uppercase tracking-widest font-mono font-semibold"
          style={{ color: "var(--color-text-muted)" }}
        >
          {label}
        </div>
        {icon && (
          <span className="opacity-30 group-hover:opacity-60 transition-opacity" style={{ color }}>
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

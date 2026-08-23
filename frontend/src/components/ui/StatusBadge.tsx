import type { CapsuleStatus } from "../../types";

const STATUS_CONFIG: Record<
  CapsuleStatus,
  { bg: string; text: string; dot: string }
> = {
  OPEN: {
    bg: "rgba(56, 189, 248, 0.12)",
    text: "var(--color-status-open)",
    dot: "var(--color-status-open)",
  },
  IN_REVIEW: {
    bg: "rgba(251, 191, 36, 0.12)",
    text: "var(--color-status-review)",
    dot: "var(--color-status-review)",
  },
  ANSWERED: {
    bg: "rgba(167, 139, 250, 0.12)",
    text: "var(--color-status-answered)",
    dot: "var(--color-status-answered)",
  },
  RESOLVED: {
    bg: "rgba(34, 197, 94, 0.12)",
    text: "var(--color-status-resolved)",
    dot: "var(--color-status-resolved)",
  },
  ARCHIVED: {
    bg: "rgba(107, 114, 128, 0.12)",
    text: "var(--color-status-archived)",
    dot: "var(--color-status-archived)",
  },
};

export default function StatusBadge({
  status,
  size = "sm",
}: {
  status: CapsuleStatus | string;
  size?: "sm" | "md";
}) {
  const key = status.replace(" ", "_") as CapsuleStatus;
  const cfg = STATUS_CONFIG[key] || STATUS_CONFIG.OPEN;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
      }`}
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: cfg.dot }}
      />
      {status.replace("_", " ")}
    </span>
  );
}

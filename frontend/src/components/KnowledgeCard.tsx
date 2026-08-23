import type { KnowledgeItem } from "../types";
import Tag from "./ui/Tag";

interface KnowledgeCardProps {
  item: KnowledgeItem;
  onView?: () => void;
}

export default function KnowledgeCard({ item, onView }: KnowledgeCardProps) {
  const confidence = Math.round((item.confidence || 0) * 100);

  return (
    <div
      className="rounded-xl border p-5 transition-all hover:scale-[1.01] hover:shadow-lg group"
      style={{
        backgroundColor: "var(--color-bg-card)",
        borderColor: "var(--color-border)",
      }}
    >
      {/* Title */}
      <h3
        className="text-sm font-semibold mb-1.5 group-hover:text-[var(--color-accent)] transition-colors"
        style={{ color: "var(--color-text-primary)" }}
      >
        {item.title}
      </h3>

      {/* Summary */}
      <p
        className="text-xs leading-relaxed mb-3 line-clamp-3"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {item.summary || item.solution?.substring(0, 150)}
      </p>

      {/* Tags */}
      {item.tags && item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {item.tags.slice(0, 4).map((t: string) => (
            <Tag key={t} label={t} />
          ))}
        </div>
      )}

      {/* Footer: confidence + view action */}
      <div
        className="flex items-center justify-between pt-3 border-t"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="h-1.5 w-16 rounded-full overflow-hidden"
            style={{ backgroundColor: "var(--color-bg-input)" }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${confidence}%`,
                backgroundColor:
                  confidence >= 80
                    ? "var(--color-status-resolved)"
                    : confidence >= 50
                    ? "var(--color-status-review)"
                    : "var(--color-status-open)",
              }}
            />
          </div>
          <span className="text-[10px] font-mono" style={{ color: "var(--color-text-muted)" }}>
            {confidence}% confidence
          </span>
        </div>

        {onView && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onView();
            }}
            className="text-[11px] font-medium px-3 py-1 rounded-lg transition-all hover:opacity-80"
            style={{
              backgroundColor: "var(--color-accent-dim)",
              color: "var(--color-accent)",
            }}
          >
            View solution →
          </button>
        )}
      </div>
    </div>
  );
}

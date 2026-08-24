import type { KnowledgeItem } from "../types";
import Tag from "./ui/Tag";
import Icon from "./ui/Icon";

interface KnowledgeCardProps {
  item: KnowledgeItem;
  /** Position in the list — rendered as the mono line number in the gutter. */
  index?: number;
  onView?: () => void;
  /** Show a PUBLIC pill (used on community/global surfaces). */
  showPublic?: boolean;
}

/**
 * The signature card: a knowledge entry framed like a line in a source file.
 * A mono line-number sits in a left "gutter" rail, and a colored margin bar
 * encodes confidence (green ≥80 / amber ≥50 / sky below) — the way an editor
 * marks changed lines. Whole card is clickable when `onView` is provided.
 */
export default function KnowledgeCard({ item, index, onView, showPublic }: KnowledgeCardProps) {
  const confidence = Math.round((item.confidence || 0) * 100);
  const confColor =
    confidence >= 80
      ? "var(--color-status-resolved)"
      : confidence >= 50
      ? "var(--color-status-review)"
      : "var(--color-status-open)";

  const lineNo = index != null ? String(index + 1).padStart(2, "0") : "··";

  const body = (
    <>
      {/* Gutter rail: confidence margin bar + line number + glyph */}
      <div className="gutter-rail flex flex-col items-center pt-4 gap-2.5">
        <span
          className="absolute left-0 top-0 bottom-0 w-[3px]"
          style={{ backgroundColor: confColor }}
          aria-hidden="true"
        />
        <span
          className="font-mono text-[13px] font-semibold leading-none"
          style={{ color: "var(--color-gutter)" }}
        >
          {lineNo}
        </span>
        <Icon name="knowledge" size={13} style={{ color: "var(--color-text-muted)" }} />
      </div>

      {/* Entry body */}
      <div className="p-4 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1.5">
          <h3
            className="font-display text-[15px] font-semibold group-hover:text-[var(--color-accent)] transition-colors"
            style={{ color: "var(--color-text-primary)" }}
          >
            {item.title}
          </h3>
          {item.category && (
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider"
              style={{ backgroundColor: "rgba(167,139,250,0.15)", color: "var(--color-status-answered)" }}
            >
              {item.category}
            </span>
          )}
          {showPublic && (
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider"
              style={{ backgroundColor: "rgba(34,197,94,0.15)", color: "var(--color-status-resolved)" }}
            >
              Public
            </span>
          )}
        </div>

        <p
          className="text-xs leading-relaxed line-clamp-2"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {item.summary || item.solution?.substring(0, 150)}
        </p>

        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {item.tags && item.tags.length > 0 &&
            item.tags.slice(0, 4).map((t: string) => <Tag key={t} label={t} />)}

          <div className="flex items-center gap-2 ml-auto shrink-0">
            <div
              className="h-1.5 w-16 rounded-full overflow-hidden"
              style={{ backgroundColor: "var(--color-bg-input)" }}
            >
              <div
                className="h-full rounded-full"
                style={{ width: `${confidence}%`, backgroundColor: confColor }}
              />
            </div>
            <span className="text-[10px] font-mono" style={{ color: "var(--color-text-muted)" }}>
              {confidence}%
            </span>
            {onView && (
              <span
                className="text-[11px] font-mono font-semibold opacity-70 group-hover:opacity-100 transition-opacity"
                style={{ color: "var(--color-accent)" }}
              >
                View →
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );

  const className = "gutter-card group rounded-xl w-full text-left";

  return onView ? (
    <button type="button" onClick={onView} className={className}>
      {body}
    </button>
  ) : (
    <div className={className}>{body}</div>
  );
}

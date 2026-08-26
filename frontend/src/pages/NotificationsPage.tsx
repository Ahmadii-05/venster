import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { notificationApi } from "../services/api";
import type { Notification } from "../types";
import Icon, { type IconName } from "../components/ui/Icon";

// Per-type presentation: icon + accent color + a human-readable category label.
// Backend emits CAPSULE_ASSIGNED / NEW_COMMENT / CAPSULE_RESOLVED today; the
// extra keys are tolerated so future types render sensibly instead of raw.
const TYPE_META: Record<string, { icon: IconName; color: string; label: string }> = {
  CAPSULE_ASSIGNED: { icon: "user", color: "var(--color-status-review)", label: "Assigned to you" },
  NEW_COMMENT: { icon: "chat", color: "var(--color-status-open)", label: "New comment" },
  CAPSULE_COMMENTED: { icon: "chat", color: "var(--color-status-open)", label: "New comment" },
  CAPSULE_RESOLVED: { icon: "check", color: "var(--color-status-resolved)", label: "Resolved" },
  CAPSULE_STATUS_CHANGED: { icon: "reply", color: "var(--color-status-answered)", label: "Status changed" },
  COMMENT: { icon: "chat", color: "var(--color-status-open)", label: "New comment" },
  MENTION: { icon: "user", color: "var(--color-accent)", label: "Mention" },
};

// The `context` column is JSONB. Each type stores a small object, e.g.
// CAPSULE_ASSIGNED → { capsuleId, title }, NEW_COMMENT → { capsuleId, commentId },
// CAPSULE_RESOLVED → { capsuleId, resolutionId }. Parse defensively so a bad
// or empty payload never crashes the list — we just fall back to generics.
interface NotifContext {
  capsuleId?: string;
  title?: string;
  commentId?: string;
  resolutionId?: string;
}

function parseContext(raw: string | null): NotifContext {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as NotifContext) : {};
  } catch {
    return {};
  }
}

// A short ticket-style reference for a capsule, matching the app's convention
// (first 8 chars of the UUID, uppercased) used on capsule/profile pages.
function capsuleRef(id?: string): string | null {
  return id ? `#${id.slice(0, 8).toUpperCase()}` : null;
}

// Turn a (type, context) pair into a readable sentence. Prefer the capsule
// title when the payload carries it; otherwise reference it by short id.
function describe(type: string, ctx: NotifContext): string {
  const title = ctx.title?.trim();
  const ref = capsuleRef(ctx.capsuleId);
  const subject = title ? `"${title}"` : ref ? `capsule ${ref}` : "a capsule";
  switch (type) {
    case "CAPSULE_ASSIGNED":
      return `You were assigned to review ${subject}.`;
    case "NEW_COMMENT":
    case "CAPSULE_COMMENTED":
    case "COMMENT":
      return `New comment on ${subject}.`;
    case "CAPSULE_RESOLVED":
      return `${title ? subject : `Capsule ${ref ?? ""}`.trim()} was resolved.`;
    case "CAPSULE_STATUS_CHANGED":
      return `The status of ${subject} changed.`;
    case "MENTION":
      return `You were mentioned on ${subject}.`;
    default:
      return `Update on ${subject}.`;
  }
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await notificationApi.list();
      setNotifications(data || []);
    } catch (e) {
      console.error("Failed to load notifications", e);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (e) {
      console.error("Failed to mark as read", e);
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    for (const n of unread) {
      try {
        await notificationApi.markAsRead(n.id);
      } catch {}
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="vs-page-header flex items-start justify-between gap-3">
        <div>
          <div className="eyebrow mb-1.5">Inbox</div>
          <h1 className="font-display text-xl sm:text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            Notifications
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            Updates on capsules, assignments, and resolutions.
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="px-3 py-2 rounded-lg text-xs font-mono font-medium border transition-all hover:opacity-80"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
          >
            Mark all read ({unreadCount})
          </button>
        )}
      </div>

      {/* Notification list */}
      {loading ? (
        <div className="text-sm text-center py-12" style={{ color: "var(--color-text-muted)" }}>
          Loading notifications...
        </div>
      ) : notifications.length === 0 ? (
        <div
          className="rounded-xl p-12 border text-center transition-theme"
          style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}
        >
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            No notifications yet
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
            You'll see updates when someone comments, assigns, or resolves a capsule.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const meta = TYPE_META[n.type] || {
              icon: "bell" as IconName,
              color: "var(--color-text-muted)",
              label: n.type.replace(/_/g, " ").toLowerCase(),
            };
            const ctx = parseContext(n.context);
            const message = describe(n.type, ctx);
            const ref = capsuleRef(ctx.capsuleId);
            const capsuleLink = ctx.capsuleId ? `/capsules/${ctx.capsuleId}` : null;
            return (
              <div
                key={n.id}
                className="vs-notif-item relative overflow-hidden rounded-xl p-3 sm:p-4 border transition-all flex items-start gap-3 sm:gap-4"
                style={{
                  backgroundColor: n.read ? "var(--color-bg-card)" : "var(--color-bg-elevated)",
                  borderColor: n.read ? "var(--color-border)" : "var(--color-accent)",
                  opacity: n.read ? 0.7 : 1,
                }}
              >
                {!n.read && (
                  <span
                    className="absolute left-0 top-0 bottom-0 w-[3px]"
                    style={{ backgroundColor: meta.color }}
                    aria-hidden="true"
                  />
                )}
                {/* Unread dot + icon */}
                <div className="relative shrink-0">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: "var(--color-bg-input)", color: meta.color }}
                  >
                    <Icon name={meta.icon} size={16} />
                  </div>
                  {!n.read && (
                    <div
                      className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: "var(--color-accent)" }}
                    />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="eyebrow" style={{ color: meta.color }}>
                      {meta.label}
                    </span>
                    {!n.read && (
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: "var(--color-accent)" }}
                      />
                    )}
                  </div>
                  <p className="text-sm" style={{ color: "var(--color-text-primary)" }}>
                    {message}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] font-mono" style={{ color: "var(--color-text-muted)" }}>
                    {ref && (
                      <>
                        <span>{ref}</span>
                        <span aria-hidden="true">·</span>
                      </>
                    )}
                    <span>{timeAgo(n.createdAt)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="vs-notif-actions flex items-center gap-2 shrink-0">
                  {!n.read && (
                    <button
                      onClick={() => handleMarkAsRead(n.id)}
                      className="px-2 py-1 rounded text-[10px] font-mono font-medium border transition-all hover:opacity-80"
                      style={{ backgroundColor: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
                    >
                      Mark read
                    </button>
                  )}
                  {capsuleLink && (
                    <Link
                      to={capsuleLink}
                      onClick={() => {
                        if (!n.read) handleMarkAsRead(n.id);
                      }}
                      className="px-2 py-1 rounded text-[10px] font-mono font-medium transition-all hover:opacity-80"
                      style={{ color: "var(--color-accent)" }}
                    >
                      Open
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

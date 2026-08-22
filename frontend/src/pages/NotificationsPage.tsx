import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { notificationApi } from "../services/api";
import type { Notification } from "../types";

const TYPE_ICONS: Record<string, { icon: string; color: string }> = {
  CAPSULE_ASSIGNED: { icon: "👤", color: "var(--color-status-review)" },
  CAPSULE_COMMENTED: { icon: "💬", color: "var(--color-status-open)" },
  CAPSULE_RESOLVED: { icon: "✅", color: "var(--color-status-resolved)" },
  CAPSULE_STATUS_CHANGED: { icon: "🔄", color: "var(--color-status-answered)" },
  COMMENT: { icon: "💬", color: "var(--color-status-open)" },
  MENTION: { icon: "@", color: "var(--color-accent)" },
};

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
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest font-mono mb-1" style={{ color: "var(--color-accent)" }}>
            INBOX
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            Notifications
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            Updates on capsules, assignments, and resolutions.
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="px-3 py-2 rounded-lg text-xs font-medium border transition-all hover:opacity-80"
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
            const typeInfo = TYPE_ICONS[n.type] || { icon: "🔔", color: "var(--color-text-muted)" };
            return (
              <div
                key={n.id}
                className="rounded-xl p-4 border transition-all flex items-start gap-4"
                style={{
                  backgroundColor: n.read ? "var(--color-bg-card)" : "var(--color-bg-elevated)",
                  borderColor: n.read ? "var(--color-border)" : "var(--color-accent)",
                  opacity: n.read ? 0.7 : 1,
                }}
              >
                {/* Unread dot + icon */}
                <div className="relative shrink-0">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-base"
                    style={{ backgroundColor: "var(--color-bg-input)", color: typeInfo.color }}
                  >
                    {typeInfo.icon}
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
                    <span
                      className="text-[10px] uppercase tracking-widest font-mono"
                      style={{ color: typeInfo.color }}
                    >
                      {n.type.replace(/_/g, " ")}
                    </span>
                    {!n.read && (
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: "var(--color-accent)" }}
                      />
                    )}
                  </div>
                  <p className="text-sm" style={{ color: "var(--color-text-primary)" }}>
                    {n.context || "No details available"}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                    <span>{timeAgo(n.createdAt)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {!n.read && (
                    <button
                      onClick={() => handleMarkAsRead(n.id)}
                      className="px-2 py-1 rounded text-[10px] font-medium transition-all hover:opacity-80"
                      style={{ backgroundColor: "var(--color-bg-input)", color: "var(--color-text-muted)" }}
                    >
                      Mark read
                    </button>
                  )}
                  <Link
                    to="/"
                    className="px-2 py-1 rounded text-[10px] font-medium transition-all hover:opacity-80"
                    style={{ color: "var(--color-accent)" }}
                  >
                    Open
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

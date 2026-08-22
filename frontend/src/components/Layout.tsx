import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { notificationApi } from "../services/api";
import { useEffect } from "react";
import type { Notification } from "../types";

const NAV_ITEMS = [
  { path: "/", label: "Workspaces" },
  { path: "/knowledge", label: "Knowledge" },
  { path: "/knowledge/global", label: "Global Knowledge" },
  { path: "/community", label: "Community Q&A" },
  { path: "/notifications", label: "Notifications" },
  { path: "/profile", label: "Profile" },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { email, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const data = await notificationApi.list();
        setNotifications(data || []);
      } catch {}
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, []);

  const initials = email ? email.substring(0, 2).toUpperCase() : "U";

  return (
    <div className="flex h-screen overflow-hidden transition-theme" style={{ backgroundColor: "var(--color-bg-primary)" }}>
      {/* Sidebar */}
      <aside
        className="flex flex-col transition-all duration-300 border-r"
        style={{
          width: collapsed ? "64px" : "240px",
          backgroundColor: "var(--color-bg-card)",
          borderColor: "var(--color-border)",
        }}
      >
        {/* Brand */}
        <div className="p-4 border-b" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
              style={{ backgroundColor: "var(--color-accent)", color: "#000" }}
            >
              V
            </div>
            {!collapsed && (
              <div>
                <div className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  Venster
                </div>
                <div className="text-[10px] uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
                  Capsule Workflow
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = item.path === "/"
              ? location.pathname === "/" || location.pathname.startsWith("/workspaces")
              : item.path === "/knowledge/global"
              ? location.pathname.startsWith("/knowledge/global")
              : location.pathname === item.path;
            return (                <Link
                key={item.path}
                to={item.path}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all"
                style={{
                  backgroundColor: active ? "var(--color-accent-dim)" : "transparent",
                  color: active ? "var(--color-accent)" : "var(--color-text-secondary)",
                }}
              >
                {!collapsed && <span>{item.label}</span>}
                {!collapsed && item.path === "/notifications" && unreadCount > 0 && (
                  <span
                    className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ backgroundColor: "var(--color-danger)", color: "#fff" }}
                  >
                    {unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Collapse + Logout */}
        <div className="p-2 border-t space-y-1" style={{ borderColor: "var(--color-border)" }}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm w-full transition-all hover:opacity-80"
            style={{ color: "var(--color-text-muted)" }}
          >
            <span className="text-base w-5 text-center">{collapsed ? "»" : "«"}</span>
            {!collapsed && <span>Collapse</span>}
          </button>
          {!collapsed && (
            <button
              onClick={() => { logout(); navigate("/login"); }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm w-full transition-all hover:opacity-80"
              style={{ color: "var(--color-danger)" }}
            >
              <span className="text-base w-5 text-center">⏻</span>
              <span>Logout</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header
          className="flex items-center gap-4 px-6 h-14 border-b shrink-0"
          style={{
            backgroundColor: "var(--color-bg-card)",
            borderColor: "var(--color-border)",
          }}
        >
          {/* Search */}
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--color-text-muted)" }}>
                ⌕
              </span>
              <input
                type="text"
                placeholder="Search Capsules, Artifacts, Knowledge..."
                className="w-full pl-9 pr-4 py-2 rounded-lg text-sm border outline-none focus:ring-1 transition-theme"
                style={{
                  backgroundColor: "var(--color-bg-input)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-primary)",
                }}
              />
            </div>
          </div>

          {/* Actions */}
          <Link
            to="/"
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
            style={{ backgroundColor: "var(--color-accent)", color: "#000" }}
          >
            + New Capsule
          </Link>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg transition-all hover:opacity-80"
            style={{ color: "var(--color-text-secondary)" }}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>

          {/* Avatar */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
            style={{ backgroundColor: "var(--color-bg-elevated)", color: "var(--color-text-secondary)" }}
          >
            {initials}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

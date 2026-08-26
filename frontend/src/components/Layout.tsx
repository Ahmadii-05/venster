import { useState, useEffect, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { notificationApi } from "../services/api";
import { isInVsCode } from "../services/vscodeBridge";
import type { Notification } from "../types";
import NewCapsuleModal from "./NewCapsuleModal";
import Avatar from "./ui/Avatar";
import BackButton from "./ui/BackButton";
import Icon from "./ui/Icon";
import Logo from "./ui/Logo";

const SIDEBAR_ITEMS = [
  { path: "/", label: "Dashboard", icon: "dashboard" as const },
  { path: "/workspaces", label: "Workspaces", icon: "folder" as const },
  { path: "/knowledge", label: "Knowledge Base", icon: "book" as const },
  { path: "/knowledge/global", label: "Community Insights", icon: "globe" as const },
  { path: "/community", label: "Community Q&A", icon: "chat" as const },
  { path: "/notifications", label: "Notifications", icon: "bell" as const },
  { path: "/profile", label: "Profile", icon: "user" as const },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { email, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNewCapsule, setShowNewCapsule] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // VS Code: the extension can ask us to open the capsule creation UI
  // (e.g. via the "Create Capsule in Venster UI" command / editor menu).
  useEffect(() => {
    if (!isInVsCode) return;
    const handler = () => setShowNewCapsule(true);
    window.addEventListener("venster:newCapsule", handler);
    return () => window.removeEventListener("venster:newCapsule", handler);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const userName = email?.split("@")[0] || "User";

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

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    if (path === "/workspaces")
      return location.pathname.startsWith("/workspaces") || location.pathname.startsWith("/projects");
    if (path === "/knowledge/global")
      return location.pathname.startsWith("/knowledge/global");
    return location.pathname === path;
  };

  return (
    <div className="flex h-screen overflow-hidden transition-theme" style={{ backgroundColor: "var(--color-bg-primary)" }}>
      {/* ── Sidebar ── */}
      <aside
        className="flex flex-col transition-all duration-300 border-r shrink-0"
        style={{
          width: collapsed ? "64px" : "232px",
          backgroundColor: "var(--color-bg-card)",
          borderColor: "var(--color-border)",
        }}
      >
        {/* Brand */}
        <div className="px-4 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex items-center gap-2.5">
            <Logo size={36} className="shrink-0" style={{ color: "var(--color-accent)" }} />
            {!collapsed && (
              <div>
                <div className="text-sm font-bold font-display" style={{ color: "var(--color-text-primary)" }}>
                  Venster
                </div>
                <div className="text-[9px] uppercase tracking-[0.15em] font-mono" style={{ color: "var(--color-text-muted)" }}>
                  Capsule Workflow
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 overflow-y-auto">
          {!collapsed && (
            <div className="eyebrow px-3 pt-2 pb-1.5" style={{ color: "var(--color-text-muted)" }}>
              Navigate
            </div>
          )}
          <div className="space-y-0.5">
            {SIDEBAR_ITEMS.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group"
                  style={{
                    backgroundColor: active ? "var(--color-accent-dim)" : "transparent",
                    color: active ? "var(--color-accent)" : "var(--color-text-secondary)",
                  }}
                >
                  {active && (
                    <span
                      className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
                      style={{ backgroundColor: "var(--color-accent)" }}
                      aria-hidden="true"
                    />
                  )}
                  <span className="w-5 h-5 flex items-center justify-center shrink-0">
                    <Icon name={item.icon} size={18} />
                  </span>
                  {!collapsed && (
                    <>
                      <span className={active ? "font-medium" : ""}>{item.label}</span>
                      {item.label === "Notifications" && unreadCount > 0 && (
                        <span
                          className="ml-auto px-1.5 py-0.5 rounded-full text-[9px] font-bold font-mono"
                          style={{ backgroundColor: "var(--color-danger)", color: "#fff" }}
                        >
                          {unreadCount}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Collapse + Logout */}
        <div className="p-2 border-t space-y-0.5" style={{ borderColor: "var(--color-border)" }}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full transition-all hover:opacity-80"
            style={{ color: "var(--color-text-muted)" }}
          >
            <span className="w-5 h-5 flex items-center justify-center shrink-0">
              <Icon name={collapsed ? "chevronRight" : "chevronLeft"} size={18} />
            </span>
            {!collapsed && <span className="text-xs">Collapse</span>}
          </button>
          {!collapsed && (
            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full transition-all hover:opacity-80"
              style={{ color: "var(--color-text-muted)" }}
            >
              <span className="w-5 h-5 flex items-center justify-center shrink-0">
                <Icon name="logout" size={18} />
              </span>
              <span className="text-xs">Logout</span>
            </button>
          )}
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header
          className="flex items-center gap-4 px-6 h-14 border-b shrink-0"
          style={{
            backgroundColor: "var(--color-bg-card)",
            borderColor: "var(--color-border)",
          }}
        >
          {/* Back to previous screen */}
          <BackButton fallback="/" />

          {/* Search */}
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm select-none"
                style={{ color: "var(--color-accent)" }}
                aria-hidden="true"
              >
                &gt;
              </span>
              <input
                type="text"
                placeholder="Search capsules and knowledge..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchQuery.trim()) {
                    navigate(`/knowledge?q=${encodeURIComponent(searchQuery.trim())}`);
                  }
                }}
                className="w-full pl-9 pr-4 py-2 rounded-lg text-sm border outline-none focus:ring-1 focus:ring-[color:var(--color-accent)] transition-theme"
                style={{
                  backgroundColor: "var(--color-bg-input)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-primary)",
                }}
              />
            </div>
          </div>

          {/* + New Capsule */}
          <button
            onClick={() => setShowNewCapsule(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold font-display transition-all hover:opacity-90 shrink-0"
            style={{ backgroundColor: "var(--color-accent)", color: "#000" }}
          >
            <Icon name="plus" size={16} />
            <span>New Capsule</span>
          </button>

          {/* Notification Bell */}
          <Link
            to="/notifications"
            className="relative p-2 rounded-lg transition-all hover:opacity-80"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <Icon name="bell" size={20} />
            {unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
                style={{ backgroundColor: "var(--color-danger)", color: "#fff" }}
              >
                {unreadCount}
              </span>
            )}
          </Link>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg transition-all hover:opacity-80"
            style={{ color: "var(--color-text-secondary)" }}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            <Icon name={theme === "dark" ? "sun" : "moon"} size={20} />
          </button>

          {/* User Avatar/Menu */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 px-2 py-1 rounded-lg transition-all hover:opacity-80"
            >
              <Avatar email={email || undefined} size="sm" />
              {!collapsed && (
                <span className="text-xs font-medium hidden sm:block" style={{ color: "var(--color-text-secondary)" }}>
                  {userName}
                </span>
              )}
            </button>

            {/* Profile dropdown */}
            {showProfileMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                <div
                  className="absolute right-0 top-full mt-1 w-48 rounded-xl border shadow-xl z-50 overflow-hidden"
                  style={{
                    backgroundColor: "var(--color-bg-card)",
                    borderColor: "var(--color-border)",
                  }}
                >
                  <div className="px-3 py-2 border-b" style={{ borderColor: "var(--color-border)" }}>
                    <div className="text-xs font-medium" style={{ color: "var(--color-text-primary)" }}>
                      {userName}
                    </div>
                    <div className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                      {email}
                    </div>
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs transition-all hover:opacity-80"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    <Icon name="user" size={14} />
                    Profile
                  </Link>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      logout();
                      navigate("/login");
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-xs w-full text-left transition-all hover:opacity-80"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    <Icon name="logout" size={14} />
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      {/* New Capsule Modal */}
      <NewCapsuleModal open={showNewCapsule} onClose={() => setShowNewCapsule(false)} />
    </div>
  );
}

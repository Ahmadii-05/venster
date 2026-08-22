import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { workspaceApi, projectApi, capsuleApi, knowledgeApi } from "../services/api";
import type { Workspace, Capsule } from "../types";

export default function DashboardPage() {
  const { email } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [allCapsules, setAllCapsules] = useState<Capsule[]>([]);
  const [knowledgeCount, setKnowledgeCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [creatingWs, setCreatingWs] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const ws = await workspaceApi.list();
        setWorkspaces(ws || []);

        const allCaps: Capsule[] = [];
        for (const w of ws || []) {
          try {
            const projs = await projectApi.list(w.id);
            for (const p of projs || []) {
              const caps = await capsuleApi.list({ projectId: p.id });
              allCaps.push(...(caps || []));
            }
          } catch {}
        }
        setAllCapsules(allCaps);

        const myCaps = allCaps.filter((c) => c.reviewer?.email === email);
        setCapsules(myCaps.slice(0, 4));

        try {
          const ki = await knowledgeApi.search({ q: "a", workspaceId: ws?.[0]?.id });
          setKnowledgeCount((ki || []).length);
        } catch {}
      } catch {} finally {
        setLoading(false);
      }
    };
    load();
  }, [email]);

  const handleCreateWorkspace = async () => {
    if (newWorkspaceName.length < 3) return;
    setCreatingWs(true);
    try {
      const ws = await workspaceApi.create(newWorkspaceName.trim());
      setWorkspaces((prev) => [...prev, ws]);
      setNewWorkspaceName("");
      setShowCreateWorkspace(false);
    } catch (err: any) {
      alert(err.message || "Failed to create workspace");
    } finally {
      setCreatingWs(false);
    }
  };

  const name = email?.split("@")[0] || "there";
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";

  const openCount = allCapsules.filter((c) => c.status === "OPEN").length;
  const inReviewCount = allCapsules.filter((c) => c.status === "IN_REVIEW").length;
  const answeredCount = allCapsules.filter((c) => c.status === "ANSWERED").length;
  const resolvedCount = allCapsules.filter((c) => c.status === "RESOLVED").length;
  const archivedCount = allCapsules.filter((c) => c.status === "ARCHIVED").length;
  const total = allCapsules.length || 1;

  const stats = [
    { label: "OPEN CAPSULES", value: openCount, sub: `Across ${workspaces.length} Workspace${workspaces.length !== 1 ? "s" : ""}`, color: "var(--color-status-open)" },
    { label: "AWAITING MY REVIEW", value: capsules.length, sub: "Assigned to you", color: "var(--color-status-review)" },
    { label: "RESOLVED THIS WEEK", value: resolvedCount, sub: "Total resolved", color: "var(--color-status-resolved)" },
    { label: "KNOWLEDGE ITEMS", value: knowledgeCount, sub: "From resolved Capsules", color: "var(--color-accent)" },
  ];

  const lifecycle = [
    { label: "Open", count: openCount, color: "var(--color-status-open)" },
    { label: "In review", count: inReviewCount, color: "var(--color-status-review)" },
    { label: "Answered", count: answeredCount, color: "var(--color-status-answered)" },
    { label: "Resolved", count: resolvedCount, color: "var(--color-status-resolved)" },
    { label: "Archived", count: archivedCount, color: "var(--color-status-archived)" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm" style={{ color: "var(--color-text-muted)" }}>Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header + Actions */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest font-mono mb-1" style={{ color: "var(--color-accent)" }}>
            OVERVIEW
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            {greeting}, {name}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            Capsules attached to your Artifacts, reviews waiting on you, and what your team resolved.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateWorkspace(!showCreateWorkspace)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
            style={{ backgroundColor: "var(--color-accent)", color: "#000" }}
          >
            + New Workspace
          </button>
          <Link
            to="/"
            className="px-4 py-2 rounded-lg text-sm font-medium border transition-all hover:opacity-80"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
          >
            Open Capsule board ↗
          </Link>
        </div>
      </div>

      {/* Create Workspace Form */}
      {showCreateWorkspace && (
        <div
          className="rounded-xl p-4 border transition-theme"
          style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}
        >
          <div className="text-xs uppercase tracking-widest font-mono mb-3" style={{ color: "var(--color-accent)" }}>
            NEW WORKSPACE
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Workspace name (min 3 chars)"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateWorkspace()}
              className="flex-1 px-3 py-2 rounded-lg text-sm border outline-none focus:ring-1 transition-theme"
              style={{
                backgroundColor: "var(--color-bg-input)",
                borderColor: "var(--color-border)",
                color: "var(--color-text-primary)",
              }}
            />
            <button
              onClick={handleCreateWorkspace}
              disabled={newWorkspaceName.length < 3 || creatingWs}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "var(--color-accent)", color: "#000" }}
            >
              {creatingWs ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      )}

      {/* Workspaces — at the top */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
            Workspaces
          </h2>
        </div>
        {workspaces.length === 0 ? (
          <div
            className="rounded-xl p-8 border text-center transition-theme"
            style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}
          >
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              No workspaces yet. Click "+ New Workspace" above to create one.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {workspaces.map((ws) => (
              <Link
                key={ws.id}
                to={`/workspaces/${ws.id}`}
                className="rounded-xl p-4 border transition-all hover:opacity-90"
                style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: "var(--color-accent-dim)", color: "var(--color-accent)" }}
                  >
                    {ws.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                      {ws.name}
                    </div>
                    <div className="text-[10px] font-mono" style={{ color: "var(--color-text-muted)" }}>
                      {ws.id.substring(0, 8)}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl p-4 border transition-theme"
            style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}
          >
            <div className="text-[10px] uppercase tracking-widest font-mono mb-2" style={{ color: "var(--color-text-muted)" }}>
              {s.label}
            </div>
            <div className="text-3xl font-bold" style={{ color: s.color }}>
              {s.value}
            </div>
            <div className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
              {s.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Lifecycle + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div
          className="rounded-xl p-5 border transition-theme"
          style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}
        >
          <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--color-text-primary)" }}>
            Lifecycle distribution
          </h2>
          <div className="space-y-3">
            {lifecycle.map((l) => (
              <div key={l.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: "var(--color-text-secondary)" }}>{l.label}</span>
                  <span style={{ color: "var(--color-text-muted)" }}>{l.count}</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ backgroundColor: "var(--color-bg-input)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.max((l.count / total) * 100, l.count > 0 ? 8 : 0)}%`,
                      backgroundColor: l.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          className="rounded-xl p-5 border transition-theme"
          style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}
        >
          <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--color-text-primary)" }}>
            Capsule activity — last 7 days
          </h2>
          <div className="flex items-end justify-between h-40 gap-2">
            {(() => {
              const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
              const now = new Date();
              const weekAgo = new Date(now);
              weekAgo.setDate(weekAgo.getDate() - 7);

              const counts = days.map((_, i) => {
                const dayStart = new Date(weekAgo);
                dayStart.setDate(dayStart.getDate() + i);
                const dayEnd = new Date(dayStart);
                dayEnd.setDate(dayEnd.getDate() + 1);
                const created = allCapsules.filter((c) => {
                  const d = new Date(c.createdAt);
                  return d >= dayStart && d < dayEnd;
                }).length;
                const resolved = allCapsules.filter((c) => {
                  if (c.status !== "RESOLVED") return false;
                  const d = new Date(c.updatedAt);
                  return d >= dayStart && d < dayEnd;
                }).length;
                return { created, resolved };
              });
              const maxCount = Math.max(...counts.flatMap((c) => [c.created, c.resolved]), 1);

              return days.map((day, i) => {
                const { created, resolved } = counts[i];
                return (
                  <div key={day} className="flex flex-col items-center gap-1 flex-1">
                    <div className="flex gap-0.5 items-end" style={{ height: "120px" }}>
                      <div
                        className="w-3 rounded-t"
                        style={{ height: `${Math.max((created / maxCount) * 100, 8)}%`, backgroundColor: "var(--color-accent)" }}
                      />
                      <div
                        className="w-3 rounded-t"
                        style={{ height: `${Math.max((resolved / maxCount) * 100, 8)}%`, backgroundColor: "var(--color-status-resolved)" }}
                      />
                    </div>
                    <span className="text-[10px] font-mono" style={{ color: "var(--color-text-muted)" }}>
                      {day}
                    </span>
                  </div>
                );
              });
            })()}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--color-accent)" }} /> Created
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--color-status-resolved)" }} /> Resolved
            </span>
          </div>
        </div>
      </div>

      {/* Assigned to you */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
            Assigned to you
          </h2>
          <Link to="/" className="text-xs font-medium" style={{ color: "var(--color-accent)" }}>
            View all Capsules
          </Link>
        </div>
        {capsules.length === 0 ? (
          <div
            className="rounded-xl p-8 border text-center transition-theme"
            style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}
          >
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>No capsules assigned to you yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {capsules.map((cap) => (
              <Link
                key={cap.id}
                to={`/capsules/${cap.id}`}
                className="rounded-xl p-4 border transition-all hover:opacity-90"
                style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-mono" style={{ color: "var(--color-text-muted)" }}>
                    {cap.id.substring(0, 8).toUpperCase()}
                  </span>
                  <StatusPill status={cap.status} />
                  <span
                    className="text-xs font-medium ml-auto"
                    style={{ color: cap.priority === "HIGH" ? "var(--color-priority-high)" : cap.priority === "MEDIUM" ? "var(--color-priority-medium)" : "var(--color-priority-low)" }}
                  >
                    {cap.priority}
                  </span>
                </div>
                <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
                  {cap.title}
                </h3>
                <div className="flex items-center gap-2 text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                  <span className="font-mono">
                    {cap.artifactAnchor?.artifactVersion?.artifact?.filePath?.split("/").pop()}
                  </span>
                  {cap.reviewer && <span>• {cap.reviewer.name}</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    OPEN: { bg: "rgba(56, 189, 248, 0.15)", text: "var(--color-status-open)" },
    IN_REVIEW: { bg: "rgba(251, 191, 36, 0.15)", text: "var(--color-status-review)" },
    ANSWERED: { bg: "rgba(167, 139, 250, 0.15)", text: "var(--color-status-answered)" },
    RESOLVED: { bg: "rgba(34, 197, 94, 0.15)", text: "var(--color-status-resolved)" },
    ARCHIVED: { bg: "rgba(107, 114, 128, 0.15)", text: "var(--color-status-archived)" },
  };
  const c = colors[status] || colors.OPEN;
  return (
    <span
      className="px-2 py-0.5 rounded text-[10px] font-medium"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {status.replace("_", " ")}
    </span>
  );
}

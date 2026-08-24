import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  workspaceApi,
  projectApi,
  capsuleApi,
  knowledgeApi,
  globalQAApi,
  dashboardApi,
} from "../services/api";
import type { KnowledgeHealth } from "../services/api";
import type { Workspace, Project, Capsule, KnowledgeItem } from "../types";
import StatCard from "../components/ui/StatCard";
import CapsuleCard from "../components/CapsuleCard";
import KnowledgeCard from "../components/KnowledgeCard";
import EmptyState from "../components/ui/EmptyState";
import Tag from "../components/ui/Tag";
import Icon from "../components/ui/Icon";

/* ── Helpers ───────────────────────────────────────────────── */
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

const POPULAR_TAGS = ["#SpringBoot", "#React", "#JWT", "#PostgreSQL", "#TypeScript", "#Docker", "#Redis", "#Java"];

/* ── Loading skeleton ──────────────────────────────────────── */
function Skeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl p-5 border animate-pulse"
          style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}
        >
          <div className="h-4 w-24 rounded mb-3" style={{ backgroundColor: "var(--color-bg-input)" }} />
          <div className="h-5 w-3/4 rounded mb-2" style={{ backgroundColor: "var(--color-bg-input)" }} />
          <div className="h-3 w-full rounded mb-1" style={{ backgroundColor: "var(--color-bg-input)" }} />
          <div className="h-3 w-2/3 rounded" style={{ backgroundColor: "var(--color-bg-input)" }} />
        </div>
      ))}
    </div>
  );
}

/* ── Main Dashboard ────────────────────────────────────────── */
export default function DashboardPage() {
  const { email } = useAuth();
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [allCapsules, setAllCapsules] = useState<Capsule[]>([]);
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateWs, setShowCreateWs] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [creatingWs, setCreatingWs] = useState(false);
  const [knowledgeHealth, setKnowledgeHealth] = useState<KnowledgeHealth | null>(null);

  /* Fetch all data */
  useEffect(() => {
    const load = async () => {
      // Declared at function scope so the knowledge-health block below (which
      // runs after the try/finally, outside its block) can read it.
      let ws: Workspace[] = [];
      try {
        ws = (await workspaceApi.list()) || [];
        setWorkspaces(ws);

        const allProjs: Project[] = [];
        const allCaps: Capsule[] = [];

        for (const w of ws || []) {
          try {
            const projs = await projectApi.list(w.id);
            allProjs.push(...(projs || []));
            for (const p of projs || []) {
              try {
                const caps = await capsuleApi.list({ projectId: p.id });
                allCaps.push(...(caps || []));
              } catch {}
            }
          } catch {}
        }
        setProjects(allProjs);
        setAllCapsules(allCaps);

        // Fetch knowledge items
        try {
          const ki = await knowledgeApi.search({ q: "a", scope: "global" });
          setKnowledgeItems((ki || []).slice(0, 6));
        } catch {
          try {
            const qn = await globalQAApi.listQuestions();
            const converted: KnowledgeItem[] = (qn || []).slice(0, 6).map((q: any) => ({
              id: q.id,
              title: q.title,
              summary: q.body,
              rootCause: "",
              solution: q.acceptedAnswer?.body || "",
              tags: q.tags || [],
              category: "Q&A",
              confidence: q.acceptedAnswer ? 0.9 : 0.5,
              visibility: "PUBLIC" as const,
              approved: true,
              createdAt: q.createdAt,
              resolution: null as any,
            }));
            setKnowledgeItems(converted);
          } catch {}
        }
      } catch {} finally {
        setLoading(false);
      }

      // Fetch knowledge health asynchronously (non-blocking)
      // Use local ws variable since workspaces state won't be updated yet in this closure
      if (ws && ws.length > 0) {
        try {
          const health = await dashboardApi.getKnowledgeHealth(ws[0].id);
          setKnowledgeHealth(health);
        } catch {
          // Fail silently — knowledge health is a suggestion, not critical
        }
      }
    };
    load();
  }, []);

  /* Computed stats */
  const stats = useMemo(() => {
    const open = allCapsules.filter((c) => c.status === "OPEN").length;
    const replied = allCapsules.filter((c) => c.status !== "OPEN").length;
    const resolved = allCapsules.filter((c) => c.status === "RESOLVED").length;
    return { open, replied, resolved, knowledge: knowledgeItems.length };
  }, [allCapsules, knowledgeItems]);

  /* Workspace creation */
  const handleCreateWs = async () => {
    if (newWsName.length < 3) return;
    setCreatingWs(true);
    try {
      const ws = await workspaceApi.create(newWsName.trim());
      setWorkspaces((prev) => [...prev, ws]);
      setNewWsName("");
      setShowCreateWs(false);
    } catch (err: any) {
      alert(err.message || "Failed to create workspace");
    } finally {
      setCreatingWs(false);
    }
  };

  /* Greeting */
  const name = email?.split("@")[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  /* Trending capsules: most recently updated */
  const trending = useMemo(
    () =>
      [...allCapsules]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 6),
    [allCapsules]
  );

  /* Suggested capsules: assigned to user but not resolved */
  const suggested = useMemo(
    () =>
      allCapsules
        .filter((c) => c.status !== "RESOLVED" && c.status !== "ARCHIVED")
        .slice(0, 4),
    [allCapsules]
  );

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Skeleton count={5} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex gap-6">
        {/* ── Main Column ── */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* 1. Hero band — leads with a sentence */}
          <div
            className="relative overflow-hidden rounded-2xl border p-6 transition-theme"
            style={{
              borderColor: "var(--color-border)",
              backgroundColor: "var(--color-bg-card)",
              backgroundImage: "linear-gradient(135deg, var(--color-accent-dim), transparent 55%)",
            }}
          >
            <span
              className="absolute left-0 top-6 bottom-6 w-[3px] rounded-full"
              style={{ backgroundColor: "var(--color-accent)" }}
              aria-hidden="true"
            />
            <div className="flex items-start justify-between gap-4 pl-3">
              <div>
                <div className="eyebrow mb-2">Overview</div>
                <h1 className="font-display text-[26px] leading-tight font-bold" style={{ color: "var(--color-text-primary)" }}>
                  {greeting}, {name}
                </h1>
                <p className="text-sm mt-2 max-w-md leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                  Ask where you work, learn from everyone — capture the{" "}
                  <span className="font-mono font-medium" style={{ color: "var(--color-text-primary)" }}>why</span>{" "}
                  where the code lives.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowCreateWs(!showCreateWs)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-all hover:opacity-80"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)", backgroundColor: "var(--color-bg-card)" }}
                >
                  <Icon name="plus" size={14} />
                  New Workspace
                </button>
                <Link
                  to="/"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-all hover:opacity-80"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)", backgroundColor: "var(--color-bg-card)" }}
                >
                  <Icon name="externalLink" size={14} />
                  Open Capsule board
                </Link>
              </div>
            </div>
          </div>

          {/* Create Workspace inline form */}
          {showCreateWs && (
            <div
              className="rounded-xl p-4 border transition-theme"
              style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}
            >
              <div className="text-[10px] uppercase tracking-widest font-mono font-semibold mb-3" style={{ color: "var(--color-accent)" }}>
                NEW WORKSPACE
              </div>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Workspace name (min 3 chars)"
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateWs()}
                  className="flex-1 px-3 py-2 rounded-lg text-sm border outline-none focus:ring-1 transition-theme"
                  style={{ backgroundColor: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
                  autoFocus
                />
                <button
                  onClick={handleCreateWs}
                  disabled={newWsName.length < 3 || creatingWs}
                  className="px-5 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: "var(--color-accent)", color: "#000" }}
                >
                  {creatingWs ? "Creating..." : "Create"}
                </button>
              </div>
            </div>
          )}

          {/* 2. Four Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Open Capsules" value={stats.open} subtitle="Awaiting response" color="var(--color-status-open)" icon="lock" />
            <StatCard label="Replies Received" value={stats.replied} subtitle="Across all projects" color="var(--color-status-review)" icon="chat" />
            <StatCard label="Resolved This Week" value={stats.resolved} subtitle="Total resolved" color="var(--color-status-resolved)" icon="check" />
            <StatCard label="Knowledge Items" value={stats.knowledge} subtitle="From resolved capsules" color="var(--color-accent)" icon="knowledge" />
          </div>

          {/* 3. Trending Capsules */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="eyebrow mb-1" style={{ color: "var(--color-text-muted)" }}>Live</div>
                <h2 className="flex items-center gap-2 font-display text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  <Icon name="trending" size={18} style={{ color: "var(--color-accent)" }} />
                  Trending Capsules
                </h2>
              </div>
              <Link to="/" className="flex items-center gap-1 text-xs font-medium transition-all hover:opacity-80" style={{ color: "var(--color-accent)" }}>
                View all
                <Icon name="chevronRight" size={14} />
              </Link>
            </div>
            {trending.length === 0 ? (
              <EmptyState
                icon="empty"
                title="No capsules yet"
                description="Create your first capsule to get started."
                action={{ label: "+ New Capsule", onClick: () => navigate("/") }}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trending.map((cap) => (
                  <CapsuleCard
                    key={cap.id}
                    capsule={cap}
                    replyCount={0}
                    upvoteCount={Math.floor(Math.random() * 15)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 4. Knowledge Health */}
          {knowledgeHealth && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Aging Capsules */}
              <div
                className="rounded-xl border p-5 transition-theme"
                style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}
              >
                <h3 className="flex items-center gap-2 text-[10.5px] font-mono font-semibold uppercase tracking-[0.15em] mb-4" style={{ color: "var(--color-text-muted)" }}>
                  <Icon name="clock" size={14} />
                  Aging Capsules
                </h3>
                {knowledgeHealth.agingCapsules.length === 0 ? (
                  <div className="flex items-center gap-2 py-4">
                    <Icon name="check" size={16} style={{ color: "var(--color-status-resolved)" }} />
                    <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                      Nothing aging — nice work
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {knowledgeHealth.agingCapsules.map((cap) => {
                      const severity =
                        cap.daysInCurrentStatus > 7 ? "high" :
                        cap.daysInCurrentStatus > 5 ? "medium" : "low";
                      const bgColor =
                        severity === "high"
                          ? "rgba(239,68,68,0.08)"
                          : severity === "medium"
                          ? "rgba(251,191,36,0.08)"
                          : "var(--color-bg-elevated)";
                      const statusColor =
                        cap.status === "OPEN"
                          ? "var(--color-status-open)"
                          : cap.status === "IN_REVIEW"
                          ? "var(--color-status-review)"
                          : "var(--color-status-answered)";
                      return (
                        <Link
                          key={cap.capsuleId}
                          to={`/capsules/${cap.capsuleId}`}
                          className="flex items-center gap-3 p-3 rounded-lg transition-all hover:opacity-90"
                          style={{ backgroundColor: bgColor }}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
                              {cap.title}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold"
                                style={{ backgroundColor: "rgba(56,189,248,0.15)", color: statusColor }}
                              >
                                {cap.status.replace("_", " ")}
                              </span>
                              <span className="text-[10px] font-mono" style={{ color: "var(--color-text-muted)" }}>
                                {cap.priority}
                              </span>
                            </div>
                          </div>
                          <div
                            className="text-right shrink-0"
                            style={{ color: severity === "high" ? "var(--color-danger)" : severity === "medium" ? "var(--color-status-review)" : "var(--color-text-muted)" }}
                          >
                            <div className="text-sm font-bold font-mono">
                              {cap.daysInCurrentStatus}d
                            </div>
                            <div className="text-[9px]">in {cap.status.replace("_", " ")}</div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Hot Files */}
              <div
                className="rounded-xl border p-5 transition-theme"
                style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}
              >
                <h3 className="flex items-center gap-2 text-[10.5px] font-mono font-semibold uppercase tracking-[0.15em] mb-4" style={{ color: "var(--color-text-muted)" }}>
                  <Icon name="alert" size={14} />
                  Hot Files
                </h3>
                {knowledgeHealth.hotArtifacts.length === 0 ? (
                  <div className="flex items-center gap-2 py-4">
                    <Icon name="check" size={16} style={{ color: "var(--color-status-resolved)" }} />
                    <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                      No repeat hot spots yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {knowledgeHealth.hotArtifacts.map((art) => (
                      <Link
                        key={art.artifactId}
                        to={`/knowledge?q=${encodeURIComponent(art.filePath)}`}
                        className="flex items-center gap-3 p-3 rounded-lg transition-all hover:opacity-90 group"
                        style={{ backgroundColor: "var(--color-bg-elevated)" }}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium font-mono truncate group-hover:text-[var(--color-accent)] transition-colors" style={{ color: "var(--color-text-primary)" }}>
                            {art.filePath}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                              {art.capsuleCount} capsule{art.capsuleCount !== 1 ? "s" : ""}
                            </span>
                            {art.openCapsuleCount > 0 && (
                              <span
                                className="text-[10px] font-bold"
                                style={{ color: "var(--color-status-open)" }}
                              >
                                {art.openCapsuleCount} open
                              </span>
                            )}
                          </div>
                        </div>
                        <Icon name="chevronRight" size={14} style={{ color: "var(--color-text-muted)" }} />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5. Recent Knowledge */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="eyebrow mb-1" style={{ color: "var(--color-text-muted)" }}>Captured</div>
                <h2 className="flex items-center gap-2 font-display text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  <Icon name="knowledge" size={18} style={{ color: "var(--color-accent)" }} />
                  Recent Knowledge
                </h2>
              </div>
              <Link to="/knowledge" className="flex items-center gap-1 text-xs font-medium transition-all hover:opacity-80" style={{ color: "var(--color-accent)" }}>
                Search Knowledge Base
                <Icon name="search" size={14} />
              </Link>
            </div>
            {knowledgeItems.length === 0 ? (
              <EmptyState
                icon="knowledge"
                title="No knowledge items yet"
                description="Knowledge items are created when capsules are resolved."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {knowledgeItems.map((ki, i) => (
                  <KnowledgeCard key={ki.id} item={ki} index={i} onView={() => navigate("/knowledge")} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right Sidebar ── */}
        <aside className="w-72 shrink-0 space-y-5 hidden xl:block">
          {/* Your Activity */}
          <div
            className="rounded-xl border p-5 transition-theme"
            style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}
          >
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--color-text-muted)" }}>
              <Icon name="trending" size={14} />
              Your Activity
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Workspaces</span>
                <span className="text-sm font-bold font-mono" style={{ color: "var(--color-accent)" }}>{workspaces.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Projects</span>
                <span className="text-sm font-bold font-mono" style={{ color: "var(--color-status-open)" }}>{projects.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>My Capsules</span>
                <span className="text-sm font-bold font-mono" style={{ color: "var(--color-status-review)" }}>{allCapsules.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Resolved</span>
                <span className="text-sm font-bold font-mono" style={{ color: "var(--color-status-resolved)" }}>{stats.resolved}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Knowledge</span>
                <span className="text-sm font-bold font-mono" style={{ color: "var(--color-accent)" }}>{stats.knowledge}</span>
              </div>
            </div>
          </div>

          {/* Suggested Capsules */}
          <div
            className="rounded-xl border p-5 transition-theme"
            style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}
          >
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--color-text-muted)" }}>
              <Icon name="edit" size={14} />
              Suggested Capsules
            </h3>
            {suggested.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                No pending capsules.
              </p>
            ) : (
              <div className="space-y-2">
                {suggested.map((cap) => (
                  <Link
                    key={cap.id}
                    to={`/capsules/${cap.id}`}
                    className="flex items-start gap-2.5 p-2.5 rounded-lg transition-all hover:opacity-90 group"
                    style={{ backgroundColor: "var(--color-bg-elevated)" }}
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                      style={{
                        backgroundColor:
                          cap.status === "OPEN"
                            ? "var(--color-status-open)"
                            : cap.status === "IN_REVIEW"
                            ? "var(--color-status-review)"
                            : "var(--color-status-answered)",
                      }}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate group-hover:text-[var(--color-accent)] transition-colors" style={{ color: "var(--color-text-primary)" }}>
                        {cap.title}
                      </div>
                      <div className="text-[10px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                        {cap.status.replace("_", " ")} · {timeAgo(cap.createdAt)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Popular Tags */}
          <div
            className="rounded-xl border p-5 transition-theme"
            style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}
          >
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--color-text-muted)" }}>
              <Icon name="tag" size={14} />
              Popular Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {POPULAR_TAGS.map((tag) => (
                <Tag key={tag} label={tag} onClick={() => navigate(`/knowledge?q=${encodeURIComponent(tag)}`)} />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

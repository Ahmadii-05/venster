import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { workspaceApi, projectApi, userApi } from "../services/api";
import type {
  Workspace,
  Project,
  WorkspaceMember,
  UserSummary,
  ProjectStatus,
  ProjectPriority,
} from "../types";
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_STYLES } from "../types";
import Avatar from "../components/ui/Avatar";
import Icon from "../components/ui/Icon";

type Tab = "projects" | "members";

// Role → pill colors, reusing the shared design tokens.
const ROLE_STYLES: Record<WorkspaceMember["role"], { bg: string; text: string }> = {
  OWNER: { bg: "var(--color-accent-dim)", text: "var(--color-accent)" },
  ADMIN: { bg: "rgba(167, 139, 250, 0.15)", text: "var(--color-status-answered)" },
  MEMBER: { bg: "rgba(107, 114, 128, 0.15)", text: "var(--color-text-secondary)" },
};

export default function WorkspaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [membersError, setMembersError] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("projects");
  const [loading, setLoading] = useState(true);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [projectRepo, setProjectRepo] = useState("");
  const [projectTech, setProjectTech] = useState("");
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>("PLANNING");
  const [projectPriority, setProjectPriority] = useState<ProjectPriority>("MEDIUM");
  const [projectTarget, setProjectTarget] = useState(""); // yyyy-MM-dd
  // Workspace-member user ids chosen as the new project's initial team. The
  // creator is always added by the backend, so they need not be picked here.
  const [projectMemberIds, setProjectMemberIds] = useState<string[]>([]);

  // ── Add-member typeahead state ──────────────────────────────
  const [memberQuery, setMemberQuery] = useState("");
  const [memberRole, setMemberRole] = useState("MEMBER");
  const [userResults, setUserResults] = useState<UserSummary[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);

  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      const [ws, projs] = await Promise.all([
        workspaceApi.list().then((ws) => ws.find((w) => w.id === id)),
        projectApi.list(id),
      ]);
      setWorkspace(ws || null);
      setProjects(projs);
      // Load the roster separately so a roster hiccup never blanks the page.
      try {
        const roster = await workspaceApi.listMembers(id);
        setMembers(roster || []);
        setMembersError(false);
      } catch {
        // Distinguish "couldn't load" from "genuinely empty" in the UI.
        setMembersError(true);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Debounced directory search for the add-member typeahead.
  useEffect(() => {
    const q = memberQuery.trim();
    if (!q) {
      setUserResults([]);
      return;
    }
    let active = true;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await userApi.search(q);
        if (active) setUserResults(results || []);
      } catch {
        if (active) setUserResults([]);
      } finally {
        if (active) setSearching(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [memberQuery]);

  const handleCreateProject = async () => {
    if (!id || projectName.length < 3) return;
    try {
      const proj = await projectApi.create(id, {
        name: projectName,
        description: projectDesc.trim() || undefined,
        repositoryUrl: projectRepo.trim() || undefined,
        techStack: projectTech.trim() || undefined,
        status: projectStatus,
        priority: projectPriority,
        targetDate: projectTarget || undefined,
        memberIds: projectMemberIds.length ? projectMemberIds : undefined,
      });
      setProjects((prev) => [...prev, proj]);
      setProjectName("");
      setProjectDesc("");
      setProjectRepo("");
      setProjectTech("");
      setProjectStatus("PLANNING");
      setProjectPriority("MEDIUM");
      setProjectTarget("");
      setProjectMemberIds([]);
      setShowCreateProject(false);
      setError("");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggleProjectMember = (userId: string) => {
    setProjectMemberIds((prev) =>
      prev.includes(userId)
        ? prev.filter((x) => x !== userId)
        : [...prev, userId]
    );
  };

  const chooseUser = (u: UserSummary) => {
    setSelectedUser(u);
    setMemberQuery(u.name || u.email);
    setShowUserDropdown(false);
  };

  const handleAddMember = async () => {
    if (!id) return;
    const q = memberQuery.trim();
    // An explicit pick from the dropdown wins; otherwise try to resolve the
    // typed text against the search results (exact email/name, or a lone hit).
    let target: UserSummary | null = selectedUser;
    if (!target && q) {
      target =
        userResults.find(
          (u) =>
            u.email.toLowerCase() === q.toLowerCase() ||
            (u.name || "").toLowerCase() === q.toLowerCase()
        ) || (userResults.length === 1 ? userResults[0] : null);
    }
    if (!target) {
      setError("No such user found");
      return;
    }

    setAdding(true);
    try {
      const member = await workspaceApi.addMember(id, target.email, memberRole);
      // Show the new person right away (guard against a duplicate entry).
      setMembers((prev) =>
        prev.some((m) => m.id === member.id) ? prev : [...prev, member]
      );
      setMemberQuery("");
      setSelectedUser(null);
      setUserResults([]);
      setMemberRole("MEMBER");
      setShowAddMember(false);
      setError("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  if (loading)
    return (
      <div className="text-sm text-center py-12" style={{ color: "var(--color-text-muted)" }}>
        Loading...
      </div>
    );

  const tabs = [
    { key: "projects", label: "Projects", icon: "folder", count: projects.length },
    { key: "members", label: "Members", icon: "user", count: members.length },
  ] as const;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest font-mono mb-1" style={{ color: "var(--color-accent)" }}>
            WORKSPACE
          </div>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold"
              style={{ backgroundColor: "var(--color-accent-dim)", color: "var(--color-accent)" }}
            >
              {workspace?.name?.substring(0, 2).toUpperCase() || "W"}
            </div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
              {workspace?.name || "Workspace"}
            </h1>
          </div>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            Manage projects and members for this workspace.
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === "members" ? (
            <button
              onClick={() => setShowAddMember((v) => !v)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all hover:opacity-90"
              style={{ backgroundColor: "var(--color-accent)", borderColor: "var(--color-accent)", color: "#000" }}
            >
              + Add Member
            </button>
          ) : (
            <button
              onClick={() => setShowCreateProject((v) => !v)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all hover:opacity-90"
              style={{ backgroundColor: "var(--color-accent)", borderColor: "var(--color-accent)", color: "#000" }}
            >
              + New Project
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg p-3 border text-sm" style={{ backgroundColor: "rgba(239,68,68,0.1)", borderColor: "var(--color-danger)", color: "var(--color-danger)" }}>
          {error}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 border-b" style={{ borderColor: "var(--color-border)" }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-all"
            style={{
              borderColor: activeTab === t.key ? "var(--color-accent)" : "transparent",
              color: activeTab === t.key ? "var(--color-accent)" : "var(--color-text-secondary)",
            }}
          >
            <Icon name={t.icon} size={14} />
            {t.label}
            <span className="text-[10px] font-mono opacity-70">({t.count})</span>
          </button>
        ))}
      </div>

      {/* ── PROJECTS TAB ─────────────────────────────────────── */}
      {activeTab === "projects" && (
        <div className="space-y-6">
          {showCreateProject && (
            <div className="rounded-xl p-4 border transition-theme space-y-3" style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
              <input
                type="text"
                placeholder="Project name (min 3 chars)"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm border outline-none focus:ring-1 transition-theme"
                style={{ backgroundColor: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={projectDesc}
                onChange={(e) => setProjectDesc(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm border outline-none focus:ring-1 transition-theme"
                style={{ backgroundColor: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
              />

              {/* Optional technical / production details (industry-standard, kept simple) */}
              <div className="pt-1 space-y-3 border-t" style={{ borderColor: "var(--color-border)" }}>
                <div className="text-[10px] uppercase tracking-widest font-mono pt-2" style={{ color: "var(--color-text-muted)" }}>
                  Technical details · optional
                </div>

                <div>
                  <label className="block text-[11px] mb-1" style={{ color: "var(--color-text-secondary)" }}>
                    Repository URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://github.com/org/repo"
                    value={projectRepo}
                    onChange={(e) => setProjectRepo(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-sm border outline-none focus:ring-1 transition-theme"
                    style={{ backgroundColor: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] mb-1" style={{ color: "var(--color-text-secondary)" }}>
                      Tech stack
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Java · Spring Boot · React"
                      value={projectTech}
                      onChange={(e) => setProjectTech(e.target.value)}
                      className="w-full rounded-lg px-3 py-2 text-sm border outline-none focus:ring-1 transition-theme"
                      style={{ backgroundColor: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] mb-1" style={{ color: "var(--color-text-secondary)" }}>
                      Target date
                    </label>
                    <input
                      type="date"
                      value={projectTarget}
                      onChange={(e) => setProjectTarget(e.target.value)}
                      className="w-full rounded-lg px-3 py-2 text-sm border outline-none focus:ring-1 transition-theme"
                      style={{ backgroundColor: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] mb-1" style={{ color: "var(--color-text-secondary)" }}>
                      Status
                    </label>
                    <select
                      value={projectStatus}
                      onChange={(e) => setProjectStatus(e.target.value as ProjectStatus)}
                      className="w-full rounded-lg px-3 py-2 text-sm border outline-none transition-theme"
                      style={{ backgroundColor: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
                    >
                      {(Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]).map((s) => (
                        <option key={s} value={s}>
                          {PROJECT_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] mb-1" style={{ color: "var(--color-text-secondary)" }}>
                      Priority
                    </label>
                    <select
                      value={projectPriority}
                      onChange={(e) => setProjectPriority(e.target.value as ProjectPriority)}
                      className="w-full rounded-lg px-3 py-2 text-sm border outline-none transition-theme"
                      style={{ backgroundColor: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Project team — who can see and act on this project's capsules.
                  Drawn from the workspace roster; you're added automatically as
                  the creator. Members not chosen here can be added later. */}
              <div className="pt-1 space-y-2 border-t" style={{ borderColor: "var(--color-border)" }}>
                <div className="text-[10px] uppercase tracking-widest font-mono pt-2" style={{ color: "var(--color-text-muted)" }}>
                  Project team · optional
                </div>
                <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                  Only team members can see this project and its capsules. You're added automatically.
                </p>
                {members.length === 0 ? (
                  <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                    {membersError
                      ? "Couldn't load the workspace roster."
                      : "No other workspace members to add yet."}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {members.map((m) => {
                      const selected = projectMemberIds.includes(m.user.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => toggleProjectMember(m.user.id)}
                          className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 text-xs border transition-all"
                          style={{
                            backgroundColor: selected ? "var(--color-accent-dim)" : "var(--color-bg-input)",
                            borderColor: selected ? "var(--color-accent)" : "var(--color-border)",
                            color: selected ? "var(--color-accent)" : "var(--color-text-secondary)",
                          }}
                        >
                          <Avatar user={m.user} size="sm" />
                          <span className="truncate max-w-[10rem]">
                            {m.user.name || m.user.email.split("@")[0]}
                          </span>
                          {selected && <Icon name="check" size={12} />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                onClick={handleCreateProject}
                disabled={projectName.length < 3}
                className="px-4 py-2 rounded-lg text-sm font-medium border transition-all hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "var(--color-accent)", borderColor: "var(--color-accent)", color: "#000" }}
              >
                Create Project
              </button>
            </div>
          )}

          {projects.length === 0 ? (
            <div
              className="rounded-xl p-12 border text-center transition-theme"
              style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}
            >
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                No projects yet. Create one to get started.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {projects.map((proj) => (
                <Link
                  key={proj.id}
                  to={`/projects/${proj.id}`}
                  className="rounded-xl p-5 border transition-all hover:opacity-90"
                  style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{proj.name}</h3>
                    {proj.status && (
                      <span
                        className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider"
                        style={{ backgroundColor: PROJECT_STATUS_STYLES[proj.status].bg, color: PROJECT_STATUS_STYLES[proj.status].text }}
                      >
                        {PROJECT_STATUS_LABELS[proj.status]}
                      </span>
                    )}
                  </div>
                  {proj.description && (
                    <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--color-text-secondary)" }}>{proj.description}</p>
                  )}
                  {proj.techStack && (
                    <p className="text-[11px] mt-1.5 truncate" style={{ color: "var(--color-text-muted)" }}>
                      {proj.techStack}
                    </p>
                  )}
                  <p className="text-[10px] font-mono mt-2" style={{ color: "var(--color-text-muted)" }}>
                    Created {new Date(proj.createdAt).toLocaleDateString()}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MEMBERS TAB ──────────────────────────────────────── */}
      {activeTab === "members" && (
        <div className="space-y-6">
          {showAddMember && (
            <div className="rounded-xl p-4 border transition-theme flex flex-col sm:flex-row gap-3" style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
              {/* Name / email typeahead */}
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search by name or email"
                  value={memberQuery}
                  onChange={(e) => {
                    setMemberQuery(e.target.value);
                    setSelectedUser(null);
                    setShowUserDropdown(true);
                  }}
                  onFocus={() => setShowUserDropdown(true)}
                  onBlur={() => setTimeout(() => setShowUserDropdown(false), 120)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
                  className="w-full rounded-lg px-3 py-2 text-sm border outline-none focus:ring-1 transition-theme"
                  style={{ backgroundColor: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
                />
                {showUserDropdown && memberQuery.trim() && (
                  <div
                    className="absolute z-10 mt-1 w-full rounded-lg border shadow-lg overflow-hidden max-h-64 overflow-y-auto"
                    style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}
                  >
                    {searching && (
                      <div className="px-3 py-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
                        Searching…
                      </div>
                    )}
                    {!searching && userResults.length === 0 && (
                      <div className="px-3 py-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
                        No such user found
                      </div>
                    )}
                    {!searching &&
                      userResults.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          // onMouseDown fires before the input's onBlur, so the
                          // pick registers before the dropdown closes.
                          onMouseDown={(e) => {
                            e.preventDefault();
                            chooseUser(u);
                          }}
                          className="w-full text-left px-3 py-2 flex items-center gap-2 transition-all hover:opacity-80"
                          style={{ backgroundColor: "transparent" }}
                        >
                          <Avatar name={u.name} email={u.email} size="sm" />
                          <span className="min-w-0">
                            <span className="block text-sm truncate" style={{ color: "var(--color-text-primary)" }}>
                              {u.name || u.email.split("@")[0]}
                            </span>
                            <span className="block text-[11px] truncate" style={{ color: "var(--color-text-muted)" }}>
                              {u.email}
                            </span>
                          </span>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              <select
                value={memberRole}
                onChange={(e) => setMemberRole(e.target.value)}
                className="rounded-lg px-3 py-2 text-sm border outline-none transition-theme"
                style={{ backgroundColor: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
              >
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
              </select>
              <button
                onClick={handleAddMember}
                disabled={!memberQuery.trim() || adding}
                className="px-4 py-2 rounded-lg text-sm font-medium border transition-all hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "var(--color-accent)", borderColor: "var(--color-accent)", color: "#000" }}
              >
                {adding ? "Adding..." : "Add"}
              </button>
            </div>
          )}

          {members.length === 0 ? (
            <div
              className="rounded-xl p-12 border text-center transition-theme"
              style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}
            >
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                {membersError
                  ? "Couldn't load members. Make sure the backend is running the latest build, then reload."
                  : "No members to show yet. Use “+ Add Member” to add someone by name or email."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl p-4 border flex items-center gap-3 transition-theme"
                  style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}
                >
                  <Avatar user={m.user} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>
                      {m.user.name || m.user.email.split("@")[0]}
                    </div>
                    <div className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>
                      {m.user.email}
                    </div>
                  </div>
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider"
                    style={{ backgroundColor: ROLE_STYLES[m.role].bg, color: ROLE_STYLES[m.role].text }}
                  >
                    {m.role}
                  </span>
                  {m.joinedAt && (
                    <span className="text-[10px] font-mono hidden sm:block" style={{ color: "var(--color-text-muted)" }}>
                      {new Date(m.joinedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

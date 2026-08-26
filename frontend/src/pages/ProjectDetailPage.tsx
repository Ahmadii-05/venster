import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { capsuleApi, artifactApi, projectApi, workspaceApi } from "../services/api";
import {
  type Capsule,
  type CapsuleStatus,
  type CapsulePriority,
  type Project,
  type ProjectStatus,
  type ProjectPriority,
  type ProjectMember,
  type WorkspaceMember,
  STATUS_COLORS,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_STYLES,
} from "../types";
import Avatar from "../components/ui/Avatar";
import Icon from "../components/ui/Icon";

const ALL_STATUSES: (CapsuleStatus | "ALL")[] = [
  "ALL",
  "OPEN",
  "IN_REVIEW",
  "ANSWERED",
  "RESOLVED",
  "ARCHIVED",
];

// Text colors for the project priority label, reusing the shared tokens.
const PROJECT_PRIORITY_COLORS: Record<ProjectPriority, string> = {
  HIGH: "var(--color-priority-high)",
  MEDIUM: "var(--color-priority-medium)",
  LOW: "var(--color-priority-low)",
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [projectName, setProjectName] = useState("");
  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<CapsuleStatus | "ALL">(
    "ALL"
  );
  const [error, setError] = useState("");

  // ── Project entity + edit-form state ──────────────────────
  const [project, setProject] = useState<Project | null>(null);
  const [showEditProject, setShowEditProject] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editRepo, setEditRepo] = useState("");
  const [editTech, setEditTech] = useState("");
  const [editStatus, setEditStatus] = useState<ProjectStatus>("PLANNING");
  const [editPriority, setEditPriority] = useState<ProjectPriority>("MEDIUM");
  const [editTarget, setEditTarget] = useState(""); // yyyy-MM-dd

  // ── Project team state ─────────────────────────────────────
  // The team is the authorization boundary: only these users can see or act on
  // the project's capsules. Add-picker is drawn from the workspace roster.
  const [team, setTeam] = useState<ProjectMember[]>([]);
  const [teamError, setTeamError] = useState(false);
  const [wsRoster, setWsRoster] = useState<WorkspaceMember[]>([]);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [teamBusy, setTeamBusy] = useState(false);

  // ── Create Capsule state ──────────────────────────────────
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [capsuleTitle, setCapsuleTitle] = useState("");
  const [filePath, setFilePath] = useState("");
  const [repository, setRepository] = useState("");
  const [codeSnippet, setCodeSnippet] = useState("");
  const [symbolName, setSymbolName] = useState("");
  const [startLine, setStartLine] = useState("");
  const [endLine, setEndLine] = useState("");
  const [priority, setPriority] = useState<CapsulePriority>("MEDIUM");

  const fetchCapsules = useCallback(async () => {
    if (!id) return;
    try {
      const status =
        statusFilter === "ALL" ? undefined : statusFilter;
      const data = await capsuleApi.list({
        projectId: id,
        status,
      });
      setCapsules(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, statusFilter]);

  useEffect(() => {
    fetchCapsules();
  }, [fetchCapsules]);

  // Load the project entity itself (name, tech details, status…). Falls back
  // to the capsule-derived name only if the project fetch fails.
  const fetchProject = useCallback(async () => {
    if (!id) return;
    try {
      const proj = await projectApi.get(id);
      setProject(proj);
      setProjectName(proj.name);
    } catch {
      try {
        const caps = await capsuleApi.list({ projectId: id });
        setProjectName(
          caps[0]?.artifactAnchor?.artifactVersion?.artifact?.project?.name ||
            "Project"
        );
      } catch {
        setProjectName("Project");
      }
    }
  }, [id]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  // Load the project team (the authorization boundary for this project).
  const fetchTeam = useCallback(async () => {
    if (!id) return;
    try {
      const members = await projectApi.listMembers(id);
      setTeam(members || []);
      setTeamError(false);
    } catch {
      setTeamError(true);
    }
  }, [id]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  // Once the project is known, load its workspace roster so the add-picker can
  // offer workspace members who aren't on the team yet.
  useEffect(() => {
    if (!project) return;
    let active = true;
    workspaceApi
      .listMembers(project.workspace.id)
      .then((roster) => {
        if (active) setWsRoster(roster || []);
      })
      .catch(() => {
        if (active) setWsRoster([]);
      });
    return () => {
      active = false;
    };
  }, [project]);

  // Pre-fill the edit form from the loaded project whenever it opens.
  const openEditProject = () => {
    if (project) {
      setEditName(project.name);
      setEditDesc(project.description || "");
      setEditRepo(project.repositoryUrl || "");
      setEditTech(project.techStack || "");
      setEditStatus(project.status || "PLANNING");
      setEditPriority(project.priority || "MEDIUM");
      setEditTarget(project.targetDate || "");
    }
    setShowEditProject(true);
  };

  const handleUpdateProject = async () => {
    if (!id || editName.trim().length < 3) return;
    setSavingProject(true);
    setError("");
    try {
      const updated = await projectApi.update(id, {
        name: editName.trim(),
        description: editDesc.trim() || undefined,
        repositoryUrl: editRepo.trim() || undefined,
        techStack: editTech.trim() || undefined,
        status: editStatus,
        priority: editPriority,
        targetDate: editTarget || undefined,
      });
      setProject(updated);
      setProjectName(updated.name);
      setShowEditProject(false);
    } catch (err: any) {
      setError(err.message || "Failed to update project");
    } finally {
      setSavingProject(false);
    }
  };

  // ── Project team management ────────────────────────────────
  const handleAddTeamMember = async (email: string) => {
    if (!id) return;
    setTeamBusy(true);
    setError("");
    try {
      const member = await projectApi.addMember(id, email);
      setTeam((prev) =>
        prev.some((m) => m.user.id === member.user.id)
          ? prev
          : [...prev, member]
      );
    } catch (err: any) {
      setError(err.message || "Failed to add team member");
    } finally {
      setTeamBusy(false);
    }
  };

  const handleRemoveTeamMember = async (email: string) => {
    // A project must keep at least one member; the backend enforces this too.
    if (!id || team.length <= 1) return;
    setTeamBusy(true);
    setError("");
    try {
      await projectApi.removeMember(id, email);
      setTeam((prev) => prev.filter((m) => m.user.email !== email));
    } catch (err: any) {
      setError(err.message || "Failed to remove team member");
    } finally {
      setTeamBusy(false);
    }
  };

  // ── Handle capsule creation (chains 4 API calls) ──────────
  const handleCreateCapsule = async () => {
    if (!id || !capsuleTitle.trim() || !filePath.trim()) return;
    setCreating(true);
    setError("");
    try {
      // 1. Create Artifact
      const artifact = await artifactApi.create(
        id,
        filePath.trim(),
        repository.trim() || undefined
      );

      // 2. Create ArtifactVersion
      const version = await artifactApi.createVersion(artifact.id);

      // 3. Create ArtifactAnchor
      const anchor = await artifactApi.createAnchor(version.id, {
        startLine: startLine ? parseInt(startLine) : undefined,
        endLine: endLine ? parseInt(endLine) : undefined,
        selectedText: codeSnippet.trim() || undefined,
        symbolName: symbolName.trim() || undefined,
      });

      // 4. Create Capsule
      const capsule = await capsuleApi.create(
        anchor.id,
        capsuleTitle.trim(),
        priority
      );

      // Update UI
      setCapsules((prev) => [capsule, ...prev]);
      setCapsuleTitle("");
      setFilePath("");
      setRepository("");
      setCodeSnippet("");
      setSymbolName("");
      setStartLine("");
      setEndLine("");
      setPriority("MEDIUM");
      setShowCreate(false);
    } catch (err: any) {
      setError(err.message || "Failed to create capsule");
    } finally {
      setCreating(false);
    }
  };

  // Workspace members not yet on the team — the pool the add-picker offers.
  const addableRoster = wsRoster.filter(
    (m) => !team.some((t) => t.user.id === m.user.id)
  );

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <div
          className="text-[10px] uppercase tracking-widest font-mono mb-1"
          style={{ color: "var(--color-accent)" }}
        >
          PROJECT
        </div>
        <div className="vs-page-header flex items-center justify-between gap-3">
          <h1
            className="text-xl sm:text-2xl font-bold min-w-0 truncate"
            style={{ color: "var(--color-text-primary)" }}
          >
            {projectName || "Project"} — Capsules
          </h1>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all hover:opacity-90"
              style={{
                backgroundColor: "var(--color-accent)",
                color: "#000",
              }}
            >
              + New Capsule
            </button>
            <Link
              to="/"
              className="text-xs font-medium transition-all hover:opacity-80 hidden sm:block"
              style={{ color: "var(--color-accent)" }}
            >
              ← Dashboard
            </Link>
          </div>
        </div>
        <p
          className="text-sm mt-1"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Capsules attached to artifacts in this project.
        </p>
      </div>

      {error && (
        <div
          className="rounded-lg p-3 border text-sm flex items-center justify-between"
          style={{
            backgroundColor: "rgba(239,68,68,0.1)",
            borderColor: "var(--color-danger)",
            color: "var(--color-danger)",
          }}
        >
          <span>{error}</span>
          <button
            onClick={() => setError("")}
            className="ml-2 underline text-xs"
          >
            dismiss
          </button>
        </div>
      )}

      {/* ── Project info card / edit form ──────────────────── */}
      {project && (
        <div
          className="rounded-xl p-5 border transition-theme"
          style={{
            backgroundColor: "var(--color-bg-card)",
            borderColor: "var(--color-border)",
          }}
        >
          {!showEditProject ? (
            <div className="space-y-3">
              {/* Badges + Edit button */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {project.status && (
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider"
                      style={{
                        backgroundColor: PROJECT_STATUS_STYLES[project.status].bg,
                        color: PROJECT_STATUS_STYLES[project.status].text,
                      }}
                    >
                      {PROJECT_STATUS_LABELS[project.status]}
                    </span>
                  )}
                  {project.priority && (
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider border"
                      style={{
                        color: PROJECT_PRIORITY_COLORS[project.priority],
                        borderColor: "var(--color-border)",
                      }}
                    >
                      {project.priority} priority
                    </span>
                  )}
                </div>
                <button
                  onClick={openEditProject}
                  className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all hover:opacity-90"
                  style={{
                    backgroundColor: "var(--color-bg-input)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  ✎ Edit project
                </button>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="min-w-0">
                  <div
                    className="text-[10px] uppercase tracking-wider font-mono mb-0.5"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Repository
                  </div>
                  {project.repositoryUrl ? (
                    <a
                      href={project.repositoryUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate block hover:underline"
                      style={{ color: "var(--color-accent)" }}
                    >
                      {project.repositoryUrl}
                    </a>
                  ) : (
                    <span style={{ color: "var(--color-text-muted)" }}>—</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div
                    className="text-[10px] uppercase tracking-wider font-mono mb-0.5"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Tech stack
                  </div>
                  <span
                    style={{
                      color: project.techStack
                        ? "var(--color-text-primary)"
                        : "var(--color-text-muted)",
                    }}
                  >
                    {project.techStack || "—"}
                  </span>
                </div>
                <div className="min-w-0">
                  <div
                    className="text-[10px] uppercase tracking-wider font-mono mb-0.5"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Target date
                  </div>
                  <span
                    style={{
                      color: project.targetDate
                        ? "var(--color-text-primary)"
                        : "var(--color-text-muted)",
                    }}
                  >
                    {project.targetDate
                      ? new Date(project.targetDate).toLocaleDateString()
                      : "—"}
                  </span>
                </div>
              </div>

              {project.description && (
                <p
                  className="text-sm pt-1"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {project.description}
                </p>
              )}
            </div>
          ) : (
            /* ── Edit form ── */
            <div className="space-y-3">
              <div
                className="text-xs uppercase tracking-widest font-mono"
                style={{ color: "var(--color-accent)" }}
              >
                EDIT PROJECT
              </div>

              <div>
                <label
                  className="text-[10px] font-mono uppercase tracking-wider mb-1 block"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Name *
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm border outline-none focus:ring-1 transition-theme"
                  style={{
                    backgroundColor: "var(--color-bg-input)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-text-primary)",
                  }}
                />
              </div>

              <div>
                <label
                  className="text-[10px] font-mono uppercase tracking-wider mb-1 block"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Description
                </label>
                <input
                  type="text"
                  placeholder="Optional"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm border outline-none focus:ring-1 transition-theme"
                  style={{
                    backgroundColor: "var(--color-bg-input)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-text-primary)",
                  }}
                />
              </div>

              <div>
                <label
                  className="text-[10px] font-mono uppercase tracking-wider mb-1 block"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Repository URL
                </label>
                <input
                  type="url"
                  placeholder="https://github.com/org/repo"
                  value={editRepo}
                  onChange={(e) => setEditRepo(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm border outline-none focus:ring-1 font-mono transition-theme"
                  style={{
                    backgroundColor: "var(--color-bg-input)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-text-primary)",
                  }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    className="text-[10px] font-mono uppercase tracking-wider mb-1 block"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Tech stack
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Java · Spring Boot · React"
                    value={editTech}
                    onChange={(e) => setEditTech(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm border outline-none focus:ring-1 transition-theme"
                    style={{
                      backgroundColor: "var(--color-bg-input)",
                      borderColor: "var(--color-border)",
                      color: "var(--color-text-primary)",
                    }}
                  />
                </div>
                <div>
                  <label
                    className="text-[10px] font-mono uppercase tracking-wider mb-1 block"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Target date
                  </label>
                  <input
                    type="date"
                    value={editTarget}
                    onChange={(e) => setEditTarget(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm border outline-none focus:ring-1 transition-theme"
                    style={{
                      backgroundColor: "var(--color-bg-input)",
                      borderColor: "var(--color-border)",
                      color: "var(--color-text-primary)",
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    className="text-[10px] font-mono uppercase tracking-wider mb-1 block"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as ProjectStatus)}
                    className="w-full px-3 py-2 rounded-lg text-sm border outline-none transition-theme"
                    style={{
                      backgroundColor: "var(--color-bg-input)",
                      borderColor: "var(--color-border)",
                      color: "var(--color-text-primary)",
                    }}
                  >
                    {(Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]).map(
                      (s) => (
                        <option key={s} value={s}>
                          {PROJECT_STATUS_LABELS[s]}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div>
                  <label
                    className="text-[10px] font-mono uppercase tracking-wider mb-1 block"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Priority
                  </label>
                  <select
                    value={editPriority}
                    onChange={(e) =>
                      setEditPriority(e.target.value as ProjectPriority)
                    }
                    className="w-full px-3 py-2 rounded-lg text-sm border outline-none transition-theme"
                    style={{
                      backgroundColor: "var(--color-bg-input)",
                      borderColor: "var(--color-border)",
                      color: "var(--color-text-primary)",
                    }}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleUpdateProject}
                  disabled={editName.trim().length < 3 || savingProject}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: "var(--color-accent)", color: "#000" }}
                >
                  {savingProject ? "Saving..." : "Save changes"}
                </button>
                <button
                  onClick={() => setShowEditProject(false)}
                  disabled={savingProject}
                  className="px-4 py-2 rounded-lg text-sm font-medium border transition-all hover:opacity-90 disabled:opacity-50"
                  style={{
                    backgroundColor: "var(--color-bg-input)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Project team ──────────────────────────────────── */}
      {project && (
        <div
          className="rounded-xl p-5 border transition-theme space-y-3"
          style={{
            backgroundColor: "var(--color-bg-card)",
            borderColor: "var(--color-border)",
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div
                className="text-[10px] uppercase tracking-widest font-mono"
                style={{ color: "var(--color-accent)" }}
              >
                PROJECT TEAM
              </div>
              <p
                className="text-xs mt-0.5"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Only these members can see and act on this project's capsules.
              </p>
            </div>
            <button
              onClick={() => setShowAddTeam((v) => !v)}
              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all hover:opacity-90"
              style={{
                backgroundColor: "var(--color-bg-input)",
                borderColor: "var(--color-border)",
                color: "var(--color-text-secondary)",
              }}
            >
              + Add member
            </button>
          </div>

          {teamError && (
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Couldn't load the team. Make sure the backend is running the
              latest build, then reload.
            </p>
          )}

          {/* Add-picker: workspace members not already on the team */}
          {showAddTeam &&
            (addableRoster.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                Everyone in the workspace is already on this team. Add more
                people to the workspace first.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                {addableRoster.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    disabled={teamBusy}
                    onClick={() => handleAddTeamMember(m.user.email)}
                    className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 text-xs border transition-all hover:opacity-90 disabled:opacity-50"
                    style={{
                      backgroundColor: "var(--color-bg-input)",
                      borderColor: "var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    <Avatar user={m.user} size="sm" />
                    <span className="truncate max-w-[10rem]">
                      {m.user.name || m.user.email.split("@")[0]}
                    </span>
                    <Icon name="plus" size={12} />
                  </button>
                ))}
              </div>
            ))}

          {/* Current team roster */}
          {team.length === 0
            ? !teamError && (
                <p
                  className="text-xs"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  No team members yet.
                </p>
              )
            : (
                <div className="flex flex-wrap gap-2">
                  {team.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 text-xs border"
                      style={{
                        backgroundColor: "var(--color-bg-input)",
                        borderColor: "var(--color-border)",
                        color: "var(--color-text-primary)",
                      }}
                    >
                      <Avatar user={m.user} size="sm" />
                      <span className="truncate max-w-[10rem]">
                        {m.user.name || m.user.email.split("@")[0]}
                      </span>
                      {team.length > 1 && (
                        <button
                          type="button"
                          disabled={teamBusy}
                          onClick={() => handleRemoveTeamMember(m.user.email)}
                          title="Remove from team"
                          className="rounded-full p-0.5 transition-all hover:opacity-70 disabled:opacity-40"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          <Icon name="close" size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
        </div>
      )}

      {/* ── Create Capsule Form ───────────────────────────── */}
      {showCreate && (
        <div
          className="rounded-xl p-5 border space-y-4 transition-theme"
          style={{
            backgroundColor: "var(--color-bg-card)",
            borderColor: "var(--color-border)",
          }}
        >
          <div
            className="text-xs uppercase tracking-widest font-mono"
            style={{ color: "var(--color-accent)" }}
          >
            NEW CAPSULE
          </div>

          {/* Title */}
          <div>
            <label
              className="text-[10px] font-mono uppercase tracking-wider mb-1 block"
              style={{ color: "var(--color-text-muted)" }}
            >
              Title *
            </label>
            <input
              type="text"
              placeholder="What's the issue or question?"
              value={capsuleTitle}
              onChange={(e) => setCapsuleTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none focus:ring-1 transition-theme"
              style={{
                backgroundColor: "var(--color-bg-input)",
                borderColor: "var(--color-border)",
                color: "var(--color-text-primary)",
              }}
            />
          </div>

          {/* File Path */}
          <div>
            <label
              className="text-[10px] font-mono uppercase tracking-wider mb-1 block"
              style={{ color: "var(--color-text-muted)" }}
            >
              File Path *
            </label>
            <input
              type="text"
              placeholder="e.g. src/main/java/com/example/MyClass.java"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none focus:ring-1 font-mono transition-theme"
              style={{
                backgroundColor: "var(--color-bg-input)",
                borderColor: "var(--color-border)",
                color: "var(--color-text-primary)",
              }}
            />
          </div>

          {/* Repository (optional) */}
          <div>
            <label
              className="text-[10px] font-mono uppercase tracking-wider mb-1 block"
              style={{ color: "var(--color-text-muted)" }}
            >
              Repository URL (optional)
            </label>
            <input
              type="text"
              placeholder="e.g. github.com/org/repo"
              value={repository}
              onChange={(e) => setRepository(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none focus:ring-1 font-mono transition-theme"
              style={{
                backgroundColor: "var(--color-bg-input)",
                borderColor: "var(--color-border)",
                color: "var(--color-text-primary)",
              }}
            />
          </div>

          {/* Code Snippet */}
          <div>
            <label
              className="text-[10px] font-mono uppercase tracking-wider mb-1 block"
              style={{ color: "var(--color-text-muted)" }}
            >
              Code Snippet (optional)
            </label>
            <textarea
              placeholder="Paste the relevant code here..."
              value={codeSnippet}
              onChange={(e) => setCodeSnippet(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none focus:ring-1 font-mono resize-none transition-theme"
              style={{
                backgroundColor: "var(--color-bg-input)",
                borderColor: "var(--color-border)",
                color: "var(--color-text-primary)",
              }}
            />
          </div>

          {/* Symbol Name + Line Range */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label
                className="text-[10px] font-mono uppercase tracking-wider mb-1 block"
                style={{ color: "var(--color-text-muted)" }}
              >
                Symbol (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. processPayment"
                value={symbolName}
                onChange={(e) => setSymbolName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm border outline-none focus:ring-1 font-mono transition-theme"
                style={{
                  backgroundColor: "var(--color-bg-input)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-primary)",
                }}
              />
            </div>
            <div>
              <label
                className="text-[10px] font-mono uppercase tracking-wider mb-1 block"
                style={{ color: "var(--color-text-muted)" }}
              >
                Start Line
              </label>
              <input
                type="number"
                placeholder="e.g. 42"
                value={startLine}
                onChange={(e) => setStartLine(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm border outline-none focus:ring-1 font-mono transition-theme"
                style={{
                  backgroundColor: "var(--color-bg-input)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-primary)",
                }}
              />
            </div>
            <div>
              <label
                className="text-[10px] font-mono uppercase tracking-wider mb-1 block"
                style={{ color: "var(--color-text-muted)" }}
              >
                End Line
              </label>
              <input
                type="number"
                placeholder="e.g. 58"
                value={endLine}
                onChange={(e) => setEndLine(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm border outline-none focus:ring-1 font-mono transition-theme"
                style={{
                  backgroundColor: "var(--color-bg-input)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-primary)",
                }}
              />
            </div>
          </div>

          {/* Priority */}
          <div>
            <label
              className="text-[10px] font-mono uppercase tracking-wider mb-1 block"
              style={{ color: "var(--color-text-muted)" }}
            >
              Priority
            </label>
            <div className="flex gap-2">
              {(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as CapsulePriority[]).map(
                (p) => (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      priority === p ? "opacity-100" : "opacity-50 hover:opacity-80"
                    }`}
                    style={{
                      backgroundColor:
                        priority === p ? "var(--color-accent-dim)" : "var(--color-bg-input)",
                      borderColor: priority === p ? "var(--color-accent)" : "var(--color-border)",
                      color: priority === p ? "var(--color-accent)" : "var(--color-text-secondary)",
                    }}
                  >
                    {p}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleCreateCapsule}
            disabled={!capsuleTitle.trim() || !filePath.trim() || creating}
            className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
            style={{
              backgroundColor: "var(--color-accent)",
              color: "#000",
            }}
          >
            {creating ? "Creating..." : "Create Capsule"}
          </button>
        </div>
      )}

      {/* Status filter tabs */}
      <div className="flex gap-1 flex-wrap">
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              statusFilter === s
                ? "border"
                : "border opacity-70 hover:opacity-100"
            }`}
            style={{
              backgroundColor:
                statusFilter === s
                  ? "var(--color-accent-dim)"
                  : "var(--color-bg-card)",
              borderColor:
                statusFilter === s
                  ? "var(--color-accent)"
                  : "var(--color-border)",
              color:
                statusFilter === s
                  ? "var(--color-accent)"
                  : "var(--color-text-secondary)",
            }}
          >
            {s}
            {s !== "ALL"
              ? ` (${capsules.filter((c) => c.status === s).length})`
              : ` (${capsules.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div
          className="text-sm text-center py-12"
          style={{ color: "var(--color-text-muted)" }}
        >
          Loading capsules...
        </div>
      ) : capsules.length === 0 ? (
        <div
          className="rounded-xl p-12 border text-center transition-theme"
          style={{
            backgroundColor: "var(--color-bg-card)",
            borderColor: "var(--color-border)",
          }}
        >
          <p
            className="text-sm"
            style={{ color: "var(--color-text-muted)" }}
          >
            No capsules yet
          </p>
          <p
            className="text-xs mt-1"
            style={{ color: "var(--color-text-muted)" }}
          >
            Click "+ New Capsule" above to create one.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {capsules.map((cap) => (
            <Link
              key={cap.id}
              to={`/capsules/${cap.id}`}
              className="block rounded-xl p-4 border transition-all hover:opacity-90"
              style={{
                backgroundColor: "var(--color-bg-card)",
                borderColor: "var(--color-border)",
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-[10px] font-mono"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {cap.id.substring(0, 8).toUpperCase()}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-medium"
                      style={{
                        backgroundColor:
                          STATUS_COLORS[cap.status]?.bg ||
                          "var(--color-bg-input)",
                        color:
                          STATUS_COLORS[cap.status]?.text ||
                          "var(--color-text-secondary)",
                      }}
                    >
                      {cap.status.replace("_", " ")}
                    </span>
                  </div>
                  <h3
                    className="text-sm font-semibold truncate"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {cap.title}
                  </h3>
                  <div
                    className="flex items-center gap-3 mt-1 text-[10px]"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    <span className="font-mono">
                      📄{" "}
                      {cap.artifactAnchor?.artifactVersion?.artifact?.filePath}
                      {cap.artifactAnchor?.startLine != null &&
                        ` (L${cap.artifactAnchor.startLine}–${cap.artifactAnchor.endLine})`}
                    </span>
                    {cap.artifactAnchor?.symbolName && (
                      <span
                        style={{ color: "var(--color-status-answered)" }}
                      >
                        ƒ {cap.artifactAnchor.symbolName}
                      </span>
                    )}
                  </div>
                  <div
                    className="text-[10px] mt-1"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    by {cap.author?.name || cap.author?.email} •
                    {cap.reviewer &&
                      ` reviewer: ${cap.reviewer.name || cap.reviewer.email} •`}
                    {new Date(cap.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="shrink-0 ml-3">
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-medium"
                    style={{
                      color:
                        cap.priority === "CRITICAL"
                          ? "var(--color-priority-high)"
                          : cap.priority === "HIGH"
                          ? "var(--color-priority-high)"
                          : cap.priority === "MEDIUM"
                          ? "var(--color-priority-medium)"
                          : "var(--color-priority-low)",
                    }}
                  >
                    {cap.priority}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

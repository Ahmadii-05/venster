import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { workspaceApi, projectApi } from "../services/api";
import type { Workspace, Project } from "../types";

export default function WorkspaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateProject = async () => {
    if (!id || projectName.length < 3) return;
    try {
      const proj = await projectApi.create(id, projectName, projectDesc || undefined);
      setProjects((prev) => [...prev, proj]);
      setProjectName("");
      setProjectDesc("");
      setShowCreateProject(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddMember = async () => {
    if (!id || !memberEmail) return;
    try {
      await workspaceApi.addMember(id, memberEmail, "MEMBER");
      setMemberEmail("");
      setShowAddMember(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) return <div className="text-sm text-center py-12" style={{ color: "var(--color-text-muted)" }}>Loading...</div>;

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
          <button
            onClick={() => setShowAddMember(!showAddMember)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all hover:opacity-80"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
          >
            + Add Member
          </button>
          <button
            onClick={() => setShowCreateProject(!showCreateProject)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all hover:opacity-90"
            style={{ backgroundColor: "var(--color-accent)", borderColor: "var(--color-accent)", color: "#000" }}
          >
            + New Project
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg p-3 border text-sm" style={{ backgroundColor: "rgba(239,68,68,0.1)", borderColor: "var(--color-danger)", color: "var(--color-danger)" }}>
          {error}
        </div>
      )}

      {showAddMember && (
        <div className="rounded-xl p-4 border transition-theme flex gap-3" style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
          <input
            type="email"
            placeholder="Member email"
            value={memberEmail}
            onChange={(e) => setMemberEmail(e.target.value)}
            className="flex-1 rounded-lg px-3 py-2 text-sm border outline-none focus:ring-1 transition-theme"
            style={{ backgroundColor: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
            onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
          />
          <button
            onClick={handleAddMember}
            disabled={!memberEmail}
            className="px-4 py-2 rounded-lg text-sm font-medium border transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "var(--color-accent)", borderColor: "var(--color-accent)", color: "#000" }}
          >
            Add
          </button>
        </div>
      )}

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

      <div className="text-xs uppercase tracking-widest font-mono" style={{ color: "var(--color-text-muted)" }}>
        PROJECTS ({projects.length})
      </div>

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
              <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{proj.name}</h3>
              {proj.description && (
                <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--color-text-secondary)" }}>{proj.description}</p>
              )}
              <p className="text-[10px] font-mono mt-2" style={{ color: "var(--color-text-muted)" }}>
                Created {new Date(proj.createdAt).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

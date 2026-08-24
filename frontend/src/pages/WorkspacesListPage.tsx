import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { workspaceApi } from "../services/api";
import type { Workspace } from "../types";
import EmptyState from "../components/ui/EmptyState";

export default function WorkspacesListPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    workspaceApi
      .list()
      .then((ws) => setWorkspaces(ws || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (newName.length < 3) return;
    setCreating(true);
    try {
      const ws = await workspaceApi.create(newName.trim());
      setWorkspaces((prev) => [...prev, ws]);
      setNewName("");
      setShowCreate(false);
    } catch (err: any) {
      alert(err.message || "Failed to create");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Loading workspaces...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="eyebrow mb-1.5">Workspaces</div>
          <h1 className="font-display text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            Workspaces
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            Manage your team workspaces and projects.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 rounded-lg text-sm font-semibold font-display transition-all hover:opacity-90"
          style={{ backgroundColor: "var(--color-accent)", color: "#000" }}
        >
          + New Workspace
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div
          className="rounded-xl p-4 border"
          style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}
        >
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Workspace name (min 3 chars)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="flex-1 px-3 py-2 rounded-lg text-sm border outline-none focus:ring-1 focus:ring-[color:var(--color-accent)] transition-theme"
              style={{ backgroundColor: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
              autoFocus
            />
            <button
              onClick={handleCreate}
              disabled={newName.length < 3 || creating}
              className="px-5 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "var(--color-accent)", color: "#000" }}
            >
              {creating ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      )}

      {/* Workspace list */}
      {workspaces.length === 0 ? (
        <EmptyState
          icon="folder"
          title="No workspaces yet"
          description="Create your first workspace to organize projects and collaborate with your team."
          action={{ label: "+ New Workspace", onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspaces.map((ws) => (
            <Link
              key={ws.id}
              to={`/workspaces/${ws.id}`}
              className="relative overflow-hidden rounded-xl p-5 border transition-all hover:-translate-y-0.5 hover:shadow-lg group"
              style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}
            >
              <span
                className="absolute left-0 top-0 bottom-0 w-[3px] opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ backgroundColor: "var(--color-accent)" }}
                aria-hidden="true"
              />
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold font-display"
                  style={{ backgroundColor: "var(--color-accent-dim)", color: "var(--color-accent)" }}
                >
                  {ws.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-semibold font-display group-hover:text-[var(--color-accent)] transition-colors" style={{ color: "var(--color-text-primary)" }}>
                    {ws.name}
                  </div>
                  <div className="text-[10px] font-mono" style={{ color: "var(--color-text-muted)" }}>
                    Created by {ws.createdBy?.name || ws.createdBy?.email?.split("@")[0] || "Unknown"}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono" style={{ color: "var(--color-text-muted)" }}>
                <span>{ws.id.substring(0, 8)}</span>
                <span>{timeAgo(ws.createdAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

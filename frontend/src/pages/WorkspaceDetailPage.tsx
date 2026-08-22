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

  if (loading) return <div className="text-gray-500 text-sm">Loading...</div>;

  return (
    <div>
      <div className="mb-6">
        <Link to="/" className="text-sm text-blue-600 hover:underline">
          ← Back to Dashboard
        </Link>
        <div className="flex items-center justify-between mt-2">
          <h1 className="text-2xl font-bold text-gray-800">
            {workspace?.name || "Workspace"}
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddMember(!showAddMember)}
              className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              + Add Member
            </button>
            <button
              onClick={() => setShowCreateProject(!showCreateProject)}
              className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              + New Project
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {showAddMember && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex gap-3">
          <input
            type="email"
            placeholder="Member email"
            value={memberEmail}
            onChange={(e) => setMemberEmail(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
          />
          <button
            onClick={handleAddMember}
            disabled={!memberEmail}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      )}

      {showCreateProject && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 space-y-3">
          <input
            type="text"
            placeholder="Project name (min 3 chars)"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={projectDesc}
            onChange={(e) => setProjectDesc(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button
            onClick={handleCreateProject}
            disabled={projectName.length < 3}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            Create Project
          </button>
        </div>
      )}

      <h2 className="text-lg font-semibold text-gray-700 mb-3">Projects</h2>
      {projects.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          No projects yet. Create one to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((proj) => (
            <Link
              key={proj.id}
              to={`/projects/${proj.id}`}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
            >
              <h3 className="font-semibold text-gray-800">{proj.name}</h3>
              {proj.description && (
                <p className="text-sm text-gray-500 mt-1">{proj.description}</p>
              )}
              <p className="text-xs text-gray-400 mt-2">
                {new Date(proj.createdAt).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

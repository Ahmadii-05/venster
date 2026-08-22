import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { capsuleApi } from "../services/api";
import {
  type Capsule,
  type CapsuleStatus,
  STATUS_COLORS,
} from "../types";

const ALL_STATUSES: (CapsuleStatus | "ALL")[] = [
  "ALL",
  "OPEN",
  "IN_REVIEW",
  "ANSWERED",
  "RESOLVED",
  "ARCHIVED",
];

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [projectName, setProjectName] = useState("");
  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<CapsuleStatus | "ALL">(
    "ALL"
  );
  const [error, setError] = useState("");

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

  // Fetch project name
  useEffect(() => {
    if (!id) return;
    // We need to get the project name - list all projects from all workspaces
    // For now, we'll get it from the first capsule or leave it blank
    const fetchName = async () => {
      try {
        const capsules = await capsuleApi.list({ projectId: id });
        if (capsules.length > 0) {
          setProjectName(
            capsules[0].artifactAnchor?.artifactVersion?.artifact?.project
              ?.name || "Project"
          );
        } else {
          setProjectName("Project");
        }
      } catch {
        setProjectName("Project");
      }
    };
    fetchName();
  }, [id]);

  return (
    <div>
      <div className="mb-6">
        <Link to="/" className="text-sm text-blue-600 hover:underline">
          ← Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 mt-2">
          {projectName || "Project"} — Capsules
        </h1>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Status filter tabs */}
      <div className="flex gap-1 mb-4 flex-wrap">
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === s
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-500 text-sm">Loading...</div>
      ) : capsules.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg mb-2">No capsules found</p>
          <p className="text-sm">
            Create one from the VS Code extension to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {capsules.map((cap) => (
            <Link
              key={cap.id}
              to={`/capsules/${cap.id}`}
              className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 truncate">
                    {cap.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    📄{" "}
                    {cap.artifactAnchor?.artifactVersion?.artifact?.filePath}
                    {cap.artifactAnchor?.startLine != null &&
                      ` (L${cap.artifactAnchor.startLine}–${cap.artifactAnchor.endLine})`}
                  </p>
                  {cap.artifactAnchor?.symbolName && (
                    <p className="text-xs text-purple-600 mt-0.5">
                      ƒ {cap.artifactAnchor.symbolName}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    by {cap.author?.name || cap.author?.email} •{" "}
                    {new Date(cap.createdAt).toLocaleDateString()}
                    {cap.reviewer &&
                      ` • reviewer: ${cap.reviewer.name || cap.reviewer.email}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[cap.status]}`}
                  >
                    {cap.status}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      cap.priority === "CRITICAL"
                        ? "bg-red-100 text-red-700"
                        : cap.priority === "HIGH"
                        ? "bg-orange-100 text-orange-700"
                        : cap.priority === "MEDIUM"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
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

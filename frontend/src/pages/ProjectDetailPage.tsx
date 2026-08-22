import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { capsuleApi, artifactApi } from "../services/api";
import {
  type Capsule,
  type CapsuleStatus,
  type CapsulePriority,
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

  useEffect(() => {
    if (!id) return;
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

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div
          className="text-[10px] uppercase tracking-widest font-mono mb-1"
          style={{ color: "var(--color-accent)" }}
        >
          PROJECT
        </div>
        <div className="flex items-center justify-between">
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--color-text-primary)" }}
          >
            {projectName || "Project"} — Capsules
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
              style={{
                backgroundColor: "var(--color-accent)",
                color: "#000",
              }}
            >
              + New Capsule
            </button>
            <Link
              to="/"
              className="text-xs font-medium transition-all hover:opacity-80"
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

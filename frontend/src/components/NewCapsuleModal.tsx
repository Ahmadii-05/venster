import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import Modal from "./ui/Modal";
import Icon from "./ui/Icon";
import { artifactApi, capsuleApi, capsuleSuggestionApi, projectApi, workspaceApi } from "../services/api";
import { isInVsCode, requestCurrentContext } from "../services/vscodeBridge";
import type { Workspace, Project } from "../types";
import type { SimilarKnowledgeItem } from "../services/api";

interface NewCapsuleModalProps {
  open: boolean;
  onClose: () => void;
}

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
const VISIBILITIES = ["Public", "Workspace", "Private"] as const;

export default function NewCapsuleModal({ open, onClose }: NewCapsuleModalProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0=details, 1=workspace/project, 2=creating
  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("");
  const [filePath, setFilePath] = useState("");
  const [repository, setRepository] = useState("");
  const [codeSnippet, setCodeSnippet] = useState("");
  const [symbolName, setSymbolName] = useState("");
  const [startLine, setStartLine] = useState("");
  const [endLine, setEndLine] = useState("");
  const [priority, setPriority] = useState<string>("MEDIUM");
  const [visibility, setVisibility] = useState<string>("Public");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [similarItems, setSimilarItems] = useState<SimilarKnowledgeItem[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [similarChecked, setSimilarChecked] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = () => {
    setStep(0);
    setTitle("");
    setQuestion("");
    setFilePath("");
    setRepository("");
    setCodeSnippet("");
    setSymbolName("");
    setStartLine("");
    setEndLine("");
    setPriority("MEDIUM");
    setVisibility("Public");
    setSelectedWorkspaceId("");
    setSelectedProjectId("");
    setWorkspaces([]);
    setProjects([]);
    setLoading(false);
    setError("");
    setSimilarItems([]);
    setSimilarChecked(false);
    setSimilarLoading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  // VS Code: when the modal opens, automatically pull the current editor
  // context (file path, selection, line range) so the developer never has to
  // type it manually. Fields stay editable for manual overrides.
  useEffect(() => {
    if (!open || !isInVsCode) return;
    let cancelled = false;
    requestCurrentContext().then((ctx) => {
      if (cancelled || !ctx) return;
      setFilePath(ctx.filePath ?? "");
      setCodeSnippet(ctx.selectedCode ?? "");
      setStartLine(ctx.startLine != null ? String(ctx.startLine) : "");
      setEndLine(ctx.endLine != null ? String(ctx.endLine) : "");
      if (ctx.workspaceName) setRepository(ctx.workspaceName);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Step 1: Load workspaces
  const goToProjectStep = async () => {
    setLoading(true);
    setError("");
    try {
      const ws = await workspaceApi.list();
      setWorkspaces(ws || []);
      setStep(1);
    } catch (err: any) {
      setError(err.message || "Failed to load workspaces");
    } finally {
      setLoading(false);
    }
  };

  // Load projects when workspace changes
  const handleWorkspaceChange = async (wsId: string) => {
    setSelectedWorkspaceId(wsId);
    setSelectedProjectId("");
    setSimilarItems([]);
    setSimilarChecked(false);
    if (!wsId) {
      setProjects([]);
      return;
    }
    try {
      const projs = await projectApi.list(wsId);
      setProjects(projs || []);
    } catch {
      setProjects([]);
    }

    // Trigger debounced duplicate check
    if (title.trim()) {
      fetchSimilarItems(title, question, wsId);
    }
  };

  // Debounced duplicate detection
  const fetchSimilarItems = useCallback(
    async (capsuleTitle: string, capsuleDesc: string, wsId: string) => {
      if (!capsuleTitle.trim() || !wsId) return;
      setSimilarLoading(true);
      try {
        const items = await capsuleSuggestionApi.suggestSimilar({
          title: capsuleTitle,
          description: capsuleDesc || undefined,
          workspaceId: wsId,
        });
        setSimilarItems(items || []);
        setSimilarChecked(true);
      } catch {
        // Fail silently — suggestion is non-blocking
        setSimilarItems([]);
        setSimilarChecked(true);
      } finally {
        setSimilarLoading(false);
      }
    },
    []
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Step 2: Create capsule
  const handleCreate = async () => {
    if (!title.trim() || !selectedProjectId) return;
    setStep(2);
    setError("");
    setLoading(true);

    try {
      // 1. Create artifact
      const artifact = await artifactApi.create(
        selectedProjectId,
        filePath || "general/query.txt",
        repository || undefined
      );

      // 2. Create version
      const version = await artifactApi.createVersion(artifact.id);

      // 3. Create anchor
      const anchor = await artifactApi.createAnchor(version.id, {
        startLine: startLine ? parseInt(startLine) : undefined,
        endLine: endLine ? parseInt(endLine) : undefined,
        selectedText: codeSnippet || question || undefined,
        symbolName: symbolName || undefined,
      });

      // 4. Create capsule
      const capsule = await capsuleApi.create(anchor.id, title, priority);

      handleClose();
      navigate(`/capsules/${capsule.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create capsule");
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    backgroundColor: "var(--color-bg-input)",
    borderColor: "var(--color-border)",
    color: "var(--color-text-primary)",
  };

  const labelClass = "block text-xs font-medium mb-1.5";
  const inputClass =
    "w-full px-3 py-2 rounded-lg text-sm border outline-none focus:ring-1 transition-theme";

  return (
    <Modal open={open} onClose={handleClose} title="Create New Capsule" maxWidth="600px">
      {error && (
        <div
          className="mb-4 px-3 py-2 rounded-lg text-xs"
          style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "var(--color-danger)" }}
        >
          {error}
        </div>
      )}

      {step === 0 && (
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className={labelClass} style={{ color: "var(--color-text-secondary)" }}>
              Title *
            </label>
            <input
              type="text"
              placeholder="What's the question or issue?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              style={inputStyle}
              autoFocus
            />
          </div>

          {/* Question */}
          <div>
            <label className={labelClass} style={{ color: "var(--color-text-secondary)" }}>
              Description
            </label>
            <textarea
              placeholder="Describe the problem or question in detail..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              className={`${inputClass} resize-none`}
              style={inputStyle}
            />
          </div>

          {/* File Path */}
          <div>
            <label className={labelClass} style={{ color: "var(--color-text-secondary)" }}>
              File / Code Context
            </label>
            <input
              type="text"
              placeholder="e.g. src/main/java/com/example/Service.java"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              className={inputClass}
              style={inputStyle}
            />
          </div>

          {/* Code Snippet */}
          <div>
            <label className={labelClass} style={{ color: "var(--color-text-secondary)" }}>
              Code Snippet
            </label>
            <textarea
              placeholder="Paste relevant code here..."
              value={codeSnippet}
              onChange={(e) => setCodeSnippet(e.target.value)}
              rows={4}
              className={`${inputClass} resize-none font-mono text-xs`}
              style={inputStyle}
            />
          </div>

          {/* Symbol + Line Range */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelClass} style={{ color: "var(--color-text-secondary)" }}>
                Symbol Name
              </label>
              <input
                type="text"
                placeholder="e.g. processPayment"
                value={symbolName}
                onChange={(e) => setSymbolName(e.target.value)}
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label className={labelClass} style={{ color: "var(--color-text-secondary)" }}>
                Start Line
              </label>
              <input
                type="number"
                placeholder="42"
                value={startLine}
                onChange={(e) => setStartLine(e.target.value)}
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label className={labelClass} style={{ color: "var(--color-text-secondary)" }}>
                End Line
              </label>
              <input
                type="number"
                placeholder="58"
                value={endLine}
                onChange={(e) => setEndLine(e.target.value)}
                className={inputClass}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Repository */}
          <div>
            <label className={labelClass} style={{ color: "var(--color-text-secondary)" }}>
              Repository URL
            </label>
            <input
              type="text"
              placeholder="e.g. github.com/org/repo"
              value={repository}
              onChange={(e) => setRepository(e.target.value)}
              className={inputClass}
              style={inputStyle}
            />
          </div>

          {/* Priority + Visibility */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass} style={{ color: "var(--color-text-secondary)" }}>
                Priority
              </label>
              <div className="flex gap-1.5">
                {PRIORITIES.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className="flex-1 px-2 py-1.5 rounded text-[10px] font-medium border transition-all"
                    style={{
                      backgroundColor:
                        priority === p ? "var(--color-accent-dim)" : "var(--color-bg-input)",
                      borderColor:
                        priority === p ? "var(--color-accent)" : "var(--color-border)",
                      color: priority === p ? "var(--color-accent)" : "var(--color-text-muted)",
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelClass} style={{ color: "var(--color-text-secondary)" }}>
                Visibility
              </label>
              <div className="flex gap-1.5">
                {VISIBILITIES.map((v) => (
                  <button
                    key={v}
                    onClick={() => setVisibility(v)}
                    className="flex-1 px-2 py-1.5 rounded text-[10px] font-medium border transition-all"
                    style={{
                      backgroundColor:
                        visibility === v ? "var(--color-accent-dim)" : "var(--color-bg-input)",
                      borderColor:
                        visibility === v ? "var(--color-accent)" : "var(--color-border)",
                      color:
                        visibility === v ? "var(--color-accent)" : "var(--color-text-muted)",
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Next */}
          <div className="flex justify-end pt-2">
            <button
              onClick={goToProjectStep}
              disabled={!title.trim()}
              className="px-5 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: "var(--color-accent)", color: "#000" }}
            >
              {loading ? "Loading..." : "Next →"}
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Select a workspace and project to attach this capsule.
          </p>

          {/* Workspace */}
          <div>
            <label className={labelClass} style={{ color: "var(--color-text-secondary)" }}>
              Workspace *
            </label>
            <select
              value={selectedWorkspaceId}
              onChange={(e) => handleWorkspaceChange(e.target.value)}
              className={inputClass}
              style={inputStyle}
            >
              <option value="">Select workspace...</option>
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name}
                </option>
              ))}
            </select>
          </div>

          {/* Project */}
          <div>
            <label className={labelClass} style={{ color: "var(--color-text-secondary)" }}>
              Project *
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className={inputClass}
              style={inputStyle}
              disabled={!selectedWorkspaceId}
            >
              <option value="">
                {selectedWorkspaceId ? "Select project..." : "Select workspace first"}
              </option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {projects.length === 0 && selectedWorkspaceId && (
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              No projects in this workspace. Create one from the workspace page first.
            </p>
          )}

          {/* Similar Items Suggestion Panel */}
          {(similarLoading || similarChecked) && similarItems.length > 0 && (
            <div
              className="rounded-xl border p-4 transition-theme"
              style={{ backgroundColor: "var(--color-bg-elevated)", borderColor: "var(--color-border)" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Icon name="knowledge" size={14} style={{ color: "var(--color-accent)" }} />
                <span className="text-xs font-semibold" style={{ color: "var(--color-accent)" }}>
                  {similarItems.length} similar resolved item{similarItems.length !== 1 ? "s" : ""} found
                </span>
              </div>
              <div className="space-y-2">
                {similarItems.map((item) => (
                  <div
                    key={item.knowledgeItemId}
                    className="flex items-start gap-3 p-2.5 rounded-lg transition-all hover:opacity-90"
                    style={{ backgroundColor: "var(--color-bg-card)" }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
                        {item.title}
                      </div>
                      {item.summary && (
                        <div className="text-[10px] mt-0.5 line-clamp-2" style={{ color: "var(--color-text-muted)" }}>
                          {item.summary.length > 120 ? item.summary.slice(0, 120) + "..." : item.summary}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {item.category && (
                          <span
                            className="inline-block px-1.5 py-0.5 rounded text-[9px] font-mono"
                            style={{ backgroundColor: "var(--color-accent-dim)", color: "var(--color-accent)" }}
                          >
                            {item.category}
                          </span>
                        )}
                        <span
                          className="text-[9px] font-mono"
                          style={{ color: item.source === "WORKSPACE" ? "var(--color-status-open)" : "var(--color-text-muted)" }}
                        >
                          {item.source === "WORKSPACE" ? "workspace" : "global"}
                        </span>
                      </div>
                    </div>
                    <Link
                      to={`/knowledge?q=${encodeURIComponent(item.title)}`}
                      target="_blank"
                      className="shrink-0 px-2 py-1 rounded text-[10px] font-medium transition-all hover:opacity-80"
                      style={{ color: "var(--color-accent)" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      View
                    </Link>
                  </div>
                ))}
              </div>
              <p className="text-[10px] mt-2" style={{ color: "var(--color-text-muted)" }}>
                These are suggestions only — you can ignore them and submit your capsule.
              </p>
            </div>
          )}

          {similarLoading && similarItems.length === 0 && (
            <div className="flex items-center gap-2 py-2">
              <div
                className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }}
              />
              <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                Checking for similar resolved items...
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between pt-2">
            <button
              onClick={() => setStep(0)}
              className="px-4 py-2 rounded-lg text-sm font-medium border transition-all hover:opacity-80"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
            >
              ← Back
            </button>
            <button
              onClick={handleCreate}
              disabled={!selectedProjectId || loading}
              className="px-5 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: "var(--color-accent)", color: "#000" }}
            >
              {loading ? "Creating..." : "Create Capsule"}
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col items-center py-8 gap-4">
          <div
            className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }}
          />
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Creating your capsule...
          </p>
        </div>
      )}
    </Modal>
  );
}

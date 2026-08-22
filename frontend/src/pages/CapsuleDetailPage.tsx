import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { capsuleApi, workspaceApi, knowledgeApi } from "../services/api";
import {
  type Capsule,
  type Comment,
  type CapsuleStatus,
  type WorkspaceMember,
  type KnowledgeItem,
  ALLOWED_TRANSITIONS,
  STATUS_COLORS,
} from "../types";
import { useAuth } from "../context/AuthContext";

export default function CapsuleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { email: currentEmail } = useAuth();
  const [capsule, setCapsule] = useState<Capsule | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [resolveSolution, setResolveSolution] = useState("");
  const [resolving, setResolving] = useState(false);
  const [showResolve, setShowResolve] = useState(false);
  const [assigneeEmail, setAssigneeEmail] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [resolution, setResolution] = useState<any>(null);
  const [membership, setMembership] = useState<WorkspaceMember | null>(null);
  const [knowledgeItem, setKnowledgeItem] = useState<KnowledgeItem | null>(null);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!id) return;
    try {
      const [cap, comms] = await Promise.all([
        capsuleApi.get(id),
        capsuleApi.listComments(id),
      ]);
      setCapsule(cap);
      setComments(comms);

      if (cap.status === "RESOLVED") {
        try {
          const res = await capsuleApi.getResolution(id);
          setResolution(res);
          setKnowledgeLoading(true);
          const pollKnowledge = async (attempts = 0) => {
            try {
              const items = await knowledgeApi.search({ q: res.id, projectId: cap.artifactAnchor?.artifactVersion?.artifact?.project?.id });
              const match = items.find((k: any) => k.resolution?.id === res.id);
              if (match) {
                setKnowledgeItem(match);
                setKnowledgeLoading(false);
              } else if (attempts < 10) {
                setTimeout(() => pollKnowledge(attempts + 1), 3000);
              } else {
                setKnowledgeLoading(false);
              }
            } catch {
              setKnowledgeLoading(false);
            }
          };
          pollKnowledge();
        } catch {
          // no resolution yet
        }
      }

      const workspaceId =
        cap.artifactAnchor?.artifactVersion?.artifact?.project?.workspace?.id;
      if (workspaceId && currentEmail) {
        try {
          const member = await workspaceApi.getMember(workspaceId, currentEmail);
          setMembership(member);
        } catch {
          // Not a member — membership will remain null
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, currentEmail]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const isReviewer = capsule?.reviewer?.email === currentEmail;
  const isWorkspaceAdminOrOwner =
    membership?.role === "ADMIN" || membership?.role === "OWNER";
  const canResolve =
    capsule?.status === "ANSWERED" && (isReviewer || isWorkspaceAdminOrOwner);

  const handleStatusChange = async (newStatus: CapsuleStatus) => {
    if (!id) return;
    try {
      const updated = await capsuleApi.update(id, { status: newStatus });
      setCapsule(updated);
      setError("");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handlePostComment = async () => {
    if (!id || !newComment.trim()) return;
    setPosting(true);
    try {
      const comment = await capsuleApi.postComment(id, newComment);
      setComments((prev) => [...prev, comment]);
      setNewComment("");
      const updated = await capsuleApi.get(id);
      setCapsule(updated);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPosting(false);
    }
  };

  const handleResolve = async () => {
    if (!id || !resolveSolution.trim()) return;
    setResolving(true);
    try {
      const res = await capsuleApi.resolve(id, resolveSolution);
      setResolution(res);
      const updated = await capsuleApi.get(id);
      setCapsule(updated);
      setShowResolve(false);
      setResolveSolution("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setResolving(false);
    }
  };

  const handleAssignReviewer = async () => {
    if (!id || !assigneeEmail.trim()) return;
    setAssigning(true);
    try {
      const updated = await capsuleApi.update(id, {
        reviewerId: assigneeEmail,
      });
      setCapsule(updated);
      setAssigneeEmail("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAssigning(false);
    }
  };

  const validTransitions = capsule
    ? ALLOWED_TRANSITIONS[capsule.status]
    : [];

  if (loading) return <div className="text-sm text-center py-12" style={{ color: "var(--color-text-muted)" }}>Loading...</div>;
  if (!capsule)
    return <div className="text-sm text-center py-12" style={{ color: "var(--color-text-muted)" }}>Capsule not found</div>;

  const anchor = capsule.artifactAnchor;
  const artifact = anchor?.artifactVersion?.artifact;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            to={artifact ? `/projects/${artifact.project.id}` : "/"}
            className="text-xs font-medium mb-2 inline-block transition-all hover:opacity-80"
            style={{ color: "var(--color-accent)" }}
          >
            ← Back to Project
          </Link>
          <div className="text-[10px] uppercase tracking-widest font-mono mb-1" style={{ color: "var(--color-accent)" }}>
            CAPSULE
          </div>
          <h1 className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            {capsule.title}
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
            Created by {capsule.author?.name || capsule.author?.email} •{" "}
            {new Date(capsule.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="px-3 py-1 rounded-full text-xs font-medium"
            style={{
              backgroundColor: STATUS_COLORS[capsule.status]?.bg || "var(--color-bg-input)",
              color: STATUS_COLORS[capsule.status]?.text || "var(--color-text-secondary)",
            }}
          >
            {capsule.status.replace("_", " ")}
          </span>
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              color: capsule.priority === "CRITICAL"
                ? "var(--color-priority-high)"
                : capsule.priority === "HIGH"
                ? "var(--color-priority-high)"
                : capsule.priority === "MEDIUM"
                ? "var(--color-priority-medium)"
                : "var(--color-priority-low)",
            }}
          >
            {capsule.priority}
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-lg p-3 border text-sm flex items-center justify-between" style={{ backgroundColor: "rgba(239,68,68,0.1)", borderColor: "var(--color-danger)", color: "var(--color-danger)" }}>
          <span>{error}</span>
          <button
            onClick={() => setError("")}
            className="text-xs underline"
            style={{ color: "var(--color-danger)" }}
          >
            dismiss
          </button>
        </div>
      )}

      {/* Artifact anchor context */}
      {anchor && (
        <div className="rounded-xl p-4 border transition-theme" style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
          <div className="flex items-center gap-2 text-xs mb-2" style={{ color: "var(--color-text-secondary)" }}>
            <span className="font-mono px-2 py-0.5 rounded" style={{ backgroundColor: "var(--color-bg-input)", color: "var(--color-text-muted)" }}>
              📄 {artifact?.filePath}
            </span>
            {anchor.startLine != null && (
              <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                L{anchor.startLine}–L{anchor.endLine}
              </span>
            )}
            {anchor.symbolName && (
              <span className="text-[10px] font-medium" style={{ color: "var(--color-status-answered)" }}>
                ƒ {anchor.symbolName}
              </span>
            )}
          </div>
          {anchor.selectedText && (
            <pre className="text-xs rounded p-3 overflow-x-auto border" style={{ backgroundColor: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
              {anchor.selectedText}
            </pre>
          )}
        </div>
      )}

      {/* Reviewer & Actions */}
      <div className="rounded-xl p-4 border transition-theme" style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
            {capsule.reviewer ? (
              <span>
                👤 Reviewer:{" "}
                <span className="font-medium" style={{ color: "var(--color-text-primary)" }}>
                  {capsule.reviewer.name || capsule.reviewer.email}
                </span>
              </span>
            ) : (
              <span style={{ color: "var(--color-text-muted)" }}>No reviewer assigned</span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status change dropdown */}
            {validTransitions.length > 0 && (
              <div className="flex gap-1">
                {validTransitions.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all hover:opacity-80"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)", backgroundColor: "var(--color-bg-input)" }}
                  >
                    → {s.replace("_", " ")}
                  </button>
                ))}
              </div>
            )}

            {/* Assign reviewer */}
            <div className="flex gap-1">
              <input
                type="text"
                placeholder="Assign reviewer (email)"
                value={assigneeEmail}
                onChange={(e) => setAssigneeEmail(e.target.value)}
                className="rounded-lg px-2 py-1 text-xs border outline-none focus:ring-1 transition-theme w-40"
                style={{ backgroundColor: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
              />
              <button
                onClick={handleAssignReviewer}
                disabled={!assigneeEmail || assigning}
                className="px-2 py-1 rounded-lg text-xs font-medium border transition-all hover:opacity-80 disabled:opacity-50"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)", backgroundColor: "var(--color-bg-input)" }}
              >
                Assign
              </button>
            </div>

            {/* Resolve button */}
            {canResolve && (
              <button
                onClick={() => setShowResolve(!showResolve)}
                className="px-4 py-1.5 rounded-lg text-xs font-medium border transition-all hover:opacity-90"
                style={{ backgroundColor: "var(--color-status-resolved)", borderColor: "var(--color-status-resolved)", color: "#000" }}
              >
                ✓ Resolve
              </button>
            )}
          </div>
        </div>

        {/* Resolve form */}
        {showResolve && (
          <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--color-border)" }}>
            <textarea
              placeholder="Describe the final solution..."
              value={resolveSolution}
              onChange={(e) => setResolveSolution(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm border outline-none focus:ring-1 transition-theme resize-none"
              rows={3}
              style={{ backgroundColor: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
            />
            <button
              onClick={handleResolve}
              disabled={!resolveSolution.trim() || resolving}
              className="mt-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "var(--color-status-resolved)", borderColor: "var(--color-status-resolved)", color: "#000" }}
            >
              {resolving ? "Resolving..." : "Confirm Resolution"}
            </button>
          </div>
        )}

        {/* Show resolution if resolved */}
        {resolution && (
          <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--color-border)" }}>
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-medium" style={{ color: "var(--color-status-resolved)" }}>
                ✓ Resolution
              </h4>
            </div>
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{resolution.finalSolution}</p>
            <p className="text-[10px] mt-1" style={{ color: "var(--color-text-muted)" }}>
              Resolved by {resolution.resolver?.name || resolution.resolver?.email} •{" "}
              {new Date(resolution.resolvedAt).toLocaleString()}
            </p>
            {/* Knowledge item link */}
            {knowledgeItem ? (
              <div className="mt-2 space-y-2">
                <Link
                  to="/knowledge"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all hover:opacity-80"
                  style={{ borderColor: "var(--color-status-answered)", color: "var(--color-status-answered)", backgroundColor: "rgba(167,139,250,0.1)" }}
                >
                  📚 View generated knowledge
                </Link>
                {/* Publish toggle — only for workspace ADMIN/OWNER */}
                {membership && (membership.role === "ADMIN" || membership.role === "OWNER") && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        if (!knowledgeItem) return;
                        const newVis = knowledgeItem.visibility === "PUBLIC" ? "PRIVATE" : "PUBLIC";
                        if (newVis === "PUBLIC" && !window.confirm(
                          "Publish to Global Knowledge Base?\n\nThis makes the summary (not the code or discussion) visible to all users of the platform."
                        )) return;
                        try {
                          const updated = await knowledgeApi.setVisibility(knowledgeItem.id, newVis);
                          setKnowledgeItem(updated);
                        } catch (e: any) {
                          alert(e?.message || "Failed to update visibility");
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all hover:opacity-80"
                      style={{
                        borderColor: knowledgeItem.visibility === "PUBLIC" ? "var(--color-status-resolved)" : "var(--color-border)",
                        color: knowledgeItem.visibility === "PUBLIC" ? "var(--color-status-resolved)" : "var(--color-text-muted)",
                        backgroundColor: knowledgeItem.visibility === "PUBLIC" ? "rgba(34,197,94,0.1)" : "var(--color-bg-input)",
                      }}
                    >
                      {knowledgeItem.visibility === "PUBLIC" ? "🌍 Published" : "🔒 Private"}
                    </button>
                    <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                      {knowledgeItem.visibility === "PUBLIC"
                        ? "Visible in global search"
                        : "Only visible to workspace members"}
                    </span>
                  </div>
                )}
              </div>
            ) : knowledgeLoading ? (
              <p className="text-[10px] mt-2" style={{ color: "var(--color-text-muted)" }}>
                ⏳ Generating knowledge item...
              </p>
            ) : null}
          </div>
        )}
      </div>

      {/* Comments */}
      <div className="rounded-xl p-4 border transition-theme" style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
        <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--color-text-primary)" }}>
          💬 Comments ({comments.length})
        </h2>

        {comments.length === 0 ? (
          <p className="text-xs text-center py-4" style={{ color: "var(--color-text-muted)" }}>
            No comments yet. Start a discussion.
          </p>
        ) : (
          <div className="space-y-2 mb-4">
            {comments.map((c) => (
              <div
                key={c.id}
                className="rounded-lg p-3 border transition-theme"
                style={{ backgroundColor: "var(--color-bg-input)", borderColor: "var(--color-border)" }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium" style={{ color: "var(--color-text-primary)" }}>
                    {c.author?.name || c.author?.email}
                  </span>
                  <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                    {new Date(c.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{c.body}</p>
              </div>
            ))}
          </div>
        )}

        {/* Comment input */}
        <div className="flex gap-2">
          <textarea
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="flex-1 rounded-lg px-3 py-2 text-sm border outline-none focus:ring-1 transition-theme resize-none"
            rows={2}
            style={{ backgroundColor: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
                handlePostComment();
            }}
          />
          <button
            onClick={handlePostComment}
            disabled={!newComment.trim() || posting}
            className="px-4 py-2 rounded-lg text-xs font-medium border transition-all hover:opacity-90 disabled:opacity-50 self-end"
            style={{ backgroundColor: "var(--color-accent)", borderColor: "var(--color-accent)", color: "#000" }}
          >
            {posting ? "Posting..." : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
}

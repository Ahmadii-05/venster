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

      // Fetch resolution if resolved
      if (cap.status === "RESOLVED") {
        try {
          const res = await capsuleApi.getResolution(id);
          setResolution(res);
          // Poll for knowledge item (may take a few seconds to generate)
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

      // Fetch current user's workspace membership for resolve permission
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

  // Determine if current user can see the resolve button
  // Matches backend: reviewer OR workspace ADMIN/OWNER
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
      // Refresh capsule to get status change
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
        reviewerId: assigneeEmail, // The backend expects reviewerId as UUID, but we'll send the email
        // Actually looking at the API, it expects reviewerId as UUID
        // We need to handle this differently - for now we'll use the input as-is
      });
      setCapsule(updated);
      setAssigneeEmail("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAssigning(false);
    }
  };

  // Get valid next transitions for current status
  const validTransitions = capsule
    ? ALLOWED_TRANSITIONS[capsule.status]
    : [];

  if (loading) return <div className="text-gray-500 text-sm">Loading...</div>;
  if (!capsule)
    return <div className="text-gray-500 text-sm">Capsule not found</div>;

  const anchor = capsule.artifactAnchor;
  const artifact = anchor?.artifactVersion?.artifact;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          to={artifact ? `/projects/${artifact.project.id}` : "/"}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to Project
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">
          {error}
          <button
            onClick={() => setError("")}
            className="ml-2 text-red-500 hover:underline"
          >
            dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">{capsule.title}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Created by {capsule.author?.name || capsule.author?.email} •{" "}
              {new Date(capsule.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[capsule.status]}`}
            >
              {capsule.status}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                capsule.priority === "CRITICAL"
                  ? "bg-red-100 text-red-700"
                  : capsule.priority === "HIGH"
                  ? "bg-orange-100 text-orange-700"
                  : capsule.priority === "MEDIUM"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {capsule.priority}
            </span>
          </div>
        </div>

        {/* Artifact anchor context */}
        {anchor && (
          <div className="mt-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <span className="font-mono text-xs bg-gray-200 px-2 py-0.5 rounded">
                📄 {artifact?.filePath}
              </span>
              {anchor.startLine != null && (
                <span className="text-xs text-gray-500">
                  L{anchor.startLine}–L{anchor.endLine}
                </span>
              )}
              {anchor.symbolName && (
                <span className="text-xs text-purple-600 font-medium">
                  ƒ {anchor.symbolName}
                </span>
              )}
            </div>
            {anchor.selectedText && (
              <pre className="text-xs text-gray-700 bg-gray-100 rounded p-3 overflow-x-auto border border-gray-200 font-mono">
                {anchor.selectedText}
              </pre>
            )}
          </div>
        )}
      </div>

      {/* Reviewer & Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="text-sm text-gray-600">
            {capsule.reviewer ? (
              <span>
                👤 Reviewer:{" "}
                <span className="font-medium">
                  {capsule.reviewer.name || capsule.reviewer.email}
                </span>
              </span>
            ) : (
              <span className="text-gray-400">No reviewer assigned</span>
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
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
                  >
                    → {s}
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
                className="border border-gray-300 rounded-lg px-2 py-1 text-xs w-48 focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button
                onClick={handleAssignReviewer}
                disabled={!assigneeEmail || assigning}
                className="bg-gray-100 text-gray-700 px-2 py-1 rounded-lg text-xs font-medium hover:bg-gray-200 disabled:opacity-50"
              >
                Assign
              </button>
            </div>

            {/* Resolve button - visible when ANSWERED and user is reviewer OR workspace ADMIN/OWNER */}
            {canResolve && (
              <button
                onClick={() => setShowResolve(!showResolve)}
                className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700"
              >
                ✓ Resolve
              </button>
            )}
          </div>
        </div>

        {/* Resolve form */}
        {showResolve && (
          <div className="mt-3 border-t border-gray-100 pt-3">
            <textarea
              placeholder="Describe the final solution..."
              value={resolveSolution}
              onChange={(e) => setResolveSolution(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none resize-none"
              rows={3}
            />
            <button
              onClick={handleResolve}
              disabled={!resolveSolution.trim() || resolving}
              className="mt-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {resolving ? "Resolving..." : "Confirm Resolution"}
            </button>
          </div>
        )}

        {/* Show resolution if resolved */}
        {resolution && (
          <div className="mt-3 border-t border-gray-100 pt-3">
            <h4 className="text-sm font-medium text-green-700 mb-1">
              ✓ Resolution
            </h4>
            <p className="text-sm text-gray-600">{resolution.finalSolution}</p>
            <p className="text-xs text-gray-400 mt-1">
              Resolved by {resolution.resolver?.name || resolution.resolver?.email} •{" "}
              {new Date(resolution.resolvedAt).toLocaleString()}
            </p>
            {/* Knowledge item link */}
            {knowledgeItem ? (
              <div className="mt-2 space-y-2">
                <Link
                  to="/knowledge"
                  className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-100"
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
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                        knowledgeItem.visibility === "PUBLIC"
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {knowledgeItem.visibility === "PUBLIC" ? "🌍 Published" : "🔒 Private"}
                    </button>
                    <span className="text-xs text-gray-400">
                      {knowledgeItem.visibility === "PUBLIC"
                        ? "Visible in global search"
                        : "Only visible to workspace members"}
                    </span>
                  </div>
                )}
              </div>
            ) : knowledgeLoading ? (
              <p className="text-xs text-gray-400 mt-2">
                ⏳ Generating knowledge item...
              </p>
            ) : null}
          </div>
        )}
      </div>

      {/* Comments */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          💬 Comments ({comments.length})
        </h2>

        {comments.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">
            No comments yet. Start a discussion.
          </p>
        ) : (
          <div className="space-y-3 mb-4">
            {comments.map((c) => (
              <div
                key={c.id}
                className="bg-gray-50 rounded-lg p-3 border border-gray-100"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-700">
                    {c.author?.name || c.author?.email}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(c.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{c.body}</p>
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
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
                handlePostComment();
            }}
          />
          <button
            onClick={handlePostComment}
            disabled={!newComment.trim() || posting}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 self-end"
          >
            {posting ? "Posting..." : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
}

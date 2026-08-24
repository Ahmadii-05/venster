import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { workspaceApi, projectApi, capsuleApi, knowledgeApi } from "../services/api";
import type { Workspace, Capsule, KnowledgeItem } from "../types";
import KnowledgeCard from "../components/KnowledgeCard";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  OPEN: { bg: "rgba(56, 189, 248, 0.15)", text: "var(--color-status-open)" },
  IN_REVIEW: { bg: "rgba(251, 191, 36, 0.15)", text: "var(--color-status-review)" },
  ANSWERED: { bg: "rgba(167, 139, 250, 0.15)", text: "var(--color-status-answered)" },
  RESOLVED: { bg: "rgba(34, 197, 94, 0.15)", text: "var(--color-status-resolved)" },
  ARCHIVED: { bg: "rgba(107, 114, 128, 0.15)", text: "var(--color-status-archived)" },
};

export default function ProfilePage() {
  const { email, logout } = useAuth();
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [assignedCapsules, setAssignedCapsules] = useState<Capsule[]>([]);
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const initials = email ? email.substring(0, 2).toUpperCase() : "U";
  const displayName = email?.split("@")[0] || "User";

  useEffect(() => {
    const load = async () => {
      try {
        const ws = await workspaceApi.list();
        setWorkspaces(ws || []);

        const allCaps: Capsule[] = [];
        for (const w of ws || []) {
          try {
            const projs = await projectApi.list(w.id);
            for (const p of projs || []) {
              const caps = await capsuleApi.list({ projectId: p.id });
              allCaps.push(...(caps || []));
            }
          } catch {}
        }
        const myAssigned = allCaps.filter((c) => c.reviewer?.email === email);
        setAssignedCapsules(myAssigned.slice(0, 5));

        if (ws && ws.length > 0) {
          try {
            const ki = await knowledgeApi.search({ q: "a", workspaceId: ws[0].id });
            setKnowledgeItems((ki || []).slice(0, 5));
          } catch {}
        }
      } catch (e) {
        console.error("Failed to load profile data", e);
      }
    };
    load();
  }, [email]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header Card */}
      <div className="relative overflow-hidden rounded-xl p-6 pl-7 border transition-theme" style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
        <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: "var(--color-accent)" }} aria-hidden="true" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold font-display"
              style={{ backgroundColor: "var(--color-accent-dim)", color: "var(--color-accent)" }}
            >
              {initials}
            </div>
            <div>
              <div className="eyebrow mb-0.5">Account</div>
              <h1 className="text-xl font-bold font-display" style={{ color: "var(--color-text-primary)" }}>
                {displayName}
              </h1>
              <p className="text-xs font-mono" style={{ color: "var(--color-text-muted)" }}>
                {email}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 rounded-lg text-xs font-mono font-medium border transition-all hover:opacity-80"
            style={{ borderColor: "var(--color-border)", color: "var(--color-danger)" }}
          >
            Logout
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div
            className="relative overflow-hidden rounded-lg p-3 pl-4 border text-center"
            style={{ backgroundColor: "var(--color-bg-input)", borderColor: "var(--color-border)" }}
          >
            <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: "var(--color-accent)" }} aria-hidden="true" />
            <div className="eyebrow mb-1" style={{ color: "var(--color-text-muted)" }}>
              Workspaces
            </div>
            <div className="text-2xl font-bold font-mono" style={{ color: "var(--color-accent)" }}>
              {workspaces.length}
            </div>
          </div>
          <div
            className="relative overflow-hidden rounded-lg p-3 pl-4 border text-center"
            style={{ backgroundColor: "var(--color-bg-input)", borderColor: "var(--color-border)" }}
          >
            <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: "var(--color-status-review)" }} aria-hidden="true" />
            <div className="eyebrow mb-1" style={{ color: "var(--color-text-muted)" }}>
              Assigned
            </div>
            <div className="text-2xl font-bold font-mono" style={{ color: "var(--color-status-review)" }}>
              {assignedCapsules.length}
            </div>
          </div>
          <div
            className="relative overflow-hidden rounded-lg p-3 pl-4 border text-center"
            style={{ backgroundColor: "var(--color-bg-input)", borderColor: "var(--color-border)" }}
          >
            <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: "var(--color-status-resolved)" }} aria-hidden="true" />
            <div className="eyebrow mb-1" style={{ color: "var(--color-text-muted)" }}>
              Knowledge
            </div>
            <div className="text-2xl font-bold font-mono" style={{ color: "var(--color-status-resolved)" }}>
              {knowledgeItems.length}
            </div>
          </div>
        </div>
      </div>

      {/* Assigned Capsules */}
      <div>
        <div className="eyebrow mb-3" style={{ color: "var(--color-text-muted)" }}>
          Assigned to you
        </div>
        {assignedCapsules.length === 0 ? (
          <div
            className="rounded-xl p-8 border text-center transition-theme"
            style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}
          >
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              No capsules assigned to you yet.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {assignedCapsules.map((cap) => {
              const sc = STATUS_COLORS[cap.status] || STATUS_COLORS.OPEN;
              return (
                <Link
                  key={cap.id}
                  to={`/capsules/${cap.id}`}
                  className="relative overflow-hidden block rounded-xl p-4 pl-5 border transition-all hover:-translate-y-0.5 hover:shadow-lg group"
                  style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}
                >
                  <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: sc.text }} aria-hidden="true" />
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono" style={{ color: "var(--color-text-muted)" }}>
                          {cap.id.substring(0, 8).toUpperCase()}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider"
                          style={{ backgroundColor: sc.bg, color: sc.text }}
                        >
                          {cap.status.replace("_", " ")}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold font-display group-hover:text-[var(--color-accent)] transition-colors" style={{ color: "var(--color-text-primary)" }}>
                        {cap.title}
                      </h3>
                      <div className="text-[10px] mt-1 font-mono" style={{ color: "var(--color-text-muted)" }}>
                        {cap.artifactAnchor?.artifactVersion?.artifact?.filePath?.split("/").pop()}
                      </div>
                    </div>
                    <span className="text-[10px] ml-3 font-mono" style={{ color: "var(--color-text-muted)" }}>
                      {new Date(cap.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Knowledge Items */}
      <div>
        <div className="eyebrow mb-3" style={{ color: "var(--color-text-muted)" }}>
          Knowledge you wrote
        </div>
        {knowledgeItems.length === 0 ? (
          <div
            className="rounded-xl p-8 border text-center transition-theme"
            style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}
          >
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              No knowledge items generated yet.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {knowledgeItems.map((item, i) => (
              <KnowledgeCard
                key={item.id}
                item={item}
                index={i}
                onView={() => navigate("/knowledge")}
              />
            ))}
          </div>
        )}
      </div>

      {/* Workspaces */}
      <div>
        <div className="eyebrow mb-3" style={{ color: "var(--color-text-muted)" }}>
          Your workspaces
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {workspaces.map((ws) => (
            <Link
              key={ws.id}
              to={`/workspaces/${ws.id}`}
              className="relative overflow-hidden rounded-xl p-4 pl-5 border transition-all hover:-translate-y-0.5 hover:shadow-lg group"
              style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}
            >
              <span className="absolute left-0 top-0 bottom-0 w-[3px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: "var(--color-accent)" }} aria-hidden="true" />
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold font-display"
                  style={{ backgroundColor: "var(--color-accent-dim)", color: "var(--color-accent)" }}
                >
                  {ws.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-semibold font-display group-hover:text-[var(--color-accent)] transition-colors" style={{ color: "var(--color-text-primary)" }}>
                    {ws.name}
                  </h3>
                  <div className="text-[10px] font-mono" style={{ color: "var(--color-text-muted)" }}>
                    Created {new Date(ws.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

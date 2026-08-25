import type {
  LoginResponse,
  Workspace,
  WorkspaceMember,
  Project,
  ProjectStatus,
  ProjectPriority,
  Artifact,
  ArtifactVersion,
  ArtifactAnchor,
  Capsule,
  CapsuleStatus,
  CapsulePriority,
  Comment,
  Resolution,
  Notification,
  KnowledgeItem,
  KnowledgeAnswer,
  ExternalSearchResult,
  GlobalQuestion,
  GlobalAnswer,
  UserSummary,
} from "../types";

// ── Base URL from env ─────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8082";

// ── Auth state ────────────────────────────────────────────────
// SECURITY NOTE: the JWT is persisted in localStorage, which is readable by
// any script on the page and therefore exfiltratable via XSS. The hardened
// long-term fix is for the backend to issue the token in an httpOnly, Secure,
// SameSite cookie so it is never exposed to JS — a coordinated backend+frontend
// change tracked as a follow-up. Until then we keep the persisted surface
// minimal (token only; the email lives in React state, not storage).
let _token: string | null = localStorage.getItem("token");

export function getStoredToken(): string | null {
  return _token;
}

export function setAuthToken(token: string) {
  _token = token;
  localStorage.setItem("token", token);
}

export function clearAuthToken() {
  _token = null;
  localStorage.removeItem("token");
  // Clean up the legacy "user" entry older builds used to persist.
  localStorage.removeItem("user");
}

// ── Core fetch wrapper ────────────────────────────────────────
async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (_token) {
    headers["Authorization"] = `Bearer ${_token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    clearAuthToken();
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  // Read the body as text first so an empty response (e.g. 204 No Content)
  // or a non-JSON error page doesn't blow up with an opaque parse error.
  const raw = await res.text();

  if (!raw) {
    if (!res.ok) {
      const err = new Error(`Request failed (HTTP ${res.status})`);
      (err as any).status = res.status;
      throw err;
    }
    return undefined as T;
  }

  let body: any;
  try {
    body = JSON.parse(raw);
  } catch {
    const err = new Error(`Unexpected non-JSON response (HTTP ${res.status})`);
    (err as any).status = res.status;
    throw err;
  }

  if (!body.success) {
    const err = new Error(body.error || "Request failed");
    (err as any).status = res.status;
    (err as any).data = body;
    throw err;
  }

  return body.data;
}

// ── Auth ──────────────────────────────────────────────────────
export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}
export interface LoginInput {
  email: string;
  password: string;
}

export const authApi = {
  register: (input: RegisterInput) =>
    request<LoginResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  login: (input: LoginInput) =>
    request<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    }),
};

// ── Users (directory search) ──────────────────────────────────
export const userApi = {
  // Search registered users by name or email. Powers the "add member"
  // typeahead; returns [] for a blank query.
  search: (query: string) =>
    request<UserSummary[]>(`/api/users?search=${encodeURIComponent(query)}`),
};

// ── Workspace ─────────────────────────────────────────────────
export const workspaceApi = {
  list: () => request<Workspace[]>("/api/workspaces"),
  create: (name: string) =>
    request<Workspace>("/api/workspaces", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  addMember: (workspaceId: string, email: string, role: string) =>
    request<WorkspaceMember>(`/api/workspaces/${workspaceId}/members`, {
      method: "POST",
      body: JSON.stringify({ email, role }),
    }),
  listMembers: (workspaceId: string) =>
    request<WorkspaceMember[]>(`/api/workspaces/${workspaceId}/members`),
  getMember: (workspaceId: string, email: string) =>
    request<WorkspaceMember>(`/api/workspaces/${workspaceId}/members/${email}`),
};

// ── Project ───────────────────────────────────────────────────
export interface ProjectInput {
  name: string;
  description?: string;
  repositoryUrl?: string;
  techStack?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  targetDate?: string; // ISO date (yyyy-MM-dd)
}

export const projectApi = {
  list: (workspaceId: string) =>
    request<Project[]>(`/api/projects?workspaceId=${workspaceId}`),
  get: (projectId: string) => request<Project>(`/api/projects/${projectId}`),
  create: (workspaceId: string, input: ProjectInput) =>
    request<Project>(`/api/projects?workspaceId=${workspaceId}`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  update: (projectId: string, input: ProjectInput) =>
    request<Project>(`/api/projects/${projectId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
};

// ── Artifact ──────────────────────────────────────────────────
export const artifactApi = {
  create: (projectId: string, filePath: string, repository?: string) =>
    request<Artifact>("/api/artifacts", {
      method: "POST",
      body: JSON.stringify({ projectId, filePath, repository }),
    }),
  createVersion: (
    artifactId: string,
    commitHash?: string,
    versionLabel?: string
  ) =>
    request<ArtifactVersion>(`/api/artifacts/${artifactId}/versions`, {
      method: "POST",
      body: JSON.stringify({ commitHash, versionLabel }),
    }),
  createAnchor: (
    versionId: string,
    anchor: {
      startLine?: number;
      endLine?: number;
      selectedText?: string;
      contentHash?: string;
      symbolName?: string;
    }
  ) =>
    request<ArtifactAnchor>(
      `/api/artifact-versions/${versionId}/anchors`,
      {
        method: "POST",
        body: JSON.stringify(anchor),
      }
    ),
};

// ── Capsule ───────────────────────────────────────────────────
export const capsuleApi = {
  create: (artifactAnchorId: string, title: string, priority?: string) =>
    request<Capsule>("/api/capsules", {
      method: "POST",
      body: JSON.stringify({ artifactAnchorId, title, priority }),
    }),
  list: (params: {
    projectId: string;
    status?: CapsuleStatus;
    assigneeId?: string;
  }) => {
    const q = new URLSearchParams({ projectId: params.projectId });
    if (params.status) q.set("status", params.status);
    if (params.assigneeId) q.set("assigneeId", params.assigneeId);
    return request<Capsule[]>(`/api/capsules?${q.toString()}`);
  },
  get: (id: string) => request<Capsule>(`/api/capsules/${id}`),
  update: (
    id: string,
    patch: {
      status?: CapsuleStatus;
      reviewerId?: string;
      priority?: CapsulePriority;
      title?: string;
    }
  ) =>
    request<Capsule>(`/api/capsules/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  postComment: (capsuleId: string, body: string) =>
    request<Comment>(`/api/capsules/${capsuleId}/comments`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),
  listComments: (capsuleId: string) =>
    request<Comment[]>(`/api/capsules/${capsuleId}/comments`),
  resolve: (capsuleId: string, finalSolution: string) =>
    request<Resolution>(`/api/capsules/${capsuleId}/resolve`, {
      method: "POST",
      body: JSON.stringify({ finalSolution }),
    }),
  getResolution: (capsuleId: string) =>
    request<Resolution>(`/api/capsules/${capsuleId}/resolution`),
};

// ── Notifications ─────────────────────────────────────────────
// ── Knowledge ──────────────────────────────────────────────
export const knowledgeApi = {
  get: (id: string) => request<KnowledgeItem>(`/api/knowledge/${id}`),
  search: (params: {
    q: string;
    workspaceId?: string;
    projectId?: string;
    category?: string;
    tags?: string;
    scope?: string;
  }) => {
    const q = new URLSearchParams({ q: params.q });
    if (params.workspaceId) q.set("workspaceId", params.workspaceId);
    if (params.projectId) q.set("projectId", params.projectId);
    if (params.category) q.set("category", params.category);
    if (params.tags) q.set("tags", params.tags);
    if (params.scope) q.set("scope", params.scope);
    return request<KnowledgeItem[]>(`/api/knowledge/search?${q.toString()}`);
  },
  setVisibility: (id: string, visibility: "PUBLIC" | "PRIVATE") =>
    request<KnowledgeItem>(`/api/knowledge/${id}/visibility`, {
      method: "PATCH",
      body: JSON.stringify({ visibility }),
    }),
  globalSearch: (params: { q: string; category?: string; tags?: string }) => {
    const q = new URLSearchParams({ q: params.q, scope: "global" });
    if (params.category) q.set("category", params.category);
    if (params.tags) q.set("tags", params.tags);
    return request<KnowledgeItem[]>(`/api/knowledge/search?${q.toString()}`);
  },
  // Browse recent PUBLIC items with NO query — powers the Global Community
  // landing view so solved problems are visible before the user searches.
  browseGlobal: (params?: { category?: string; tags?: string }) => {
    const q = new URLSearchParams();
    if (params?.category && params.category !== "ALL") q.set("category", params.category);
    if (params?.tags) q.set("tags", params.tags);
    const qs = q.toString();
    return request<KnowledgeItem[]>(`/api/knowledge/global/recent${qs ? "?" + qs : ""}`);
  },
  // AI answer with citations. scope "mine" searches the caller's workspaces;
  // anything else (default) searches PUBLIC/global knowledge.
  answer: (params: {
    q: string;
    scope?: string;
    category?: string;
    tags?: string;
  }) =>
    request<KnowledgeAnswer>("/api/knowledge/answer", {
      method: "POST",
      body: JSON.stringify(params),
    }),
  // Search an EXTERNAL source (public Stack Overflow now; SOFA once connected).
  // The backend proxies the request and keeps any API key server-side. Returns
  // an envelope so the UI can show "not connected"/"degraded" states cleanly.
  externalSearch: (params: { q: string; source?: string; tags?: string }) => {
    const q = new URLSearchParams({ q: params.q });
    if (params.source) q.set("source", params.source);
    if (params.tags) q.set("tags", params.tags);
    return request<ExternalSearchResult>(`/api/knowledge/external?${q.toString()}`);
  },
};

// ── Global Q&A ───────────────────────────────────────────────
export const globalQAApi = {
  listQuestions: (params?: { tag?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.tag) q.set("tag", params.tag);
    if (params?.status) q.set("status", params.status);
    const qs = q.toString();
    return request<GlobalQuestion[]>(`/api/global-questions${qs ? "?" + qs : ""}`);
  },
  getQuestion: (id: string) => request<GlobalQuestion>(`/api/global-questions/${id}`),
  createQuestion: (title: string, body: string, tags: string[]) =>
    request<GlobalQuestion>("/api/global-questions", {
      method: "POST",
      body: JSON.stringify({ title, body, tags }),
    }),
  listAnswers: (questionId: string) =>
    request<GlobalAnswer[]>(`/api/global-questions/${questionId}/answers`),
  createAnswer: (questionId: string, body: string) =>
    request<GlobalAnswer>(`/api/global-questions/${questionId}/answers`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),
  acceptAnswer: (questionId: string, answerId: string) =>
    request<GlobalQuestion>(`/api/global-questions/${questionId}/accept`, {
      method: "PATCH",
      body: JSON.stringify({ answerId }),
    }),
  reportQuestion: (id: string) =>
    request<string>(`/api/global-questions/${id}/report`, { method: "POST" }),
  reportAnswer: (id: string) =>
    request<string>(`/api/global-answers/${id}/report`, { method: "POST" }),
  hideQuestion: (id: string) =>
    request<string>(`/api/global-questions/${id}/hide`, { method: "PATCH" }),
  hideAnswer: (id: string) =>
    request<string>(`/api/global-answers/${id}/hide`, { method: "PATCH" }),
};

// ── Notifications ─────────────────────────────────────────────
export const notificationApi = {
  list: () => request<Notification[]>("/api/notifications"),
  markAsRead: (id: string) =>
    request<Notification>(`/api/notifications/${id}/read`, {
      method: "PATCH",
    }),
};

// ── Dashboard ───────────────────────────────────────────────
export interface AgingCapsule {
  capsuleId: string;
  title: string;
  status: string;
  daysInCurrentStatus: number;
  priority: string;
}

export interface HotArtifact {
  artifactId: string;
  filePath: string;
  capsuleCount: number;
  openCapsuleCount: number;
}

export interface KnowledgeHealth {
  agingCapsules: AgingCapsule[];
  hotArtifacts: HotArtifact[];
}

export interface SimilarKnowledgeItem {
  knowledgeItemId: string;
  title: string;
  summary: string;
  category: string;
  confidence: number;
  similarityScore: number;
  source: "WORKSPACE" | "GLOBAL";
}

export const dashboardApi = {
  getKnowledgeHealth: (workspaceId: string, agingThresholdDays?: number) => {
    const q = new URLSearchParams({ workspaceId });
    if (agingThresholdDays != null) q.set("agingThresholdDays", String(agingThresholdDays));
    return request<KnowledgeHealth>(`/api/dashboard/knowledge-health?${q.toString()}`);
  },
};

// ── Capsule Suggestions (Duplicate Detection) ──────────────
export const capsuleSuggestionApi = {
  suggestSimilar: (params: {
    title: string;
    description?: string;
    workspaceId: string;
    projectId?: string;
  }) =>
    request<SimilarKnowledgeItem[]>("/api/capsules/suggest-similar", {
      method: "POST",
      body: JSON.stringify(params),
    }),
};

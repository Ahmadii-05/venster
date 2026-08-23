import type {
  LoginResponse,
  Workspace,
  WorkspaceMember,
  Project,
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
  GlobalQuestion,
  GlobalAnswer,
} from "../types";

// ── Base URL from env ─────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8082";

// ── Auth state persisted in localStorage ──────────────────────
let _token: string | null = localStorage.getItem("token");
let _user: { email: string } | null = (() => {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
})();

export function getStoredToken(): string | null {
  return _token;
}

export function setAuthToken(token: string, email: string) {
  _token = token;
  _user = { email };
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify({ email }));
}

export function clearAuthToken() {
  _token = null;
  _user = null;
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export function getStoredUser(): { email: string } | null {
  return _user;
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

  const body = await res.json();

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
  getMember: (workspaceId: string, email: string) =>
    request<WorkspaceMember>(`/api/workspaces/${workspaceId}/members/${email}`),
};

// ── Project ───────────────────────────────────────────────────
export const projectApi = {
  list: (workspaceId: string) =>
    request<Project[]>(`/api/projects?workspaceId=${workspaceId}`),
  create: (workspaceId: string, name: string, description?: string) =>
    request<Project>(`/api/projects?workspaceId=${workspaceId}`, {
      method: "POST",
      body: JSON.stringify({ name, description }),
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

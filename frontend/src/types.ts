// ── API Envelope ──────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error: string | null;
  timestamp: string;
}

// ── Auth ──────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string;
  role: "MEMBER" | "ADMIN";
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  token: string;
  email: string;
}

// Lightweight user projection returned by the directory search endpoint
// (GET /api/users?search=). Only safe fields — no password, no flags.
export interface UserSummary {
  id: string;
  name: string;
  email: string;
}

// ── Workspace ─────────────────────────────────────────────────
export interface Workspace {
  id: string;
  name: string;
  createdBy: User;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  id: string;
  workspace: Workspace;
  user: User;
  role: "OWNER" | "ADMIN" | "MEMBER";
  joinedAt: string;
}

// ── Project ───────────────────────────────────────────────────
export type ProjectStatus =
  | "PLANNING"
  | "ACTIVE"
  | "ON_HOLD"
  | "COMPLETED"
  | "ARCHIVED";

export type ProjectPriority = "LOW" | "MEDIUM" | "HIGH";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  repositoryUrl: string | null;
  techStack: string | null;
  status: ProjectStatus | null;
  priority: ProjectPriority | null;
  targetDate: string | null; // ISO date (yyyy-MM-dd)
  workspace: Workspace;
  createdAt: string;
  updatedAt: string;
}

// Human-readable labels + pill colors for the project status badge.
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNING: "Planning",
  ACTIVE: "Active",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

export const PROJECT_STATUS_STYLES: Record<ProjectStatus, { bg: string; text: string }> = {
  PLANNING: { bg: "rgba(56, 189, 248, 0.15)", text: "var(--color-status-open)" },
  ACTIVE: { bg: "rgba(34, 197, 94, 0.15)", text: "var(--color-status-resolved)" },
  ON_HOLD: { bg: "rgba(251, 191, 36, 0.15)", text: "var(--color-status-review)" },
  COMPLETED: { bg: "rgba(167, 139, 250, 0.15)", text: "var(--color-status-answered)" },
  ARCHIVED: { bg: "rgba(107, 114, 128, 0.15)", text: "var(--color-status-archived)" },
};

// ── Artifact Chain ────────────────────────────────────────────
export interface Artifact {
  id: string;
  project: Project;
  filePath: string;
  repository: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ArtifactVersion {
  id: string;
  artifact: Artifact;
  commitHash: string | null;
  versionLabel: string | null;
  createdAt: string;
}

export interface ArtifactAnchor {
  id: string;
  artifactVersion: ArtifactVersion;
  startLine: number | null;
  endLine: number | null;
  selectedText: string | null;
  contentHash: string | null;
  symbolName: string | null;
  createdAt: string;
}

// ── Capsule ───────────────────────────────────────────────────
export type CapsuleStatus =
  | "OPEN"
  | "IN_REVIEW"
  | "ANSWERED"
  | "RESOLVED"
  | "ARCHIVED";

export type CapsulePriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface Capsule {
  id: string;
  artifactAnchor: ArtifactAnchor;
  author: User;
  reviewer: User | null;
  priority: CapsulePriority;
  status: CapsuleStatus;
  title: string;
  createdAt: string;
  updatedAt: string;
}

// ── Comment ───────────────────────────────────────────────────
export interface Comment {
  id: string;
  capsule: Capsule;
  author: User;
  body: string;
  createdAt: string;
}

// ── Resolution ────────────────────────────────────────────────
export interface Resolution {
  id: string;
  capsule: Capsule;
  resolver: User;
  finalSolution: string;
  resolvedAt: string;
}

// ── Notification ──────────────────────────────────────────────
export interface KnowledgeItem {
  id: string;
  resolution: Resolution;
  title: string;
  summary: string;
  rootCause: string;
  solution: string;
  tags: string[];
  category: string;
  confidence: number;
  visibility: KnowledgeVisibility;
  approved: boolean;
  createdAt: string;
}

// AI "answer with citations" response (POST /api/knowledge/answer).
// `citations` are stripped knowledge items (no resolution graph at runtime),
// typed loosely as KnowledgeItem[] so they can open the same detail view.
// When hasAnswer is false, `answer` is null but citations may still be present.
export interface KnowledgeAnswer {
  hasAnswer: boolean;
  answer: string | null;
  citations: KnowledgeItem[];
}

// ── External knowledge (Stack Overflow / SOFA search proxy) ──────
// Results from a source OUTSIDE the team knowledge base. The backend proxies
// the call (keeping any API key server-side) and normalizes every source to
// this one shape so the UI renders a single card. Not team data — always links
// out, so there is nothing to redact. `source` is currently "stackoverflow";
// "sofa" (Stack Overflow for Agents) activates once its key is configured.
export type ExternalSource = "stackoverflow" | "sofa";

export interface ExternalKnowledgeItem {
  source: string;
  title: string;
  snippet: string | null;
  url: string;
  tags: string[];
  score: number | null;
  answered: boolean | null;
  answerCount: number | null;
}

// Envelope: `configured=false` means the source isn't connected yet (show the
// message); `configured=true` with empty items + a message means it degraded.
export interface ExternalSearchResult {
  source: string;
  configured: boolean;
  message: string | null;
  items: ExternalKnowledgeItem[];
}

export interface Notification {
  id: string;
  user: User;
  type: string;
  context: string;
  read: boolean;
  createdAt: string;
}

// ── Transition Map (client-side, matches backend) ─────────────
export const ALLOWED_TRANSITIONS: Record<CapsuleStatus, CapsuleStatus[]> = {
  OPEN: ["IN_REVIEW", "ARCHIVED"],
  IN_REVIEW: ["ANSWERED", "ARCHIVED"],
  ANSWERED: ["IN_REVIEW", "RESOLVED", "ARCHIVED"],
  RESOLVED: [],
  ARCHIVED: [],
};

// ── Status Colors ─────────────────────────────────────────────
export const STATUS_COLORS: Record<CapsuleStatus, { bg: string; text: string }> = {
  OPEN: { bg: "rgba(56, 189, 248, 0.15)", text: "var(--color-status-open)" },
  IN_REVIEW: { bg: "rgba(251, 191, 36, 0.15)", text: "var(--color-status-review)" },
  ANSWERED: { bg: "rgba(167, 139, 250, 0.15)", text: "var(--color-status-answered)" },
  RESOLVED: { bg: "rgba(34, 197, 94, 0.15)", text: "var(--color-status-resolved)" },
  ARCHIVED: { bg: "rgba(107, 114, 128, 0.15)", text: "var(--color-status-archived)" },
};

// ── Knowledge Visibility ─────────────────────────────────────
export type KnowledgeVisibility = "PRIVATE" | "PUBLIC";

// ── Global Q&A ───────────────────────────────────────────────
export type QuestionStatus = "OPEN" | "ANSWERED" | "CLOSED";

export interface GlobalQuestion {
  id: string;
  author: User;
  title: string;
  body: string;
  tags: string[];
  status: QuestionStatus;
  acceptedAnswer: GlobalAnswer | null;
  hidden: boolean;
  reportCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GlobalAnswer {
  id: string;
  question: GlobalQuestion;
  author: User;
  body: string;
  accepted: boolean;
  hidden: boolean;
  reportCount: number;
  createdAt: string;
}

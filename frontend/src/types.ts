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
export interface Project {
  id: string;
  name: string;
  description: string | null;
  workspace: Workspace;
  createdAt: string;
  updatedAt: string;
}

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
export const STATUS_COLORS: Record<CapsuleStatus, string> = {
  OPEN: "bg-blue-100 text-blue-800",
  IN_REVIEW: "bg-yellow-100 text-yellow-800",
  ANSWERED: "bg-purple-100 text-purple-800",
  RESOLVED: "bg-green-100 text-green-800",
  ARCHIVED: "bg-gray-100 text-gray-800",
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

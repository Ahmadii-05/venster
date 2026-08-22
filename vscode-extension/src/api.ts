import * as vscode from "vscode";

// ── Types (subset matching backend) ───────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error: string | null;
  timestamp: string;
}

export interface Capsule {
  id: string;
  title: string;
  status: string;
  priority: string;
  author: { id: string; email: string; name: string };
  reviewer: { id: string; email: string; name: string } | null;
  artifactAnchor: {
    id: string;
    startLine: number | null;
    endLine: number | null;
    selectedText: string | null;
    symbolName: string | null;
    artifactVersion: {
      artifact: {
        filePath: string;
        project: { id: string; name: string };
      };
    };
  };
  createdAt: string;
}

export interface Comment {
  id: string;
  body: string;
  author: { id: string; email: string; name: string };
  createdAt: string;
}

export interface Notification {
  id: string;
  type: string;
  context: string;
  read: boolean;
  createdAt: string;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  summary: string;
  rootCause: string;
  solution: string;
  tags: string[];
  category: string;
  confidence: number;
  approved: boolean;
  createdAt: string;
}

// ── API Client ────────────────────────────────────────────────
export class MicroHubsApi {
  private token: string | null = null;

  constructor(private getConfig: () => string) {}

  get baseUrl(): string {
    return this.getConfig();
  }

  setToken(token: string | null) {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      this.token = null;
      vscode.window.showErrorMessage(
        "Micro-Hubs: Session expired. Please login again."
      );
      throw new Error("Unauthorized");
    }

    const body = (await res.json()) as ApiResponse<T>;

    if (!body.success) {
      const err = new Error(body.error || "Request failed");
      (err as any).status = res.status;
      throw err;
    }

    return body.data;
  }

  // ── Auth ──────────────────────────────────────────────────
  async login(email: string, password: string): Promise<string> {
    const data = await this.request<{ token: string; email: string }>(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) }
    );
    this.token = data.token;
    return data.token;
  }

  // ── Capsules ──────────────────────────────────────────────
  async getCapsules(projectId?: string): Promise<Capsule[]> {
    const q = projectId ? `?projectId=${projectId}` : "";
    return this.request<Capsule[]>(`/api/capsules${q}`);
  }

  async getCapsule(id: string): Promise<Capsule> {
    return this.request<Capsule>(`/api/capsules/${id}`);
  }

  async createCapsule(
    artifactAnchorId: string,
    title: string,
    priority?: string
  ): Promise<Capsule> {
    return this.request<Capsule>("/api/capsules", {
      method: "POST",
      body: JSON.stringify({ artifactAnchorId, title, priority }),
    });
  }

  async postComment(capsuleId: string, body: string): Promise<Comment> {
    return this.request<Comment>(`/api/capsules/${capsuleId}/comments`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
  }

  async listComments(capsuleId: string): Promise<Comment[]> {
    return this.request<Comment[]>(`/api/capsules/${capsuleId}/comments`);
  }

  // ── Artifacts ─────────────────────────────────────────────
  async createArtifact(
    projectId: string,
    filePath: string,
    repository?: string
  ): Promise<{ id: string }> {
    return this.request("/api/artifacts", {
      method: "POST",
      body: JSON.stringify({ projectId, filePath, repository }),
    });
  }

  async createVersion(
    artifactId: string,
    commitHash?: string,
    versionLabel?: string
  ): Promise<{ id: string }> {
    return this.request(`/api/artifacts/${artifactId}/versions`, {
      method: "POST",
      body: JSON.stringify({ commitHash, versionLabel }),
    });
  }

  async createAnchor(
    versionId: string,
    anchor: {
      startLine?: number;
      endLine?: number;
      selectedText?: string;
      contentHash?: string;
      symbolName?: string;
    }
  ): Promise<{ id: string }> {
    return this.request(`/api/artifact-versions/${versionId}/anchors`, {
      method: "POST",
      body: JSON.stringify(anchor),
    });
  }

  // ── Notifications ─────────────────────────────────────────
  async getNotifications(): Promise<Notification[]> {
    return this.request<Notification[]>("/api/notifications");
  }

  async markRead(id: string): Promise<void> {
    await this.request(`/api/notifications/${id}/read`, { method: "PATCH" });
  }

  // ── Knowledge ────────────────────────────────────────────
  async searchKnowledge(query: string): Promise<KnowledgeItem[]> {
    return this.request<KnowledgeItem[]>(`/api/knowledge/search?q=${encodeURIComponent(query)}`);
  }
}

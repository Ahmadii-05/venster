"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MicroHubsApi = void 0;
const vscode = __importStar(require("vscode"));
// ── API Client ────────────────────────────────────────────────
class MicroHubsApi {
    getConfig;
    token = null;
    constructor(getConfig) {
        this.getConfig = getConfig;
    }
    get baseUrl() {
        return this.getConfig();
    }
    setToken(token) {
        this.token = token;
    }
    getToken() {
        return this.token;
    }
    async request(path, options = {}) {
        const headers = {
            "Content-Type": "application/json",
            ...options.headers,
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
            vscode.window.showErrorMessage("Micro-Hubs: Session expired. Please login again.");
            throw new Error("Unauthorized");
        }
        const body = (await res.json());
        if (!body.success) {
            const err = new Error(body.error || "Request failed");
            err.status = res.status;
            throw err;
        }
        return body.data;
    }
    // ── Auth ──────────────────────────────────────────────────
    async login(email, password) {
        const data = await this.request("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
        this.token = data.token;
        return data.token;
    }
    // ── Capsules ──────────────────────────────────────────────
    async getCapsules(projectId) {
        const q = projectId ? `?projectId=${projectId}` : "";
        return this.request(`/api/capsules${q}`);
    }
    async getCapsule(id) {
        return this.request(`/api/capsules/${id}`);
    }
    async createCapsule(artifactAnchorId, title, priority) {
        return this.request("/api/capsules", {
            method: "POST",
            body: JSON.stringify({ artifactAnchorId, title, priority }),
        });
    }
    async postComment(capsuleId, body) {
        return this.request(`/api/capsules/${capsuleId}/comments`, {
            method: "POST",
            body: JSON.stringify({ body }),
        });
    }
    async listComments(capsuleId) {
        return this.request(`/api/capsules/${capsuleId}/comments`);
    }
    // ── Artifacts ─────────────────────────────────────────────
    async createArtifact(projectId, filePath, repository) {
        return this.request("/api/artifacts", {
            method: "POST",
            body: JSON.stringify({ projectId, filePath, repository }),
        });
    }
    async createVersion(artifactId, commitHash, versionLabel) {
        return this.request(`/api/artifacts/${artifactId}/versions`, {
            method: "POST",
            body: JSON.stringify({ commitHash, versionLabel }),
        });
    }
    async createAnchor(versionId, anchor) {
        return this.request(`/api/artifact-versions/${versionId}/anchors`, {
            method: "POST",
            body: JSON.stringify(anchor),
        });
    }
    // ── Notifications ─────────────────────────────────────────
    async getNotifications() {
        return this.request("/api/notifications");
    }
    async markRead(id) {
        await this.request(`/api/notifications/${id}/read`, { method: "PATCH" });
    }
    // ── Knowledge ────────────────────────────────────────────
    async searchKnowledge(query) {
        return this.request(`/api/knowledge/search?q=${encodeURIComponent(query)}`);
    }
}
exports.MicroHubsApi = MicroHubsApi;
//# sourceMappingURL=api.js.map
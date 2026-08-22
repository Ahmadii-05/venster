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
exports.CapsuleTreeProvider = exports.CapsuleTreeItem = void 0;
const vscode = __importStar(require("vscode"));
// ── Status colors (matching the frontend) ─────────────────────
const STATUS_ICONS = {
    OPEN: "🔵",
    IN_REVIEW: "🟡",
    ANSWERED: "🟣",
    RESOLVED: "🟢",
    ARCHIVED: "⚫",
};
class CapsuleTreeItem extends vscode.TreeItem {
    capsule;
    constructor(capsule) {
        super(capsule.title, vscode.TreeItemCollapsibleState.None);
        this.capsule = capsule;
        this.description = `${STATUS_ICONS[capsule.status] || "?"} ${capsule.status}`;
        this.tooltip = [
            `Status: ${capsule.status}`,
            `Priority: ${capsule.priority}`,
            `Author: ${capsule.author?.name || capsule.author?.email}`,
            capsule.reviewer
                ? `Reviewer: ${capsule.reviewer.name || capsule.reviewer.email}`
                : "No reviewer",
            `File: ${capsule.artifactAnchor?.artifactVersion?.artifact?.filePath}`,
            capsule.artifactAnchor?.startLine != null
                ? `Lines: ${capsule.artifactAnchor.startLine}–${capsule.artifactAnchor.endLine}`
                : "",
            `Created: ${new Date(capsule.createdAt).toLocaleString()}`,
        ]
            .filter(Boolean)
            .join("\n");
        this.iconPath = new vscode.ThemeIcon("comment-discussion");
        this.command = {
            command: "microhubs.viewCapsules",
            title: "Open Capsule",
            arguments: [this],
        };
    }
}
exports.CapsuleTreeItem = CapsuleTreeItem;
class CapsuleTreeProvider {
    api;
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    capsules = [];
    constructor(api) {
        this.api = api;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren() {
        if (!this.api.getToken()) {
            return [];
        }
        try {
            this.capsules = await this.api.getCapsules();
            // Sort by created date, newest first
            this.capsules.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            return this.capsules.map((c) => new CapsuleTreeItem(c));
        }
        catch (err) {
            vscode.window.showWarningMessage(`Micro-Hubs: Failed to load capsules: ${err.message}`);
            return [];
        }
    }
}
exports.CapsuleTreeProvider = CapsuleTreeProvider;
//# sourceMappingURL=CapsuleTreeProvider.js.map
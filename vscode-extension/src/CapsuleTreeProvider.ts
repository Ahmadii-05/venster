import * as vscode from "vscode";
import { MicroHubsApi, type Capsule } from "./api";

// ── Status colors (matching the frontend) ─────────────────────
const STATUS_ICONS: Record<string, string> = {
  OPEN: "🔵",
  IN_REVIEW: "🟡",
  ANSWERED: "🟣",
  RESOLVED: "🟢",
  ARCHIVED: "⚫",
};

export class CapsuleTreeItem extends vscode.TreeItem {
  constructor(public readonly capsule: Capsule) {
    super(capsule.title, vscode.TreeItemCollapsibleState.None);

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

export class CapsuleTreeProvider
  implements vscode.TreeDataProvider<CapsuleTreeItem>
{
  private _onDidChangeTreeData =
    new vscode.EventEmitter<CapsuleTreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private capsules: Capsule[] = [];

  constructor(private api: MicroHubsApi) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: CapsuleTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<CapsuleTreeItem[]> {
    if (!this.api.getToken()) {
      return [];
    }

    try {
      this.capsules = await this.api.getCapsules();
      // Sort by created date, newest first
      this.capsules.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      return this.capsules.map((c) => new CapsuleTreeItem(c));
    } catch (err: any) {
      vscode.window.showWarningMessage(
        `Micro-Hubs: Failed to load capsules: ${err.message}`
      );
      return [];
    }
  }
}

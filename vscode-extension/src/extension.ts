import * as vscode from "vscode";
import * as crypto from "crypto";
import { MicroHubsApi } from "./api";
import {
  CapsuleTreeProvider,
  CapsuleTreeItem,
} from "./CapsuleTreeProvider";
import { NotificationPoller } from "./NotificationPoller";
import { VensterViewProvider } from "./VensterViewProvider";

let api: MicroHubsApi;
let treeProvider: CapsuleTreeProvider;
let poller: NotificationPoller;
let vensterProvider: VensterViewProvider;

export async function activate(context: vscode.ExtensionContext) {
  // ── API setup ─────────────────────────────────────────────
  const getConfig = () =>
    vscode.workspace.getConfiguration("microhubs").get<string>(
      "baseUrl",
      "http://localhost:8082"
    );
  api = new MicroHubsApi(getConfig);

  // Restore token from SecretStorage
  const storedToken = await context.secrets.get("microhubs.token");
  if (storedToken) {
    api.setToken(storedToken);
  }

  // ── Venster React webview (sidebar) ───────────────────────
  vensterProvider = new VensterViewProvider(
    context.extensionUri,
    api,
    async (token) => {
      // Persist auth changes coming from the React UI into SecretStorage and
      // keep the native tree/poller in sync.
      if (token) {
        await context.secrets.store("microhubs.token", token);
        treeProvider.refresh();
        poller.start(30000);
      } else {
        await context.secrets.delete("microhubs.token");
        treeProvider.refresh();
        poller.stop();
      }
    }
  );
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      VensterViewProvider.viewId,
      vensterProvider
    )
  );

  // ── Tree view ─────────────────────────────────────────────
  treeProvider = new CapsuleTreeProvider(api);
  vscode.window.registerTreeDataProvider("microhubs.capsules", treeProvider);

  // ── Notification poller ───────────────────────────────────
  poller = new NotificationPoller(api);
  if (api.getToken()) {
    poller.start(30000);
  }

  // ── Commands ──────────────────────────────────────────────

  // Login
  context.subscriptions.push(
    vscode.commands.registerCommand("microhubs.login", async () => {
      const email = await vscode.window.showInputBox({
        prompt: "Micro-Hubs email",
        placeHolder: "you@example.com",
      });
      if (!email) return;

      const password = await vscode.window.showInputBox({
        prompt: "Micro-Hubs password",
        password: true,
      });
      if (!password) return;

      try {
        await api.login(email, password);
        await context.secrets.store("microhubs.token", api.getToken()!);
        vscode.window.showInformationMessage(
          `Micro-Hubs: Logged in as ${email}`
        );
        treeProvider.refresh();
        poller.start(30000);
        vensterProvider.postAuthState();
      } catch (err: any) {
        vscode.window.showErrorMessage(
          `Micro-Hubs: Login failed — ${err.message}`
        );
      }
    })
  );

  // Logout
  context.subscriptions.push(
    vscode.commands.registerCommand("microhubs.logout", async () => {
      api.setToken(null);
      await context.secrets.delete("microhubs.token");
      vscode.window.showInformationMessage("Micro-Hubs: Logged out");
      treeProvider.refresh();
      poller.stop();
      vensterProvider.postAuthState();
    })
  );

  // Create Capsule from Selection
  context.subscriptions.push(
    vscode.commands.registerCommand("microhubs.createCapsule", async () => {
      if (!api.getToken()) {
        vscode.window.showErrorMessage("Micro-Hubs: Please login first");
        return;
      }

      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor");
        return;
      }

      const selection = editor.selection;
      if (selection.isEmpty) {
        vscode.window.showErrorMessage(
          "Micro-Hubs: Select some code first"
        );
        return;
      }

      const selectedText = editor.document.getText(selection);
      const filePath = editor.document.fileName;
      const startLine = selection.start.line + 1; // 1-indexed
      const endLine = selection.end.line + 1;

      // Prompt for title
      const title = await vscode.window.showInputBox({
        prompt: "Capsule title",
        placeHolder: "What is this about?",
      });
      if (!title) return;

      // Prompt for priority
      const priority = await vscode.window.showQuickPick(
        ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
        { placeHolder: "Priority" }
      );

      // Prompt for project ID
      const projectId = await vscode.window.showInputBox({
        prompt: "Project ID (UUID)",
        placeHolder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      });
      if (!projectId) return;

      try {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Micro-Hubs: Creating capsule...",
          },
          async () => {
            // Step 1: Create artifact (or reuse)
            const artifact = await api.createArtifact(
              projectId,
              filePath
            );

            // Step 2: Create version
            const version = await api.createVersion(artifact.id);

            // Step 3: Create anchor
            const anchor = await api.createAnchor(version.id, {
              startLine,
              endLine,
              selectedText,
              symbolName: undefined,
            });

            // Step 4: Create capsule
            const capsule = await api.createCapsule(
              anchor.id,
              title,
              priority || "MEDIUM"
            );

            vscode.window.showInformationMessage(
              `Micro-Hubs: Capsule "${capsule.title}" created (${capsule.status})`
            );
            treeProvider.refresh();
          }
        );
      } catch (err: any) {
        vscode.window.showErrorMessage(
          `Micro-Hubs: Failed to create capsule — ${err.message}`
        );
      }
    })
  );

  // View Capsules for Current File
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "microhubs.viewCapsules",
      async (item?: CapsuleTreeItem) => {
        if (item) {
          // Preferred: open the capsule inside the Venster React webview.
          const openedInVenster = await vensterProvider.revealRoute(
            `/capsules/${item.capsule.id}`
          );
          if (openedInVenster) {
            return;
          }

          // Fallback: static HTML panel (used before the webview has resolved).
          const cap = item.capsule;
          const panel = vscode.window.createWebviewPanel(
            "capsuleDetail",
            `Capsule: ${cap.title}`,
            vscode.ViewColumn.One,
            { enableScripts: false }
          );

          const comments = await api.listComments(cap.id);
          const commentsHtml = comments
            .map(
              (c) => `
            <div style="background:#f8f9fa;border-radius:6px;padding:10px;margin:8px 0;border:1px solid #e9ecef;">
              <strong>${c.author?.name || c.author?.email}</strong>
              <span style="color:#888;font-size:12px;margin-left:8px;">${new Date(c.createdAt).toLocaleString()}</span>
              <p style="margin:4px 0 0;font-size:14px;">${escapeHtml(c.body)}</p>
            </div>`
            )
            .join("");

          panel.webview.html = `
            <!DOCTYPE html>
            <html>
            <body style="font-family:system-ui;padding:16px;max-width:800px;">
              <h2 style="margin-top:0;">${escapeHtml(cap.title)}</h2>
              <p><strong>Status:</strong> ${cap.status} | <strong>Priority:</strong> ${cap.priority}</p>
              <p><strong>Author:</strong> ${cap.author?.name || cap.author?.email}</p>
              ${
                cap.reviewer
                  ? `<p><strong>Reviewer:</strong> ${cap.reviewer.name || cap.reviewer.email}</p>`
                  : ""
              }
              <hr/>
              <p><strong>File:</strong> <code>${escapeHtml(cap.artifactAnchor?.artifactVersion?.artifact?.filePath || "")}</code></p>
              ${
                cap.artifactAnchor?.startLine != null
                  ? `<p><strong>Lines:</strong> ${cap.artifactAnchor.startLine}–${cap.artifactAnchor.endLine}</p>`
                  : ""
              }
              ${
                cap.artifactAnchor?.selectedText
                  ? `<pre style="background:#f1f3f5;padding:10px;border-radius:4px;font-size:13px;overflow-x:auto;">${escapeHtml(cap.artifactAnchor.selectedText)}</pre>`
                  : ""
              }
              <hr/>
              <h3>Comments (${comments.length})</h3>
              ${commentsHtml || '<p style="color:#888;">No comments yet.</p>'}
            </body>
            </html>`;
          return;
        }

        // List capsules in quick pick
        if (!api.getToken()) {
          vscode.window.showErrorMessage("Micro-Hubs: Please login first");
          return;
        }

        const editor = vscode.window.activeTextEditor;
        const filePath = editor?.document.fileName;

        try {
          const capsules = await api.getCapsules();
          const filtered = filePath
            ? capsules.filter(
                (c) =>
                  c.artifactAnchor?.artifactVersion?.artifact?.filePath ===
                  filePath
              )
            : capsules;

          if (filtered.length === 0) {
            vscode.window.showInformationMessage(
              `Micro-Hubs: No capsules found${filePath ? " for this file" : ""}`
            );
            return;
          }

          const picked = await vscode.window.showQuickPick(
            filtered.map((c) => ({
              label: `${c.title}`,
              description: `${c.status} • ${c.priority}`,
              detail: c.artifactAnchor?.artifactVersion?.artifact?.filePath,
              capsule: c,
            })),
            { placeHolder: "Select a capsule to view" }
          );

          if (picked) {
            vscode.commands.executeCommand(
              "microhubs.viewCapsules",
              new CapsuleTreeItem(picked.capsule)
            );
          }
        } catch (err: any) {
          vscode.window.showErrorMessage(
            `Micro-Hubs: ${err.message}`
          );
        }
      }
    )
  );

  // Reply to Capsule
  context.subscriptions.push(
    vscode.commands.registerCommand("microhubs.replyToCapsule", async () => {
      if (!api.getToken()) {
        vscode.window.showErrorMessage("Micro-Hubs: Please login first");
        return;
      }

      const capsuleId = await vscode.window.showInputBox({
        prompt: "Capsule ID to reply to",
        placeHolder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      });
      if (!capsuleId) return;

      const body = await vscode.window.showInputBox({
        prompt: "Your reply",
        placeHolder: "Type your comment...",
      });
      if (!body) return;

      try {
        await api.postComment(capsuleId, body);
        vscode.window.showInformationMessage("Micro-Hubs: Reply posted!");
      } catch (err: any) {
        vscode.window.showErrorMessage(
          `Micro-Hubs: Failed to post reply — ${err.message}`
        );
      }
    })
  );

  // Refresh capsule list
  context.subscriptions.push(
    vscode.commands.registerCommand("microhubs.refreshCapsules", () => {
      treeProvider.refresh();
      vscode.window.showInformationMessage("Micro-Hubs: Capsule list refreshed");
    })
  );

  // Open the Venster React UI (focus the sidebar webview)
  context.subscriptions.push(
    vscode.commands.registerCommand("microhubs.openVenster", async () => {
      await vscode.commands.executeCommand("microhubs.venster.focus");
    })
  );

  // Create a capsule via the Venster React UI, prefilled with editor context
  context.subscriptions.push(
    vscode.commands.registerCommand("microhubs.createCapsuleInVenster", async () => {
      await vensterProvider.notifyNewCapsule();
    })
  );

  // Search Knowledge
  context.subscriptions.push(
    vscode.commands.registerCommand("microhubs.searchKnowledge", async () => {
      if (!api.getToken()) {
        vscode.window.showErrorMessage("Micro-Hubs: Please login first");
        return;
      }

      const query = await vscode.window.showInputBox({
        prompt: "Search knowledge base",
        placeHolder: "e.g. null pointer exception in authentication",
      });
      if (!query) return;

      try {
        const results = await api.searchKnowledge(query);
        if (results.length === 0) {
          vscode.window.showInformationMessage("Micro-Hubs: No knowledge items found");
          return;
        }

        const picked = await vscode.window.showQuickPick(
          results.map((k) => ({
            label: `${k.title}`,
            description: `${k.category} • ${Math.round(k.confidence * 100)}%`,
            detail: k.summary,
            item: k,
          })),
          { placeHolder: "Select a knowledge item to view" }
        );

        if (picked) {
          const panel = vscode.window.createWebviewPanel(
            "knowledgeDetail",
            `Knowledge: ${picked.item.title}`,
            vscode.ViewColumn.One,
            { enableScripts: false }
          );

          panel.webview.html = `
            <!DOCTYPE html>
            <html>
            <body style="font-family:system-ui;padding:16px;max-width:800px;">
              <h2 style="margin-top:0;">${escapeHtml(picked.item.title)}</h2>
              <p><strong>Category:</strong> ${picked.item.category} | <strong>Confidence:</strong> ${Math.round(picked.item.confidence * 100)}%</p>
              <hr/>
              <h3>Summary</h3>
              <p>${escapeHtml(picked.item.summary)}</p>
              <h3>Root Cause</h3>
              <p>${escapeHtml(picked.item.rootCause)}</p>
              <h3>Solution</h3>
              <p>${escapeHtml(picked.item.solution)}</p>
              ${picked.item.tags?.length ? `<h3>Tags</h3><p>${picked.item.tags.join(', ')}</p>` : ''}
            </body>
            </html>`;
        }
      } catch (err: any) {
        vscode.window.showErrorMessage(`Micro-Hubs: Search failed — ${err.message}`);
      }
    })
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function deactivate() {
  poller?.dispose();
}

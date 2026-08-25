import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { MicroHubsApi } from "./api";
import { getCurrentEditorContext, EditorContext } from "./editorContext";

// ── Message protocol (React ↔ Extension) ──────────────────────
// Requests FROM React have a `type` and optional `payload`.
// Responses TO React use the matching response type listed below.
//
//   React → Extension                Extension → React
//   ─────────────────                ─────────────────
//   ready                            authState { token }
//   getAuthState                     currentContext (payload: EditorContext)
//   getCurrentContext                navigate    { path }  (deep-link React router)
//   tokenUpdated   { token|null }    error       { message }
//
interface WebviewMessage {
  type: string;
  payload?: unknown;
}

export class VensterViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewId = "microhubs.venster";

  private _view?: vscode.WebviewView;

  /**
   * Called after login/logout/token changes so the extension can persist the
   * JWT in SecretStorage and refresh native UI. Wired up in extension.ts.
   */
  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _api: MicroHubsApi,
    private readonly _onTokenChanged: (token: string | null) => Promise<void>
  ) {}

  resolveWebviewView(view: vscode.WebviewView): void {
    this._view = view;

    view.webview.options = {
      enableScripts: true,
      // Only the packaged React build is reachable — no arbitrary workspace access.
      localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, "webview", "dist"),
      ],
    };

    view.webview.html = this._getHtmlForWebview(view.webview);

    view.webview.onDidReceiveMessage((msg: WebviewMessage) =>
      this._handleMessage(msg)
    );
  }

  // ── Public helpers used by extension.ts ─────────────────────

  /** Push current auth state into React. */
  postAuthState(): void {
    this._post({ type: "authState", payload: { token: this._api.getToken() } });
  }

  /** Reveal the webview and deep-link React to a route (e.g. /capsules/:id). */
  async revealRoute(routePath: string): Promise<boolean> {
    if (!this._view) {
      return false;
    }
    await this._view.show?.(true);
    this._post({ type: "navigate", payload: { path: routePath } });
    return true;
  }

  /** Reveal the webview and ask React to open the capsule creation UI,
 *  prefilled with the current editor context. */
  async notifyNewCapsule(): Promise<void> {
    // The view loads lazily; focusing it first guarantees it resolves so
    // the message below is not lost.
    await vscode.commands.executeCommand(`${VensterViewProvider.viewId}.focus`);
    if (!this._view) {
      return;
    }
    this._post({ type: "newCapsule", payload: getCurrentEditorContext() });
  }

  // ── Message handling (validated, fixed set — no arbitrary commands) ──
  private async _handleMessage(msg: WebviewMessage): Promise<void> {
    switch (msg.type) {
      case "ready":
        this.postAuthState();
        break;

      case "getAuthState":
        this.postAuthState();
        break;

      case "getCurrentContext":
        this._post({
          type: "currentContext",
          payload: getCurrentEditorContext(),
        });
        break;

      case "tokenUpdated": {
        const payload = msg.payload as { token?: string | null };
        const token =
          typeof payload?.token === "string" ? payload.token : null;
        // Never trust the webview blindly: empty tokens are rejected.
        if (token !== null && token.length === 0) {
          return;
        }
        this._api.setToken(token);
        await this._onTokenChanged(token);
        break;
      }

      default:
        // Unknown message types are ignored — never executed as commands.
        break;
    }
  }

  private _post(message: unknown): void {
    void this._view?.webview.postMessage(message);
  }  // ── HTML: load the packaged React build with a strict CSP ────
  private _getHtmlForWebview(webview: vscode.Webview): string {
    const distUri = vscode.Uri.joinPath(this._extensionUri, "webview", "dist");
    const distDir = distUri.fsPath;
    const indexPath = path.join(distDir, "index.html");
    const indexExists = fs.existsSync(indexPath);

    // Temporary diagnostics (remove once the webview is confirmed working).
    console.log(`[Venster] webview distDir: ${distDir}`);
    console.log(`[Venster] webview indexPath: ${indexPath}`);
    console.log(`[Venster] webview index.html exists: ${indexExists}`);

    if (!indexExists) {
      console.error(`[Venster] index.html NOT FOUND — webview will show fallback`);
      return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: system-ui, sans-serif; padding: 16px; color: var(--vscode-foreground);">
  <h3>Venster UI not built</h3>
  <p>The React bundle was not found at <code>${indexPath}</code>.</p>
  <p>Run <code>npm run build</code> in <code>vscode-extension/</code> (which builds
  <code>frontend/</code> into <code>webview/dist/</code>) and reload the window.</p>
</body>
</html>`;
    }

    let html = fs.readFileSync(indexPath, "utf8");

    // Rewrite EVERY local asset reference Vite emitted — JS bundles, CSS,
    // favicon, and any <link rel="modulepreload"> — into webview-resource
    // URIs. External http(s)/data URLs are left untouched. No hashed
    // filenames are hardcoded; everything comes from the generated HTML.
    html = html.replace(
      /\b(src|href)="([^"]+)"/g,
      (match: string, attr: string, ref: string): string => {
        if (/^(https?:)?\/\//i.test(ref) || ref.startsWith("data:")) {
          return match; // external font/CDN links stay as-is
        }
        if (!/^[./]/.test(ref)) {
          return match; // not a local path (e.g. "#anchor")
        }
        const cleanRef = ref.replace(/^(\.\/|\/|\.\.\/)+/, "");
        const uri = webview.asWebviewUri(
          vscode.Uri.joinPath(distUri, cleanRef)
        );
        return `${attr}="${uri}"`;
      }
    );

    // The backend URL is needed by React's fetch calls; CSP must allow it.
    const baseUrl = this._api.baseUrl.replace(/\/$/, "");

    // Strict CSP. script-src uses webview.cspSource (NOT a nonce): this is
    // the robust strategy for Vite's ES-module bundles and any dynamically
    // imported chunks, which nonces can silently block in some VS Code
    // versions. cspSource is scoped to our own localResourceRoots.
    const csp = [
      "default-src 'none'",
      `img-src ${webview.cspSource} data:`,
      `font-src ${webview.cspSource} data: https://fonts.gstatic.com`,
      `style-src ${webview.cspSource} 'unsafe-inline' https://fonts.googleapis.com`,
      `script-src ${webview.cspSource}`,
      `connect-src ${baseUrl}`,
    ].join("; ");

    html = html.replace(
      "<head>",
      `<head>\n<meta charset="utf-8">\n<meta http-equiv="Content-Security-Policy" content="${csp}">`
    );

    // Temporary diagnostics: log the resolved resource URIs before the
    // caller assigns webview.html.
    const finalScriptUri = html.match(/src="([^"]+\.js[^"]*)"/)?.[1];
    const finalStyleUri = html.match(/href="([^"]+\.css[^"]*)"/)?.[1];
    console.log(`[Venster] final script URI: ${finalScriptUri ?? "NOT FOUND"}`);
    console.log(`[Venster] final stylesheet URI: ${finalStyleUri ?? "NOT FOUND"}`);

    return html;
  }
}

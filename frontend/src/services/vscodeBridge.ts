// ── VS Code ↔ React message bridge ────────────────────────────
// The ONLY place in the frontend that touches the VS Code API.
// Outside of VS Code (normal browser dev) every call is a safe no-op.

// acquireVsCodeApi() may only ever be called once per page — guard it here.
// NOTE: this object implements ONLY postMessage/getState/setState — it is NOT
// an EventTarget. Incoming messages from the extension host arrive as standard
// "message" events on the webview's window.
interface VsCodeApi {
  postMessage(msg: unknown): void;
}

declare global {
  interface Window {
    acquireVsCodeApi?: () => VsCodeApi;
  }
}

const vscodeApi: VsCodeApi | null =
  typeof window !== "undefined" && window.acquireVsCodeApi
    ? window.acquireVsCodeApi()
    : null;

/** True when the React app runs inside a VS Code webview. */
export const isInVsCode = vscodeApi !== null;

// ── Shared message types (mirrored in the extension host) ─────
export interface EditorContextPayload {
  filePath: string | null;
  startLine: number | null;
  endLine: number | null;
  selectedCode: string | null;
  language: string | null;
  workspaceName: string | null;
}

export type BridgeMessage =
  | { type: "authState"; payload: { token: string | null } }
  | { type: "currentContext"; payload: EditorContextPayload }
  | { type: "navigate"; payload: { path: string } }
  | { type: "newCapsule"; payload: EditorContextPayload };

export function postMessage(type: string, payload?: unknown): void {
  vscodeApi?.postMessage({ type, payload });
}

export function onBridgeMessage(handler: (msg: BridgeMessage) => void) {
  if (!isInVsCode) return () => {};
  const h = (e: MessageEvent) => handler(e.data as BridgeMessage);
  // Listen on window: webview.postMessage() from the extension delivers
  // MessageEvents to the webview's window, not to the vscodeApi object.
  window.addEventListener("message", h);
  return () => window.removeEventListener("message", h);
}

// ── Request/response helpers ──────────────────────────────────

/** Ask the extension for the current editor code context. */
export function requestCurrentContext(): Promise<EditorContextPayload | null> {
  if (!vscodeApi) return Promise.resolve(null);
  return new Promise((resolve) => {
    const off = onBridgeMessage((msg) => {
      if (msg.type === "currentContext") {
        off();
        resolve(msg.payload);
      }
    });
    postMessage("getCurrentContext");
    // Don't hang forever if no editor is available.
    setTimeout(() => {
      off();
      resolve(null);
    }, 2000);
  });
}

/** Ask the extension for the stored auth token (from SecretStorage). */
export function requestAuthState(): Promise<string | null> {
  if (!vscodeApi) return Promise.resolve(null);
  return new Promise((resolve) => {
    const off = onBridgeMessage((msg) => {
      if (msg.type === "authState") {
        off();
        resolve(msg.payload.token);
      }
    });
    postMessage("getAuthState");
    setTimeout(() => {
      off();
      resolve(null);
    }, 2000);
  });
}

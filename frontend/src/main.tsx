import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// ── TEMPORARY boot diagnostics ────────────────────────────────
// Surfaces any startup exception visibly instead of a black webview.
// Remove once the webview is confirmed stable.
function showBootError(err: unknown) {
  console.error("[VENSTER BOOT ERROR]", err);
  console.error(
    "[VENSTER BOOT STACK]",
    err instanceof Error ? err.stack : err
  );
  const el = document.getElementById("root");
  if (el && !el.hasChildNodes()) {
    const pre = document.createElement("pre");
    pre.style.cssText =
      "padding:16px;color:#f66;font-family:monospace;white-space:pre-wrap;overflow:auto;";
    pre.textContent = `[VENSTER BOOT ERROR]\n${
      err instanceof Error ? `${err.message}\n\n${err.stack}` : String(err)
    }`;
    el.appendChild(pre);
  }
}

window.addEventListener("error", (e) => showBootError(e.error ?? e.message));
window.addEventListener("unhandledrejection", (e) => showBootError(e.reason));

try {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
} catch (error) {
  showBootError(error);
  throw error;
}

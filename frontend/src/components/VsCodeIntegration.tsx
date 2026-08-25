import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { onBridgeMessage, isInVsCode, postMessage } from "../services/vscodeBridge";

/**
 * Invisible glue component: listens for messages from the VS Code extension
 * host and translates them into React app behaviour. Renders nothing.
 *
 *  - "navigate"   → deep-link the router (e.g. tree view → capsule detail)
 *  - "newCapsule" → open the creation modal prefilled with editor context
 *                   (dispatched as a window event so any page can pick it up)
 */
export default function VsCodeIntegration() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isInVsCode) return;

    // Tell the extension we're up so it can push initial state.
    postMessage("ready");

    const off = onBridgeMessage((msg) => {
      if (msg.type === "navigate") {
        navigate(msg.payload.path);
      } else if (msg.type === "newCapsule") {
        window.dispatchEvent(
          new CustomEvent("venster:newCapsule", { detail: msg.payload })
        );
      }
    });

    return off;
  }, [navigate]);

  return null;
}

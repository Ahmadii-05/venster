import { useLocation, useNavigate } from "react-router-dom";
import Icon from "./Icon";

interface BackButtonProps {
  /**
   * Where to go when there is no in-app history to pop — i.e. this is the
   * first screen loaded in the session. When omitted, the button hides itself
   * in that case rather than dead-ending (see below).
   */
  fallback?: string;
  /** Visible label; defaults to "Back". Hidden on very narrow widths. */
  label?: string;
  /** Extra classes (e.g. positioning) appended to the button. */
  className?: string;
}

/**
 * Universal "go to the previous screen" control.
 *
 * It pops the router history stack (navigate(-1)) so it always returns to
 * wherever the user actually came from — the literal previous screen.
 *
 * On the very first screen of a session there is nothing to pop. React Router
 * marks that initial entry with location.key === "default", so we detect it and
 * either send the user to `fallback` (when one is supplied) or render nothing —
 * this keeps the button from trapping the user or bouncing them out of the app.
 */
export default function BackButton({
  fallback,
  label = "Back",
  className,
}: BackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const hasHistory = location.key !== "default";

  // Nothing to go back to and no fallback to fall through to: don't render.
  if (!hasHistory && !fallback) {
    return null;
  }

  const handleBack = () => {
    if (hasHistory) {
      navigate(-1);
    } else if (fallback) {
      navigate(fallback);
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label="Go back to the previous screen"
      title="Back"
      className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm transition-all hover:opacity-80 shrink-0 ${className || ""}`}
      style={{ color: "var(--color-text-secondary)" }}
    >
      <Icon name="arrowLeft" size={18} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

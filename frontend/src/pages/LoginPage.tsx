import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import Logo from "../components/ui/Logo";
import BackButton from "../components/ui/BackButton";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center transition-theme"
      style={{ backgroundColor: "var(--color-bg-primary)" }}
    >
      {/* Back to previous screen (self-hides on a fresh session — login is the entry point) */}
      <BackButton className="fixed top-4 left-4" />

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 p-2 rounded-lg transition-all hover:opacity-80"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {theme === "dark" ? "☀" : "☾"}
      </button>

      <div className="w-full max-w-md px-6">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <Logo size={48} style={{ color: "var(--color-accent)" }} />
          </div>
          <h1 className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            Welcome back
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            Sign in to your Micro-Hubs account
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-xl p-6 border space-y-4 transition-theme"
          style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}
        >
          {error && (
            <div
              className="p-3 rounded-lg text-sm"
              style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", color: "var(--color-danger)" }}
            >
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-muted)" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-lg text-sm border outline-none focus:ring-1 transition-theme"
              style={{
                backgroundColor: "var(--color-bg-input)",
                borderColor: "var(--color-border)",
                color: "var(--color-text-primary)",
              }}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-muted)" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-lg text-sm border outline-none focus:ring-1 transition-theme"
              style={{
                backgroundColor: "var(--color-bg-input)",
                borderColor: "var(--color-border)",
                color: "var(--color-text-primary)",
              }}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "var(--color-accent)", color: "#000" }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm mt-4" style={{ color: "var(--color-text-secondary)" }}>
          Don't have an account?{" "}
          <Link to="/register" className="font-medium" style={{ color: "var(--color-accent)" }}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

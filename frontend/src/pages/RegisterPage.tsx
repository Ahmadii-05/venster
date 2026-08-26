import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import Logo from "../components/ui/Logo";
import BackButton from "../components/ui/BackButton";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { register, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await register(name, email, password);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center transition-theme"
      style={{ backgroundColor: "var(--color-bg-primary)" }}
    >
      {/* Back to previous screen */}
      <BackButton fallback="/login" className="fixed top-4 left-4" />

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
            Create your account
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            Start capturing your team's knowledge
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
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              className="w-full px-3 py-2.5 rounded-lg text-sm border outline-none focus:ring-1 transition-theme"
              style={{
                backgroundColor: "var(--color-bg-input)",
                borderColor: "var(--color-border)",
                color: "var(--color-text-primary)",
              }}
              placeholder="Ada Lovelace"
            />
          </div>

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
              minLength={8}
              className="w-full px-3 py-2.5 rounded-lg text-sm border outline-none focus:ring-1 transition-theme"
              style={{
                backgroundColor: "var(--color-bg-input)",
                borderColor: "var(--color-border)",
                color: "var(--color-text-primary)",
              }}
              placeholder="••••••••"
            />
            <p className="text-[11px] mt-1.5" style={{ color: "var(--color-text-muted)" }}>
              At least 8 characters
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "var(--color-accent)", color: "#000" }}
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm mt-4" style={{ color: "var(--color-text-secondary)" }}>
          Already have an account?{" "}
          <Link to="/login" className="font-medium" style={{ color: "var(--color-accent)" }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

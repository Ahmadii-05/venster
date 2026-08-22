import { useState } from "react";
import { knowledgeApi } from "../services/api";
import type { KnowledgeItem } from "../types";

const CATEGORIES = [
  "ALL", "BUG", "PERFORMANCE", "SECURITY", "DESIGN",
  "CONFIGURATION", "TESTING", "DOCUMENTATION",
];

export default function KnowledgeSearchPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [results, setResults] = useState<KnowledgeItem[]>([]);
  const [selected, setSelected] = useState<KnowledgeItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setSearched(true);
    try {
      const data = await knowledgeApi.search({
        q: query,
        category: category === "ALL" ? undefined : category,
      });
      setResults(data);
      setSelected(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (selected) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <button
          onClick={() => setSelected(null)}
          className="text-xs font-medium mb-4 transition-all hover:opacity-80"
          style={{ color: "var(--color-accent)" }}
        >
          ← Back to search results
        </button>
        <div className="rounded-xl p-6 border transition-theme" style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>{selected.title}</h1>
            <div className="flex gap-2 shrink-0">
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ backgroundColor: "rgba(167,139,250,0.15)", color: "var(--color-status-answered)" }}
              >
                {selected.category}
              </span>
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ backgroundColor: "rgba(34,197,94,0.15)", color: "var(--color-status-resolved)" }}
              >
                {Math.round(selected.confidence * 100)}% confidence
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-xs uppercase tracking-widest font-mono mb-1" style={{ color: "var(--color-kicker)" }}>Summary</h3>
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{selected.summary}</p>
            </div>
            <div>
              <h3 className="text-xs uppercase tracking-widest font-mono mb-1" style={{ color: "var(--color-kicker)" }}>Root Cause</h3>
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{selected.rootCause}</p>
            </div>
            <div>
              <h3 className="text-xs uppercase tracking-widest font-mono mb-1" style={{ color: "var(--color-kicker)" }}>Solution</h3>
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{selected.solution}</p>
            </div>
            {selected.tags && selected.tags.length > 0 && (
              <div>
                <h3 className="text-xs uppercase tracking-widest font-mono mb-1" style={{ color: "var(--color-kicker)" }}>Tags</h3>
                <div className="flex gap-1 flex-wrap">
                  {selected.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: "var(--color-bg-input)", color: "var(--color-text-muted)" }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {selected.resolution && (
              <div className="border-t pt-3" style={{ borderColor: "var(--color-border)" }}>
                <h3 className="text-xs uppercase tracking-widest font-mono mb-1" style={{ color: "var(--color-kicker)" }}>Source</h3>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  Resolved by {selected.resolution.resolver?.name || selected.resolution.resolver?.email}
                  {" • "}
                  {new Date(selected.resolution.resolvedAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="text-[10px] uppercase tracking-widest font-mono mb-1" style={{ color: "var(--color-accent)" }}>
          LIBRARY
        </div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
          Knowledge Search
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Search your resolved issues using semantic similarity.
        </p>
      </div>

      {/* Search bar */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Search your resolved issues (semantic search)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="flex-1 rounded-lg px-4 py-2.5 text-sm border outline-none focus:ring-1 transition-theme"
          style={{
            backgroundColor: "var(--color-bg-input)",
            borderColor: "var(--color-border)",
            color: "var(--color-text-primary)",
          }}
        />
        <button
          onClick={handleSearch}
          disabled={!query.trim() || loading}
          className="px-5 py-2.5 rounded-lg text-sm font-medium border transition-all hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: "var(--color-accent)", borderColor: "var(--color-accent)", color: "#000" }}
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-1 flex-wrap">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              category === c ? "border" : "border opacity-70 hover:opacity-100"
            }`}
            style={{
              backgroundColor: category === c ? "var(--color-accent-dim)" : "var(--color-bg-card)",
              borderColor: category === c ? "var(--color-accent)" : "var(--color-border)",
              color: category === c ? "var(--color-accent)" : "var(--color-text-secondary)",
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg p-3 border text-sm" style={{ backgroundColor: "rgba(239,68,68,0.1)", borderColor: "var(--color-danger)", color: "var(--color-danger)" }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-center py-12" style={{ color: "var(--color-text-muted)" }}>
          Searching knowledge base...
        </div>
      ) : !searched ? (
        <div className="text-center py-12" style={{ color: "var(--color-text-muted)" }}>
          <p className="text-sm mb-1" style={{ color: "var(--color-text-secondary)" }}>Enter a query to search resolved issues</p>
          <p className="text-xs">Uses semantic similarity, not just keyword matching</p>
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-12" style={{ color: "var(--color-text-muted)" }}>
          <p className="text-sm mb-1" style={{ color: "var(--color-text-secondary)" }}>No results found</p>
          <p className="text-xs">Try different keywords or a broader query</p>
        </div>
      ) : (
        <div className="space-y-2">
          {results.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelected(item)}
              className="w-full text-left rounded-xl p-4 border transition-all hover:opacity-90"
              style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>📖</span>
                    <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{item.title}</h3>
                  </div>
                  <p className="text-xs line-clamp-2 mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                    {item.summary}
                  </p>
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {item.tags.slice(0, 5).map((tag) => (
                        <span key={tag} className="px-2 py-0.5 rounded text-[10px]" style={{ backgroundColor: "var(--color-bg-input)", color: "var(--color-text-muted)" }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0 ml-3">
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ backgroundColor: "rgba(167,139,250,0.15)", color: "var(--color-status-answered)" }}
                  >
                    {item.category}
                  </span>
                  <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                    {Math.round(item.confidence * 100)}%
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

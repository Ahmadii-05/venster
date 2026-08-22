import { useState } from "react";
import { knowledgeApi } from "../services/api";
import type { KnowledgeItem } from "../types";

export default function GlobalKnowledgePage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<KnowledgeItem | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await knowledgeApi.globalSearch({ q: query });
      setResults(data || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  if (selected) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <button onClick={() => setSelected(null)} className="text-xs font-medium mb-4 transition-all hover:opacity-80" style={{ color: "var(--color-accent)" }}>
          ← Back to search results
        </button>
        <div className="rounded-xl p-6 border transition-theme" style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>{selected.title}</h1>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ backgroundColor: "rgba(34,197,94,0.15)", color: "var(--color-status-resolved)" }}
            >
              PUBLIC
            </span>
          </div>
          {selected.category && (
            <span
              className="inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-3"
              style={{ backgroundColor: "rgba(167,139,250,0.15)", color: "var(--color-status-answered)" }}
            >
              {selected.category}
            </span>
          )}
          <div className="space-y-4 mt-4">
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
                <div className="flex flex-wrap gap-1 mt-1">
                  {selected.tags.map((tag, i) => (
                    <span key={i} className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: "var(--color-bg-input)", color: "var(--color-text-muted)" }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Confidence: {Math.round((selected.confidence || 0) * 100)}%
            </div>
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
          GLOBAL
        </div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
          Global Knowledge Search
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Search publicly shared knowledge across all teams. No workspace required.
        </p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search knowledge... (e.g., 'how to handle null references')"
          className="flex-1 rounded-lg px-4 py-2.5 text-sm border outline-none focus:ring-1 transition-theme"
          style={{
            backgroundColor: "var(--color-bg-input)",
            borderColor: "var(--color-border)",
            color: "var(--color-text-primary)",
          }}
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-6 py-2.5 rounded-lg text-sm font-medium border transition-all hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: "var(--color-accent)", borderColor: "var(--color-accent)", color: "#000" }}
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {!searched && (
        <div className="text-center py-12" style={{ color: "var(--color-text-muted)" }}>
          <p className="text-sm mb-1" style={{ color: "var(--color-text-secondary)" }}>Enter a query to search the global knowledge base</p>
          <p className="text-xs">Results come from resolved capsules published by workspace admins</p>
        </div>
      )}

      {searched && results.length === 0 && !loading && (
        <div className="text-center py-12" style={{ color: "var(--color-text-muted)" }}>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>No public knowledge items found for "{query}"</p>
        </div>
      )}

      <div className="space-y-2">
        {results.map((item) => (
          <button
            key={item.id}
            onClick={() => setSelected(item)}
            className="w-full text-left rounded-xl p-4 border transition-all hover:opacity-90"
            style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>📖</span>
              <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{item.title}</h3>
              {item.category && (
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ backgroundColor: "rgba(167,139,250,0.15)", color: "var(--color-status-answered)" }}
                >
                  {item.category}
                </span>
              )}
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ backgroundColor: "rgba(34,197,94,0.15)", color: "var(--color-status-resolved)" }}
              >
                PUBLIC
              </span>
            </div>
            <p className="text-xs line-clamp-2 mt-1" style={{ color: "var(--color-text-secondary)" }}>{item.summary}</p>
            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {item.tags.slice(0, 5).map((tag, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: "var(--color-bg-input)", color: "var(--color-text-muted)" }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

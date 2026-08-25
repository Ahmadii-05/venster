import { useEffect, useState } from "react";
import { knowledgeApi } from "../services/api";
import type { KnowledgeItem } from "../types";
import KnowledgeCard from "../components/KnowledgeCard";
import Icon from "../components/ui/Icon";

export default function GlobalKnowledgePage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(false); // search request in flight
  const [initialLoading, setInitialLoading] = useState(true); // first browse load
  const [searched, setSearched] = useState(false); // showing search results vs browse
  const [selected, setSelected] = useState<KnowledgeItem | null>(null);

  // Load recently-shared problems on mount so the page shows solved issues
  // immediately — no need to search first.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await knowledgeApi.browseGlobal();
        if (!cancelled) setResults(data || []);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  // Clear the search and return to the browse (recently shared) view.
  const backToBrowse = async () => {
    setQuery("");
    setSearched(false);
    setInitialLoading(true);
    try {
      const data = await knowledgeApi.browseGlobal();
      setResults(data || []);
    } catch {
      setResults([]);
    } finally {
      setInitialLoading(false);
    }
  };

  /* ── Detail view: doc column + privacy-safe provenance rail ── */
  if (selected) {
    const confidence = Math.round((selected.confidence || 0) * 100);
    const confColor =
      confidence >= 80
        ? "var(--color-status-resolved)"
        : confidence >= 50
        ? "var(--color-status-review)"
        : "var(--color-status-open)";

    const Section = ({ label, body }: { label: string; body?: string }) => (
      <div className="relative pl-4">
        <span
          className="absolute left-0 top-1 bottom-1 w-[2px] rounded-full"
          style={{ backgroundColor: "var(--color-border-hover)" }}
          aria-hidden="true"
        />
        <h3 className="eyebrow mb-1.5" style={{ color: "var(--color-text-muted)" }}>{label}</h3>
        <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          {body || "—"}
        </p>
      </div>
    );

    return (
      <div className="max-w-5xl mx-auto p-6">
        <button
          onClick={() => setSelected(null)}
          className="inline-flex items-center gap-1.5 text-xs font-mono font-medium mb-5 transition-all hover:opacity-80"
          style={{ color: "var(--color-accent)" }}
        >
          <Icon name="arrowLeft" size={14} />
          {searched ? "Back to results" : "Back to browse"}
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_268px] gap-6">
          {/* Doc column */}
          <article
            className="rounded-2xl border p-6 transition-theme"
            style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}
          >
            <div className="eyebrow mb-2">Solved Problem</div>
            <h1 className="font-display text-2xl font-bold mb-5" style={{ color: "var(--color-text-primary)" }}>
              {selected.title}
            </h1>
            <div className="space-y-5">
              <Section label="Summary" body={selected.summary} />
              <Section label="Root Cause" body={selected.rootCause} />
              <Section label="Solution" body={selected.solution} />
            </div>
          </article>

          {/* Provenance rail */}
          <aside className="space-y-4">
            <div
              className="rounded-2xl border p-4 transition-theme"
              style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}
            >
              <div className="eyebrow mb-3" style={{ color: "var(--color-text-muted)" }}>Provenance</div>

              <div className="flex items-center justify-between mb-3">
                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Visibility</span>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider"
                  style={{ backgroundColor: "rgba(34,197,94,0.15)", color: "var(--color-status-resolved)" }}
                >
                  Public
                </span>
              </div>

              {selected.category && (
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Category</span>
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider"
                    style={{ backgroundColor: "rgba(167,139,250,0.15)", color: "var(--color-status-answered)" }}
                  >
                    {selected.category}
                  </span>
                </div>
              )}

              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Confidence</span>
                <span className="text-[11px] font-mono font-semibold" style={{ color: confColor }}>{confidence}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full overflow-hidden mb-4" style={{ backgroundColor: "var(--color-bg-input)" }}>
                <div className="h-full rounded-full" style={{ width: `${confidence}%`, backgroundColor: confColor }} />
              </div>

              {selected.tags && selected.tags.length > 0 && (
                <>
                  <div className="text-xs mb-1.5" style={{ color: "var(--color-text-secondary)" }}>Tags</div>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded text-[10px] font-mono"
                        style={{ backgroundColor: "var(--color-bg-input)", color: "var(--color-text-muted)" }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Truthful note: public items are stripped of source anchors */}
            <div className="flex items-start gap-2 px-1">
              <Icon name="lock" size={13} style={{ color: "var(--color-text-muted)", marginTop: 2 }} />
              <p className="text-[11px] leading-relaxed font-mono" style={{ color: "var(--color-text-muted)" }}>
                Source location, code and workspace redacted for public sharing.
              </p>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  const busy = loading || initialLoading;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="eyebrow mb-1.5">Community</div>
        <h1 className="font-display text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
          Community Insights
        </h1>
        <p className="text-sm mt-1.5 max-w-2xl leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          Browse solved problems shared publicly across all teams, or search for a specific one. No workspace required.
        </p>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm select-none"
            style={{ color: "var(--color-accent)" }}
            aria-hidden="true"
          >
            &gt;
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search knowledge... (e.g., 'how to handle null references')"
            className="w-full rounded-lg pl-9 pr-4 py-2.5 text-sm border outline-none focus:ring-1 focus:ring-[color:var(--color-accent)] transition-theme"
            style={{
              backgroundColor: "var(--color-bg-input)",
              borderColor: "var(--color-border)",
              color: "var(--color-text-primary)",
            }}
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-6 py-2.5 rounded-lg text-sm font-semibold font-display border transition-all hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: "var(--color-accent)", borderColor: "var(--color-accent)", color: "#000" }}
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {/* Results header: browse vs search, with a way back to browse */}
      {!busy && results.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-mono" style={{ color: "var(--color-text-muted)" }}>
            {searched
              ? `${results.length} ${results.length === 1 ? "result" : "results"} for “${query}”`
              : `Recently shared by the community · ${results.length}`}
          </span>
          {searched && (
            <button
              onClick={backToBrowse}
              className="inline-flex items-center gap-1 text-xs font-mono font-medium transition-all hover:opacity-80"
              style={{ color: "var(--color-accent)" }}
            >
              <Icon name="arrowLeft" size={13} />
              Back to browse
            </button>
          )}
        </div>
      )}

      {/* Loading */}
      {busy && (
        <div className="text-center py-12" style={{ color: "var(--color-text-muted)" }}>
          <p className="text-sm">{initialLoading ? "Loading community solutions…" : "Searching…"}</p>
        </div>
      )}

      {/* Empty: search returned nothing */}
      {!busy && searched && results.length === 0 && (
        <div className="text-center py-12" style={{ color: "var(--color-text-muted)" }}>
          <p className="text-sm mb-1" style={{ color: "var(--color-text-secondary)" }}>No public knowledge items found for “{query}”</p>
          <p className="text-xs mb-4">Try broader wording, or browse everything the community has shared.</p>
          <button
            onClick={backToBrowse}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-mono font-medium border transition-all hover:opacity-90"
            style={{ backgroundColor: "var(--color-accent-dim)", borderColor: "var(--color-accent)", color: "var(--color-accent)" }}
          >
            <Icon name="arrowLeft" size={13} />
            Back to browse
          </button>
        </div>
      )}

      {/* Empty: nothing published yet */}
      {!busy && !searched && results.length === 0 && (
        <div className="text-center py-12" style={{ color: "var(--color-text-muted)" }}>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>No community solutions have been shared yet.</p>
          <p className="text-xs mt-1">Publish a resolved capsule to Community Insights and it will show up here.</p>
        </div>
      )}

      {/* Results / browse list — the gutter card is the home signature here */}
      {!busy && results.length > 0 && (
        <div className="space-y-2.5">
          {results.map((item, i) => (
            <KnowledgeCard
              key={item.id}
              item={item}
              index={i}
              showPublic
              onView={() => setSelected(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

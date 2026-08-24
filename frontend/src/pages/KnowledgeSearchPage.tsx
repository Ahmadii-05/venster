import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { knowledgeApi } from "../services/api";
import type { KnowledgeItem, KnowledgeAnswer } from "../types";
import KnowledgeCard from "../components/KnowledgeCard";
import Icon from "../components/ui/Icon";

const CATEGORIES = [
  "ALL", "BUG", "PERFORMANCE", "SECURITY", "DESIGN",
  "CONFIGURATION", "TESTING", "DOCUMENTATION",
];

type Scope = "mine" | "global";
type Sort = "relevance" | "newest" | "confidence";

const SORTS: { value: Sort; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "newest", label: "Newest" },
  { value: "confidence", label: "Confidence" },
];

export default function KnowledgeSearchPage() {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<Scope>("mine");
  const [category, setCategory] = useState("ALL");
  const [tags, setTags] = useState("");
  const [sort, setSort] = useState<Sort>("relevance");

  const [results, setResults] = useState<KnowledgeItem[]>([]);
  const [selected, setSelected] = useState<KnowledgeItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const [answer, setAnswer] = useState<KnowledgeAnswer | null>(null);
  const [answerLoading, setAnswerLoading] = useState(false);

  // Search + AI answer fire in parallel so results never wait on the LLM.
  // `opts.scope` lets callers (scope toggle, "search global instead") run a
  // search against a scope before the state update has flushed.
  const runSearch = (opts?: { scope?: Scope }) => {
    if (opts?.scope && opts.scope !== scope) setScope(opts.scope);
    const effScope = opts?.scope ?? scope;
    if (!query.trim()) return;

    const params = {
      q: query,
      scope: effScope,
      category: category === "ALL" ? undefined : category,
      tags: tags.trim() || undefined,
    };

    setSearched(true);
    setSelected(null);
    setError("");

    setLoading(true);
    knowledgeApi
      .search(params)
      .then((data) => setResults(data))
      .catch((err: any) => {
        setError(err.message || "Search failed");
        setResults([]);
      })
      .finally(() => setLoading(false));

    // AI answer with citations — independent; failure just hides the panel.
    setAnswer(null);
    setAnswerLoading(true);
    knowledgeApi
      .answer(params)
      .then((data) => setAnswer(data))
      .catch(() => setAnswer(null))
      .finally(() => setAnswerLoading(false));
  };

  const changeScope = (s: Scope) => {
    if (s === scope) return;
    setScope(s);
    if (searched && query.trim()) runSearch({ scope: s });
  };

  // Sorting is client-side so changing it re-orders instantly (no refetch).
  // "relevance" preserves server (embedding-similarity) order.
  const sortedResults = useMemo(() => {
    const arr = [...results];
    if (sort === "newest") {
      arr.sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      );
    } else if (sort === "confidence") {
      arr.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    }
    return arr;
  }, [results, sort]);

  // ── Detail view: doc column + provenance rail ──────────────
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
          Back to search results
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_268px] gap-6">
          {/* Doc column */}
          <article
            className="rounded-2xl border p-6 transition-theme"
            style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}
          >
            <div className="eyebrow mb-2">Resolved Issue</div>
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
                    {selected.tags.map((tag) => (
                      <span
                        key={tag}
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

            {/* Real source anchor when present (mine scope), else redacted note */}
            {selected.resolution ? (
              <div
                className="rounded-2xl border p-4 transition-theme"
                style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}
              >
                <div className="eyebrow mb-2" style={{ color: "var(--color-text-muted)" }}>Source</div>
                <div className="flex items-center gap-2">
                  <Icon name="check" size={13} style={{ color: "var(--color-status-resolved)" }} />
                  <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                    Resolved by {selected.resolution.resolver?.name || selected.resolution.resolver?.email}
                  </p>
                </div>
                <p className="text-[11px] font-mono mt-1.5" style={{ color: "var(--color-text-muted)" }}>
                  {new Date(selected.resolution.resolvedAt).toLocaleDateString()}
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-2 px-1">
                <Icon name="lock" size={13} style={{ color: "var(--color-text-muted)", marginTop: 2 }} />
                <p className="text-[11px] leading-relaxed font-mono" style={{ color: "var(--color-text-muted)" }}>
                  Source location redacted for cross-team sharing.
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>
    );
  }

  // ── Search view ────────────────────────────────────────────
  const scopeLabel = scope === "mine" ? "your workspaces" : "the global community";

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="eyebrow mb-1.5">Library</div>
        <h1 className="font-display text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
          Knowledge Search
        </h1>
        <p className="text-sm mt-1.5 max-w-2xl leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          Ask a question or search resolved issues by meaning — the AI answers from your team's knowledge and cites its sources.
        </p>
      </div>

      {/* Scope toggle */}
      <div className="inline-flex rounded-lg border p-0.5" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg-card)" }}>
        {([
          { value: "mine" as Scope, label: "My workspaces" },
          { value: "global" as Scope, label: "Global community" },
        ]).map((s) => (
          <button
            key={s.value}
            onClick={() => changeScope(s.value)}
            className="px-3.5 py-1.5 rounded-md text-xs font-medium font-mono transition-all"
            style={{
              backgroundColor: scope === s.value ? "var(--color-accent)" : "transparent",
              color: scope === s.value ? "#000" : "var(--color-text-secondary)",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Search bar */}
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
            placeholder="Ask a question, e.g. “why do our webhooks time out under load?”"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            className="w-full rounded-lg pl-9 pr-4 py-2.5 text-sm border outline-none focus:ring-1 focus:ring-[color:var(--color-accent)] transition-theme"
            style={{
              backgroundColor: "var(--color-bg-input)",
              borderColor: "var(--color-border)",
              color: "var(--color-text-primary)",
            }}
          />
        </div>
        <button
          onClick={() => runSearch()}
          disabled={!query.trim() || loading}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold font-display border transition-all hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: "var(--color-accent)", borderColor: "var(--color-accent)", color: "#000" }}
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {/* Filters row: tags + sort */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Filter by tags (comma-separated)…"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runSearch()}
          className="flex-1 min-w-[200px] rounded-lg px-3 py-2 text-xs border outline-none focus:ring-1 focus:ring-[color:var(--color-accent)] transition-theme"
          style={{
            backgroundColor: "var(--color-bg-input)",
            borderColor: "var(--color-border)",
            color: "var(--color-text-primary)",
          }}
        />
        <div className="flex items-center gap-2">
          <span className="eyebrow" style={{ color: "var(--color-text-muted)" }}>Sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="rounded-lg px-3 py-2 text-xs border outline-none focus:ring-1 transition-theme cursor-pointer"
            style={{
              backgroundColor: "var(--color-bg-input)",
              borderColor: "var(--color-border)",
              color: "var(--color-text-primary)",
            }}
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-1 flex-wrap">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => {
              setCategory(c);
              if (searched && query.trim()) runSearch();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium font-mono transition-all ${
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

      {/* AI answer panel — violet-accented, footnote-style citations */}
      {searched && answerLoading && (
        <div
          className="relative overflow-hidden rounded-xl p-5 border animate-pulse"
          style={{ backgroundColor: "rgba(167,139,250,0.06)", borderColor: "var(--color-status-answered)" }}
        >
          <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: "var(--color-status-answered)" }} aria-hidden="true" />
          <div className="flex items-center gap-1.5 mb-2 pl-2">
            <Icon name="knowledge" size={13} style={{ color: "var(--color-status-answered)" }} />
            <span className="text-[10.5px] font-mono font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--color-status-answered)" }}>
              AI Answer
            </span>
          </div>
          <p className="text-sm pl-2" style={{ color: "var(--color-text-muted)" }}>
            Synthesizing an answer from the top matches…
          </p>
        </div>
      )}

      {searched && !answerLoading && answer?.hasAnswer && answer.answer && (
        <div
          className="relative overflow-hidden rounded-xl p-5 border"
          style={{ backgroundColor: "rgba(167,139,250,0.06)", borderColor: "var(--color-status-answered)" }}
        >
          <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: "var(--color-status-answered)" }} aria-hidden="true" />
          <div className="flex items-center gap-1.5 mb-2.5 pl-2">
            <Icon name="knowledge" size={13} style={{ color: "var(--color-status-answered)" }} />
            <span className="text-[10.5px] font-mono font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--color-status-answered)" }}>
              AI Answer
            </span>
          </div>
          <p className="text-sm whitespace-pre-wrap pl-2 leading-relaxed" style={{ color: "var(--color-text-primary)" }}>
            {answer.answer}
          </p>

          {answer.citations && answer.citations.length > 0 && (
            <div className="mt-4 pt-3 border-t ml-2" style={{ borderColor: "var(--color-border)" }}>
              <h3 className="eyebrow mb-2" style={{ color: "var(--color-text-muted)" }}>Sources</h3>
              <div className="space-y-1.5">
                {answer.citations.map((c, i) => (
                  <button
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className="w-full text-left flex items-start gap-2.5 rounded-lg px-2.5 py-2 transition-all hover:opacity-80"
                    style={{ backgroundColor: "var(--color-bg-input)" }}
                  >
                    <span
                      className="text-[11px] font-mono font-semibold shrink-0 mt-px px-1.5 rounded"
                      style={{ backgroundColor: "rgba(167,139,250,0.15)", color: "var(--color-status-answered)" }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-xs flex-1 min-w-0" style={{ color: "var(--color-text-secondary)" }}>{c.title}</span>
                    <span className="text-[10px] font-mono shrink-0" style={{ color: "var(--color-text-muted)" }}>{c.category}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-[10px] font-mono mt-3 pl-2" style={{ color: "var(--color-text-muted)" }}>
            Generated from your team's resolved issues. Verify before relying on it.
          </p>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="text-sm text-center py-12" style={{ color: "var(--color-text-muted)" }}>
          Searching knowledge base...
        </div>
      ) : !searched ? (
        <div className="text-center py-12" style={{ color: "var(--color-text-muted)" }}>
          <p className="text-sm mb-1" style={{ color: "var(--color-text-secondary)" }}>Ask a question to search {scopeLabel}</p>
          <p className="text-xs">Matches by meaning, not just keywords — and drafts an answer with citations</p>
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm mb-1" style={{ color: "var(--color-text-secondary)" }}>
            No matches in {scopeLabel}
          </p>
          <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
            Try broader wording, clear the category filter, or widen your search.
          </p>
          <div className="flex gap-2 justify-center flex-wrap">
            {scope === "mine" && (
              <button
                onClick={() => runSearch({ scope: "global" })}
                className="px-4 py-2 rounded-lg text-xs font-medium font-mono border transition-all hover:opacity-90"
                style={{ backgroundColor: "var(--color-accent-dim)", borderColor: "var(--color-accent)", color: "var(--color-accent)" }}
              >
                Search the global community →
              </button>
            )}
            <Link
              to="/community"
              className="px-4 py-2 rounded-lg text-xs font-medium font-mono border transition-all hover:opacity-90"
              style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
            >
              Ask the community →
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-mono" style={{ color: "var(--color-text-muted)" }}>
              {sortedResults.length} {sortedResults.length === 1 ? "match" : "matches"} in {scopeLabel}
            </span>
          </div>
          {sortedResults.map((item, i) => (
            <KnowledgeCard
              key={item.id}
              item={item}
              index={i}
              showPublic={scope === "global"}
              onView={() => setSelected(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

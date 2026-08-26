import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { knowledgeApi } from "../services/api";
import type {
  KnowledgeItem,
  KnowledgeAnswer,
  ExternalKnowledgeItem,
  ExternalKnowledgeDetail,
  ExternalSearchResult,
} from "../types";
import KnowledgeCard from "../components/KnowledgeCard";
import Icon from "../components/ui/Icon";

const CATEGORIES = [
  "ALL", "BUG", "PERFORMANCE", "SECURITY", "DESIGN",
  "CONFIGURATION", "TESTING", "DOCUMENTATION",
];

type Sort = "relevance" | "newest" | "confidence";

const SORTS: { value: Sort; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "newest", label: "Newest" },
  { value: "confidence", label: "Confidence" },
];

// Renders server-converted plain text where fenced ``` segments are code blocks
// and `backticks` are inline code. We split on the delimiters and place each
// piece in a plain-text node — deliberately NO dangerouslySetInnerHTML, so a
// malicious external body can never inject markup into our page.
function renderInlineCode(text: string) {
  return text.split("`").map((part, i) =>
    i % 2 === 1 ? (
      <code
        key={i}
        className="px-1 py-0.5 rounded text-[11px] font-mono"
        style={{ backgroundColor: "var(--color-bg-card)", color: "var(--color-accent)" }}
      >
        {part}
      </code>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function CodeAwareText({ text }: { text: string }) {
  if (!text || !text.trim()) {
    return (
      <p className="text-xs italic" style={{ color: "var(--color-text-muted)" }}>
        No content.
      </p>
    );
  }
  const segments = text.split("```");
  return (
    <div className="space-y-2">
      {segments.map((seg, i) => {
        const trimmed = seg.replace(/^\n+|\n+$/g, "");
        if (i % 2 === 1) {
          // Odd segments are fenced code blocks.
          return (
            <pre
              key={i}
              className="rounded-lg p-3 text-[11px] font-mono overflow-x-auto whitespace-pre leading-relaxed"
              style={{
                backgroundColor: "var(--color-bg-input)",
                color: "var(--color-text-primary)",
                border: "1px solid var(--color-border)",
              }}
            >
              {trimmed}
            </pre>
          );
        }
        // Even segments are prose (with possible inline `code`).
        if (!trimmed) return null;
        return (
          <p
            key={i}
            className="text-xs leading-relaxed whitespace-pre-wrap"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {renderInlineCode(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

// External-source result card (Stack Overflow now; SOFA later). Reuses the
// "IDE gutter" accent-bar motif, but instead of linking OUT it expands INLINE:
// clicking it lazy-loads the question body + top answers from the backend proxy
// and shows them right here, so the user never has to leave the app. A subtle
// "view full thread" link into the source stays available in the expanded panel.
// Left bar goes green when the question is answered (resolved-status color).
function ExternalResultCard({ item, citationNumber }: { item: ExternalKnowledgeItem; citationNumber?: number }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<ExternalKnowledgeDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    // Lazy-load detail the first time it opens; cache it thereafter.
    if (next && !detail && !loading && item.id) {
      setLoading(true);
      setDetailError("");
      knowledgeApi
        .externalDetail({ id: item.id, source: item.source })
        .then((d) => setDetail(d))
        .catch((err: any) =>
          setDetailError(err?.message || "Couldn't load this result.")
        )
        .finally(() => setLoading(false));
    }
  };

  const barColor = item.answered
    ? "var(--color-status-resolved)"
    : "var(--color-border-hover)";

  return (
    <div
      className="relative rounded-xl border overflow-hidden transition-all"
      style={{
        backgroundColor: "var(--color-bg-card)",
        borderColor: expanded ? "var(--color-accent)" : "var(--color-border)",
      }}
    >
      <span
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ backgroundColor: barColor }}
        aria-hidden="true"
      />

      {/* Header row — click to expand/collapse inline */}
      <button
        onClick={toggle}
        aria-expanded={expanded}
        className="w-full text-left p-4 pl-5 transition-all hover:opacity-95"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-sm font-semibold leading-snug" style={{ color: "var(--color-text-primary)" }}>
            {typeof citationNumber === "number" && (
              <span className="font-mono mr-1.5" style={{ color: "var(--color-status-answered)" }}>[{citationNumber}]</span>
            )}
            {item.title}
          </h3>
          <Icon
            name={loading ? "spinner" : "chevronRight"}
            size={14}
            className={`shrink-0 mt-0.5 transition-transform ${
              loading ? "animate-spin" : expanded ? "rotate-90" : ""
            }`}
            style={{ color: expanded ? "var(--color-accent)" : "var(--color-text-muted)" }}
          />
        </div>

        {/* Snippet only while collapsed (the expanded view shows the full body) */}
        {!expanded && item.snippet && (
          <p className="text-xs mt-1.5 leading-relaxed line-clamp-2" style={{ color: "var(--color-text-secondary)" }}>
            {item.snippet}
          </p>
        )}

        <div className="flex items-center flex-wrap gap-x-3 gap-y-1.5 mt-2.5">
          {typeof item.score === "number" && (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono" style={{ color: "var(--color-text-muted)" }}>
              <Icon name="arrowUp" size={11} style={{ color: "var(--color-accent)" }} />
              {item.score}
            </span>
          )}
          {typeof item.answerCount === "number" && (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-mono"
              style={{ color: item.answered ? "var(--color-status-resolved)" : "var(--color-text-muted)" }}
            >
              {item.answered && <Icon name="check" size={11} />}
              {item.answerCount} {item.answerCount === 1 ? "answer" : "answers"}
            </span>
          )}
          {item.tags && item.tags.length > 0 && (
            <span className="flex flex-wrap gap-1.5">
              {item.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded text-[10px] font-mono"
                  style={{ backgroundColor: "var(--color-bg-input)", color: "var(--color-text-muted)" }}
                >
                  {tag}
                </span>
              ))}
            </span>
          )}
        </div>
      </button>

      {/* Expanded detail panel — question body + top answers, inline */}
      {expanded && (
        <div className="px-5 pb-4 border-t" style={{ borderColor: "var(--color-border)" }}>
          {loading ? (
            <p className="text-xs py-3.5 font-mono" style={{ color: "var(--color-text-muted)" }}>
              Loading question &amp; answers…
            </p>
          ) : detailError ? (
            <div className="py-3.5">
              <p className="text-xs mb-2" style={{ color: "var(--color-danger)" }}>{detailError}</p>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-mono font-medium transition-all hover:opacity-80"
                style={{ color: "var(--color-accent)" }}
              >
                Open on Stack Overflow <Icon name="externalLink" size={11} />
              </a>
            </div>
          ) : detail ? (
            <div className="pt-3.5 space-y-4">
              {/* Question body */}
              <div>
                <div className="eyebrow mb-1.5" style={{ color: "var(--color-text-muted)" }}>Question</div>
                <CodeAwareText text={detail.body} />
              </div>

              {/* Top answers */}
              {detail.answers && detail.answers.length > 0 ? (
                <div className="space-y-3">
                  <div className="eyebrow" style={{ color: "var(--color-text-muted)" }}>
                    {detail.answers.length === 1 ? "Top answer" : `Top ${detail.answers.length} answers`}
                  </div>
                  {detail.answers.map((ans, i) => (
                    <div
                      key={i}
                      className="relative rounded-lg border p-3 pl-4"
                      style={{
                        backgroundColor: "var(--color-bg-input)",
                        borderColor: ans.accepted ? "var(--color-status-resolved)" : "var(--color-border)",
                      }}
                    >
                      <span
                        className="absolute left-0 top-0 bottom-0 w-[2px] rounded-full"
                        style={{ backgroundColor: ans.accepted ? "var(--color-status-resolved)" : "var(--color-border-hover)" }}
                        aria-hidden="true"
                      />
                      <div className="flex items-center gap-2.5 mb-1.5">
                        {ans.accepted && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold uppercase tracking-wider" style={{ color: "var(--color-status-resolved)" }}>
                            <Icon name="check" size={11} /> Accepted
                          </span>
                        )}
                        {typeof ans.score === "number" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono" style={{ color: "var(--color-text-muted)" }}>
                            <Icon name="arrowUp" size={11} style={{ color: "var(--color-accent)" }} /> {ans.score}
                          </span>
                        )}
                      </div>
                      <CodeAwareText text={ans.body} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-mono" style={{ color: "var(--color-text-muted)" }}>
                  No answers on this question yet.
                </p>
              )}

              {/* Subtle fallback into the source — inline content is self-sufficient */}
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-mono font-medium transition-all hover:opacity-80"
                style={{ color: "var(--color-accent)" }}
              >
                View full thread on Stack Overflow <Icon name="externalLink" size={11} />
              </a>
            </div>
          ) : (
            // No id to expand (e.g. a source without detail support) — link out.
            <div className="py-3.5">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-mono font-medium transition-all hover:opacity-80"
                style={{ color: "var(--color-accent)" }}
              >
                Open on Stack Overflow <Icon name="externalLink" size={11} />
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function KnowledgeSearchPage() {
  const [query, setQuery] = useState("");
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

  // External-source results (Stack Overflow / SOFA), kept separate from `results`.
  const [externalResult, setExternalResult] = useState<ExternalSearchResult | null>(null);
  const [externalLoading, setExternalLoading] = useState(false);

  // One unified search. The AI answer, your-workspace matches, and Stack
  // Overflow references all fire in PARALLEL — the list never waits on the LLM,
  // and Stack Overflow is a best-effort companion whose failure never blocks the
  // page or surfaces an error (the section just stays empty).
  const runSearch = () => {
    if (!query.trim()) return;

    setSearched(true);
    setSelected(null);
    setError("");

    const params = {
      q: query,
      scope: "mine",
      category: category === "ALL" ? undefined : category,
      tags: tags.trim() || undefined,
    };

    // Your team's resolved issues (semantic search).
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

    // Stack Overflow references — best-effort; never blocks or errors the page.
    setExternalResult(null);
    setExternalLoading(true);
    knowledgeApi
      .externalSearch({
        q: query,
        source: "stackoverflow",
        tags: tags.trim() || undefined,
      })
      .then((res) => setExternalResult(res))
      .catch(() => setExternalResult(null))
      .finally(() => setExternalLoading(false));
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

  // When the AI answer is grounded in Stack Overflow, its cited threads render as
  // expandable "Sources" inside the answer panel. Filter those same threads out of
  // the broader "Similar issues" list below so nothing is shown twice.
  const citedExternalUrls = useMemo(
    () =>
      answer?.source === "stackoverflow"
        ? new Set((answer.externalCitations ?? []).map((c) => c.url))
        : new Set<string>(),
    [answer]
  );
  const similarExternalItems = useMemo(
    () => (externalResult?.items ?? []).filter((it) => !citedExternalUrls.has(it.url)),
    [externalResult, citedExternalUrls]
  );

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
  const busy = loading || answerLoading;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="eyebrow mb-1.5">Library</div>
        <h1 className="font-display text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
          Knowledge Search
        </h1>
        <p className="text-sm mt-1.5 max-w-2xl leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          Ask a question — the AI drafts an answer from your team's resolved issues, with similar Stack Overflow threads below.
        </p>
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
          disabled={!query.trim() || busy}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold font-display border transition-all hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: "var(--color-accent)", borderColor: "var(--color-accent)", color: "#000" }}
        >
          {busy ? "Searching..." : "Search"}
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
        {/* Sort re-orders your-workspace matches client-side (no refetch). */}
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

      {/* Category filter for your-workspace matches */}
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

      {/* AI answer panel — violet-accented, the primary result. Drafted from
          your team's resolved issues; Stack Overflow references sit below. */}
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
            {answer.source === "stackoverflow" && (
              <span
                className="text-[9px] font-mono font-semibold uppercase tracking-[0.14em] px-1.5 py-0.5 rounded flex items-center gap-1"
                style={{ backgroundColor: "var(--color-bg-card)", color: "var(--color-text-muted)" }}
              >
                <Icon name="globe" size={9} /> via Stack Overflow
              </span>
            )}
          </div>
          <p className="text-sm whitespace-pre-wrap pl-2 leading-relaxed" style={{ color: "var(--color-text-primary)" }}>
            {answer.answer}
          </p>

          {/* A Stack Overflow-sourced answer cites public threads — surface them here
              as expandable proof: the question body + top answers open inline, so the
              user never leaves the app. [n] matches the citations in the answer above. */}
          {answer.source === "stackoverflow" && answer.externalCitations && answer.externalCitations.length > 0 && (
            <div className="mt-4 pl-2 space-y-2">
              <div className="eyebrow" style={{ color: "var(--color-text-muted)" }}>Sources · click to expand</div>
              {answer.externalCitations.map((c, i) => (
                <ExternalResultCard key={c.url} item={c} citationNumber={i + 1} />
              ))}
            </div>
          )}

          <p className="text-[10px] font-mono mt-3 pl-2" style={{ color: "var(--color-text-muted)" }}>
            {answer.source === "stackoverflow"
              ? "Synthesized from public Stack Overflow threads — your team hasn't resolved this yet. Verify before relying on it."
              : "Generated from your team's resolved issues. Verify before relying on it."}
          </p>
        </div>
      )}

      {/* Empty state — before the first search */}
      {!searched ? (
        <div className="text-center py-12" style={{ color: "var(--color-text-muted)" }}>
          <p className="text-sm mb-1" style={{ color: "var(--color-text-secondary)" }}>Ask a question to search your knowledge</p>
          <p className="text-xs">Matches by meaning, not just keywords — the AI drafts an answer, with similar Stack Overflow threads below</p>
        </div>
      ) : (
        <>
          {/* Your workspace matches — the evidence behind the AI answer */}
          {loading ? (
            <div className="text-sm text-center py-8" style={{ color: "var(--color-text-muted)" }}>
              Searching your knowledge base...
            </div>
          ) : results.length === 0 ? (
            <div className="rounded-xl border p-6 text-center" style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
              <p className="text-sm mb-1" style={{ color: "var(--color-text-secondary)" }}>
                No matches in your workspaces
              </p>
              <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
                Try broader wording or clear the category filter. Similar Stack Overflow threads are below.
              </p>
              <div className="flex gap-2 justify-center flex-wrap">
                <Link
                  to="/knowledge/global"
                  className="px-4 py-2 rounded-lg text-xs font-medium font-mono border transition-all hover:opacity-90"
                  style={{ backgroundColor: "var(--color-accent-dim)", borderColor: "var(--color-accent)", color: "var(--color-accent)" }}
                >
                  Browse Community Insights →
                </Link>
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
                <span className="eyebrow" style={{ color: "var(--color-text-muted)" }}>
                  Related resolved issues · your workspaces
                </span>
                <span className="text-xs font-mono" style={{ color: "var(--color-text-muted)" }}>
                  {sortedResults.length} {sortedResults.length === 1 ? "match" : "matches"}
                </span>
              </div>
              {sortedResults.map((item, i) => (
                <KnowledgeCard
                  key={item.id}
                  item={item}
                  index={i}
                  showPublic={false}
                  onView={() => setSelected(item)}
                />
              ))}
            </div>
          )}

          {/* Stack Overflow references — similar issues, listed one by one.
              Threads already shown as answer "Sources" above are filtered out. */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="eyebrow flex items-center gap-1.5" style={{ color: "var(--color-text-muted)" }}>
                <Icon name="globe" size={12} /> Similar issues on Stack Overflow
              </span>
              {!externalLoading && externalResult && externalResult.configured && similarExternalItems.length > 0 && (
                <span className="text-[10px] font-mono flex items-center gap-1" style={{ color: "var(--color-text-muted)" }}>
                  <Icon name="chevronRight" size={11} /> click to expand
                </span>
              )}
            </div>
            {externalLoading ? (
              <div className="text-sm py-6 text-center" style={{ color: "var(--color-text-muted)" }}>
                Finding similar issues on Stack Overflow…
              </div>
            ) : externalResult && externalResult.configured && similarExternalItems.length > 0 ? (
              similarExternalItems.map((item) => (
                <ExternalResultCard key={item.url} item={item} />
              ))
            ) : (
              <p className="text-xs px-1 pb-2" style={{ color: "var(--color-text-muted)" }}>
                {externalResult && !externalResult.configured
                  ? externalResult.message || "Stack Overflow isn't connected on the server."
                  : citedExternalUrls.size > 0
                  ? "The cited sources above are the closest Stack Overflow matches."
                  : "No similar Stack Overflow threads found."}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

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
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => setSelected(null)}
          className="text-sm text-blue-600 hover:underline mb-4"
        >
          ← Back to search results
        </button>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-800">{selected.title}</h1>
            <div className="flex gap-2 shrink-0">
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                {selected.category}
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {Math.round(selected.confidence * 100)}% confidence
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-1">Summary</h3>
              <p className="text-sm text-gray-700">{selected.summary}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-1">Root Cause</h3>
              <p className="text-sm text-gray-700">{selected.rootCause}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-1">Solution</h3>
              <p className="text-sm text-gray-700">{selected.solution}</p>
            </div>
            {selected.tags && selected.tags.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 mb-1">Tags</h3>
                <div className="flex gap-1 flex-wrap">
                  {selected.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {selected.resolution && (
              <div className="border-t border-gray-100 pt-3">
                <h3 className="text-sm font-semibold text-gray-500 mb-1">Source</h3>
                <p className="text-xs text-gray-400">
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
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">🔍 Knowledge Search</h1>

      {/* Search bar */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Search your resolved issues (semantic search)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <button
          onClick={handleSearch}
          disabled={!query.trim() || loading}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-1 mb-4 flex-wrap">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              category === c
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="text-gray-500 text-sm py-8 text-center">Searching knowledge base...</div>
      ) : !searched ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg mb-2">Enter a query to search resolved issues</p>
          <p className="text-sm">Uses semantic similarity, not just keyword matching</p>
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg mb-2">No results found</p>
          <p className="text-sm">Try different keywords or a broader query</p>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelected(item)}
              className="w-full text-left bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800">{item.title}</h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.summary}</p>
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {item.tags.slice(0, 5).map((tag) => (
                        <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0 ml-3">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    {item.category}
                  </span>
                  <span className="text-xs text-gray-400">
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

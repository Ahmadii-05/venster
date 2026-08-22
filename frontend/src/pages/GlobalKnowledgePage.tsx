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
        <button onClick={() => setSelected(null)} className="text-blue-600 hover:underline mb-4">
          ← Back to search results
        </button>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-2xl font-bold">{selected.title}</h1>
            <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
              PUBLIC
            </span>
          </div>
          {selected.category && (
            <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 mb-3">
              {selected.category}
            </span>
          )}
          <div className="space-y-4 mt-4">
            <div>
              <h3 className="font-semibold text-gray-700">Summary</h3>
              <p className="text-gray-600">{selected.summary}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-700">Root Cause</h3>
              <p className="text-gray-600">{selected.rootCause}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-700">Solution</h3>
              <p className="text-gray-600">{selected.solution}</p>
            </div>
            {selected.tags && selected.tags.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-700">Tags</h3>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selected.tags.map((tag, i) => (
                    <span key={i} className="px-2 py-0.5 bg-gray-100 rounded text-sm text-gray-600">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="text-sm text-gray-400">
              Confidence: {Math.round((selected.confidence || 0) * 100)}%
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">🌍 Global Knowledge Search</h1>
      <p className="text-gray-500 mb-6">
        Search publicly shared knowledge across all teams. No workspace required.
      </p>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search knowledge... (e.g., 'how to handle null references')"
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {!searched && (
        <div className="text-center text-gray-400 py-12">
          <p className="text-lg">Enter a query to search the global knowledge base</p>
          <p className="text-sm mt-2">
            Results come from resolved capsules published by workspace admins
          </p>
        </div>
      )}

      {searched && results.length === 0 && !loading && (
        <div className="text-center text-gray-400 py-12">
          <p>No public knowledge items found for "{query}"</p>
        </div>
      )}

      <div className="space-y-3">
        {results.map((item) => (
          <div
            key={item.id}
            onClick={() => setSelected(item)}
            className="bg-white rounded-lg shadow p-4 hover:shadow-md cursor-pointer transition"
          >
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{item.title}</h3>
              {item.category && (
                <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                  {item.category}
                </span>
              )}
              <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">
                PUBLIC
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.summary}</p>
            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {item.tags.slice(0, 5).map((tag, i) => (
                  <span key={i} className="px-1.5 py-0.5 bg-gray-100 rounded text-xs text-gray-500">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

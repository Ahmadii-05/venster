import { useState, useEffect } from "react";
import { globalQAApi } from "../services/api";
import type { GlobalQuestion, GlobalAnswer } from "../types";
import { useAuth } from "../context/AuthContext";

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    OPEN: { bg: "rgba(56, 189, 248, 0.15)", text: "var(--color-status-open)" },
    ANSWERED: { bg: "rgba(34, 197, 94, 0.15)", text: "var(--color-status-resolved)" },
    CLOSED: { bg: "rgba(107, 114, 128, 0.15)", text: "var(--color-status-archived)" },
  };
  const c = colors[status] || colors.OPEN;
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: c.bg, color: c.text }}>
      {status}
    </span>
  );
}

export default function GlobalQAPage() {
  const { email: currentUserEmail } = useAuth();
  const [questions, setQuestions] = useState<GlobalQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAsk, setShowAsk] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<GlobalQuestion | null>(null);

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const data = await globalQAApi.listQuestions();
      setQuestions(data || []);
    } catch (e) {
      console.error("Failed to load questions", e);
    } finally {
      setLoading(false);
    }
  };

  if (selectedQuestion) {
    return (
      <QuestionDetail
        question={selectedQuestion}
        onBack={() => { setSelectedQuestion(null); loadQuestions(); }}
        currentUserEmail={currentUserEmail || undefined}
      />
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest font-mono mb-1" style={{ color: "var(--color-accent)" }}>
            COMMUNITY
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            Community Q&A
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            Ask questions, share knowledge — no workspace required.
          </p>
        </div>
        <button
          onClick={() => setShowAsk(true)}
          className="px-4 py-2 rounded-lg text-sm font-medium border transition-all hover:opacity-90"
          style={{ backgroundColor: "var(--color-accent)", borderColor: "var(--color-accent)", color: "#000" }}
        >
          Ask a Question
        </button>
      </div>

      {showAsk && (
        <AskQuestionForm
          onSubmitted={() => { setShowAsk(false); loadQuestions(); }}
          onCancel={() => setShowAsk(false)}
        />
      )}

      {loading ? (
        <div className="text-sm text-center py-12" style={{ color: "var(--color-text-muted)" }}>Loading...</div>
      ) : questions.length === 0 ? (
        <div
          className="rounded-xl p-12 border text-center transition-theme"
          style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}
        >
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            No questions yet. Be the first to ask!
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {questions.map((q) => (
            <button
              key={q.id}
              onClick={() => setSelectedQuestion(q)}
              className="w-full text-left rounded-xl p-4 border transition-all hover:opacity-90"
              style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}
            >
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{q.title}</h3>
                <StatusBadge status={q.status} />
                {q.reportCount > 0 && (
                  <span className="text-xs" style={{ color: "var(--color-warning)" }}>⚠ {q.reportCount} reports</span>
                )}
              </div>
              <p className="text-xs line-clamp-2 mt-1" style={{ color: "var(--color-text-secondary)" }}>{q.body}</p>
              <div className="flex items-center gap-3 mt-2 text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                <span>by {q.author?.name || "Unknown"}</span>
                <span>{new Date(q.createdAt).toLocaleDateString()}</span>
                {q.tags && q.tags.length > 0 && (
                  <div className="flex gap-1">
                    {q.tags.slice(0, 3).map((t, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--color-bg-input)", color: "var(--color-text-muted)" }}>{t}</span>
                    ))}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AskQuestionForm({ onSubmitted, onCancel }: { onSubmitted: () => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) return;
    setSubmitting(true);
    try {
      const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
      await globalQAApi.createQuestion(title, body, tags);
      onSubmitted();
    } catch (e) {
      console.error("Failed to create question", e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl p-6 border transition-theme space-y-3" style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
      <h2 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>Ask a Question</h2>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Question title"
        className="w-full rounded-lg px-3 py-2 text-sm border outline-none focus:ring-1 transition-theme"
        style={{ backgroundColor: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Describe your question in detail..."
        rows={5}
        className="w-full rounded-lg px-3 py-2 text-sm border outline-none focus:ring-1 transition-theme resize-none"
        style={{ backgroundColor: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
      />
      <input
        type="text"
        value={tagsInput}
        onChange={(e) => setTagsInput(e.target.value)}
        placeholder="Tags (comma-separated): java, spring, debugging"
        className="w-full rounded-lg px-3 py-2 text-sm border outline-none focus:ring-1 transition-theme"
        style={{ backgroundColor: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
      />
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={submitting || !title.trim() || !body.trim()}
          className="px-4 py-2 rounded-lg text-sm font-medium border transition-all hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: "var(--color-accent)", borderColor: "var(--color-accent)", color: "#000" }}
        >
          {submitting ? "Posting..." : "Post Question"}
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-medium border transition-all hover:opacity-80" style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function QuestionDetail({
  question,
  onBack,
  currentUserEmail,
}: {
  question: GlobalQuestion;
  onBack: () => void;
  currentUserEmail?: string;
}) {
  const [answers, setAnswers] = useState<GlobalAnswer[]>([]);
  const [newAnswer, setNewAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadAnswers();
  }, [question.id]);

  const loadAnswers = async () => {
    setLoading(true);
    try {
      const data = await globalQAApi.listAnswers(question.id);
      setAnswers(data || []);
    } catch (e) {
      console.error("Failed to load answers", e);
    } finally {
      setLoading(false);
    }
  };

  const handlePostAnswer = async () => {
    if (!newAnswer.trim()) return;
    setSubmitting(true);
    try {
      await globalQAApi.createAnswer(question.id, newAnswer);
      setNewAnswer("");
      loadAnswers();
    } catch (e) {
      console.error("Failed to post answer", e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccept = async (answerId: string) => {
    try {
      await globalQAApi.acceptAnswer(question.id, answerId);
      loadAnswers();
    } catch (e) {
      console.error("Failed to accept answer", e);
    }
  };

  const handleReport = async (type: "question" | "answer", id: string) => {
    try {
      if (type === "question") await globalQAApi.reportQuestion(id);
      else await globalQAApi.reportAnswer(id);
      if (type === "question") onBack();
      else loadAnswers();
    } catch (e: any) {
      alert(e?.message || "Already reported");
    }
  };

  const isAuthor = currentUserEmail === question.author?.email;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <button onClick={onBack} className="text-xs font-medium mb-4 transition-all hover:opacity-80" style={{ color: "var(--color-accent)" }}>
        ← Back to questions
      </button>

      <div className="rounded-xl p-6 border transition-theme" style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>{question.title}</h1>
          <StatusBadge status={question.status} />
        </div>
        <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--color-text-secondary)" }}>{question.body}</p>
        <div className="flex items-center gap-3 mt-3 text-[10px]" style={{ color: "var(--color-text-muted)" }}>
          <span>by {question.author?.name || "Unknown"}</span>
          <span>{new Date(question.createdAt).toLocaleDateString()}</span>
          {question.tags && (
            <div className="flex gap-1">
              {question.tags.map((t, i) => (
                <span key={i} className="px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--color-bg-input)", color: "var(--color-text-muted)" }}>{t}</span>
              ))}
            </div>
          )}
          {!isAuthor && (
            <button
              onClick={() => handleReport("question", question.id)}
              className="ml-auto text-xs transition-all hover:opacity-80"
              style={{ color: "var(--color-warning)" }}
            >
              ⚑ Report
            </button>
          )}
        </div>
      </div>

      <h2 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>{answers.length} Answer(s)</h2>

      {loading ? (
        <div className="text-sm text-center py-8" style={{ color: "var(--color-text-muted)" }}>Loading answers...</div>
      ) : (
        <div className="space-y-2 mb-6">
          {answers.map((a) => (
            <div
              key={a.id}
              className="rounded-xl p-4 border transition-theme"
              style={{
                backgroundColor: "var(--color-bg-card)",
                borderColor: a.accepted ? "var(--color-status-resolved)" : "var(--color-border)",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{a.author?.name || "Unknown"}</span>
                <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                  {new Date(a.createdAt).toLocaleDateString()}
                </span>
                {a.accepted && (
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ backgroundColor: "rgba(34,197,94,0.15)", color: "var(--color-status-resolved)" }}
                  >
                    ✓ Accepted
                  </span>
                )}
                {a.reportCount > 0 && (
                  <span className="text-xs" style={{ color: "var(--color-warning)" }}>⚠ {a.reportCount}</span>
                )}
              </div>
              <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--color-text-secondary)" }}>{a.body}</p>
              <div className="flex gap-3 mt-2 text-xs">
                {isAuthor && !a.accepted && question.status !== "ANSWERED" && (
                  <button
                    onClick={() => handleAccept(a.id)}
                    className="transition-all hover:opacity-80"
                    style={{ color: "var(--color-status-resolved)" }}
                  >
                    ✓ Accept this answer
                  </button>
                )}
                {!isAuthor && (
                  <button
                    onClick={() => handleReport("answer", a.id)}
                    className="transition-all hover:opacity-80"
                    style={{ color: "var(--color-warning)" }}
                  >
                    ⚑ Report
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl p-4 border transition-theme" style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
        <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>Your Answer</h3>
        <textarea
          value={newAnswer}
          onChange={(e) => setNewAnswer(e.target.value)}
          placeholder="Write your answer..."
          rows={4}
          className="w-full rounded-lg px-3 py-2 text-sm border outline-none focus:ring-1 transition-theme resize-none mb-3"
          style={{ backgroundColor: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
        />
        <button
          onClick={handlePostAnswer}
          disabled={submitting || !newAnswer.trim()}
          className="px-4 py-2 rounded-lg text-sm font-medium border transition-all hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: "var(--color-accent)", borderColor: "var(--color-accent)", color: "#000" }}
        >
          {submitting ? "Posting..." : "Post Answer"}
        </button>
      </div>
    </div>
  );
}

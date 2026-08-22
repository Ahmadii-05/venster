import { useState, useEffect } from "react";
import { globalQAApi } from "../services/api";
import type { GlobalQuestion, GlobalAnswer } from "../types";
import { useAuth } from "../context/AuthContext";

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
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">💬 Community Q&A</h1>
          <p className="text-gray-500 text-sm">
            Ask questions, share knowledge — no workspace required
          </p>
        </div>
        <button
          onClick={() => setShowAsk(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
        <p className="text-gray-400 text-center py-8">Loading...</p>
      ) : questions.length === 0 ? (
        <p className="text-gray-400 text-center py-8">No questions yet. Be the first to ask!</p>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <div
              key={q.id}
              onClick={() => setSelectedQuestion(q)}
              className="bg-white rounded-lg shadow p-4 hover:shadow-md cursor-pointer transition"
            >
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{q.title}</h3>
                <StatusBadge status={q.status} />
                {q.reportCount > 0 && (
                  <span className="text-xs text-orange-500">⚠ {q.reportCount} reports</span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{q.body}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                <span>by {q.author?.name || "Unknown"}</span>
                <span>{new Date(q.createdAt).toLocaleDateString()}</span>
                {q.tags && q.tags.length > 0 && (
                  <div className="flex gap-1">
                    {q.tags.slice(0, 3).map((t, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-gray-100 rounded">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    OPEN: "bg-blue-100 text-blue-800",
    ANSWERED: "bg-green-100 text-green-800",
    CLOSED: "bg-gray-100 text-gray-800",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] || colors.OPEN}`}>
      {status}
    </span>
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
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-lg font-semibold mb-4">Ask a Question</h2>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Question title"
        className="w-full px-3 py-2 border rounded mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Describe your question in detail..."
        rows={5}
        className="w-full px-3 py-2 border rounded mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        type="text"
        value={tagsInput}
        onChange={(e) => setTagsInput(e.target.value)}
        placeholder="Tags (comma-separated): java, spring, debugging"
        className="w-full px-3 py-2 border rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={submitting || !title.trim() || !body.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "Posting..." : "Post Question"}
        </button>
        <button onClick={onCancel} className="px-4 py-2 text-gray-600 hover:text-gray-800">
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
      if (type === "question") onBack(); // refresh
      else loadAnswers();
    } catch (e: any) {
      alert(e?.message || "Already reported");
    }
  };

  const isAuthor = currentUserEmail === question.author?.email;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <button onClick={onBack} className="text-blue-600 hover:underline mb-4">
        ← Back to questions
      </button>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-2xl font-bold">{question.title}</h1>
          <StatusBadge status={question.status} />
        </div>
        <p className="text-gray-600 whitespace-pre-wrap">{question.body}</p>
        <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
          <span>by {question.author?.name || "Unknown"}</span>
          <span>{new Date(question.createdAt).toLocaleDateString()}</span>
          {question.tags && (
            <div className="flex gap-1">
              {question.tags.map((t, i) => (
                <span key={i} className="px-1.5 py-0.5 bg-gray-100 rounded">{t}</span>
              ))}
            </div>
          )}
          {!isAuthor && (
            <button
              onClick={() => handleReport("question", question.id)}
              className="text-orange-500 hover:text-orange-700 ml-auto"
            >
              ⚑ Report
            </button>
          )}
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-3">{answers.length} Answer(s)</h2>

      {loading ? (
        <p className="text-gray-400">Loading answers...</p>
      ) : (
        <div className="space-y-3 mb-6">
          {answers.map((a) => (
            <div
              key={a.id}
              className={`bg-white rounded-lg shadow p-4 ${a.accepted ? "ring-2 ring-green-500" : ""}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium">{a.author?.name || "Unknown"}</span>
                <span className="text-xs text-gray-400">
                  {new Date(a.createdAt).toLocaleDateString()}
                </span>
                {a.accepted && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium">
                    ✓ Accepted
                  </span>
                )}
                {a.reportCount > 0 && (
                  <span className="text-xs text-orange-500">⚠ {a.reportCount}</span>
                )}
              </div>
              <p className="text-gray-600 whitespace-pre-wrap">{a.body}</p>
              <div className="flex gap-3 mt-2 text-xs">
                {isAuthor && !a.accepted && question.status !== "ANSWERED" && (
                  <button
                    onClick={() => handleAccept(a.id)}
                    className="text-green-600 hover:text-green-800"
                  >
                    ✓ Accept this answer
                  </button>
                )}
                {!isAuthor && (
                  <button
                    onClick={() => handleReport("answer", a.id)}
                    className="text-orange-500 hover:text-orange-700"
                  >
                    ⚑ Report
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold mb-2">Your Answer</h3>
        <textarea
          value={newAnswer}
          onChange={(e) => setNewAnswer(e.target.value)}
          placeholder="Write your answer..."
          rows={4}
          className="w-full px-3 py-2 border rounded mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handlePostAnswer}
          disabled={submitting || !newAnswer.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "Posting..." : "Post Answer"}
        </button>
      </div>
    </div>
  );
}

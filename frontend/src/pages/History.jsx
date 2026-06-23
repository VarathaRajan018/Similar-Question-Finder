/**
 * pages/History.jsx — Protected page: user's question history with tag filters
 */

import { useState, useEffect, useCallback } from "react";
import { questionApi } from "../api/client";
import { tagColor } from "../theme";

const TAGS = [
  "All",
  "Biology",
  "Physics",
  "Chemistry",
  "Mathematics",
  "Computer Science",
  "History",
  "English",
];

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function History() {
  const [questions, setQuestions] = useState([]);
  const [activeTag, setActiveTag] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchHistory = useCallback(async (tag) => {
    setLoading(true);
    setError("");
    try {
      const data = await questionApi.history(tag === "All" ? null : tag);
      setQuestions(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(activeTag);
  }, [activeTag, fetchHistory]);

  return (
    <div className="page history-page">
      <h1>My Question History</h1>
      <p className="page-sub">
        All your past questions, newest first. Filter by subject tag.
      </p>

      {/* Tag filter buttons */}
      <div className="tag-filters" role="group" aria-label="Filter by topic">
        {TAGS.map((tag) => {
          const isActive = activeTag === tag;
          const isSubject = tag !== "All";
          const { bar } = isSubject ? tagColor(tag) : { bar: null };
          const activeStyle =
            isActive && isSubject
              ? { backgroundColor: bar, borderColor: bar }
              : {};
          return (
            <button
              key={tag}
              id={`filter-${tag.toLowerCase().replace(/\s+/g, "-")}`}
              className={`tag-filter-btn ${isActive ? "active" : ""}`}
              style={activeStyle}
              onClick={() => setActiveTag(tag)}
            >
              {tag}
            </button>
          );
        })}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading-state">Loading…</div>
      ) : questions.length === 0 ? (
        <div className="empty-state">
          <p>No questions found{activeTag !== "All" ? ` for "${activeTag}"` : ""}.</p>
          {activeTag === "All" && (
            <p className="empty-hint">
              Go to <a href="/ask">Ask a Question</a> to get started!
            </p>
          )}
        </div>
      ) : (
        <div className="history-list">
          {questions.map((q) => (
            <div key={q.question_id} className="history-card">
              <div className="history-card-header">
                <span
                  className="history-tag"
                  style={{
                    backgroundColor: tagColor(q.tag).bg,
                    color: tagColor(q.tag).text,
                  }}
                >
                  {q.tag}
                </span>
                <span className="history-date">{formatDate(q.created_at)}</span>
              </div>
              <p className="history-text">{q.text}</p>
              <div className="history-meta">
                <span className="history-similar-count">
                  {q.similar_count} similar question{q.similar_count !== 1 ? "s" : ""} found
                </span>
                <span className="history-confidence">
                  Tag confidence: {Math.round(q.tag_confidence * 100)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

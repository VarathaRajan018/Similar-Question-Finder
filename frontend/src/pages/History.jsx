/**
 * pages/History.jsx — User's question history with tag filters + live search
 *
 * Changes from previous version:
 * - Added instant search bar (filters by question text AND tag, client-side)
 * - Search positioned above topic filter pills
 * - Search icon embedded inside the input
 * - Improved card design: rounded corners, hover lift, green badges
 * - "No matching questions found" message when search has no results
 * - All API calls / auth logic unchanged
 */

import { useState, useEffect, useCallback, useMemo } from "react";
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

/* ── Search icon (inline SVG — no external assets) ─────────── */
function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M10.5 10.5L14 14"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function History() {
  const [questions, setQuestions]   = useState([]);
  const [activeTag, setActiveTag]   = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");

  /* Fetch from API whenever the tag filter changes */
  const fetchHistory = useCallback(async (tag) => {
    setLoading(true);
    setError("");
    setSearchQuery(""); // reset search on tag switch
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

  /* Client-side search — filters by text and tag, no extra API call */
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return questions;
    return questions.filter(
      (item) =>
        item.text.toLowerCase().includes(q) ||
        item.tag.toLowerCase().includes(q)
    );
  }, [questions, searchQuery]);

  return (
    <div className="page history-page">
      <h1>My Question History</h1>
      <p className="page-sub">
        All your past questions, newest first. Filter by subject or search
        by keyword.
      </p>

      {/* ── Search bar ──────────────────────────────────────── */}
      <div className="history-search-wrapper">
        <span className="history-search-icon">
          <SearchIcon />
        </span>
        <input
          id="history-search"
          type="search"
          className="history-search-input"
          placeholder="Search your previously asked questions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search questions"
        />
      </div>

      {/* ── Tag filter pills ─────────────────────────────────── */}
      <div className="tag-filters" role="group" aria-label="Filter by topic">
        {TAGS.map((tag) => {
          const isActive  = activeTag === tag;
          const isSubject = tag !== "All";
          const { bar }   = isSubject ? tagColor(tag) : { bar: null };
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

      {/* ── Content area ─────────────────────────────────────── */}
      {loading ? (
        <div className="loading-state">Loading…</div>
      ) : questions.length === 0 ? (
        /* No questions at all for this tag filter */
        <div className="empty-state">
          <p>
            No questions found
            {activeTag !== "All" ? ` for "${activeTag}"` : ""}.
          </p>
          {activeTag === "All" && (
            <p className="empty-hint">
              Go to <a href="/ask">Ask a Question</a> to get started!
            </p>
          )}
        </div>
      ) : filtered.length === 0 ? (
        /* Questions exist but search has no matches */
        <div className="history-no-results">
          <span>🔍</span>
          <p style={{ marginTop: "0.5rem" }}>No matching questions found</p>
          <p style={{ fontSize: "0.83rem", marginTop: "0.25rem" }}>
            Try a different keyword or clear the search
          </p>
        </div>
      ) : (
        <div className="history-list">
          {filtered.map((q) => (
            <div key={q.question_id} className="history-card">
              {/* Header row: tag badge + date */}
              <div className="history-card-header">
                <span
                  className="history-tag"
                  style={{
                    backgroundColor: tagColor(q.tag).bg,
                    color:           tagColor(q.tag).text,
                  }}
                >
                  {q.tag}
                </span>
                <span className="history-date">{formatDate(q.created_at)}</span>
              </div>

              {/* Question text */}
              <p className="history-text">{q.text}</p>

              {/* Footer meta */}
              <div className="history-meta">
                <span>
                  {q.similar_count} similar question
                  {q.similar_count !== 1 ? "s" : ""} found
                </span>
                <span>
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

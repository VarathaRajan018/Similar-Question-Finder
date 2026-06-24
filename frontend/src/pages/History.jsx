/**
 * pages/History.jsx — Question history with search, tag filters, premium card UI
 *
 * State logic, API calls, and filtering are identical to previous version.
 * Only the JSX structure and CSS classes have changed.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { questionApi } from "../api/client";
import { tagColor } from "../theme";
import "./History.css";

/* ─── Constants ─────────────────────────────────────────────── */

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
    day:    "numeric",
    month:  "short",
    year:   "numeric",
    hour:   "2-digit",
    minute: "2-digit",
  });
}

/* ─── Inline SVG icons (no external assets) ─────────────────── */

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function SimilarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ConfidenceIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Sub-components ─────────────────────────────────────────── */

function LoadingState() {
  return (
    <div className="history-loading-state">
      <div className="history-loading-dots">
        <span /><span /><span />
      </div>
      Loading your questions…
    </div>
  );
}

function EmptyState({ type, activeTag }) {
  if (type === "no-match") {
    return (
      <div className="history-empty-state">
        <span className="history-empty-icon">🔍</span>
        <p className="history-empty-title">No questions found matching your criteria.</p>
        <p className="history-empty-sub">Try changing filters or adjusting your search keyword.</p>
      </div>
    );
  }

  /* type === "no-data" */
  return (
    <div className="history-empty-state">
      <span className="history-empty-icon">📚</span>
      <p className="history-empty-title">
        {activeTag !== "All"
          ? `No ${activeTag} questions yet.`
          : "No questions asked yet."}
      </p>
      <p className="history-empty-sub">
        {activeTag !== "All"
          ? "Try selecting a different subject filter."
          : "Try changing filters or ask a new question."}
      </p>
      {activeTag === "All" && (
        <a href="/ask" className="history-empty-link">Ask Your First Question →</a>
      )}
    </div>
  );
}

function QuestionCard({ q }) {
  const { bg, text: textColor } = tagColor(q.tag);
  return (
    <div className="history-qcard">
      {/* Top row: tag + date */}
      <div className="history-qcard-top">
        <span
          className="history-qcard-tag"
          style={{ backgroundColor: bg, color: textColor }}
        >
          {q.tag}
        </span>
        <span className="history-qcard-date">{formatDate(q.created_at)}</span>
      </div>

      {/* Question text */}
      <p className="history-qcard-text">{q.text}</p>

      {/* Footer: similar count + confidence */}
      <div className="history-qcard-footer">
        <span className="history-qcard-stat">
          <SimilarIcon />
          <strong>{q.similar_count}</strong>
          {" "}similar question{q.similar_count !== 1 ? "s" : ""} found
        </span>
        <span className="history-qcard-stat">
          <ConfidenceIcon />
          Tag confidence: <strong>{Math.round(q.tag_confidence * 100)}%</strong>
        </span>
      </div>
    </div>
  );
}

/* ─── Main page component ────────────────────────────────────── */

export default function History() {
  const [questions,   setQuestions]   = useState([]);
  const [activeTag,   setActiveTag]   = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");

  /* Fetch from API whenever the tag filter changes — unchanged logic */
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

  /* Client-side search — filters by text AND tag, no extra API call */
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
    <div className="history-page">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="history-header">
        <h1 className="history-title">Question History</h1>
        <p className="history-subtitle">
          Review, search, and filter your previously asked study questions.
        </p>
      </div>

      {/* ── Controls row: search + filter pills ─────────────── */}
      <div className="history-controls">

        {/* Search bar — flex: 1, grows to fill ~65% */}
        <div className="history-search-wrapper">
          <span className="history-search-icon" aria-hidden="true">
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

        {/* Filter section — shrinks to ~35% on desktop */}
        <div className="history-filters-section">
          <span className="history-filter-label">
            <FilterIcon /> Filter by topic
          </span>
          <div className="history-tag-filters" role="group" aria-label="Filter by topic">
            {TAGS.map((tag) => {
              const isActive  = activeTag === tag;
              const isSubject = tag !== "All";
              const { bar }   = isSubject ? tagColor(tag) : { bar: null };
              /* Subject-specific colour only when active; otherwise forest green */
              const activeStyle =
                isActive && isSubject
                  ? { backgroundColor: bar, borderColor: bar }
                  : {};
              return (
                <button
                  key={tag}
                  id={`filter-${tag.toLowerCase().replace(/\s+/g, "-")}`}
                  className={`history-filter-btn${isActive ? " hfb-active" : ""}`}
                  style={activeStyle}
                  onClick={() => setActiveTag(tag)}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── API error ────────────────────────────────────────── */}
      {error && <div className="alert alert-error">{error}</div>}

      {/* ── Content ──────────────────────────────────────────── */}
      {loading ? (
        <LoadingState />
      ) : questions.length === 0 ? (
        <EmptyState type="no-data" activeTag={activeTag} />
      ) : filtered.length === 0 ? (
        <EmptyState type="no-match" activeTag={activeTag} />
      ) : (
        <div className="history-card-list">
          {filtered.map((q) => (
            <QuestionCard key={q.question_id} q={q} />
          ))}
        </div>
      )}

    </div>
  );
}

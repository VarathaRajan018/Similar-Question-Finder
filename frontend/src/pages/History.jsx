/**
 * pages/History.jsx — Question History with modern premium UI
 *
 * Functionality (unchanged):
 *   - Live search filtering by question text and tag (client-side, no extra API)
 *   - Topic filter via pill buttons + dropdown select (both sync activeTag state)
 *   - Displays: question text, tag, similar count, tag confidence, date
 *   - Search resets when topic filter changes
 *
 * UI changes:
 *   - New header with title, subtitle, divider
 *   - Controls row: search input (65%) + topic dropdown (35%)
 *   - Modern pill buttons below controls
 *   - 20px radius cards with hover lift
 *   - Meta info shown as chips in card footer
 *   - Animated loading dots
 *   - Improved empty / no-results states
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { questionApi } from "../api/client";
import { tagColor } from "../theme";
import "./History.css";

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

/* ── Inline SVG icons ──────────────────────────────────────── */

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function SimilarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ConfidenceIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

/* ── Main component ────────────────────────────────────────── */

export default function History() {
  const [questions, setQuestions]     = useState([]);
  const [activeTag, setActiveTag]     = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");

  /* Fetch from API whenever the topic filter changes */
  const fetchHistory = useCallback(async (tag) => {
    setLoading(true);
    setError("");
    setSearchQuery("");
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

  /* Client-side search — no extra API call */
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return questions;
    return questions.filter(
      (item) =>
        item.text.toLowerCase().includes(q) ||
        item.tag.toLowerCase().includes(q)
    );
  }, [questions, searchQuery]);

  /* Sync dropdown and pills — both control the same state */
  function handleTagChange(tag) {
    setActiveTag(tag);
  }

  return (
    <div className="history-page">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="history-header">
        <h1 className="history-title">Question History</h1>
        <p className="history-subtitle">
          Review, search, and filter your previously asked study questions.
        </p>
        <hr className="history-divider" />
      </div>

      {/* ── Controls: search (65%) + topic dropdown (35%) ─── */}
      <div className="history-controls">

        {/* Search input */}
        <div className="history-search-section">
          <span className="history-search-icon-wrap" aria-hidden="true">
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

        {/* Topic dropdown */}
        <div className="history-filter-section">
          <span className="history-filter-icon-wrap" aria-hidden="true">
            <FilterIcon />
          </span>
          <select
            id="history-topic-select"
            className="history-topic-select"
            value={activeTag}
            onChange={(e) => handleTagChange(e.target.value)}
            aria-label="Filter by topic"
          >
            {TAGS.map((tag) => (
              <option key={tag} value={tag}>{tag === "All" ? "All Topics" : tag}</option>
            ))}
          </select>
          <span className="history-select-caret" aria-hidden="true">
            <ChevronDownIcon />
          </span>
        </div>
      </div>

      {/* ── Modern pill topic filters ────────────────────── */}
      <div className="history-pills" role="group" aria-label="Filter by topic">
        {TAGS.map((tag) => (
          <button
            key={tag}
            id={`pill-${tag.toLowerCase().replace(/\s+/g, "-")}`}
            className={`history-pill${activeTag === tag ? " active" : ""}`}
            onClick={() => handleTagChange(tag)}
          >
            {tag}
          </button>
        ))}
      </div>

      {error && <div className="history-error">{error}</div>}

      {/* ── Content area ────────────────────────────────── */}
      {loading ? (
        <div className="history-loading">
          <div className="history-loading-dots">
            <span /><span /><span />
          </div>
          <p>Loading your questions…</p>
        </div>

      ) : questions.length === 0 ? (
        /* No questions for this topic at all */
        <div className="history-empty">
          <span className="history-empty-icon">📚</span>
          <p className="history-empty-title">No questions found matching your criteria.</p>
          <p className="history-empty-sub">
            {activeTag !== "All"
              ? `No ${activeTag} questions in your history. Try a different topic or ask one!`
              : "Try changing filters or ask a new question to get started."}
          </p>
          {activeTag === "All" && (
            <a href="/ask" className="history-empty-link">
              ✦ Ask a Question
            </a>
          )}
        </div>

      ) : filtered.length === 0 ? (
        /* Questions exist but search found nothing */
        <div className="history-empty">
          <span className="history-empty-icon">🔍</span>
          <p className="history-empty-title">No questions found matching your criteria.</p>
          <p className="history-empty-sub">
            Try changing filters or ask a new question.
          </p>
        </div>

      ) : (
        <>
          {/* Results count */}
          <p className="history-results-meta">
            {filtered.length} question{filtered.length !== 1 ? "s" : ""}
            {searchQuery ? ` matching "${searchQuery}"` : activeTag !== "All" ? ` in ${activeTag}` : ""}
          </p>

          <div className="history-list">
            {filtered.map((q) => (
              <div key={q.question_id} className="history-card">

                {/* Card header: subject badge + date */}
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

                {/* Footer chips: similar count + confidence */}
                <div className="history-meta">
                  <span className="history-meta-chip">
                    <SimilarIcon />
                    {q.similar_count} similar question{q.similar_count !== 1 ? "s" : ""} found
                  </span>
                  <span className="history-meta-chip">
                    <ConfidenceIcon />
                    Tag confidence: {Math.round(q.tag_confidence * 100)}%
                  </span>
                </div>

              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

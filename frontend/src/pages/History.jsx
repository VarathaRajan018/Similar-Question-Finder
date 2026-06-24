/**
 * pages/History.jsx — Question history, redesigned
 *
 * Functionality unchanged:
 *   - Client-side search (text + tag)
 *   - Tag filter (now a select dropdown, same API call)
 *   - Similar count, tag confidence, date — all preserved
 *
 * UI changes:
 *   - Header: "Question History" + subtitle + divider
 *   - Controls row: search (65%) + subject dropdown (35%) in one line
 *   - Cards: 20px radius, stronger shadow, hover lift -3px
 *   - Topic badge: light-green pill
 *   - Empty / no-results state: icon + two-line message
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
  "Geography",
  "Economics",
  "Environmental Science",
  "General Knowledge",
  "Other",
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
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EmptyIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ color: "#95D5B2" }}>
      <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11 8v6M8 11h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function QuestionIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ color: "#95D5B2" }}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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

  /* Client-side instant search — no extra API call */
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
    <div className="hx-page">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="hx-header">
        <h1 className="hx-title">Question History</h1>
        <p className="hx-subtitle">
          Review, search, and filter your previously asked study questions.
        </p>
        <div className="hx-divider" />
      </div>

      {/* ── Controls row: search (65%) + subject dropdown (35%) ── */}
      <div className="hx-controls">
        {/* Search */}
        <div className="hx-search-box">
          <span className="hx-search-icon"><SearchIcon /></span>
          <input
            id="history-search"
            type="search"
            className="hx-search-input"
            placeholder="Search your previously asked questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search questions"
          />
        </div>

        {/* Topic dropdown */}
        <div className="hx-filter-box">
          <span className="hx-filter-icon"><FilterIcon /></span>
          <select
            id="history-topic-filter"
            className="hx-filter-select"
            value={activeTag}
            onChange={(e) => setActiveTag(e.target.value)}
            aria-label="Filter by topic"
          >
            {TAGS.map((tag) => (
              <option key={tag} value={tag}>{tag === "All" ? "All Topics" : tag}</option>
            ))}
          </select>
          <span className="hx-select-arrow">▾</span>
        </div>
      </div>

      {/* Active filter pill (shows below controls when a specific tag is active) */}
      {activeTag !== "All" && (
        <div className="hx-active-filter">
          <span
            className="hx-active-pill"
            style={{
              backgroundColor: tagColor(activeTag).bg,
              color: tagColor(activeTag).text,
            }}
          >
            {activeTag}
            <button
              className="hx-clear-tag"
              onClick={() => setActiveTag("All")}
              aria-label="Clear topic filter"
            >
              ×
            </button>
          </span>
          <span className="hx-result-count">
            {filtered.length} question{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      {/* ── Content ─────────────────────────────────────────── */}
      {loading ? (
        <div className="hx-loading">
          <div className="hx-spinner" />
          <p>Loading your questions…</p>
        </div>
      ) : questions.length === 0 ? (
        /* No questions exist at all */
        <div className="hx-empty">
          <QuestionIcon />
          <p className="hx-empty-title">No questions found matching your criteria.</p>
          <p className="hx-empty-sub">
            {activeTag !== "All"
              ? `No ${activeTag} questions yet. Try a different subject.`
              : <>Try changing filters or <a href="/ask">ask a new question</a>.</>
            }
          </p>
        </div>
      ) : filtered.length === 0 ? (
        /* Questions exist but search returns nothing */
        <div className="hx-empty">
          <EmptyIcon />
          <p className="hx-empty-title">No questions found matching your criteria.</p>
          <p className="hx-empty-sub">Try changing filters or ask a new question.</p>
        </div>
      ) : (
        <div className="hx-list">
          {filtered.map((q) => (
            <div key={q.question_id} className="hx-card">

              {/* Card top: badge + date */}
              <div className="hx-card-top">
                <span
                  className="hx-tag-badge"
                  style={{
                    backgroundColor: tagColor(q.tag).bg,
                    color:           tagColor(q.tag).text,
                  }}
                  title={
                    q.tag === "Other"
                      ? "No subject exceeded the confidence threshold."
                      : undefined
                  }
                >
                  {q.tag}
                </span>
                <span className="hx-card-date">{formatDate(q.created_at)}</span>
              </div>

              {/* Question text */}
              <p className="hx-card-text">{q.text}</p>

              {/* Card footer: similar count + confidence */}
              <div className="hx-card-footer">
                <span className="hx-meta-item">
                  <span className="hx-meta-dot" style={{ background: tagColor(q.tag).bar }} />
                  {q.similar_count} similar question{q.similar_count !== 1 ? "s" : ""} found
                </span>
                <span className="hx-meta-item">
                  Tag confidence: <strong>{Math.round(q.tag_confidence * 100)}%</strong>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

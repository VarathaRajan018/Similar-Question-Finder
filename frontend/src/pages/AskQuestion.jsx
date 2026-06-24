/**
 * pages/AskQuestion.jsx — Chat-style question interface (Claude / ChatGPT layout)
 * Functionality is identical to the original; only the layout and UX are new.
 */

import { useState, useRef, useEffect } from "react";
import { questionApi } from "../api/client";
import { tagColor } from "../theme";

/* ── Sub-components ─────────────────────────────────────────── */

function TagBadge({ tag, confidence }) {
  const { bg, text } = tagColor(tag);
  const isOther = tag === "Other";
  return (
    <span
      className="tag-badge"
      style={{ backgroundColor: bg, color: text }}
      title={isOther ? "No subject exceeded the confidence threshold." : undefined}
    >
      {isOther ? "Auto-tagged as: Other" : `Auto-tagged as: ${tag}`}
      {confidence !== undefined && (
        <span className="tag-confidence"> {Math.round(confidence * 100)}%</span>
      )}
    </span>
  );
}


function SimilarCard({ question }) {
  const pct = Math.round(question.similarity * 100);
  const { bar } = tagColor(question.tag);
  return (
    <div className="similar-card">
      <div className="similar-header">
        <TagBadge tag={question.tag} />
        <span className="similarity-score" title="Cosine similarity">
          {pct}% match
        </span>
      </div>
      <p className="similar-text">{question.text}</p>
      <div className="similarity-bar">
        <div
          className="similarity-fill"
          style={{ width: `${pct}%`, backgroundColor: bar }}
        />
      </div>
    </div>
  );
}

const EXAMPLE_QUESTIONS = [
  "How does photosynthesis work?",
  "What is Newton's second law?",
  "Explain the Pythagorean theorem",
  "What causes the seasons to change?",
];

function EmptyState({ onChipClick }) {
  return (
    <div className="chat-empty-state">
      <div className="chat-empty-icon">🎓</div>
      <h2 className="chat-empty-title">Ask a Study Question</h2>
      <p className="chat-empty-sub">
        Type any question below — we'll instantly find semantically similar past
        questions and auto-assign a subject tag using local AI.
      </p>
      <div className="chat-empty-chips">
        {EXAMPLE_QUESTIONS.map((q) => (
          <button key={q} className="chat-chip" onClick={() => onChipClick(q)}>
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="chat-thinking">
      <div className="chat-response-avatar" aria-hidden="true">🎓</div>
      <div className="chat-thinking-body">
        <div className="chat-thinking-dots">
          <span /><span /><span />
        </div>
        <span className="chat-thinking-text">Analysing your question…</span>
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────── */

export default function AskQuestion() {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  /* Scroll to bottom when result or loading state changes */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [result, loading]);

  /* Auto-resize textarea up to 180px */
  function resizeTextarea() {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 180) + "px";
  }

  function handleChange(e) {
    setText(e.target.value);
    resizeTextarea();
  }

  /* Enter = submit, Shift+Enter = newline */
  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!loading && text.trim().length >= 5) handleSubmit(e);
    }
  }

  /* Pre-fill input from an example chip */
  function handleChipClick(q) {
    setText(q);
    textareaRef.current?.focus();
    setTimeout(resizeTextarea, 0);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const submitted = text.trim();
    if (!submitted) return;

    setError("");
    setResult(null);
    setLoading(true);
    setText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      const res = await questionApi.submit(submitted);
      setResult(res);
    } catch (err) {
      setError(err.message);
      setText(submitted); // restore text on failure
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = !loading && text.trim().length >= 5;
  const showEmpty = !result && !error && !loading;

  return (
    <div className="chat-page">

      {/* ── Scrollable messages area ──────────────────────────── */}
      <div className="chat-messages-area">

        {showEmpty && <EmptyState onChipClick={handleChipClick} />}

        {loading && <ThinkingIndicator />}

        {error && (
          <div className="chat-messages-inner">
            <div className="alert alert-error">{error}</div>
          </div>
        )}

        {result && (
          <div className="chat-messages-inner">

            {/* User message bubble */}
            <div className="chat-user-turn">
              <div className="chat-user-bubble">{result.text}</div>
            </div>

            {/* AI response */}
            <div className="chat-response-turn">
              <div className="chat-response-avatar" aria-hidden="true">🎓</div>
              <div className="chat-response-body">

                {/* Tag result row */}
                <div className="chat-tag-row">
                  <span className="chat-tag-label">Auto-tagged as</span>
                  <TagBadge tag={result.tag} confidence={result.tag_confidence} />
                  <span className="chat-saved-note">· Saved to history</span>
                </div>

                {/* Similar questions */}
                <p className="chat-similar-heading">
                  {result.similar_questions.length === 0
                    ? "No similar questions yet — you're the first to ask this!"
                    : `${result.similar_questions.length} Similar Past Question${result.similar_questions.length !== 1 ? "s" : ""} Found`}
                </p>

                {result.similar_questions.length > 0 && (
                  <div className="similar-list">
                    {result.similar_questions.map((q) => (
                      <SimilarCard key={q.question_id} question={q} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Sticky input bar ──────────────────────────────────── */}
      <div className="chat-input-bar">
        <div className="chat-input-inner">
          <form onSubmit={handleSubmit}>
            <div className="chat-input-wrapper">
              <textarea
                ref={textareaRef}
                id="question-input"
                className="chat-textarea"
                placeholder="Ask a study question…"
                value={text}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                rows={1}
                required
                minLength={5}
                maxLength={2000}
              />
              <button
                id="submit-question-btn"
                type="submit"
                className={`chat-send-btn${canSubmit ? " ready" : ""}`}
                disabled={!canSubmit}
                title="Send (Enter)"
                aria-label="Send question"
              >
                {/* Upward arrow icon */}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="M8 13V3M8 3L3.5 7.5M8 3L12.5 7.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            <div className="chat-input-meta">
              <span>{text.length} / 2000</span>
              <span>Enter to send · Shift + Enter for new line</span>
            </div>
          </form>
        </div>
      </div>

    </div>
  );
}

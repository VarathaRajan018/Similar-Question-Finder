/**
 * pages/AskQuestion.jsx — Protected page: submit a question, see results
 */

import { useState } from "react";
import { questionApi } from "../api/client";
import { tagColor } from "../theme";

function TagBadge({ tag, confidence }) {
  const { bg, text } = tagColor(tag);
  return (
    <span className="tag-badge" style={{ backgroundColor: bg, color: text }}>
      {tag}
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
        <div className="similarity-fill" style={{ width: `${pct}%`, backgroundColor: bar }} />
      </div>
    </div>
  );
}

export default function AskQuestion() {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const res = await questionApi.submit(text.trim());
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page ask-page">
      <h1>Ask a Study Question</h1>
      <p className="page-sub">
        Type your question below. We'll find semantically similar past questions
        and automatically assign a subject tag.
      </p>

      <form onSubmit={handleSubmit} className="ask-form">
        <textarea
          id="question-input"
          className="question-textarea"
          placeholder="e.g. Why does photosynthesis need light?"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          required
          minLength={5}
          maxLength={2000}
        />
        <div className="ask-footer">
          <span className="char-count">{text.length}/2000</span>
          <button
            id="submit-question-btn"
            type="submit"
            className="btn btn-primary"
            disabled={loading || text.trim().length < 5}
          >
            {loading ? "Analysing…" : "Find Similar Questions"}
          </button>
        </div>
      </form>

      {error && <div className="alert alert-error">{error}</div>}

      {result && (
        <div className="result-section">
          <div className="result-header">
            <div>
              <h2 className="result-question">"{result.text}"</h2>
              <p className="result-meta">Saved to your history</p>
            </div>
            <div className="result-tag-area">
              <span className="result-tag-label">Auto-tagged as</span>
              <TagBadge tag={result.tag} confidence={result.tag_confidence} />
            </div>
          </div>

          <h3 className="similar-heading">
            Similar Past Questions
            {result.similar_questions.length === 0 && (
              <span className="no-similar"> — none yet (you're first!)</span>
            )}
          </h3>

          {result.similar_questions.length > 0 && (
            <div className="similar-list">
              {result.similar_questions.map((q) => (
                <SimilarCard key={q.question_id} question={q} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

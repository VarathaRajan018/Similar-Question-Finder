/**
 * pages/Home.jsx — Landing page
 */

import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="page home-page">
      <div className="hero">
        <h1>Similar Question Finder</h1>
        <p className="hero-sub">
          Type any study question. We'll instantly find semantically similar past
          questions and auto-tag your subject — powered by local AI embeddings.
        </p>
        <div className="hero-actions">
          {isAuthenticated ? (
            <>
              <Link to="/ask" className="btn btn-primary">Ask a Question</Link>
              <Link to="/history" className="btn btn-secondary">My History</Link>
            </>
          ) : (
            <>
              <Link to="/signup" className="btn btn-primary">Get Started</Link>
              <Link to="/login" className="btn btn-secondary">Sign In</Link>
            </>
          )}
        </div>
      </div>

      <div className="features">
        <div className="feature-card">
          <span className="feature-icon">🧠</span>
          <h3>Semantic Search</h3>
          <p>
            Finds similar questions by meaning, not keywords — using the
            all-MiniLM-L6-v2 embedding model running locally.
          </p>
        </div>
        <div className="feature-card">
          <span className="feature-icon">🏷️</span>
          <h3>Zero-Shot Tagging</h3>
          <p>
            Automatically classifies your question into Biology, Physics,
            Mathematics, and more — without any hardcoded rules.
          </p>
        </div>
        <div className="feature-card">
          <span className="feature-icon">📚</span>
          <h3>Question History</h3>
          <p>
            All your past questions saved and filterable by subject tag so you
            can revisit and study by topic.
          </p>
        </div>
      </div>
    </div>
  );
}

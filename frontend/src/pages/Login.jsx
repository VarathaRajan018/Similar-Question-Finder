/**
 * pages/Login.jsx — Sign In page with password visibility toggle
 *
 * Changes from previous version:
 * - Password field uses <PasswordInput> (eye toggle + lock icon)
 * - Client-side validation: min 6 characters shown inline
 * - Modern auth card layout with improved spacing
 * - All auth API calls unchanged
 */

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../api/client";
import { useAuth } from "../context/AuthContext";
import PasswordInput from "../components/PasswordInput";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm]       = useState({ email: "", password: "" });
  const [error, setError]     = useState("");
  const [fieldError, setFieldError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setFieldError(""); // clear inline errors on change
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setFieldError("");

    // Client-side validation
    if (form.password.length < 6) {
      setFieldError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.login(form.email, form.password);
      login(res);
      navigate("/ask");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page auth-page">
      <div className="auth-card">
        {/* Header */}
        <div className="auth-header">
          <div className="auth-logo-icon">🎓</div>
          <h1>Welcome back</h1>
          <p className="auth-sub">Sign in to continue to QuestionFinder</p>
        </div>

        {/* Server error */}
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {/* Email */}
          <div className="form-group">
            <label htmlFor="login-email">Email address</label>
            <div className="input-with-icon">
              <span className="input-icon-left" aria-hidden="true">
                <EmailIcon />
              </span>
              <input
                id="login-email"
                name="email"
                type="email"
                className="input-has-left-icon"
                placeholder="jane@example.com"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password */}
          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <PasswordInput
              id="login-password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Your password"
              required
              autoComplete="current-password"
            />
            {fieldError && (
              <p className="field-error">{fieldError}</p>
            )}
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            className="btn btn-primary btn-full auth-submit-btn"
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account?{" "}
          <Link to="/signup">Create one</Link>
        </p>
      </div>
    </div>
  );
}

/* ── Email icon (inline SVG) ─────────────────────────────── */
function EmailIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

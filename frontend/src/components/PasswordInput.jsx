/**
 * components/PasswordInput.jsx
 *
 * Reusable password field with:
 *   - Right eye / eye-off toggle (inline SVG)
 *   - Independent visibility state per instance
 *   - Consistent height (58px), border-radius (14px), green focus ring
 *
 * Props:
 *   id          {string}   — for the <label htmlFor>
 *   name        {string}   — form field name
 *   value       {string}   — controlled value
 *   onChange    {function} — change handler
 *   placeholder {string}   — placeholder text
 *   required    {bool}
 *   minLength   {number}
 */

import { useState } from "react";

/* ── Eye / EyeOff icons (inline SVG) ─────────────────────── */

function EyeIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

/* ── Component ────────────────────────────────────────────── */

export default function PasswordInput({
  id,
  name,
  value,
  onChange,
  placeholder = "Enter password",
  required = false,
  minLength,
  autoComplete,
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="pw-field">
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        className="pw-input"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
      />

      {/* Right eye toggle */}
      <button
        type="button"
        className="pw-eye-btn"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        tabIndex={0}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

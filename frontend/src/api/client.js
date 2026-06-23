/**
 * api/client.js — Central API client
 *
 * ALL backend calls go through this module.  No scattered fetch() calls in components.
 * Automatically attaches the Bearer token from localStorage on every request.
 */

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/** Read the stored JWT from localStorage. */
function getToken() {
  return localStorage.getItem("token");
}

/**
 * Core fetch wrapper — adds Content-Type and Authorization headers.
 * Throws an Error with the server's detail message on non-2xx responses.
 */
async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export const authApi = {
  signup: (name, email, password) =>
    request("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),

  login: (email, password) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
};

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------
export const questionApi = {
  submit: (text) =>
    request("/questions", {
      method: "POST",
      body: JSON.stringify({ text }),
    }),

  history: (tag = null) => {
    const params = tag ? `?tag=${encodeURIComponent(tag)}` : "";
    return request(`/questions${params}`);
  },
};

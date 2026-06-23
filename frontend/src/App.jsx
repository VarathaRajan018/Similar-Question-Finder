/**
 * App.jsx — Root component with routing
 */

import { BrowserRouter, Routes, Route, Link, NavLink, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import AskQuestion from "./pages/AskQuestion";
import History from "./pages/History";

function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        🎓 QuestionFinder
      </Link>
      <div className="navbar-links">
        {isAuthenticated ? (
          <>
            <NavLink to="/ask" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              Ask
            </NavLink>
            <NavLink to="/history" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              History
            </NavLink>
            <span className="nav-user">Hi, {user?.name?.split(" ")[0]}</span>
            <button className="btn btn-ghost" onClick={logout}>
              Sign Out
            </button>
          </>
        ) : (
          <>
            <NavLink to="/login" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              Sign In
            </NavLink>
            <NavLink to="/signup" className="btn btn-primary btn-sm">
              Sign Up
            </NavLink>
          </>
        )}
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/ask"
              element={
                <ProtectedRoute>
                  <AskQuestion />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <History />
                </ProtectedRoute>
              }
            />
            <Route
              path="*"
              element={
                <div className="page">
                  <h1>404 — Page not found</h1>
                  <Link to="/login" className="btn btn-primary">Go to Sign In</Link>
                </div>
              }
            />
          </Routes>
        </main>
        <footer className="footer">
          <p>Similar Question Finder • EdTech Assignment • Local AI, no external APIs</p>
        </footer>
      </BrowserRouter>
    </AuthProvider>
  );
}

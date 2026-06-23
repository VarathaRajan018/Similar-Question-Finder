/**
 * components/ProtectedRoute.jsx
 *
 * Redirects unauthenticated users to /login when they try to access
 * a protected page.  Wraps any route that requires auth.
 */

import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

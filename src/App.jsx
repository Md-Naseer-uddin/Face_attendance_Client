import React, { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  Navigate,
  useNavigate,
} from "react-router-dom";
import Registration from "./pages/Registration";
import Attendance from "./pages/Attendance";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import { getUser, isAdmin, logout, isAuthenticated as checkAuth } from "./utils/api";

// Protected Route Component
function ProtectedRoute({ children, adminOnly = false }) {
  const token = localStorage.getItem("token");
  const user = getUser();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin()) {
    return <Navigate to="/" replace />;
  }

  return children;
}

// Navigation Component
function Navigation() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check authentication status
    const checkAuth = () => {
      const token = localStorage.getItem("token");
      setIsAuthenticated(!!token);
    };

    // Initial check
    checkAuth();

    // Listen for storage changes (when token is added/removed)
    window.addEventListener("storage", checkAuth);

    // Also check periodically to catch same-tab changes
    const interval = setInterval(checkAuth, 500);

    return () => {
      window.removeEventListener("storage", checkAuth);
      clearInterval(interval);
    };
  }, []);

  const handleLogout = () => {
    logout(); // Use centralized logout function
    setIsAuthenticated(false);
    navigate("/login", { replace: true });
  };

  if (!isAuthenticated) {
    return null;
  }

  const user = getUser();
  const userIsAdmin = isAdmin();

  return (
    <nav className="navbar">
      <div className="nav-container">
        <h1 className="nav-title">Face Attendance System</h1>
        <div className="nav-links">
          <Link to="/" className="nav-link">
            Attendance
          </Link>
          {userIsAdmin && (
            <>
              <Link to="/register" className="nav-link">
                Registration
              </Link>
              <Link to="/admin" className="nav-link">
                Admin
              </Link>
            </>
          )}
          <span className="user-info">
            {user?.name} ({user?.role})
          </span>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Navigation />
        <main className="main-content">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Attendance />
                </ProtectedRoute>
              }
            />
            <Route
              path="/register"
              element={
                <ProtectedRoute adminOnly={true}>
                  <Registration />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute adminOnly={true}>
                  <Admin />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;

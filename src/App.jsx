import { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { supabase } from "./utils/supabaseClient";

// =========================================
// PUBLIC PAGES
// =========================================

import HomeLandingPage from "./pages/LandingPage/HomeLandingPage";
import SignUp from "./pages/SignUp/SignUp";
import Login from "./pages/Login/Login";

// =========================================
// DASHBOARD PAGES
// =========================================

import Home from "./pages/Home/Home";
import Subjects from "./pages/Subjects/Subjects";
import SubjectDetails from "./pages/SubjectDetails/SubjectDetails";
import Plan from "./pages/Plan/Plan";
import Tasks from "./pages/Tasks/Tasks";
import Goals from "./pages/Goals/Goals";
import Notes from "./pages/Notes/Notes";
import Errors from "./pages/Errors/Errors";
import Review from "./pages/Review/Review";
import FocusSession from "./pages/FocusSession/FocusSession";
import Achievements from "./pages/Achievements/Achievements";
import Friends from "./pages/Friends/Friends";
import Reports from "./pages/Reports/Reports";
import Profile from "./pages/Profile/Profile";
import FocusStatistics from "./pages/FocusStatistics/FocusStatistics";
import Subscription from "./pages/Subscription/Subscription";

// =========================================
// CONTEXT
// =========================================

import { ThemeProvider } from "./context/ThemeContext";

// =========================================
// PROTECTED ROUTE
// =========================================

import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";
import AdminSubscriptions from "./pages/AdminSubscriptions/AdminSubscriptions";
import AdminRoute from "./components/AdminRoute/AdminRoute";
import AuthRoute from "./components/AuthRoute/AuthRoute";
import Notifications from "./pages/Notifications/Notifications";
import ResetPassword from "./pages/reset-password/reset-password";

// =========================================
// ROOT ROUTE
// لو المستخدم مسجل → Home
// لو غير مسجل → Landing Page
// =========================================

function RootRoute() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("ROOT AUTH ERROR:", error);
        }

        if (mounted) {
          setUser(session?.user || null);
          setCheckingAuth(false);
        }
      } catch (error) {
        console.error("ROOT AUTH CHECK ERROR:", error);

        if (mounted) {
          setUser(null);
          setCheckingAuth(false);
        }
      }
    };

    checkAuth();

    // متابعة تسجيل الدخول / تسجيل الخروج
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;

        setUser(session?.user || null);
        setCheckingAuth(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // =========================================
  // انتظار التحقق من Supabase
  // =========================================

  if (checkingAuth) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          direction: "rtl",
        }}
      >
        جاري التحميل...
      </div>
    );
  }

  // =========================================
  // المستخدم مسجل
  // =========================================

  if (user) {
    return <Navigate to="/home" replace />;
  }

  // =========================================
  // المستخدم غير مسجل
  // =========================================

  return <HomeLandingPage />;
}

// =========================================
// APP
// =========================================

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>

          {/* =====================================================
              ROOT
          ===================================================== */}

          <Route
            path="/"
            element={<RootRoute />}
          />

          {/* =====================================================
              PUBLIC PAGES
          ===================================================== */}

          <Route
            path="/SignUp"
            element={<SignUp />}
          />

          <Route
            path="/Login"
            element={<Login />}
          />

          <Route
            path="/reset-password"
            element={<ResetPassword />}
          />

          {/* =====================================================
              PROTECTED DASHBOARD
          ===================================================== */}

          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />

          <Route
            path="/Subjects"
            element={
              <ProtectedRoute>
                <Subjects />
              </ProtectedRoute>
            }
          />

          <Route
            path="/subjects/:subjectId"
            element={
              <ProtectedRoute>
                <SubjectDetails />
              </ProtectedRoute>
            }
          />

          <Route
            path="/Plan"
            element={
              <ProtectedRoute>
                <Plan />
              </ProtectedRoute>
            }
          />

          <Route
            path="/Tasks"
            element={
              <ProtectedRoute>
                <Tasks />
              </ProtectedRoute>
            }
          />

          <Route
            path="/Goals"
            element={
              <ProtectedRoute>
                <Goals />
              </ProtectedRoute>
            }
          />

          <Route
            path="/Notes"
            element={
              <ProtectedRoute>
                <Notes />
              </ProtectedRoute>
            }
          />

          <Route
            path="/Errors"
            element={
              <ProtectedRoute>
                <Errors />
              </ProtectedRoute>
            }
          />

          <Route
            path="/Review"
            element={
              <ProtectedRoute>
                <Review />
              </ProtectedRoute>
            }
          />

          <Route
            path="/FocusSession"
            element={
              <ProtectedRoute>
                <FocusSession />
              </ProtectedRoute>
            }
          />

          <Route
            path="/Achievements"
            element={
              <ProtectedRoute>
                <Achievements />
              </ProtectedRoute>
            }
          />

          <Route
            path="/Friends"
            element={
              <ProtectedRoute>
                <Friends />
              </ProtectedRoute>
            }
          />

          <Route
            path="/Reports"
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            }
          />

          <Route
            path="/Profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/FocusStatistics"
            element={
              <ProtectedRoute>
                <FocusStatistics />
              </ProtectedRoute>
            }
          />

          <Route
            path="/Notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />

          {/* =====================================================
              ADMIN
          ===================================================== */}

          <Route
            path="/AdminSubscriptions"
            element={
              <AdminRoute>
                <AdminSubscriptions />
              </AdminRoute>
            }
          />

          {/* =====================================================
              SUBSCRIPTION
          ===================================================== */}

          <Route
            path="/Subscription"
            element={
              <AuthRoute>
                <Subscription />
              </AuthRoute>
            }
          />

        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
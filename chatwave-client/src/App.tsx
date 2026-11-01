import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { Direction } from "radix-ui";
import { useTranslation } from "react-i18next";
import { selectCanAccessAdmin, selectIsAuthenticated, useAuthStore } from "./stores/authStore";
import { useApplyTheme } from "./hooks/useApplyTheme";
import { FullScreenLoader } from "./components/ui/FullScreenLoader";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";

// The chat UI and the admin dashboard load only when needed.
const ChatPage = lazy(() => import("./pages/ChatPage"));
const AdminApp = lazy(() => import("./pages/admin/AdminApp"));

function RequireAuth() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const signedOut = useAuthStore((s) => s.endedBy === "signed-out");
  const location = useLocation();

  if (!isAuthenticated) {
    // Remember the page so signing back in returns to it, unless the user chose to leave.
    return <Navigate to="/login" replace state={signedOut ? undefined : { from: location.pathname }} />;
  }
  return <Outlet />;
}

/** The admin dashboard needs a role with an admin permission (the API enforces this too). */
function RequireAdmin() {
  const canAdmin = useAuthStore(selectCanAccessAdmin);
  return canAdmin ? <AdminApp /> : <Navigate to="/chat" replace />;
}

/** Sign-in pages. Once signed in, continue to where the user was headed. */
function GuestOnly() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const location = useLocation();

  if (isAuthenticated) {
    const from = (location.state as { from?: string } | null)?.from;
    const safe = from && ["/chat", "/settings", "/admin"].some((prefix) => from.startsWith(prefix));
    return <Navigate to={safe ? from : "/chat"} replace />;
  }
  return <Outlet />;
}

export default function App() {
  useApplyTheme();
  const { i18n } = useTranslation();

  return (
    // Menus, radio groups and switches follow the language's direction (arrow keys too).
    <Direction.Provider dir={i18n.dir()}>
      <BrowserRouter>
        <Suspense fallback={<FullScreenLoader />}>
          <Routes>
            <Route element={<GuestOnly />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            </Route>
            <Route element={<RequireAuth />}>
              {/* One shell for all signed-in pages; it reads the URL to decide what to show. */}
              <Route element={<ChatPage />}>
                <Route path="/chat/:conversationId?" element={null} />
                <Route path="/chat/:conversationId/info" element={null} />
                <Route path="/settings/:section?" element={null} />
              </Route>
              <Route path="/admin/*" element={<RequireAdmin />} />
            </Route>
            <Route path="*" element={<Navigate to="/chat" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </Direction.Provider>
  );
}

import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./router/ProtectedRoute";
import { AppShell } from "./components/layout/AppShell";
import { useAuth } from "./context/AuthContext";
import { useLanguage } from "./context/LanguageContext";
import { LandingPage } from "./pages/landing/LandingPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { DashboardPage } from "./pages/dashboard/DashboardPage";
import { MessagesPage } from "./pages/messages/MessagesPage";
import { RequestsPage } from "./pages/requests/RequestsPage";
import { DocumentsPage } from "./pages/documents/DocumentsPage";
import { NotificationsPage } from "./pages/notifications/NotificationsPage";
import { ProfilePage } from "./pages/profile/ProfilePage";
import { UsersPage } from "./pages/users/UsersPage";
import { ReportsPage } from "./pages/reports/ReportsPage";
import { AdminPage } from "./pages/admin/AdminPage";

export default function App() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();

  // Guests see the public landing page at "/", signed-in users see the dashboard there.
  let homeElement = <AppShell />;
  if (loading) {
    homeElement = <div className="page-loader">{t("route.forbiddenLoading")}</div>;
  } else if (!user) {
    homeElement = <LandingPage />;
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <RegisterPage />} />

      <Route path="/" element={homeElement}>
        <Route index element={<DashboardPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/requests" element={<RequestsPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={["ADMIN", "DIRECTOR", "HR"]} />}>
        <Route element={<AppShell />}>
          <Route path="/users" element={<UsersPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={["ADMIN", "DIRECTOR", "ACADEMIC_OFFICE", "HR", "ACCOUNTANT"]} />}>
        <Route element={<AppShell />}>
          <Route path="/reports" element={<ReportsPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={["ADMIN", "DIRECTOR"]} />}>
        <Route element={<AppShell />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

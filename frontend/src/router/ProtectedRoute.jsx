import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

export function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  const { t } = useLanguage();

  if (loading) {
    return <div className="page-loader">{t("route.forbiddenLoading")}</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.roleCode)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

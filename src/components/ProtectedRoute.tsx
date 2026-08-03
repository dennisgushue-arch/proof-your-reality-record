import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ContextualLoading } from "@/components/ContextualLoading";

export const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();
  if (loading) return <ContextualLoading title="Verifying your secure session…" detail="Keeping your private records scoped to your account." className="min-h-screen" />;
  if (!user) return <Navigate to="/auth?reason=session-expired" replace />;
  return children;
};

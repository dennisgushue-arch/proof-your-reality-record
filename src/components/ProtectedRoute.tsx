import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="container py-20 text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/auth" replace />;
  return children;
};

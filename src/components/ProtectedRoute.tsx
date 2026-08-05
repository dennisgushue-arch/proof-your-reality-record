import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ContextualLoading } from "@/components/ContextualLoading";

type ProtectedRouteProps = {
  children: JSX.Element;
  requireSubscription?: boolean;
};

export const ProtectedRoute = ({ children, requireSubscription = true }: ProtectedRouteProps) => {
  const location = useLocation();
  const { user, loading, hasPaidAccess, subscriptionLoading } = useAuth();
  if (loading) return <ContextualLoading title="Verifying your secure session…" detail="Keeping your private records scoped to your account." className="min-h-screen" />;
  if (!user) return <Navigate to="/auth?reason=session-expired" replace />;
  if (requireSubscription && subscriptionLoading) {
    return (
      <ContextualLoading
        title="Checking subscription access…"
        detail="Confirming your plan before opening protected features."
        className="min-h-screen"
      />
    );
  }
  if (requireSubscription && !hasPaidAccess) {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/pricing?reason=subscription-required&redirect=${redirect}`} replace />;
  }
  return children;
};

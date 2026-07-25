import { Component, type ErrorInfo, type ReactNode } from "react";
import { isDynamicImportLoadError, normalizeSafeError } from "../releaseUtils";
import { GlobalErrorState } from "./GlobalErrorState";

type RouteErrorBoundaryProps = {
  children: ReactNode;
};

type RouteErrorBoundaryState = {
  error: unknown;
};

export class RouteErrorBoundary extends Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  state: RouteErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): RouteErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("Route rendering failed", { error, componentStack: info.componentStack });
    } else {
      console.error("Route rendering failed");
    }
  }

  render() {
    if (this.state.error) {
      const safe = normalizeSafeError(this.state.error, "This page could not be displayed. Try reloading the app.");
      const retry = isDynamicImportLoadError(this.state.error)
        ? () => window.location.reload()
        : () => this.setState({ error: null });

      return (
        <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 lg:px-10">
          <GlobalErrorState title={safe.title} message={safe.message} onRetry={safe.retryable ? retry : undefined} />
        </main>
      );
    }

    return this.props.children;
  }
}

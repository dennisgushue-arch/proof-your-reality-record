import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Application failed to render", error, errorInfo);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-background text-foreground">
        <main className="container flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-card">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h1 className="mt-5 text-2xl">Proof hit a startup problem</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              The page failed to finish loading. Try refreshing the app. If the problem keeps happening, clear cached site data for this domain and try again.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent/90"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh app
              </button>
              <a href="/" className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground transition hover:bg-card hover:text-foreground">
                Back to home
              </a>
            </div>
          </div>
        </main>
      </div>
    );
  }
}
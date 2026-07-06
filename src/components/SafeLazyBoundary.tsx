import { Component, type ErrorInfo, type ReactNode } from "react";

type SafeLazyBoundaryProps = {
  children: ReactNode;
  fallback: ReactNode;
};

type SafeLazyBoundaryState = {
  hasError: boolean;
};

export class SafeLazyBoundary extends Component<SafeLazyBoundaryProps, SafeLazyBoundaryState> {
  state: SafeLazyBoundaryState = { hasError: false };

  static getDerivedStateFromError(): SafeLazyBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Lazy component failed to render", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

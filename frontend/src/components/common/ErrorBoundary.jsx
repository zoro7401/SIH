import { Component } from "react";
import { ArrowCounterClockwise, WarningCircle } from "@phosphor-icons/react";

// Catches render-time errors anywhere below it so one broken component
// blanks its own section instead of the entire app going white.
export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled render error:", error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center">
          <WarningCircle size={32} className="text-muted mx-auto mb-4" />
          <h1 className="font-geist text-xl text-ink tracking-tight mb-2">Something went wrong</h1>
          <p className="text-sm text-muted mb-6">
            This page hit an unexpected error. Reloading usually fixes it — if it keeps happening, let us know.
          </p>
          <button
            onClick={this.handleReload}
            className="inline-flex items-center gap-2 bg-ink text-white text-sm font-medium rounded-md py-2.5 px-6 hover:bg-ink-hover active:scale-[0.98] transition-all"
          >
            <ArrowCounterClockwise size={16} />
            Reload page
          </button>
        </div>
      </div>
    );
  }
}

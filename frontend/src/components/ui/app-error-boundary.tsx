import { Component, type ErrorInfo, type ReactNode } from "react";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  error: Error | null;
};

/**
 * Last-resort recovery for render failures. Feature-level error states should
 * still handle expected request and empty-data cases before they reach here.
 */
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Keep diagnostic output useful without serializing request objects or headers.
    console.error("Unhandled application render error", {
      name: error.name,
      message: error.message,
      componentStack: errorInfo.componentStack,
    });
  }

  private retry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <main className="grid min-h-screen place-items-center bg-slate-50 p-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
          <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">METRICAST</p>
            <h1 className="mt-2 text-xl font-semibold">We could not display this page.</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Please try again. If the issue continues, refresh the page or contact your administrator.
            </p>
            <button
              type="button"
              onClick={this.retry}
              className="mt-5 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2 dark:bg-emerald-700 dark:hover:bg-emerald-600 dark:focus:ring-offset-slate-900"
            >
              Retry
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

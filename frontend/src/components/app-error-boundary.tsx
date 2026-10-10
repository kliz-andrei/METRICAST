import { Component, type ErrorInfo, type ReactNode } from 'react';

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

/**
 * Keeps an unexpected render failure from presenting a completely blank page.
 * The original error remains available in the browser console for diagnosis.
 */
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  public state: AppErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('METRICAST application rendering error', error, errorInfo);
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main className="grid min-h-screen place-items-center bg-slate-950 p-6 text-slate-100">
          <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-300">METRICAST</p>
            <h1 className="mt-2 text-xl font-bold">We could not display this page.</h1>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Please refresh the page. If the problem continues, contact the system administrator.
            </p>
            <button
              type="button"
              className="mt-5 inline-flex h-10 items-center rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-slate-900"
              onClick={() => window.location.reload()}
            >
              Refresh page
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

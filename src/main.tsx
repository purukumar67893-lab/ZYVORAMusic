import { Component, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message || 'Unexpected application error' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ZYVORAMusic render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0B0B0E] text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full p-6 rounded-2xl bg-[#141418] border border-white/[0.1] space-y-4 text-center">
            <h1 className="font-display text-xl font-bold">Playback view encountered an issue</h1>
            <p className="text-sm text-zinc-400">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-[#FF2D55] hover:bg-[#E12248] text-white text-sm font-semibold"
            >
              Reload ZYVORAMusic
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);

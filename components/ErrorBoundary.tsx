import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  // Fix: Switched to a class property for state initialization. The previous constructor-based
  // approach was causing type inference issues for 'this.state' and 'this.props'.
  // This is a more modern and robust way to define state in a class component.
  public state: State = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="flex h-screen w-screen items-center justify-center bg-gray-900 text-gray-200 p-4">
          <div className="w-full max-w-lg bg-gray-800 p-8 rounded-2xl shadow-lg ring-1 ring-white/10 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h1 className="mt-4 text-2xl font-bold text-white">Что-то пошло не так</h1>
            <p className="mt-2 text-gray-400">Произошла непредвиденная ошибка, которая помешала загрузке приложения.</p>
            {this.state.error && (
              <details className="mt-4 text-left bg-gray-900/50 p-3 rounded-lg">
                <summary className="cursor-pointer text-sm text-gray-300">Технические детали</summary>
                <pre className="mt-2 text-xs text-red-300 whitespace-pre-wrap overflow-auto max-h-40">
                  <code>{this.state.error.toString()}</code>
                </pre>
              </details>
            )}
            <button
              onClick={this.handleReload}
              className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
            >
              Перезагрузить приложение
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

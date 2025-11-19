
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Icon } from '@iconify/react';

interface Props {
  children?: ReactNode;
  isCard?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary - это специальный React-компонент, который отлавливает JavaScript-ошибки
 * в любом месте своего дочернего дерева компонентов, логирует эти ошибки и отображает
 * запасной пользовательский интерфейс вместо "сломанного" компонента.
 * Это предотвращает падение всего приложения из-за ошибки в одном из его частей.
 */
class ErrorBoundary extends Component<Props, State> {
  // Fix: Define state as a public class property to satisfy TypeScript.
  public state: State = {
    hasError: false,
    error: null,
  };

  /**
   * Этот статический метод жизненного цикла вызывается после того, как в дочернем компоненте
   * была выброшена ошибка. Он позволяет обновить состояние, чтобы при следующем рендере
   * показать запасной UI.
   */
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  /**
   * Этот метод жизненного цикла вызывается после того, как в дочернем компоненте
   * была выброшена ошибка. Он получает информацию об ошибке и о том, какой компонент
   * вызвал ошибку. Здесь можно, например, отправить лог в систему мониторинга.
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  // Обработчик для перезагрузки страницы.
  handleReload = () => {
    window.location.reload();
  };

  render(): ReactNode {
    // Если произошла ошибка, рендерим запасной UI.
    if (this.state.hasError) {
      if (this.props.isCard) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-red-500/10 text-red-400 p-2 rounded-xl ring-1 ring-red-500/50">
                <Icon icon="mdi:alert-circle-outline" className="w-8 h-8" />
                <p className="text-xs mt-1 font-semibold text-center">Ошибка карточки</p>
            </div>
        );
      }

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

    // Если ошибок нет, рендерим дочерние компоненты как обычно.
    return this.props.children;
  }
}

export default ErrorBoundary;

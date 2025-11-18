import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Icon } from '@iconify/react';

interface Props {
  children: ReactNode;
  isCard?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary - это специальный React-компонент, который отлавливает JavaScript-ошибки
 * в любом месте своего дочернего дерева компонентов, логирует эти ошибки и отображает
 * запасной пользовательский интерфейс вместо "сломанного" компонента.
 * Это предотвращает падение всего приложения из-за ошибки в одном из его частей.
 */
class ErrorBoundary extends Component<Props, State> {
  public state: State;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * Этот статический метод жизненного цикла вызывается после того, как в дочернем компоненте
   * была выброшена ошибка. Он позволяет обновить состояние, чтобы при следующем рендере
   * показать запасной UI.
   */
  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  /**
   * Этот метод жизненного цикла вызывается после того, как в дочернем компоненте
   * была выброшена ошибка. Он получает информацию об ошибке и о том, какой компонент
   * вызвал ошибку. Здесь можно, например, отправить лог в систему мониторинга.
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
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
        <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-gray-200 p-4">
          <div className="w-full max-w-lg bg-slate-800 p-8 rounded-2xl shadow-lg ring-1 ring-white/10 text-center">
            <Icon icon="mdi:alert-circle" className="h-12 w-12 mx-auto text-red-500" />
            <h1 className="mt-4 text-2xl font-bold text-white">Что-то пошло не так</h1>
            <p className="mt-2 text-gray-400">Произошла непредвиденная ошибка, которая помешала загрузке приложения.</p>
            {this.state.error && (
              <details className="mt-4 text-left rounded-lg bg-slate-700/50 overflow-hidden">
                <summary className="cursor-pointer text-sm text-gray-300 list-none p-3 hover:bg-slate-700 flex items-center">
                  <Icon icon="mdi:chevron-right" className="w-5 h-5 mr-1 transition-transform duration-200 details-arrow" />
                  Технические детали
                </summary>
                <div className="bg-slate-900 p-3">
                    <pre className="text-xs text-red-300 whitespace-pre-wrap overflow-auto max-h-60 no-scrollbar">
                      <code>
                        {this.state.error.toString()}
                        {this.state.errorInfo && `\n\nComponent Stack:\n${this.state.errorInfo.componentStack}`}
                      </code>
                    </pre>
                </div>
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

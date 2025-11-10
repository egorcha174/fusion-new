
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

// Находим корневой DOM-элемент, в который будет вмонтировано приложение.
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Создаем React root для рендеринга приложения.
const root = createRoot(rootElement);

// Рендерим приложение.
root.render(
  // React.StrictMode активирует дополнительные проверки и предупреждения для дочерних компонентов.
  // Помогает выявлять потенциальные проблемы в приложении.
  <React.StrictMode>
    {/* ErrorBoundary - это компонент, который отлавливает JavaScript-ошибки в дочернем дереве компонентов,
        логирует их и отображает запасной UI вместо "белого экрана". */}
    <ErrorBoundary>
      {/* App - это главный компонент приложения, точка входа в UI. */}
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

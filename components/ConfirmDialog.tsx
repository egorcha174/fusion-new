


import React from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
}

/**
 * Универсальный компонент для отображения модального окна с подтверждением действия.
 * Используется, например, для подтверждения удаления.
 */
const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  confirmButtonClass = 'bg-red-600 hover:bg-red-700',
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      // Оверлей, закрывающий диалог при клике на него
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-60 p-4 fade-in"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg w-full max-w-sm ring-1 ring-black/5 dark:ring-white/10"
        // Предотвращаем закрытие диалога при клике на само окно
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">{message}</div>
        </div>
        
        <div className="p-4 flex justify-end gap-4 bg-gray-100/50 dark:bg-gray-900/50 rounded-b-2xl">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white ${confirmButtonClass} rounded-lg transition-colors`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;

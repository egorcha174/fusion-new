

import React, { useEffect, useRef, useState } from 'react';

interface ContextMenuProps {
  x: number;
  y: number;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Компонент для отображения контекстного меню по координатам клика мыши.
 */
const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, isOpen, onClose, children }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedX, setAdjustedX] = useState(x);
  const [adjustedY, setAdjustedY] = useState(y);

  // Эффект для закрытия меню при клике вне его области.
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Эффект для корректировки позиции меню, чтобы оно не выходило за пределы экрана.
  useEffect(() => {
    if (menuRef.current) {
      const menuRect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let newX = x;
      // Если меню выходит за правый край, сдвигаем его влево.
      if (x + menuRect.width > viewportWidth) {
        newX = viewportWidth - menuRect.width - 10;
      }

      let newY = y;
      // Если меню выходит за нижний край, сдвигаем его вверх.
      if (y + menuRect.height > viewportHeight) {
        newY = viewportHeight - menuRect.height - 10;
      }
      
      setAdjustedX(newX);
      setAdjustedY(newY);
    }
  }, [x, y, isOpen]);


  if (!isOpen) {
    return null;
  }
  
  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg shadow-2xl ring-1 ring-black/10 dark:ring-white/10 p-1 text-sm text-gray-800 dark:text-gray-200 min-w-[180px] fade-in"
      style={{ top: adjustedY, left: adjustedX }}
    >
      {/* Проходим по дочерним элементам, чтобы добавить им общий стиль при наведении */}
      {React.Children.map(children, child => {
        if (React.isValidElement<{ className?: string }>(child) && child.props.className) {
          return React.cloneElement(child, {
            className: `${child.props.className} hover:bg-gray-200 dark:hover:bg-gray-700/80`
          });
        }
        return child;
      })}
    </div>
  );
};

export default React.memo(ContextMenu);

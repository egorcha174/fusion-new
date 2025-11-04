// FloatingCameraWindow.tsx

import React, { useState, useCallback } from 'react';
import { Device } from '../types';
import { CameraStreamContent } from './DeviceCard';

// --- PROPS ---
interface FloatingCameraWindowProps {
  device: Device;
  onClose: () => void;
  haUrl: string;
  signPath: (path: string) => Promise<{ path: string }>;
  getCameraStreamUrl: (entityId: string) => Promise<string>;
}

// --- CONSTANTS ---
const MIN_WIDTH = 320;
const MIN_HEIGHT = 240;

const FloatingCameraWindow: React.FC<FloatingCameraWindowProps> = ({
  device,
  onClose,
  haUrl,
  signPath,
  getCameraStreamUrl,
}) => {
  // --- STATE ---
  // Начальная позиция и размер окна
  const [position, setPosition] = useState({ x: window.innerWidth / 2 - 250, y: 100 });
  const [size, setSize] = useState({ width: 500, height: 350 });

  // --- DRAG LOGIC ---
  // Обработчик для перетаскивания окна за заголовок
  const handleDragPointerDown = useCallback((e: React.PointerEvent) => {
    // Реагируем только на левую кнопку мыши и игнорируем клики по кнопкам внутри заголовка
    if (e.button !== 0 || (e.target as HTMLElement).closest('button')) {
      return;
    }
    
    // Предотвращаем стандартное поведение (например, выделение текста) и "протекание" события вниз
    e.preventDefault();
    e.stopPropagation();

    const target = e.currentTarget as HTMLElement;
    // Захватываем указатель, чтобы все последующие события мыши приходили на этот элемент,
    // даже если курсор выйдет за его пределы. Это ключ к изоляции от dnd-kit.
    target.setPointerCapture(e.pointerId);

    const initialPos = { ...position };
    const startMouse = { x: e.clientX, y: e.clientY };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startMouse.x;
      const dy = moveEvent.clientY - startMouse.y;
      setPosition({
        x: initialPos.x + dx,
        y: initialPos.y + dy,
      });
    };
    
    const handlePointerUp = () => {
      // Освобождаем захват указателя и удаляем глобальные обработчики
      target.releasePointerCapture(e.pointerId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    // Добавляем глобальные обработчики на время перетаскивания
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }, [position]);

  // --- RESIZE LOGIC ---
  // Обработчик для изменения размера окна за правый нижний угол
  const handleResizePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    
    e.preventDefault();
    e.stopPropagation();

    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    const initialSize = { ...size };
    const startMouse = { x: e.clientX, y: e.clientY };

    const handlePointerMove = (moveEvent: PointerEvent) => {
        const dx = moveEvent.clientX - startMouse.x;
        const dy = moveEvent.clientY - startMouse.y;
        // Обновляем размер, но не меньше минимально допустимого
        setSize({
            width: Math.max(MIN_WIDTH, initialSize.width + dx),
            height: Math.max(MIN_HEIGHT, initialSize.height + dy),
        });
    };
    
    const handlePointerUp = () => {
        target.releasePointerCapture(e.pointerId);
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
    };
    
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }, [size]);

  // --- RENDER ---
  return (
    <div
      className="fixed z-50 bg-gray-800 rounded-lg shadow-2xl ring-1 ring-white/10 flex flex-col overflow-hidden"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        touchAction: 'none', // Отключаем сенсорные жесты по умолчанию (скролл, зум)
      }}
    >
      {/* ЗАГОЛОВОК ОКНА */}
      <header
        onPointerDownCapture={handleDragPointerDown}
        className="h-10 bg-gray-700/80 flex-shrink-0 flex items-center justify-between px-3 cursor-move select-none"
      >
        <h3 className="font-bold text-white text-sm truncate">{device.name}</h3>
        {/* КНОПКА ЗАКРЫТИЯ */}
        {/* onClick здесь сработает, потому что handleDragPointerDown игнорирует клики по кнопкам */}
        <button
          onClick={onClose}
          className="p-1 rounded-full text-gray-300 hover:bg-gray-600 hover:text-white transition-colors"
          aria-label="Закрыть окно камеры"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </header>

      {/* КОНТЕНТ (ВИДЕОПОТОК) */}
      <div className="flex-grow bg-black min-h-0">
         {/* Ключевое исправление: рендерим компонент CameraStreamContent и передаем ему все необходимые данные */}
         <CameraStreamContent
            entityId={device.id}
            haUrl={haUrl}
            signPath={signPath}
            getCameraStreamUrl={getCameraStreamUrl}
            altText={`Прямая трансляция с ${device.name}`}
          />
      </div>

      {/* УГОЛОК ДЛЯ ИЗМЕНЕНИЯ РАЗМЕРА */}
       <div
        onPointerDownCapture={handleResizePointerDown}
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
        aria-label="Изменить размер окна"
        style={{
            clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
        }}
      />
    </div>
  );
};

export default FloatingCameraWindow;
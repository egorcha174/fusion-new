// FloatingCameraWindow.tsx
import React, { useState, useCallback } from 'react';
import { Device } from '../types';
import { CameraStreamContent } from './DeviceCard';

interface FloatingCameraWindowProps {
  device: Device;
  onClose: () => void;
  haUrl: string;
  signPath: (path: string) => Promise<{ path: string }>;
  getCameraStreamUrl: (entityId: string) => Promise<string>;
}

const MIN_WIDTH = 320;
const MIN_HEIGHT = 240;

const FloatingCameraWindow: React.FC<FloatingCameraWindowProps> = ({
  device,
  onClose,
  haUrl,
  signPath,
  getCameraStreamUrl,
}) => {
  // Состояние для позиции и размера окна
  const [position, setPosition] = useState({ x: window.innerWidth / 2 - 250, y: 100 });
  const [size, setSize] = useState({ width: 500, height: 350 });

  // Обработчик для перетаскивания окна.
  // Использует Pointer Events для лучшей совместимости и предотвращения конфликтов.
  // useCallback мемоизирует функцию, чтобы избежать лишних ререндеров дочерних компонентов.
  const handleDragPointerDown = useCallback((e: React.PointerEvent) => {
    // Игнорируем клики не левой кнопкой мыши и клики по кнопкам внутри заголовка.
    if (e.button !== 0 || (e.target as HTMLElement).closest('button')) {
      return;
    }
    
    // Предотвращаем стандартные действия браузера (например, выделение текста)
    e.preventDefault();
    e.stopPropagation();
    
    const target = e.currentTarget as HTMLElement;
    // Захватываем указатель, чтобы все события мыши приходили к этому элементу,
    // даже если курсор покинет его пределы. Это ключ к изоляции от dnd-kit.
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
      // Освобождаем захват указателя и удаляем глобальные слушатели.
      target.releasePointerCapture(e.pointerId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }, [position]);

  // Обработчик для изменения размера окна. Логика аналогична перетаскиванию.
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

  return (
    <div
      className="fixed z-50 bg-gray-800 rounded-lg shadow-2xl ring-1 ring-white/10 flex flex-col overflow-hidden fade-in"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        touchAction: 'none', // Отключает стандартные сенсорные действия (например, скролл)
      }}
    >
      <header
        onPointerDown={handleDragPointerDown}
        className="h-10 bg-gray-700/80 flex-shrink-0 flex items-center justify-between px-3 cursor-move"
      >
        <h3 className="font-bold text-white text-sm truncate select-none">{device.name}</h3>
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

      {/* Контейнер для контента. flex-grow заставляет его занять всё доступное место. */}
      <div className="flex-grow bg-black min-h-0 relative">
        {/*
          КЛЮЧЕВОЕ ИЗМЕНЕНИЕ:
          Рендерим компонент CameraStreamContent, который отвечает за получение и отображение видеопотока.
          Передаем ему все необходимые props, полученные от родителя (App.tsx).
        */}
        <CameraStreamContent
          entityId={device.id}
          haUrl={haUrl}
          signPath={signPath}
          getCameraStreamUrl={getCameraStreamUrl}
          altText={device.name}
        />
        
        {/* Элемент для изменения размера, расположенный в правом нижнем углу. */}
        <div
            onPointerDown={handleResizePointerDown}
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
            style={{
                // Рисуем треугольник с помощью clip-path для визуального индикатора
                clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
            }}
            aria-label="Изменить размер окна"
        />
      </div>
    </div>
  );
};

export default FloatingCameraWindow;

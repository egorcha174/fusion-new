import React, { useState, useCallback } from 'react';
import { Device } from '../types';
import { CameraStreamContent } from './DeviceCard';

// --- Типы для пропсов ---
interface FloatingCameraWindowProps {
  device: Device;
  onClose: () => void;
  haUrl: string;
  signPath: (path: string) => Promise<{ path: string }>;
  getCameraStreamUrl: (entityId: string) => Promise<string>;
}

// --- Минимальные размеры окна ---
const MIN_WIDTH = 640;
const MIN_HEIGHT = 480;

const FloatingCameraWindow: React.FC<FloatingCameraWindowProps> = ({
  device,
  onClose,
  haUrl,
  signPath,
  getCameraStreamUrl,
}) => {
  const [position, setPosition] = useState({ x: window.innerWidth / 2 - 500, y: 100 });
  const [size, setSize] = useState({ width: 1000, height: 700 });

  /**
   * ОБРАБОТЧИК ПЕРЕТАСКИВАНИЯ (DRAG)
   * При нажатии на заголовок, он захватывает указатель мыши,
   * отслеживает его движение и обновляет позицию окна.
   * Это предотвращает случайное выделение текста или другие действия браузера.
   * Клик по кнопке закрытия игнорируется.
   */
  const handleDragPointerDown = useCallback((e: React.PointerEvent) => {
    // Игнорируем нажатия не левой кнопкой мыши или клики по кнопкам внутри заголовка
    if (e.button !== 0 || (e.target as HTMLElement).closest('button')) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();

    const target = e.currentTarget as HTMLElement;
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
      target.releasePointerCapture(e.pointerId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }, [position]);

  /**
   * ОБРАБОТЧИК ИЗМЕНЕНИЯ РАЗМЕРА (RESIZE)
   * Работает аналогично перетаскиванию, но для уголка в правом нижнем углу.
   * Захватывает указатель и обновляет размеры окна, соблюдая минимальные ограничения.
   */
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
      className="fixed z-50 bg-gray-800 rounded-lg shadow-2xl ring-1 ring-white/10 flex flex-col user-select-none overflow-hidden"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        touchAction: 'none',
      }}
    >
      {/* Заголовок окна */}
      <header
        onPointerDown={handleDragPointerDown}
        className="h-10 bg-gray-700/80 flex-shrink-0 flex items-center justify-between px-3 cursor-move"
      >
        <h3 className="font-bold text-white text-sm truncate select-none">
          {device.name}
        </h3>
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
      
      {/* Контейнер для видеопотока */}
      <div className="flex-grow bg-black min-h-0 relative">
        <CameraStreamContent
          entityId={device.id}
          haUrl={haUrl}
          signPath={signPath}
          getCameraStreamUrl={getCameraStreamUrl}
          altText={device.name}
        />
        
        {/* Уголок для изменения размера */}
        <div
          onPointerDown={handleResizePointerDown}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-10"
          aria-label="Изменить размер окна"
        >
           <svg width="100%" height="100%" viewBox="0 0 16 16" className="text-white/50">
            <path d="M16 0 L0 16 Z" stroke="currentColor" strokeWidth="1" fill="none" />
            <path d="M16 8 L8 16 Z" stroke="currentColor" strokeWidth="1" fill="none" />
           </svg>
        </div>
      </div>
    </div>
  );
};

export default React.memo(FloatingCameraWindow);

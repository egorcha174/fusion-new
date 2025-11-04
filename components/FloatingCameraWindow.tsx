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

// Устанавливаем минимальный размер окна, чтобы оно не стало непригодным для использования.
const MIN_WIDTH = 320;
const MIN_HEIGHT = 240;

const FloatingCameraWindow: React.FC<FloatingCameraWindowProps> = ({
  device,
  onClose,
  haUrl,
  signPath,
  getCameraStreamUrl,
}) => {
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: window.innerWidth / 2 - 250, // Изначально центрируем по горизонтали
    y: 100,
  });
  const [size, setSize] = useState<{ width: number; height: number }>({
    width: 500,
    height: 350,
  });

  /**
   * ПОЧЕМУ ЭТОТ ПОДХОД РАБОТАЕТ:
   * Эта реализация исправляет предыдущие ошибки, создавая полностью независимые
   * обработчики для перетаскивания и изменения размера.
   * 1. ИЗОЛЯЦИЯ: `e.stopPropagation()` и `e.preventDefault()` вызываются немедленно
   *    в обработчиках `onPointerDown`. Это останавливает "всплытие" события к
   *    нижележащим DnD-библиотекам (например, dnd-kit) и отключает действия браузера
   *    по умолчанию (например, выделение текста), что было основной причиной
   *    визуальных артефактов и "залипания" окна.
   * 2. ЗАХВАТ УКАЗАТЕЛЯ: `target.setPointerCapture(e.pointerId)` — это ключевой момент.
   *    Он сообщает браузеру, что все последующие события указателя (move, up, cancel)
   *    для этого конкретного взаимодействия должны отправляться ТОЛЬКО этому элементу,
   *    даже если курсор выходит за его пределы. Это обеспечивает плавное и
   *    бесперебойное перетаскивание и изменение размера.
   * 3. НЕЗАВИСИМАЯ ЛОГИКА: Логика перетаскивания привязана только к заголовку, а логика
   *    изменения размера — только к угловому маркеру. Они не мешают друг другу.
   *    Кнопка закрытия также в безопасности, поскольку обработчик перетаскивания
   *    явно игнорирует события, исходящие от кнопок.
   */

  // Обрабатывает перетаскивание окна за заголовок.
  const handleDragPointerDown = useCallback((e: React.PointerEvent) => {
    // Реагируем только на основную кнопку мыши и игнорируем клики по интерактивным элементам, таким как кнопки.
    if (e.button !== 0 || (e.target as HTMLElement).closest('button')) {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();

    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    target.style.cursor = 'grabbing'; // Визуальная обратная связь

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
      target.style.cursor = 'grab'; // Восстанавливаем курсор
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }, [position]);

  // Обрабатывает изменение размера окна за правый нижний маркер.
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
  
  // TODO: Добавить aria-live регионы для объявления состояния окна для доступности.
  // TODO: Добавить управление с клавиатуры для перемещения и изменения размера окна.

  return (
    <div
      className="fixed z-50 bg-gray-800 rounded-lg shadow-2xl ring-1 ring-white/10 flex flex-col select-none overflow-hidden fade-in"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        touchAction: 'none', // Предотвращает прокрутку на сенсорных устройствах во время перетаскивания/изменения размера
      }}
    >
      <header
        onPointerDown={handleDragPointerDown}
        className="h-10 bg-gray-700/80 flex-shrink-0 flex items-center justify-between px-3 cursor-grab border-b border-gray-600"
      >
        <h3 className="font-bold text-white text-sm truncate">{device.name}</h3>
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
      <div className="flex-grow bg-black min-h-0 relative">
         <CameraStreamContent
            entityId={device.id} // Исправлено: передаем entityId, а не весь объект device
            haUrl={haUrl}
            signPath={signPath}
            getCameraStreamUrl={getCameraStreamUrl}
            altText={device.name}
          />
         <div
            onPointerDown={handleResizePointerDown}
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
            aria-label="Изменить размер окна"
            style={{
                // Создает маленький, едва заметный треугольник в углу для изменения размера
                clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
            }}
        />
      </div>
    </div>
  );
};

export default FloatingCameraWindow;

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

// Минимальный размер окна
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
    x: window.innerWidth / 2 - 250,
    y: 100,
  });
  const [size, setSize] = useState<{ width: number; height: number }>({
    width: 500,
    height: 350,
  });

  // TODO: Можно вынести activeDrag/Resize state для визуализации активного состояния и блокировки pointer events

  // Drag только по заголовку
  const handleDragPointerDown = useCallback((e: React.PointerEvent) => {
    // Блокируем drag по кнопкам и другим интерактивным элементам
    if (
      e.button !== 0 ||
      (e.target as HTMLElement).closest('button')
    )
      return;
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
      // TODO: Доработать чтобы окно не выходило за пределы экрана
    };

    const handlePointerUp = () => {
      target.releasePointerCapture(e.pointerId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }, [position]);

  // Resize только по правому нижнему углу
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
      // TODO: Добавить debounce/throttle, если ресайз будет лагать на слабых устройствах
    };

    const handlePointerUp = () => {
      target.releasePointerCapture(e.pointerId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }, [size]);

  // Максимальная изоляция оконного слоя: z-index: 10000, pointer-events: 'auto'
  // TODO: добавить aria-label для кнопки закрытия и ресайза для доступности

  return (
    <div
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        zIndex: 10000, // Максимальный z-index
        background: '#222',
        borderRadius: 8,
        boxShadow: '0 4px 32px rgba(0,0,0,0.18)',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none', // Защита от выделения текста
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{
          width: '100%',
          height: 42,
          cursor: 'grab',
          background: '#303036',
          borderBottom: '1px solid #444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
        }}
        onPointerDown={handleDragPointerDown}
      >
        <span style={{ fontWeight: 600, color: '#fff' }}>
          {device.name || 'Камера'}
        </span>
        <button
          aria-label="Закрыть окно камеры"
          style={{
            background: 'none',
            border: 'none',
            color: '#fff',
            fontSize: 20,
            cursor: 'pointer',
            padding: 0,
            marginLeft: 8,
          }}
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <div
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <CameraStreamContent
          device={device}
          haUrl={haUrl}
          signPath={signPath}
          getCameraStreamUrl={getCameraStreamUrl}
        />
        {/* TODO: добавить overlay для drag/resize визуализации */}
        {/* Правый нижний угол для изменения размера */}
        <div
          aria-label="Изменить размер окна"
          style={{
            position: 'absolute',
            bottom: 2,
            right: 2,
            width: 18,
            height: 18,
            cursor: 'nwse-resize',
            background: 'rgba(120,120,120,0.68)',
            borderRadius: 4,
            border: '1px solid #444',
            zIndex: 10100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'auto',
          }}
          onPointerDown={handleResizePointerDown}
        >
          <svg width="14" height="14">
            <polyline
              points="2,12 12,12 12,2"
              stroke="#fff"
              strokeWidth={2}
              fill="none"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default FloatingCameraWindow;

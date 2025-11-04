// FloatingCameraWindow.tsx
import React, { useState, useCallback } from 'react';

const MIN_WIDTH = 320;
const MIN_HEIGHT = 240;

const FloatingCameraWindow = ({
  device,
  onClose,
  haUrl,
  signPath,
  getCameraStreamUrl,
}) => {
  const [position, setPosition] = useState({ x: window.innerWidth / 2 - 250, y: 100 });
  const [size, setSize] = useState({ width: 500, height: 350 });

  // Перетаскивание по заголовку
  const handleDragPointerDown = useCallback((e) => {
    if (e.button !== 0 || (e.target.closest && e.target.closest('button'))) return;
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    const initialPos = { ...position };
    const startMouse = { x: e.clientX, y: e.clientY };

    const handlePointerMove = (moveEvent) => {
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

  // Resize уголок
  const handleResizePointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    const initialSize = { ...size };
    const startMouse = { x: e.clientX, y: e.clientY };

    const handlePointerMove = (moveEvent) => {
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
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        zIndex: 10000,
        background: '#222',
        borderRadius: 8,
        boxShadow: '0 4px 32px rgba(0,0,0,0.18)',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
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
        {/* Ваш компонент камеры/видео */}
        {/* <CameraStreamContent ... /> */}
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

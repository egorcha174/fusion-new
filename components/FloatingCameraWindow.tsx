import React, { useState, useRef } from 'react';
import { Device } from '../types';
import { CameraStreamContent } from './DeviceCard';

interface FloatingCameraWindowProps {
  device: Device;
  onClose: () => void;
  haUrl: string;
  signPath: (path: string) => Promise<{ path: string }>;
  getCameraStreamUrl: (entityId: string) => Promise<string>;
}

const FloatingCameraWindow: React.FC<FloatingCameraWindowProps> = ({ device, onClose, haUrl, signPath, getCameraStreamUrl }) => {
  const [position, setPosition] = useState({ x: window.innerWidth / 2 - 250, y: 100 });
  const [size, setSize] = useState({ width: 500, height: 350 });
  const windowRef = useRef<HTMLDivElement>(null);

  // Dragging logic
  const onDragMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const { left, top } = windowRef.current!.getBoundingClientRect();
    const dragOffset = { x: e.clientX - left, y: e.clientY - top };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      setPosition({
        x: moveEvent.clientX - dragOffset.x,
        y: moveEvent.clientY - dragOffset.y,
      });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Resizing logic
  const onResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const handleMouseMove = (moveEvent: MouseEvent) => {
      setSize(currentSize => ({
        width: Math.max(320, currentSize.width + moveEvent.movementX), // Min width 320px
        height: Math.max(240, currentSize.height + moveEvent.movementY), // Min height 240px
      }));
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      ref={windowRef}
      className="fixed z-40 bg-gray-800 rounded-lg shadow-2xl ring-1 ring-white/10 flex flex-col overflow-hidden fade-in"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
      }}
    >
      <header
        className="h-10 bg-gray-700/80 flex-shrink-0 flex items-center justify-between px-3 cursor-move"
        onMouseDown={onDragMouseDown}
      >
        <h3 className="font-bold text-white text-sm truncate">{device.name}</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-full text-gray-300 hover:bg-gray-600 hover:text-white transition-colors"
          aria-label="Close camera view"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </header>
      <div className="flex-grow bg-black min-h-0">
         <CameraStreamContent
            entityId={device.id}
            haUrl={haUrl}
            signPath={signPath}
            getCameraStreamUrl={getCameraStreamUrl}
            altText={device.name}
          />
      </div>
       <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
        onMouseDown={onResizeMouseDown}
        style={{
            clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
        }}
      />
    </div>
  );
};

export default FloatingCameraWindow;

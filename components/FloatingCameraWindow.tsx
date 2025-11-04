import React, { useState, useRef, useEffect } from 'react';
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
  // Using a ref for interaction state to prevent re-renders on move
  const interactionState = useRef({
    isDragging: false,
    isResizing: false,
    dragOffset: { x: 0, y: 0 },
  });
  
  // A stable ref for the onClose callback to use in event handlers
  const stableOnClose = useRef(onClose);
  useEffect(() => {
    stableOnClose.current = onClose;
  }, [onClose]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only react to the primary mouse button
    if (e.button !== 0) return;
    
    const target = e.target as HTMLElement;
    const isResizeHandle = !!target.closest('[data-resize-handle]');
    const isDragHandle = !!target.closest('[data-drag-handle]');
    const isCloseButton = !!target.closest('[data-close-button]');
    
    // If the close button is clicked, close the window and do nothing else.
    if (isCloseButton) {
      stableOnClose.current();
      return;
    }

    // If it's a drag or resize handle, capture the pointer.
    if (isDragHandle || isResizeHandle) {
      // Stop event from bubbling up to underlying elements like dnd-kit
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

      if (isResizeHandle) {
        interactionState.current.isResizing = true;
      } else if (isDragHandle) {
        interactionState.current.isDragging = true;
        const { left, top } = windowRef.current!.getBoundingClientRect();
        interactionState.current.dragOffset = { x: e.clientX - left, y: e.clientY - top };
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // This handler will only receive events if pointer capture is active
    if (interactionState.current.isResizing) {
      setSize(currentSize => ({
        width: Math.max(320, currentSize.width + e.movementX),
        height: Math.max(240, currentSize.height + e.movementY),
      }));
    } else if (interactionState.current.isDragging) {
      setPosition({
        x: e.clientX - interactionState.current.dragOffset.x,
        y: e.clientY - interactionState.current.dragOffset.y,
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    // Reset interaction state and release pointer capture if it was active
    if (interactionState.current.isDragging || interactionState.current.isResizing) {
        interactionState.current.isDragging = false;
        interactionState.current.isResizing = false;
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    }
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
        touchAction: 'none', // Prevent default touch actions on the entire window
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp} // Also handle cancellation (e.g., browser gesture)
    >
      <header
        data-drag-handle
        className="h-10 bg-gray-700/80 flex-shrink-0 flex items-center justify-between px-3 cursor-move"
      >
        <h3 className="font-bold text-white text-sm truncate select-none">{device.name}</h3>
        <button
          data-close-button
          className="p-1 rounded-full text-gray-300 hover:bg-gray-600 hover:text-white transition-colors"
          aria-label="Close camera view"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </header>
      <div className="flex-grow bg-black min-h-0 pointer-events-none">
         <CameraStreamContent
            entityId={device.id}
            haUrl={haUrl}
            signPath={signPath}
            getCameraStreamUrl={getCameraStreamUrl}
            altText={device.name}
          />
      </div>
       <div
        data-resize-handle
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
        style={{
            clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
        }}
      />
    </div>
  );
};

export default FloatingCameraWindow;
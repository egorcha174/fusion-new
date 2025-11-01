// FIX: Import React hooks using standard import syntax to fix JSX transform issues.
import React, { useEffect, useRef, useState } from '../vendor/react.js';

interface ContextMenuProps {
  x: number;
  y: number;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, isOpen, onClose, children }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedX, setAdjustedX] = useState(x);
  const [adjustedY, setAdjustedY] = useState(y);

  // Effect to handle clicking outside the menu to close it
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

  // Effect to adjust menu position to stay within the viewport
  useEffect(() => {
    if (menuRef.current) {
      const menuRect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let newX = x;
      if (x + menuRect.width > viewportWidth) {
        newX = viewportWidth - menuRect.width - 10;
      }

      let newY = y;
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
      className="fixed z-50 bg-gray-800/80 backdrop-blur-sm rounded-lg shadow-2xl ring-1 ring-white/10 p-1 text-sm text-gray-200 min-w-[180px] fade-in"
      style={{ top: adjustedY, left: adjustedX }}
    >
      {children}
    </div>
  );
};

export default ContextMenu;
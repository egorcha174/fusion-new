import React, { useState, useEffect, useRef } from 'react';

interface MjpegStreamerProps {
  src: string;
  altText?: string;
}

const MjpegStreamer: React.FC<MjpegStreamerProps> = ({ src, altText = 'MJPEG Stream' }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // Сброс состояния при изменении src
    setIsLoading(true);
    setError(null);
    
    const imgElement = imgRef.current;
    if (!imgElement) return;

    // Событие 'load' для MJPEG потока сработает для первого кадра.
    const handleLoad = () => {
      setIsLoading(false);
      setError(null);
    };

    const handleError = () => {
      setIsLoading(false);
      setError('Не удалось загрузить MJPEG поток.');
    };

    imgElement.addEventListener('load', handleLoad);
    imgElement.addEventListener('error', handleError);

    // Устанавливаем src после добавления обработчиков, чтобы избежать race conditions
    imgElement.src = src;

    return () => {
      imgElement.removeEventListener('load', handleLoad);
      imgElement.removeEventListener('error', handleError);
      // Очищаем src, чтобы остановить поток при размонтировании или изменении src
      imgElement.src = '';
    };
  }, [src]);

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center">
      <img
        ref={imgRef}
        className={`w-full h-full border-0 bg-black object-contain transition-opacity duration-300 ${isLoading || error ? 'opacity-0' : 'opacity-100'}`}
        alt={altText}
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-dashed rounded-full animate-spin border-gray-400"></div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 p-2 text-center bg-gray-800/80">
          <p className="text-sm font-semibold">Ошибка</p>
          <p className="text-xs text-gray-400 mt-1">{error}</p>
        </div>
      )}
    </div>
  );
};

export default MjpegStreamer;

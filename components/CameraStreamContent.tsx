
import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import LoadingSpinner from './LoadingSpinner';
import { Icon } from '@iconify/react';

interface CameraStreamContentProps {
  streamUrl: string | null;
  type: 'hls' | 'mjpeg' | 'iframe' | 'file' | 'none';
  posterUrl?: string | null;
  muted?: boolean;
  autoPlay?: boolean;
  onLoaded?: () => void;
  onError?: (msg: string) => void;
  className?: string;
}

export const CameraStreamContent: React.FC<CameraStreamContentProps> = ({
  streamUrl,
  type,
  posterUrl,
  muted = true,
  autoPlay = true,
  onLoaded,
  onError,
  className = "w-full h-full object-cover"
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Сброс состояния при смене URL
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
  }, [streamUrl, type]);

  // --- Логика HLS и Native Video ---
  useEffect(() => {
    if (!streamUrl || (type !== 'hls' && type !== 'file')) return;

    const video = videoRef.current;
    if (!video) return;

    // Функция безопасного воспроизведения
    const tryPlay = async () => {
      try {
        if (video.paused && autoPlay) {
          await video.play();
        }
        setIsLoading(false);
        if (onLoaded) onLoaded();
      } catch (e) {
        console.warn("Autoplay blocked or failed:", e);
        // Не считаем блокировку автоплея критической ошибкой, поток готов
        setIsLoading(false); 
      }
    };

    // Очистка предыдущего HLS
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Сценарий 1: Native HLS (Safari)
    if (type === 'hls' && video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', tryPlay);
      video.addEventListener('error', () => {
          setHasError(true);
          if(onError) onError("Ошибка нативного плеера");
      });
    } 
    // Сценарий 2: HLS.js (Chrome, Firefox)
    else if (type === 'hls' && Hls.isSupported()) {
      const hls = new Hls({
        maxBufferLength: 30, // 30 секунд буфера
        manifestLoadingTimeOut: 15000,
        levelLoadingTimeOut: 15000,
      });
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        tryPlay();
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              // Пытаемся восстановить сеть
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              // Пытаемся восстановить медиа
              hls.recoverMediaError();
              break;
            default:
              // Критическая ошибка
              hls.destroy();
              setHasError(true);
              if(onError) onError(`HLS Error: ${data.details}`);
              break;
          }
        }
      });
    } 
    // Сценарий 3: Просто видео файл (mp4, webm)
    else if (type === 'file') {
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', tryPlay);
      video.addEventListener('error', () => {
          setHasError(true);
          if(onError) onError("Ошибка загрузки файла");
      });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      if (video) {
        video.removeAttribute('src');
        video.load();
      }
    };
  }, [streamUrl, type, autoPlay]); // Re-run only if url or type changes

  // --- Рендеринг в зависимости от типа ---

  if (!streamUrl) return null;

  // IFrame (WebRTC, Go2RTC Embeds)
  if (type === 'iframe') {
    return (
      <iframe
        src={streamUrl}
        className={className}
        allowFullScreen
        onLoad={() => { setIsLoading(false); if(onLoaded) onLoaded(); }}
        style={{ border: 'none', background: 'black' }}
      />
    );
  }

  // MJPEG (Image stream)
  if (type === 'mjpeg') {
    return (
      <img
        src={streamUrl}
        className={className}
        onLoad={() => { setIsLoading(false); if(onLoaded) onLoaded(); }}
        onError={() => { setHasError(true); if(onError) onError("MJPEG Error"); }}
        alt="Camera Stream"
      />
    );
  }

  // Video Tag (HLS, File)
  if (type === 'hls' || type === 'file') {
    return (
      <video
        ref={videoRef}
        className={className}
        poster={posterUrl || undefined}
        muted={muted}
        playsInline
        autoPlay={autoPlay}
        controls={false}
        style={{ display: hasError ? 'none' : 'block' }}
      />
    );
  }

  return null;
};


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

    // IMPROVED: Safe play handler that ensures state is updated even if playback is blocked
    const handlePlay = async () => {
      try {
        if (video.paused && autoPlay) {
          await video.play();
        }
      } catch (e) {
        console.warn("Autoplay blocked or failed:", e);
        // Even if autoplay fails, we consider it loaded (showing poster/frame)
      } finally {
        // FIX: Always clear loading state
        setIsLoading(false);
        if (onLoaded) onLoaded();
      }
    };

    // IMPROVED: Named function for error handling
    const handleError = (e: Event) => {
        console.error("Video Error:", e);
        setHasError(true);
        if(onError) onError("Ошибка воспроизведения");
        setIsLoading(false);
    };

    // Очистка предыдущего HLS
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Сценарий 1: Native HLS (Safari)
    if (type === 'hls' && video.canPlayType('application/vnd.apple.mpegurl')) {
      // FIX: Ensure src is set before attaching listeners
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', handlePlay);
      video.addEventListener('error', handleError);
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
      
      // FIX: Wrap attachMedia in try/catch for safety
      try {
          hls.attachMedia(video);
      } catch (e) {
          console.error("HLS Attach Error:", e);
          setHasError(true);
      }

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // Try to play immediately when manifest is parsed
        handlePlay();
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad(); // Try to recover network error
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError(); // Try to recover media error
              break;
            default:
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
      video.addEventListener('loadedmetadata', handlePlay);
      video.addEventListener('error', handleError);
    }

    // FIX: Clean up event listeners on unmount
    return () => {
      if (video) {
        video.removeEventListener('loadedmetadata', handlePlay);
        video.removeEventListener('error', handleError);
        
        // FIX: Stop downloading content properly
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamUrl, type, autoPlay]);

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

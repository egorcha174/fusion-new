




import React, { useState, useRef, useEffect, useCallback } from 'react';
import Hls from 'hls.js';
import { constructHaUrl } from '../utils/url';
import LoadingSpinner from './LoadingSpinner';
import { Icon } from '@iconify/react';

interface VideoPlayerProps {
  src: string;
}

/**
 * Внутренний компонент-плеер для HLS-потоков.
 * Использует библиотеку hls.js для воспроизведения, если она поддерживается браузером.
 * В противном случае (например, в Safari) использует нативную поддержку HLS в теге <video>.
 */
const VideoPlayer: React.FC<VideoPlayerProps> = ({ src }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    let hls: Hls;
    if (Hls.isSupported()) {
      hls = new Hls({ lowLatencyMode: true, backBufferLength: 90 });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(e => console.warn("Autoplay was prevented.", e));
      });
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR: hls.startLoad(); break;
            case Hls.ErrorTypes.MEDIA_ERROR: hls.recoverMediaError(); break;
            default: hls.destroy(); break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Нативная поддержка в Safari.
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(e => console.warn("Autoplay was prevented.", e));
      });
    }

    return () => { if (hls) hls.destroy(); };
  }, [src]);

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center group">
      <video ref={videoRef} className="w-full h-full object-contain" muted autoPlay playsInline />
      <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/50 backdrop-blur-sm rounded-md text-white text-xs font-bold tracking-wider fade-in pointer-events-none">HLS</div>
    </div>
  );
};


interface CameraStreamContentProps {
  entityId: string | null;
  haUrl: string;
  signPath: (path: string) => Promise<{ path: string }>;
  getCameraStreamUrl: (entityId: string) => Promise<{ url: string }>;
  altText?: string;
  refreshInterval?: number; // seconds
  autoPlay?: boolean;
  showPlayButton?: boolean;
}

/**
 * Основной компонент для отображения контента с камеры.
 * Реализует многоступенчатую логику загрузки:
 * 1. Сначала загружает статическое превью-изображение.
 * 2. Автоматически обновляет превью раз в `refreshInterval` секунд (если задано).
 * 3. По клику на "play" (или если autoPlay=true) пытается загрузить HLS-поток.
 * 4. Если HLS не удается, автоматически переключается на MJPEG-поток.
 */
export const CameraStreamContent: React.FC<CameraStreamContentProps> = ({ 
    entityId, 
    haUrl, 
    signPath, 
    getCameraStreamUrl, 
    altText = 'Прямая трансляция',
    refreshInterval,
    autoPlay = false,
    showPlayButton = true
}) => {
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [streamType, setStreamType] = useState<'hls' | 'mjpeg' | 'none'>('none');
  const [isPlaying, setIsPlaying] = useState(autoPlay);

  const getPreview = useCallback(async (currentMounted: boolean) => {
      if (!entityId) {
        if (currentMounted) setLoadState('idle');
        return;
      }
      // Don't set loading state on refresh to avoid flashing
      if (!previewUrl) {
          if (currentMounted) setLoadState('loading');
      }
      
      setError(null);
      try {
        const result = await signPath(`/api/camera_proxy/${entityId}`);
        if (currentMounted) {
          const url = constructHaUrl(haUrl, result.path, 'http');
          // Append timestamp to bust cache for refreshes
          const urlWithCacheBuster = new URL(url);
          urlWithCacheBuster.searchParams.set('t', String(new Date().getTime()));
          setPreviewUrl(urlWithCacheBuster.toString());
          setLoadState('loaded');
        }
      } catch (err) {
        if (currentMounted) {
          console.error(`Failed to load preview for ${entityId}:`, err);
          // Only show error if we don't have a previous image to fallback to
          if (!previewUrl) {
              setError('Не удалось загрузить превью.');
              setLoadState('error');
          }
        }
      }
  }, [entityId, haUrl, signPath, previewUrl]);

  // Initial Preview Load & Refresh Interval
  useEffect(() => {
    let isMounted = true;
    
    if (!isPlaying) {
        getPreview(isMounted);
    }

    let intervalId: ReturnType<typeof setInterval> | null = null;
    if (refreshInterval && refreshInterval > 0 && !isPlaying) {
        intervalId = setInterval(() => {
            getPreview(isMounted);
        }, refreshInterval * 1000);
    }

    return () => { 
        isMounted = false; 
        if (intervalId) clearInterval(intervalId);
    };
  }, [entityId, isPlaying, refreshInterval, getPreview]);
  
  // Handle AutoPlay logic updates
  useEffect(() => {
      if (autoPlay) {
          setIsPlaying(true);
      }
  }, [autoPlay]);

  // Эффект для загрузки живого потока
  useEffect(() => {
    if (!isPlaying || !entityId) return;

    let isMounted = true;
    const setupStream = async () => {
      if (!isMounted) return;

      setStreamUrl(null); setError(null); setLoadState('loading'); setStreamType('none');
      
      // Сначала пытаемся получить HLS-поток.
      try {
        const streamData = await getCameraStreamUrl(entityId);
        if (isMounted && streamData && streamData.url) {
          const finalUrl = constructHaUrl(haUrl, streamData.url, 'http');
          setStreamUrl(finalUrl); setStreamType('hls'); setLoadState('loaded');
          return;
        } else if (isMounted) { throw new Error('API returned no stream URL.'); }
      } catch (err) {
        console.warn(`HLS stream failed for ${entityId}, falling back to MJPEG. Error:`, err);
      }

      // Если HLS не удался, пробуем MJPEG.
      try {
        const result = await signPath(`/api/camera_proxy_stream/${entityId}`);
        if (isMounted) {
          const finalUrl = constructHaUrl(haUrl, result.path, 'http');
          const urlWithCacheBuster = new URL(finalUrl);
          urlWithCacheBuster.searchParams.set('t', String(new Date().getTime()));
          setStreamUrl(urlWithCacheBuster.toString());
          setStreamType('mjpeg');
          setLoadState('loaded');
        }
      } catch (err) {
        if (isMounted) {
          console.error(`Failed to load MJPEG stream for ${entityId}:`, err);
          setError('Не удалось загрузить трансляцию.');
          setLoadState('error');
          setIsPlaying(false); // Go back to preview on error
        }
      }
    };

    setupStream();
    return () => { isMounted = false; };
  }, [isPlaying, entityId, haUrl, getCameraStreamUrl, signPath]);

  const LoadingIndicator = () => <div className="absolute inset-0 flex items-center justify-center bg-black/50"><LoadingSpinner /></div>;
  const ErrorIndicator = () => <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-red-400 text-center p-4"><p>{error}</p></div>;

  // Рендеринг состояния превью (до нажатия play)
  if (!isPlaying) {
    return (
      <div className="relative w-full h-full bg-black flex items-center justify-center group">
        {loadState === 'loading' && <LoadingIndicator />}
        {loadState === 'error' && <ErrorIndicator />}
        {previewUrl && (
          <>
            <img src={previewUrl} className="w-full h-full border-0 bg-black object-contain" alt={altText} />
            {showPlayButton && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <button 
                        onClick={(e) => { e.stopPropagation(); if (entityId) setIsPlaying(true); }} 
                        className="group/btn p-4 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md shadow-lg transition-all transform hover:scale-110 active:scale-95 pointer-events-auto ring-1 ring-white/30" 
                        title="Смотреть трансляцию"
                    >
                        <Icon icon="mdi:play" className="w-8 h-8 ml-1 fill-current drop-shadow-md" />
                    </button>
                </div>
            )}
          </>
        )}
        {loadState === 'idle' && (
          <div className="text-gray-500 text-center p-4">
            <Icon icon="mdi:cctv-off" className="w-10 h-10 mx-auto mb-2" />
            <p className="mt-2 text-sm">Камера не выбрана</p>
          </div>
        )}
      </div>
    );
  }

  // Рендеринг живого потока
  return (
    <div className="relative w-full h-full bg-black">
      {loadState === 'loading' && <LoadingIndicator />}
      {loadState === 'error' && <ErrorIndicator />}
      {loadState === 'loaded' && streamUrl && (
        <>
          {streamType === 'hls' && <VideoPlayer src={streamUrl} />}
          {streamType === 'mjpeg' && (
            <>
              <img src={streamUrl} className="w-full h-full object-contain" alt={altText} />
              <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/50 backdrop-blur-sm rounded-md text-white text-xs font-bold tracking-wider fade-in pointer-events-none">MJPEG</div>
            </>
          )}
        </>
      )}
    </div>
  );
};
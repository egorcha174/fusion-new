
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Hls from 'hls.js';
import { constructHaUrl } from '../utils/url';
import LoadingSpinner from './LoadingSpinner';
import { Icon } from '@iconify/react';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  onStreamReady?: () => void;
  onError?: () => void;
}

/**
 * Оптимизированный плеер HLS.
 * Включает capLevelToPlayerSize для экономии трафика на маленьких карточках.
 */
const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, poster, onStreamReady, onError }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    const handleReady = () => {
        if (onStreamReady) onStreamReady();
    };

    const handleError = () => {
        if (onError) onError();
    };

    if (Hls.isSupported()) {
      const hls = new Hls({ 
          capLevelToPlayerSize: true, // Критически важно: ограничивает качество размером элемента
          autoStartLoad: false, // Загружаем только когда элемент виден (контролируется IntersectionObserver выше)
          startLevel: -1,
          backBufferLength: 30,
      });
      hlsRef.current = hls;
      
      hls.loadSource(src);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // Запускаем загрузку только после привязки
        hls.startLoad();
        video.play().catch(e => console.warn("Autoplay prevented:", e));
      });

      hls.on(Hls.Events.FRAG_PARSED, () => {
          // Считаем поток готовым, когда распаршен первый фрагмент
          setTimeout(handleReady, 200);
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn("HLS Network error, trying to recover...");
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn("HLS Media error, trying to recover...");
              hls.recoverMediaError();
              break;
            default:
              console.error("HLS Fatal error:", data);
              hls.destroy();
              handleError();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS (Safari)
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(e => console.warn("Autoplay prevented:", e));
      });
      video.addEventListener('canplay', handleReady);
      video.addEventListener('error', handleError);
    }

    return () => { 
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }
        video.removeEventListener('canplay', handleReady);
        video.removeEventListener('error', handleError);
        video.removeAttribute('src');
        video.load();
    };
  }, [src, onStreamReady, onError]);

  return (
    <div className="w-full h-full bg-black flex items-center justify-center">
      <video 
        ref={videoRef} 
        className="w-full h-full object-cover" 
        poster={poster}
        muted 
        autoPlay 
        playsInline 
      />
      <div className="absolute top-2 left-2 px-2 py-0.5 bg-red-600/80 backdrop-blur-sm rounded text-white text-[10px] font-bold uppercase tracking-wider pointer-events-none z-10 animate-pulse">LIVE</div>
    </div>
  );
};

interface CameraStreamContentProps {
  entityId: string | null;
  haUrl: string;
  signPath: (path: string) => Promise<{ path: string }>;
  getCameraStreamUrl: (entityId: string) => Promise<{ url: string }>;
  altText?: string;
  refreshInterval?: number; // seconds for snapshot refresh
  autoPlay?: boolean; // If true, loads stream immediately. If false, loads snapshot.
  showPlayButton?: boolean;
}

export const CameraStreamContent: React.FC<CameraStreamContentProps> = ({ 
    entityId, 
    haUrl, 
    signPath, 
    getCameraStreamUrl, 
    altText = 'Камера',
    refreshInterval = 10,
    autoPlay = false,
    showPlayButton = true
}) => {
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [streamType, setStreamType] = useState<'hls' | 'mjpeg' | 'none'>('none');
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [isStreamActive, setIsStreamActive] = useState(autoPlay);
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false); // Intersection Observer state

  const containerRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
      isMountedRef.current = true;
      return () => { isMountedRef.current = false; };
  }, []);

  // Intersection Observer для ленивой загрузки
  useEffect(() => {
      const observer = new IntersectionObserver(
          ([entry]) => {
              setIsVisible(entry.isIntersecting);
          },
          { threshold: 0.1 } // Trigger when 10% visible
      );

      if (containerRef.current) {
          observer.observe(containerRef.current);
      }

      return () => observer.disconnect();
  }, []);

  // Fetch Snapshot (Lightweight mode)
  const fetchSnapshot = useCallback(async () => {
      if (!entityId || isStreamActive || !isVisible) return;

      try {
        // Используем camera_proxy, который возвращает изображение
        const result = await signPath(`/api/camera_proxy/${entityId}`);
        if (!isMountedRef.current) return;

        const url = constructHaUrl(haUrl, result.path, 'http');
        const urlWithCacheBuster = `${url}&t=${Date.now()}`;

        const img = new Image();
        img.onload = () => {
            if (isMountedRef.current) {
                setSnapshotUrl(urlWithCacheBuster);
                setError(null);
            }
        };
        img.onerror = () => {
            // Silent fail for snapshots to avoid flickering error states
            // console.warn("Snapshot load failed"); 
        };
        img.src = urlWithCacheBuster;

      } catch (err) {
          // Ignore auth errors during fast unmounts
      }
  }, [entityId, haUrl, signPath, isStreamActive, isVisible]);

  // Snapshot polling
  useEffect(() => {
      fetchSnapshot();
      const interval = setInterval(fetchSnapshot, refreshInterval * 1000);
      return () => clearInterval(interval);
  }, [fetchSnapshot, refreshInterval]);

  // Start Stream Logic
  const startStream = useCallback(async () => {
      if (!entityId || !isVisible) return;
      
      setIsLoading(true);
      setError(null);

      try {
          // 1. Попытка HLS
          try {
              const streamData = await getCameraStreamUrl(entityId);
              if (isMountedRef.current && streamData?.url) {
                  const finalUrl = constructHaUrl(haUrl, streamData.url, 'http');
                  setStreamUrl(finalUrl);
                  setStreamType('hls');
                  setIsLoading(false);
                  return;
              }
          } catch (e) {
              console.warn(`HLS not available for ${entityId}, falling back to MJPEG.`);
          }

          // 2. Фоллбек MJPEG
          const result = await signPath(`/api/camera_proxy_stream/${entityId}`);
          if (isMountedRef.current) {
              const finalUrl = constructHaUrl(haUrl, result.path, 'http');
              const urlWithCacheBuster = `${finalUrl}&t=${Date.now()}`; // MJPEG needs cache busting initially
              setStreamUrl(urlWithCacheBuster);
              setStreamType('mjpeg');
          }
      } catch (err) {
          if (isMountedRef.current) {
              setError("Не удалось загрузить поток");
              setIsStreamActive(false); // Revert to snapshot mode
          }
      } finally {
          if (isMountedRef.current) setIsLoading(false);
      }
  }, [entityId, haUrl, getCameraStreamUrl, signPath, isVisible]);

  // Handle AutoPlay changes
  useEffect(() => {
      if (autoPlay && isVisible) {
          setIsStreamActive(true);
      } else {
          setIsStreamActive(false);
      }
  }, [autoPlay, isVisible]);

  // Trigger stream load when active and visible
  useEffect(() => {
      if (isStreamActive && isVisible && !streamUrl) {
          startStream();
      } else if ((!isStreamActive || !isVisible) && streamUrl) {
          // Cleanup stream if we go inactive or invisible
          setStreamUrl(null);
          setStreamType('none');
      }
  }, [isStreamActive, isVisible, streamUrl, startStream]);


  if (!entityId) {
      return (
        <div ref={containerRef} className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center rounded-lg">
            <div className="text-gray-400 flex flex-col items-center">
                <Icon icon="mdi:camera-off" className="w-8 h-8 mb-1" />
                <span className="text-xs">Нет сигнала</span>
            </div>
        </div>
      );
  }

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black overflow-hidden rounded-lg group">
        
        {/* 1. Video Layer */}
        {isStreamActive && streamUrl && (
            <div className="absolute inset-0 z-10">
                {streamType === 'hls' ? (
                    <VideoPlayer 
                        src={streamUrl} 
                        poster={snapshotUrl || undefined}
                        onError={() => setError("Ошибка потока")}
                    />
                ) : (
                    <img 
                        src={streamUrl} 
                        className="w-full h-full object-cover" 
                        alt={altText}
                    />
                )}
            </div>
        )}

        {/* 2. Snapshot Layer (Visible when not streaming or loading) */}
        {(!isStreamActive || isLoading) && (
            <div className="absolute inset-0 z-0 flex items-center justify-center bg-gray-900">
                {snapshotUrl ? (
                    <img 
                        src={snapshotUrl} 
                        className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity duration-300" 
                        alt={altText} 
                    />
                ) : (
                    <div className="flex flex-col items-center text-gray-500">
                        <Icon icon="mdi:camera" className="w-10 h-10 opacity-20" />
                    </div>
                )}
            </div>
        )}

        {/* 3. Loading Overlay */}
        {isLoading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <LoadingSpinner />
            </div>
        )}

        {/* 4. Error Overlay */}
        {error && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60">
                <div className="text-center p-2">
                    <Icon icon="mdi:alert-circle" className="w-6 h-6 text-red-500 mx-auto" />
                    <p className="text-red-400 text-[10px] mt-1">{error}</p>
                    <button 
                        onClick={(e) => { e.stopPropagation(); startStream(); }} 
                        className="mt-2 px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-xs text-white"
                    >
                        Повторить
                    </button>
                </div>
            </div>
        )}

        {/* 5. Play Button Overlay (Only in snapshot mode) */}
        {!isStreamActive && showPlayButton && !error && (
            <div 
                className="absolute inset-0 z-20 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                onClick={(e) => { e.stopPropagation(); setIsStreamActive(true); }}
            >
                <div className="p-3 rounded-full bg-black/50 hover:bg-blue-600 text-white backdrop-blur-md transition-colors transform hover:scale-110">
                    <Icon icon="mdi:play" className="w-8 h-8" />
                </div>
            </div>
        )}
        
        {/* 6. Badge for Snapshot Mode */}
        {!isStreamActive && snapshotUrl && (
             <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/40 rounded text-white/70 text-[9px] pointer-events-none">
                 {refreshInterval}s
             </div>
        )}
    </div>
  );
};

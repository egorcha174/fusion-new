
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Hls from 'hls.js';
import { constructHaUrl } from '../utils/url';
import LoadingSpinner from './LoadingSpinner';
import { Icon } from '@iconify/react';

interface VideoPlayerProps {
  src: string;
  onStreamReady?: () => void;
}

/**
 * Внутренний компонент-плеер для HLS-потоков.
 * Использует библиотеку hls.js для воспроизведения, если она поддерживается браузером.
 * В противном случае (например, в Safari) использует нативную поддержку HLS в теге <video>.
 */
const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, onStreamReady }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    // Функция, вызываемая когда видео готово к отображению (первый кадр)
    const handleReady = () => {
        if (onStreamReady) onStreamReady();
    };

    if (Hls.isSupported()) {
      const hls = new Hls({ 
          lowLatencyMode: true, 
          backBufferLength: 90,
          enableWorker: true,
      });
      hlsRef.current = hls;
      
      hls.loadSource(src);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(e => console.warn("Autoplay was prevented.", e));
      });

      // Отслеживаем появление первого кадра или парсинг фрагмента
      hls.on(Hls.Events.FRAG_PARSED, () => {
          // Небольшая задержка, чтобы убедиться, что рендеринг успел за декодированием
          setTimeout(handleReady, 100);
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
      video.addEventListener('canplay', handleReady);
    } else {
        // Fallback logic for direct file playback if browsers support it
        video.src = src;
        video.addEventListener('canplay', handleReady);
    }

    return () => { 
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }
        // Remove event listeners if native
        video.removeEventListener('canplay', handleReady);
    };
  }, [src, onStreamReady]);

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center group">
      <video 
        ref={videoRef} 
        className="w-full h-full object-contain" 
        muted 
        autoPlay 
        playsInline 
        // onCanPlay может сработать раньше для нативного воспроизведения
        onCanPlay={() => onStreamReady && onStreamReady()}
      />
      <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/50 backdrop-blur-sm rounded-md text-white text-xs font-bold tracking-wider fade-in pointer-events-none z-10">LIVE</div>
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
 * Реализует многоступенчатую логику загрузки с предзагрузкой (preloading) для предотвращения моргания и черных экранов.
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
  // Stream State
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [streamType, setStreamType] = useState<'hls' | 'mjpeg' | 'none'>('none');
  
  // Preview Image State
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(null);
  
  // Loading / UI State
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isVideoReady, setIsVideoReady] = useState(false); // True, когда видео реально начало играть
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const isMountedRef = useRef(true);
  const activePreviewUrlRef = useRef<string | null>(null);
  const retryCountRef = useRef(0);

  useEffect(() => {
      isMountedRef.current = true;
      return () => { isMountedRef.current = false; };
  }, []);

  // Keep ref in sync for callbacks
  useEffect(() => {
      activePreviewUrlRef.current = activePreviewUrl;
  }, [activePreviewUrl]);

  // Обновление превью (с предзагрузкой, чтобы не моргало)
  const updatePreview = useCallback(async () => {
      if (!entityId || isPlaying) return; // Не обновляем превью, если смотрим видео

      try {
        const result = await signPath(`/api/camera_proxy/${entityId}`);
        if (!isMountedRef.current) return;

        const url = constructHaUrl(haUrl, result.path, 'http');
        const urlWithCacheBuster = new URL(url);
        urlWithCacheBuster.searchParams.set('t', String(new Date().getTime()));
        const newUrl = urlWithCacheBuster.toString();

        // Предзагрузка изображения перед показом
        const img = new Image();
        img.onload = () => {
            if (isMountedRef.current) {
                setActivePreviewUrl(newUrl);
                setIsInitialLoad(false);
                setError(null); // Clear error on success
                retryCountRef.current = 0; // Reset retry count
            }
        };
        img.onerror = (e) => {
            console.warn("Failed to preload camera image", e);
            if (isMountedRef.current) {
                // Если изображение уже есть, просто оставляем старое (silent fail), чтобы не моргало
                if (activePreviewUrlRef.current) return;

                // Логика ретраев для первоначальной загрузки
                if (retryCountRef.current < 3) {
                    retryCountRef.current++;
                    console.log(`Retrying image load (${retryCountRef.current}/3)...`);
                    setTimeout(updatePreview, 1000); // Retry after 1s
                } else {
                    // Если все попытки исчерпаны, показываем ошибку
                    setError('Ошибка загрузки изображения');
                    setIsInitialLoad(false);
                }
            }
        };
        img.src = newUrl;
      } catch (err) {
        console.error(`Failed to get preview path for ${entityId}:`, err);
        if (isMountedRef.current && !activePreviewUrlRef.current) {
             setError('Ошибка доступа к камере');
             setIsInitialLoad(false);
        }
      }
  }, [entityId, haUrl, signPath, isPlaying]);

  // Reset State when Entity Changes
  useEffect(() => {
    setIsPlaying(autoPlay);
    setIsVideoReady(false);
    setStreamUrl(null);
    setStreamType('none');
    setActivePreviewUrl(null);
    setError(null);
    setIsInitialLoad(true);
    retryCountRef.current = 0;
  }, [entityId, autoPlay]);

  // Timer for Preview Updates
  useEffect(() => {
    if (!isPlaying) {
        updatePreview();
    }

    const intervalId = (refreshInterval && refreshInterval > 0 && !isPlaying) 
        ? setInterval(updatePreview, refreshInterval * 1000) 
        : null;

    return () => { 
        if (intervalId) clearInterval(intervalId);
    };
  }, [refreshInterval, isPlaying, updatePreview]);

  // Логика запуска видеопотока
  useEffect(() => {
    if (!isPlaying || !entityId) return;

    let isMounted = true;
    
    const startStream = async () => {
      setError(null);
      setIsVideoReady(false); // Сбрасываем флаг готовности, чтобы показать превью поверх видео пока оно грузится

      // 1. Попытка HLS
      try {
        const streamData = await getCameraStreamUrl(entityId);
        if (isMounted && streamData && streamData.url) {
          const finalUrl = constructHaUrl(haUrl, streamData.url, 'http');
          setStreamUrl(finalUrl); 
          setStreamType('hls');
          return;
        }
      } catch (err) {
        console.warn(`HLS failed for ${entityId}, trying MJPEG...`);
      }

      // 2. Фоллбек на MJPEG
      try {
        const result = await signPath(`/api/camera_proxy_stream/${entityId}`);
        if (isMounted) {
          const finalUrl = constructHaUrl(haUrl, result.path, 'http');
          // Для MJPEG тоже добавляем bust, но он обычно долгоживущий
          const urlWithCacheBuster = new URL(finalUrl);
          urlWithCacheBuster.searchParams.set('t', String(new Date().getTime()));
          
          setStreamUrl(urlWithCacheBuster.toString());
          setStreamType('mjpeg');
          // MJPEG "готов" почти сразу, как только начнется загрузка картинки
          setIsVideoReady(true); 
        }
      } catch (err) {
        if (isMounted) {
          setError('Ошибка загрузки потока');
          setIsPlaying(false);
        }
      }
    };

    startStream();
    return () => { isMounted = false; };
  }, [isPlaying, entityId, haUrl, getCameraStreamUrl, signPath]);

  const handleVideoReady = () => {
      setIsVideoReady(true);
  };

  // --- RENDER LOGIC ---
  
  if (!entityId) {
      return (
        <div className="relative w-full h-full bg-black flex items-center justify-center group rounded-lg overflow-hidden">
            <div className="text-gray-500 text-center p-4">
                <Icon icon="mdi:cctv-off" className="w-10 h-10 mx-auto mb-2" />
                <p className="mt-2 text-sm">Камера не выбрана</p>
            </div>
        </div>
      );
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden rounded-lg">
      {/* 
          LAYER 1: VIDEO PLAYER (Bottom) 
          Рендерим его, если isPlaying = true. 
          Он может быть еще черным (грузится), поэтому сверху может лежать превью.
      */}
      {isPlaying && streamUrl && (
          <div className="absolute inset-0 z-0 flex items-center justify-center">
              {streamType === 'hls' ? (
                  <VideoPlayer src={streamUrl} onStreamReady={handleVideoReady} />
              ) : (
                  <div className="relative w-full h-full">
                    <img 
                        src={streamUrl} 
                        className="w-full h-full object-contain" 
                        alt={altText} 
                        onLoad={() => setIsVideoReady(true)}
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/50 backdrop-blur-sm rounded-md text-white text-xs font-bold tracking-wider pointer-events-none">MJPEG</div>
                  </div>
              )}
          </div>
      )}

      {/* 
          LAYER 2: STATIC PREVIEW (Top)
          Показываем, если:
          1. Мы НЕ играем видео (!isPlaying)
          2. ИЛИ мы играем видео, но оно еще не готово (!isVideoReady) - чтобы скрыть черный экран загрузки
          
          Используем opacity для плавного перехода.
      */}
      <div 
        className="absolute inset-0 z-10 bg-black flex items-center justify-center transition-opacity duration-500 ease-in-out pointer-events-none"
        style={{ opacity: (isPlaying && isVideoReady) ? 0 : 1 }}
      >
          {activePreviewUrl ? (
              <img 
                src={activePreviewUrl} 
                className="w-full h-full object-contain" 
                alt={altText} 
              />
          ) : (
              // Если нет URL...
              <div className="flex flex-col items-center justify-center text-gray-500">
                  {isInitialLoad ? (
                      <LoadingSpinner />
                  ) : (
                      // Если не загрузка и нет URL - значит ошибка, которую мы обработаем ниже, или просто пусто
                      <div className="w-full h-full bg-black" />
                  )}
              </div>
          )}
          
          {/* Показываем ошибку поверх превью, если есть */}
          {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 pointer-events-auto">
                  <div className="text-center p-4">
                      <Icon icon="mdi:alert-circle-outline" className="w-8 h-8 text-red-500 mx-auto mb-2" />
                      <p className="text-red-400 text-sm">{error}</p>
                      {/* Manual Retry Button */}
                      <button 
                        onClick={(e) => { e.stopPropagation(); retryCountRef.current = 0; setIsInitialLoad(true); setError(null); updatePreview(); }}
                        className="mt-3 px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-xs text-white transition-colors"
                      >
                        Повторить
                      </button>
                  </div>
              </div>
          )}
      </div>

      {/* 
          LAYER 3: CONTROLS (Overlay)
          Кнопка Play. Видна только если мы НЕ играем.
          pointer-events-auto нужна, чтобы клик прошел сквозь прозрачный слой превью (если он исчезает) или попал сюда.
      */}
      {!isPlaying && showPlayButton && !error && activePreviewUrl && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-auto group cursor-pointer" onClick={(e) => { e.stopPropagation(); setIsPlaying(true); }}>
            <button 
                className="p-4 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md shadow-lg transition-all transform group-hover:scale-110 active:scale-95 ring-1 ring-white/30" 
                title="Смотреть трансляцию"
            >
                {isInitialLoad && !activePreviewUrl ? (
                    <LoadingSpinner /> 
                ) : (
                    <Icon icon="mdi:play" className="w-8 h-8 ml-1 fill-current drop-shadow-md" />
                )}
            </button>
        </div>
      )}
      
      {/* Loader Video - показываем спиннер поверх всего, если нажали Play, но видео еще не готово */}
      {isPlaying && !isVideoReady && !error && (
          <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
              <div className="bg-black/40 p-3 rounded-full backdrop-blur-sm">
                <LoadingSpinner />
              </div>
          </div>
      )}
    </div>
  );
};

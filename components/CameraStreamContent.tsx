
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Hls from 'hls.js';
import { constructHaUrl } from '../utils/url';
import LoadingSpinner from './LoadingSpinner';
import { Icon } from '@iconify/react';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  muted?: boolean;
  onStreamReady?: () => void;
  onError?: () => void;
}

/**
 * A robust video player that handles both HLS streams and direct video files (MP4/WebM).
 * Prioritizes native HLS (Safari) and falls back to hls.js.
 */
const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, poster, muted = true, onStreamReady, onError }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  
  // Use refs for callbacks to avoid effect re-runs on render
  const onStreamReadyRef = useRef(onStreamReady);
  const onErrorRef = useRef(onError);

  useEffect(() => {
      onStreamReadyRef.current = onStreamReady;
      onErrorRef.current = onError;
  }, [onStreamReady, onError]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    const isHls = (url: string) => {
        try {
            return url.split('?')[0].toLowerCase().endsWith('.m3u8');
        } catch {
            return false;
        }
    };

    // Cleanup previous HLS instance if any (safety check)
    if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
    }

    const attemptPlay = async () => {
        if (!video) return;
        try {
            await video.play();
        } catch (e) {
            // Autoplay might be blocked, but stream is ready
        } finally {
            if (onStreamReadyRef.current) onStreamReadyRef.current();
        }
    };

    const handleError = () => {
         if (onErrorRef.current) onErrorRef.current();
    };

    const handleNativeHls = () => {
        video.src = src;
        video.addEventListener('loadedmetadata', attemptPlay);
        video.addEventListener('error', handleError);
    };

    const handleDirectFile = () => {
        video.src = src;
        video.addEventListener('loadedmetadata', attemptPlay);
        video.addEventListener('error', handleError);
        video.load();
    };

    if (isHls(src)) {
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // Native HLS support (Safari)
            handleNativeHls();
        } else if (Hls.isSupported()) {
            // MSE HLS support (Chrome, Firefox, etc.)
            const hls = new Hls({
                capLevelToPlayerSize: true,
                maxBufferLength: 30,
                startLevel: -1, // Auto start level
            });
            hlsRef.current = hls;
            
            try {
                hls.loadSource(src);
                hls.attachMedia(video);
            } catch (e) {
                console.error('HLS Attach Error:', e);
                handleError();
            }

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                attemptPlay();
            });

            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    console.error('HLS Fatal Error:', data);
                    hls.destroy();
                    handleError();
                }
            });
        } else {
            console.error('HLS not supported in this browser');
            handleError();
        }
    } else {
        // Not an .m3u8 file, assume direct MP4/WebM
        handleDirectFile();
    }

    return () => { 
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }
        if (video) {
            video.removeEventListener('loadedmetadata', attemptPlay);
            video.removeEventListener('error', handleError);
            video.pause();
            video.removeAttribute('src');
            video.load();
        }
    };
  }, [src]); // Dependencies reduced to src only

  return (
    <div className="w-full h-full bg-black flex items-center justify-center relative">
      <video 
        ref={videoRef} 
        className="w-full h-full object-cover" 
        poster={poster}
        muted={muted}
        playsInline 
      />
    </div>
  );
};

interface CameraStreamContentProps {
  entityId: string | null;
  haUrl: string;
  signPath: (path: string) => Promise<{ path: string }>;
  getCameraStreamUrl: (entityId: string) => Promise<{ url: string }>;
  altText?: string;
  refreshInterval?: number;
  autoPlay?: boolean;
  showPlayButton?: boolean;
  // New props to allow direct usage without internal logic
  streamUrlOverride?: string;
  snapshotUrlOverride?: string | null;
  onStreamReady?: () => void;
  onError?: () => void;
  muted?: boolean;
}

export const CameraStreamContent: React.FC<CameraStreamContentProps> = ({ 
    entityId, 
    haUrl, 
    signPath, 
    getCameraStreamUrl, 
    altText = 'Камера',
    refreshInterval = 10,
    autoPlay = false,
    showPlayButton = true,
    streamUrlOverride,
    snapshotUrlOverride,
    onStreamReady,
    onError,
    muted = true
}) => {
  const [streamUrl, setStreamUrl] = useState<string | null>(streamUrlOverride || null);
  const [streamType, setStreamType] = useState<'hls' | 'mjpeg' | 'none'>('none');
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(snapshotUrlOverride || null);
  
  const [error, setError] = useState<string | null>(null);
  const [isStreamActive, setIsStreamActive] = useState(autoPlay || !!streamUrlOverride);
  const [isLoading, setIsLoading] = useState(!!streamUrlOverride);
  const isMountedRef = useRef(true);

  // If overrides are provided (from UniversalCameraCard), rely on them
  const isManagedMode = !!streamUrlOverride;

  useEffect(() => {
      isMountedRef.current = true;
      return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => {
      if (streamUrlOverride) {
          setStreamUrl(streamUrlOverride);
          setStreamType('hls'); // Uses the unified VideoPlayer
          setIsLoading(true);
      }
  }, [streamUrlOverride]);

  // Safety timeout for loading
  useEffect(() => {
      let timeout: ReturnType<typeof setTimeout>;
      if (isLoading) {
          timeout = setTimeout(() => {
              if(isMountedRef.current && isLoading) {
                  setIsLoading(false);
              }
          }, 15000);
      }
      return () => clearTimeout(timeout);
  }, [isLoading]);

  // Initial Snapshot Load (only if not managed)
  useEffect(() => {
      if (entityId && !isManagedMode) fetchSnapshot();
  }, [entityId, isManagedMode]);

  const fetchSnapshot = useCallback(async () => {
      if (!entityId || isManagedMode) return;
      try {
        if (entityId.startsWith('internal::')) return;

        const result = await signPath(`/api/camera_proxy/${entityId}`);
        if (!isMountedRef.current) return;
        const url = constructHaUrl(haUrl, result.path, 'http');
        
        const img = new Image();
        const finalUrl = `${url}&t=${Date.now()}`;
        img.onload = () => {
            if(isMountedRef.current) setSnapshotUrl(finalUrl);
        };
        img.src = finalUrl;
        
        if(!isStreamActive) setError(null);
      } catch (err) {
          // Silent fallback
      }
  }, [entityId, haUrl, signPath, isStreamActive, isManagedMode]);

  useEffect(() => {
      if (!isStreamActive && !isManagedMode) {
          const interval = setInterval(fetchSnapshot, refreshInterval * 1000);
          return () => clearInterval(interval);
      }
  }, [fetchSnapshot, refreshInterval, isStreamActive, isManagedMode]);

  const startStream = useCallback(async () => {
      if (!entityId || isManagedMode) return;
      setIsLoading(true);
      setError(null);

      try {
          // Try HLS first
          try {
              const streamData = await getCameraStreamUrl(entityId);
              if (isMountedRef.current && streamData?.url) {
                  setStreamUrl(constructHaUrl(haUrl, streamData.url, 'http'));
                  setStreamType('hls'); // Uses unified VideoPlayer
                  return; 
              }
          } catch (e) {}

          // Fallback to MJPEG
          const result = await signPath(`/api/camera_proxy_stream/${entityId}`);
          if (isMountedRef.current) {
              const finalUrl = constructHaUrl(haUrl, result.path, 'http');
              setStreamUrl(`${finalUrl}&t=${Date.now()}`);
              setStreamType('mjpeg');
              setIsLoading(false);
          }
      } catch (err) {
          if (isMountedRef.current) {
              setError("Ошибка подключения");
              setIsLoading(false);
              setIsStreamActive(false);
          }
      }
  }, [entityId, haUrl, getCameraStreamUrl, signPath, isManagedMode]);

  useEffect(() => {
      if (!isManagedMode) {
          if (isStreamActive && !streamUrl) startStream();
          else if (!isStreamActive) {
              setStreamUrl(null);
              setStreamType('none');
              setIsLoading(false);
          }
      }
  }, [isStreamActive, streamUrl, startStream, isManagedMode]);

  const handleStreamReady = () => {
      setIsLoading(false);
      if (onStreamReady) onStreamReady();
  };

  const handleError = () => {
      setError("Ошибка потока");
      setIsLoading(false);
      if (onError) onError();
  };

  // If used purely as a player component (isManagedMode), just render the player
  if (isManagedMode) {
      return (
          <VideoPlayer 
              src={streamUrlOverride!} 
              poster={snapshotUrlOverride || undefined}
              onStreamReady={handleStreamReady}
              onError={handleError}
              muted={muted}
          />
      );
  }

  if (!entityId) {
      return (
        <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center rounded-lg text-gray-400">
            <Icon icon="mdi:camera-off" className="w-10 h-10" />
        </div>
      );
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden rounded-lg group">
        {/* Snapshot Layer */}
        <div className="absolute inset-0 z-[1] flex items-center justify-center">
            {snapshotUrl ? (
                <img src={snapshotUrl} className="w-full h-full object-cover opacity-70" alt={altText} />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-600">
                    <Icon icon="mdi:cctv" className="w-12 h-12" />
                </div>
            )}
        </div>

        {/* Stream Layer */}
        {isStreamActive && streamUrl && !error && (
            <div className="absolute inset-0 z-[2]">
                {streamType === 'hls' ? (
                    <VideoPlayer 
                        src={streamUrl} 
                        poster={snapshotUrl || undefined}
                        onStreamReady={handleStreamReady}
                        onError={handleError}
                        muted={muted}
                    />
                ) : (
                    <img src={streamUrl} className="w-full h-full object-cover" alt={altText} onError={() => setError("Ошибка MJPEG")} />
                )}
            </div>
        )}

        {/* Loading Overlay */}
        {isLoading && (
            <div className="absolute inset-0 z-[3] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <LoadingSpinner />
            </div>
        )}

        {/* Error Overlay */}
        {error && (
            <div className="absolute inset-0 z-[4] flex flex-col items-center justify-center bg-black/70 p-4 text-center">
                <Icon icon="mdi:alert-circle" className="w-8 h-8 text-red-500 mb-2" />
                <p className="text-xs text-white mb-2">{error}</p>
                <button onClick={() => startStream()} className="px-3 py-1 bg-white/20 rounded text-xs text-white hover:bg-white/30 backdrop-blur-md">
                    Повторить
                </button>
            </div>
        )}

        {/* Play Button Overlay (Manual Mode) */}
        {!isStreamActive && showPlayButton && !error && (
            <div 
                className="absolute inset-0 z-[3] flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => { e.stopPropagation(); setIsStreamActive(true); }}
            >
                <div className="p-3 rounded-full bg-white/20 backdrop-blur-md hover:bg-blue-600 hover:text-white transition-all shadow-lg">
                    <Icon icon="mdi:play" className="w-8 h-8 text-white" />
                </div>
            </div>
        )}
        
        {/* Live Badge */}
        {isStreamActive && !error && !isLoading && (
             <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-red-600/80 backdrop-blur-sm rounded text-white text-[9px] font-bold uppercase tracking-wider pointer-events-none z-[5] animate-pulse">
                LIVE
            </div>
        )}
    </div>
  );
};

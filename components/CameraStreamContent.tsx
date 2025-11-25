
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

const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, poster, onStreamReady, onError }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    if (Hls.isSupported()) {
      const hls = new Hls({ 
          capLevelToPlayerSize: true,
          startLevel: -1, 
      });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
        if (onStreamReady) onStreamReady();
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
            hls.destroy();
            if (onError) onError();
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(() => {});
        if (onStreamReady) onStreamReady();
      });
      video.addEventListener('error', () => {
          if (onError) onError();
      });
    }

    return () => { 
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }
        if (video) {
            video.removeAttribute('src');
            video.load();
        }
    };
  }, [src, onStreamReady, onError]);

  return (
    <div className="w-full h-full bg-black flex items-center justify-center relative">
      <video 
        ref={videoRef} 
        className="w-full h-full object-cover" 
        poster={poster}
        muted 
        autoPlay 
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
  const isMountedRef = useRef(true);

  useEffect(() => {
      isMountedRef.current = true;
      return () => { isMountedRef.current = false; };
  }, []);

  // Safety timeout for loading
  useEffect(() => {
      let timeout: ReturnType<typeof setTimeout>;
      if (isLoading) {
          timeout = setTimeout(() => {
              if(isMountedRef.current && isLoading) {
                  setIsLoading(false);
                  // Don't force error state, let it show what it can
              }
          }, 15000);
      }
      return () => clearTimeout(timeout);
  }, [isLoading]);

  // Initial Snapshot Load
  useEffect(() => {
      if (entityId) fetchSnapshot();
  }, [entityId]);

  const fetchSnapshot = useCallback(async () => {
      if (!entityId) return;
      try {
        // Only works for standard HA cameras
        if (entityId.startsWith('internal::')) return;

        const result = await signPath(`/api/camera_proxy/${entityId}`);
        if (!isMountedRef.current) return;
        const url = constructHaUrl(haUrl, result.path, 'http');
        
        // Preload
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
  }, [entityId, haUrl, signPath, isStreamActive]);

  useEffect(() => {
      if (!isStreamActive) {
          const interval = setInterval(fetchSnapshot, refreshInterval * 1000);
          return () => clearInterval(interval);
      }
  }, [fetchSnapshot, refreshInterval, isStreamActive]);

  const startStream = useCallback(async () => {
      if (!entityId) return;
      setIsLoading(true);
      setError(null);

      try {
          // Try HLS first
          try {
              const streamData = await getCameraStreamUrl(entityId);
              if (isMountedRef.current && streamData?.url) {
                  setStreamUrl(constructHaUrl(haUrl, streamData.url, 'http'));
                  setStreamType('hls');
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
  }, [entityId, haUrl, getCameraStreamUrl, signPath]);

  useEffect(() => {
      if (isStreamActive && !streamUrl) startStream();
      else if (!isStreamActive) {
          setStreamUrl(null);
          setStreamType('none');
          setIsLoading(false);
      }
  }, [isStreamActive, streamUrl, startStream]);

  if (!entityId) {
      return (
        <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center rounded-lg text-gray-400">
            <Icon icon="mdi:camera-off" className="w-10 h-10" />
        </div>
      );
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden rounded-lg group">
        {/* Snapshot Layer (Always visible underneath) */}
        <div className="absolute inset-0 z-0 flex items-center justify-center">
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
            <div className="absolute inset-0 z-10">
                {streamType === 'hls' ? (
                    <VideoPlayer 
                        src={streamUrl} 
                        poster={snapshotUrl || undefined}
                        onStreamReady={() => setIsLoading(false)}
                        onError={() => { setError("Ошибка потока"); setIsLoading(false); }}
                    />
                ) : (
                    <img src={streamUrl} className="w-full h-full object-cover" alt={altText} onError={() => setError("Ошибка MJPEG")} />
                )}
            </div>
        )}

        {/* Loading Overlay */}
        {isLoading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <LoadingSpinner />
            </div>
        )}

        {/* Error Overlay */}
        {error && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/70 p-4 text-center">
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
                className="absolute inset-0 z-20 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => { e.stopPropagation(); setIsStreamActive(true); }}
            >
                <div className="p-3 rounded-full bg-white/20 backdrop-blur-md hover:bg-blue-600 hover:text-white transition-all shadow-lg">
                    <Icon icon="mdi:play" className="w-8 h-8 text-white" />
                </div>
            </div>
        )}
        
        {/* Live Badge */}
        {isStreamActive && !error && !isLoading && (
             <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-red-600/80 backdrop-blur-sm rounded text-white text-[9px] font-bold uppercase tracking-wider pointer-events-none z-40 animate-pulse">
                LIVE
            </div>
        )}
    </div>
  );
};

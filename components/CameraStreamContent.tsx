
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Hls from 'hls.js';
import { constructHaUrl } from '../utils/url';
import MjpegStreamer from './MjpegStreamer';

interface VideoPlayerProps {
  src: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ src }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const setupHls = useCallback(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    let hls: Hls;

    if (Hls.isSupported()) {
      const token = localStorage.getItem('ha-token');
      hls = new Hls({
          lowLatencyMode: true,
          backBufferLength: 90,
          xhrSetup: (xhr) => {
              if (token) {
                  xhr.setRequestHeader('Authorization', `Bearer ${token}`);
              }
          }
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(e => console.warn("Autoplay was prevented.", e));
      });
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('HLS fatal network error encountered, trying to recover');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('HLS fatal media error encountered, trying to recover');
              hls.recoverMediaError();
              break;
            default:
              console.error('HLS fatal error, cannot recover');
              hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(e => console.warn("Autoplay was prevented.", e));
      });
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [src]);

  useEffect(setupHls, [setupHls]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, []);

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center group">
      <video ref={videoRef} className="w-full h-full object-contain" muted autoPlay playsInline />

      <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/50 backdrop-blur-sm rounded-md text-white text-xs font-bold tracking-wider fade-in">
        RTC
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-auto z-10">
        <div className="flex items-center gap-3">
          <button onClick={togglePlay} className="text-white flex-shrink-0 p-1">
            {isPlaying ? (
              <svg className="w-6 h-6" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v4a1 1 0 11-2 0V8z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-6 h-6" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
            )}
          </button>
          
          <div className="w-full h-1.5 bg-gray-500/50 rounded-full flex items-center">
            <div className="w-full h-full bg-gray-400/80 rounded-full"></div>
          </div>
          
        </div>
      </div>
    </div>
  );
};


interface CameraStreamContentProps {
  entityId?: string | null;
  haUrl: string;
  signPath: (path: string) => Promise<{ path: string }>;
  getCameraStreamUrl: (entityId: string) => Promise<string>;
  altText?: string;
}

export const CameraStreamContent: React.FC<CameraStreamContentProps> = ({
  entityId,
  haUrl,
  signPath,
  getCameraStreamUrl,
  altText = 'Прямая трансляция',
}) => {
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [streamType, setStreamType] = useState<'hls' | 'mjpeg' | 'none'>('none');
  const [isPlaying, setIsPlaying] = useState(false);

  // Effect for the initial preview image
  useEffect(() => {
    let isMounted = true;
    const getPreview = async () => {
      if (!isMounted) return;
      if (!entityId || !haUrl) {
        setLoadState('idle');
        return;
      }

      setLoadState('loading');
      setError(null);
      setPreviewUrl(null);

      try {
        const result = await signPath(`/api/camera_proxy/${entityId}`);
        if (isMounted) {
          setPreviewUrl(constructHaUrl(haUrl, result.path, 'http'));
          setLoadState('loaded');
        }
      } catch (err) {
        if (isMounted) {
          console.error(`Failed to get preview URL for ${entityId}:`, err);
          setError("Не удалось загрузить превью камеры.");
          setLoadState('error');
        }
      }
    };

    getPreview();
    
    // When entityId changes, reset the playing state
    setIsPlaying(false);

    return () => { isMounted = false; };
  }, [entityId, haUrl, signPath]);
  
  // Effect for the live stream when user clicks play
  useEffect(() => {
    if (!isPlaying || !entityId) return;

    let isMounted = true;
    const setupStream = async () => {
      if (!isMounted) return;

      setStreamUrl(null);
      setError(null);
      setLoadState('loading');
      setStreamType('none');
      
      // Try HLS first
      try {
        if (getCameraStreamUrl) {
          const hlsUrlPath = await getCameraStreamUrl(entityId);
          if (isMounted) {
            const finalUrl = constructHaUrl(haUrl, hlsUrlPath, 'http');
            setStreamUrl(finalUrl);
            setStreamType('hls');
            setLoadState('loaded');
            return;
          }
        }
      } catch (err) {
        console.warn(`Failed to get HLS stream for ${entityId}, falling back to MJPEG. Error:`, err);
      }

      // Fallback to MJPEG
      try {
        const result = await signPath(`/api/camera_proxy_stream/${entityId}`);
        if (isMounted) {
          const pathWithCacheBuster = `${result.path}&t=${new Date().getTime()}`;
          const finalUrl = constructHaUrl(haUrl, pathWithCacheBuster, 'http');
          setStreamUrl(finalUrl);
          setStreamType('mjpeg');
          setLoadState('loaded');
        }
      } catch (err) {
        if (isMounted) {
          console.error(`Failed to get signed MJPEG URL for ${entityId}:`, err);
          setError("Не удалось получить URL для камеры от Home Assistant.");
          setLoadState('error');
        }
      }
    };

    setupStream();

    return () => { isMounted = false; };
  }, [isPlaying, entityId, haUrl, signPath, getCameraStreamUrl]);

  const LoadingIndicator = () => (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-dashed rounded-full animate-spin border-gray-400"></div>
    </div>
  );
  
  const ErrorIndicator = () => (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 p-2 text-center bg-gray-800/80">
      <p className="text-sm font-semibold">Ошибка</p>
      <p className="text-xs text-gray-400 mt-1">{error}</p>
    </div>
  );

  if (!isPlaying) {
    return (
      <div 
        className="relative w-full h-full bg-black flex items-center justify-center group" 
      >
        {loadState === 'loading' && <LoadingIndicator />}
        {loadState === 'error' && <ErrorIndicator />}
        {loadState === 'loaded' && previewUrl && (
          <>
            <img
              src={previewUrl}
              className="w-full h-full border-0 bg-black object-contain"
              alt={altText}
            />
            <div className="absolute inset-0 flex items-end justify-start p-3 z-[5]">
                <button 
                    onClick={(e) => { e.stopPropagation(); if (entityId) setIsPlaying(true); }}
                    className="bg-black/30 backdrop-blur-sm rounded-full p-2 hover:bg-black/50 transition-all opacity-0 group-hover:opacity-100"
                    title="Воспроизвести"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white/90" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>
          </>
        )}
        {loadState === 'idle' && (
           <div className="text-gray-500 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.55a2 2 0 01.95 1.664V16a2 2 0 01-2 2H5a2 2 0 01-2 2v-2.336a2 2 0 01.95-1.664L8 10l3 3 4-3z" />
            </svg>
            <p className="mt-2 text-sm">Камера не выбрана</p>
           </div>
        )}
      </div>
    );
  }

  // isPlaying is true
  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center">
      {loadState === 'loading' && <LoadingIndicator />}
      {loadState === 'error' && <ErrorIndicator />}
      {loadState === 'loaded' && streamUrl && (
        streamType === 'hls' ? (
          <VideoPlayer src={streamUrl} />
        ) : (
          <MjpegStreamer src={streamUrl} altText={altText} />
        )
      )}
    </div>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

interface CameraStreamContentProps {
  streamUrl: string | null;
  type: 'hls' | 'mjpeg' | 'iframe' | 'file' | 'mp4' | 'none';
  posterUrl?: string | null;
  muted?: boolean;
  autoPlay?: boolean;
  onLoaded?: () => void;
  onError?: (msg: string) => void;
  className?: string;
  retryAttempts?: number;
  retryDelay?: number;
}

export const CameraStreamContent: React.FC<CameraStreamContentProps> = ({
  streamUrl,
  type,
  posterUrl,
  muted = true,
  autoPlay = true,
  onLoaded,
  onError,
  className = "w-full h-full object-cover",
  retryAttempts = 3,
  retryDelay = 1000,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const retryCountRef = useRef<number>(0);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Reset error and loading state when URL changes
  useEffect(() => {
    setHasError(false);
    setIsLoading(true);
    retryCountRef.current = 0;
  }, [streamUrl, type]);

  // Helper function to detect stream type by URL
  const detectStreamType = (url: string): 'hls' | 'mp4' | 'mjpeg' => {
    if (!url) return 'mp4';
    const urlLower = url.split('?')[0].toLowerCase();
    if (urlLower.endsWith('.m3u8')) return 'hls';
    if (urlLower.endsWith('.mp4')) return 'mp4';
    if (urlLower.endsWith('.mjpeg') || urlLower.includes('mjpeg')) return 'mjpeg';
    // Default to mp4 for unknown formats
    return 'mp4';
  };

  // Retry logic with exponential backoff
  const retryStream = (retryFn: () => void) => {
    if (retryCountRef.current < retryAttempts) {
      retryCountRef.current += 1;
      const delay = retryDelay * retryCountRef.current;
      console.warn(`Retrying stream (attempt ${retryCountRef.current}/${retryAttempts}) after ${delay}ms`);
      setTimeout(() => {
        retryFn();
      }, delay);
    } else {
      setHasError(true);
      if (onError) onError('Stream failed after multiple retries');
    }
  };

  // Main video playback logic for HLS and MP4/File
  useEffect(() => {
    if (!streamUrl || (type !== 'hls' && type !== 'file' && type !== 'mp4')) return;

    const video = videoRef.current;
    if (!video) return;

    setIsLoading(true);

    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const handleVideoLoaded = () => {
      setIsLoading(false);
      setHasError(false);
      if (onLoaded) onLoaded();
    };

    const handleError = (e: Event | string) => {
      console.error('Video Error:', e);
      setIsLoading(false);
      const errorMsg = typeof e === 'string' ? e : 'Ошибка воспроизведения';
      
      // Try to retry before giving up
      retryStream(() => {
        if (type === 'hls' || type === 'mp4' || type === 'file') {
          loadStream();
        }
      });

      if (retryCountRef.current >= retryAttempts) {
        if (onError) onError(errorMsg);
      }
    };

    const loadStream = () => {
      // HLS Logic
      if (type === 'hls') {
        if (Hls.isSupported()) {
          const hls = new Hls({
            maxBufferLength: 30,
            maxMaxBufferLength: 60,
            manifestLoadingTimeOut: 15000,
            levelLoadingTimeOut: 15000,
            fragLoadingTimeOut: 15000,
            enableWorker: true,
            lowLatencyMode: false,
          });

          hlsRef.current = hls;
          hls.loadSource(streamUrl);

          try {
            hls.attachMedia(video);
          } catch (e) {
            console.error('HLS attach failed', e);
            handleError('HLS Attach Error');
            return;
          }

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setIsLoading(false);
            if (autoPlay) {
              video.play().catch(() => console.debug('Autoplay blocked'));
            }
          });

          hls.on(Hls.Events.ERROR, (_event, data) => {
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  console.warn('HLS Network Error, recovering...');
                  hls.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  console.warn('HLS Media Error, recovering...');
                  hls.recoverMediaError();
                  break;
                default:
                  console.error('HLS Fatal Error', data);
                  hls.destroy();
                  handleError(`HLS Fatal: ${data.details}`);
                  break;
              }
            }
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // Native HLS fallback (Safari)
          video.src = streamUrl;
          if (autoPlay) {
            video.play().catch(() => console.debug('Autoplay blocked'));
          }
        } else {
          handleError('HLS not supported in this browser');
        }
      }
      // MP4/File Logic (both direct and go2rtc)
      else if (type === 'file' || type === 'mp4') {
        video.src = streamUrl;
        video.addEventListener('loadeddata', handleVideoLoaded, { once: true });
        video.addEventListener('error', handleError, { once: true });
        if (autoPlay) {
          video.play().catch(() => console.debug('Autoplay blocked'));
        }
      }
    };

    video.addEventListener('loadeddata', handleVideoLoaded);
    video.addEventListener('error', handleError);

    loadStream();

    // Cleanup function
    return () => {
      if (video) {
        video.removeEventListener('loadeddata', handleVideoLoaded);
        video.removeEventListener('error', handleError);
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamUrl, type, autoPlay, onLoaded, onError, retryAttempts, retryDelay]);

  // Rendering
  if (!streamUrl) return null;

  if (type === 'iframe') {
    return (
      <iframe
        src={streamUrl}
        className={className}
        allowFullScreen
        onLoad={() => onLoaded && onLoaded()}
        onError={() => onError && onError('IFrame Error')}
        style={{ border: 'none', background: 'black' }}
      />
    );
  }

  if (type === 'mjpeg') {
    return (
      <img
        src={streamUrl}
        className={className}
        onLoad={() => onLoaded && onLoaded()}
        onError={() => {
          setHasError(true);
          if (onError) onError('MJPEG Error');
        }}
        alt="Camera Stream"
      />
    );
  }

  if (type === 'hls' || type === 'file' || type === 'mp4') {
    return (
      <>
        <video
          ref={videoRef}
          className={className}
          poster={posterUrl || undefined}
          muted={muted}
          playsInline
          controls={false}
          crossOrigin="anonymous"
          style={{ display: hasError ? 'none' : 'block' }}
        />
        {isLoading && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }} />}
      </>
    );
  }

  return null;
};

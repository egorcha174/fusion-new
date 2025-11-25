
import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
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
  // FIX: Local state to force re-render on error, though parent handles main loading UI
  const [, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Reset state on URL change
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
  }, [streamUrl, type]);

  // --- Logic for HLS and Native Video ---
  useEffect(() => {
    if (!streamUrl || (type !== 'hls' && type !== 'file')) return;

    const video = videoRef.current;
    if (!video) return;

    // IMPROVED: Use 'loadeddata' instead of 'play' promise for reliable loading state
    const onVideoLoaded = () => {
      setIsLoading(false);
      if (onLoaded) onLoaded();
    };

    // IMPROVED: Centralized error handler
    const onVideoError = (e: Event | string) => {
      console.error("Video Error:", e);
      setHasError(true);
      if (onError) onError(typeof e === 'string' ? e : "Ошибка воспроизведения");
      setIsLoading(false);
    };

    // FIX: Ensure previous HLS instance is destroyed before creating new one
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // FIX: Attach listeners safely
    video.addEventListener('loadeddata', onVideoLoaded);
    video.addEventListener('error', onVideoError);

    // Scenario 1: Native HLS (Safari)
    if (type === 'hls' && video.canPlayType('application/vnd.apple.mpegurl')) {
      // FIX: Set src directly for native support
      video.src = streamUrl;
      if (autoPlay) {
        // IMPROVED: Catch autoplay rejection to prevent unhandled promise errors
        video.play().catch(() => { /* Autoplay blocked, waiting for interaction */ });
      }
    } 
    // Scenario 2: HLS.js (Chrome, Firefox)
    else if (type === 'hls' && Hls.isSupported()) {
      const hls = new Hls({
        maxBufferLength: 30, 
        manifestLoadingTimeOut: 15000,
        levelLoadingTimeOut: 15000,
      });
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      
      // FIX: Wrap attachMedia in try/catch for safety
      try {
          hls.attachMedia(video);
      } catch (e) {
          onVideoError("HLS Attach Error");
      }

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (autoPlay) video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              // IMPROVED: Try to recover network error
              hls.startLoad(); 
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              // IMPROVED: Try to recover media error
              hls.recoverMediaError(); 
              break;
            default:
              hls.destroy();
              onVideoError(`HLS Fatal: ${data.details}`);
              break;
          }
        }
      });
    } 
    // Scenario 3: Direct File (MP4, WebM)
    else if (type === 'file') {
      video.src = streamUrl;
      if (autoPlay) video.play().catch(() => {});
    }

    // FIX: Robust cleanup on unmount
    return () => {
      if (video) {
        video.removeEventListener('loadeddata', onVideoLoaded);
        video.removeEventListener('error', onVideoError);
        
        // IMPROVED: Stop downloading content
        video.pause();
        video.removeAttribute('src');
        video.load(); 
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamUrl, type, autoPlay, onLoaded, onError]);

  // --- Rendering ---

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
        controls={false}
        style={{ display: hasError ? 'none' : 'block' }}
      />
    );
  }

  return null;
};

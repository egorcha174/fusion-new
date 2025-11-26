
import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

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
  // IMPROVED: State to track critical error vs loading
  const [hasError, setHasError] = useState(false);

  // Reset error state when URL changes
  useEffect(() => {
    setHasError(false);
  }, [streamUrl, type]);

  // --- Main Video Logic (HLS & File) ---
  useEffect(() => {
    if (!streamUrl || (type !== 'hls' && type !== 'file')) return;

    const video = videoRef.current;
    if (!video) return;

    // FIX: Cleanup previous HLS instance before creating a new one
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const handleVideoLoaded = () => {
      // FIX: Notify parent that stream is ready
      if (onLoaded) onLoaded();
    };

    const handleError = (e: Event | string) => {
      console.error("Video Error:", e);
      setHasError(true);
      if (onError) onError(typeof e === 'string' ? e : "Ошибка воспроизведения");
    };

    video.addEventListener('loadeddata', handleVideoLoaded);
    video.addEventListener('error', handleError);

    // --- HLS Logic ---
    if (type === 'hls') {
      if (Hls.isSupported()) {
        const hls = new Hls({
          maxBufferLength: 30,
          manifestLoadingTimeOut: 15000,
          levelLoadingTimeOut: 15000,
          fragLoadingTimeOut: 15000,
        });
        hlsRef.current = hls;

        hls.loadSource(streamUrl);

        // FIX: Wrap attachMedia in try/catch
        try {
          hls.attachMedia(video);
        } catch (e) {
          console.error("HLS attach failed", e);
          handleError("HLS Attach Error");
        }

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (autoPlay) {
            // FIX: Catch autoplay rejection
            video.play().catch(() => console.debug("Autoplay blocked"));
          }
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.warn("HLS Network Error, recovering...");
                // IMPROVED: Try to recover network error
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.warn("HLS Media Error, recovering...");
                // IMPROVED: Try to recover media error
                hls.recoverMediaError();
                break;
              default:
                console.error("HLS Fatal Error", data);
                hls.destroy();
                // FIX: Pass specific details to error handler for debugging
                handleError(`HLS Fatal: ${data.details}`);
                break;
            }
          }
        });
      } 
      // FIX: Native HLS fallback (Safari)
      else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
        if (autoPlay) {
          video.play().catch(() => console.debug("Autoplay blocked"));
        }
      } else {
        handleError("HLS not supported");
      }
    }
    // --- Direct File Logic (MP4/WebM) ---
    else if (type === 'file') {
      video.src = streamUrl;
      if (autoPlay) {
        video.play().catch(() => console.debug("Autoplay blocked"));
      }
    }

    // FIX: Robust cleanup
    return () => {
      if (video) {
        video.removeEventListener('loadeddata', handleVideoLoaded);
        video.removeEventListener('error', handleError);
        video.pause();
        // IMPROVED: Stop buffering immediately
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

  if (type === 'iframe') {
    return (
      <iframe
        src={streamUrl}
        className={className}
        allowFullScreen
        onLoad={() => onLoaded && onLoaded()}
        onError={() => onError && onError("IFrame Error")}
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
        onError={() => { setHasError(true); if(onError) onError("MJPEG Error"); }}
        alt="Camera Stream"
      />
    );
  }

  if (type === 'hls' || type === 'file') {
    return (
      <video
        ref={videoRef}
        className={className}
        poster={posterUrl || undefined}
        muted={muted}
        playsInline // IMPROVED: Required for iOS autoplay
        controls={false} // Custom UI usually handles controls
        crossOrigin="anonymous" // FIX: Add crossOrigin to allow fetching segments from different origins
        style={{ display: hasError ? 'none' : 'block' }}
      />
    );
  }

  return null;
};

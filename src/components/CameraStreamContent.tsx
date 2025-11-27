
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

    // STRICT CLEANUP
    const destroyHls = () => {
        if (hlsRef.current) {
            try {
                hlsRef.current.stopLoad();
                hlsRef.current.detachMedia();
                hlsRef.current.destroy();
            } catch (e) {
                console.warn("Error destroying HLS instance", e);
            }
            hlsRef.current = null;
        }
    };

    const cleanup = () => {
        destroyHls();
        if (video) {
            video.pause();
            video.removeAttribute('src');
            video.load();
        }
    };

    // Run cleanup before starting new stream
    cleanup();

    const handleVideoLoaded = () => {
      if (onLoaded) onLoaded();
    };

    const handleError = (e: Event | string) => {
      const msg = typeof e === 'string' ? e : (video.error?.message || "Ошибка воспроизведения");
      console.error("Video Error:", e);
      setHasError(true);
      // Clean up immediately on fatal error
      destroyHls();
      if (onError) onError(msg);
    };

    video.addEventListener('loadeddata', handleVideoLoaded);
    // Use a named function for the event listener to ensure we can remove it if needed, 
    // though React's useEffect cleanup usually handles the node removal.
    const errorListener = (e: Event) => handleError(e);
    video.addEventListener('error', errorListener);

    const playVideo = async () => {
        if (!video.paused) return;
        try {
            await video.play();
        } catch (e) {
            console.debug("Autoplay blocked or interrupted", e);
        }
    };

    // --- HLS Logic ---
    if (type === 'hls') {
        // Check for Native HLS (Safari) first
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
             video.src = streamUrl;
             if (autoPlay) playVideo();
        } else if (Hls.isSupported()) {
             const hls = new Hls({
                manifestLoadingTimeOut: 15000,
                levelLoadingTimeOut: 15000,
                fragLoadingTimeOut: 15000,
                startLevel: -1,
             });
             hlsRef.current = hls;
             
             hls.loadSource(streamUrl);
             hls.attachMedia(video);
             
             hls.on(Hls.Events.MANIFEST_PARSED, () => {
                 if (autoPlay) playVideo();
             });
             
             hls.on(Hls.Events.ERROR, (event, data) => {
                 if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            console.warn("fatal network error encountered, try to recover");
                            hls.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            console.warn("fatal media error encountered, try to recover");
                            hls.recoverMediaError();
                            break;
                        default:
                            console.error('HLS Fatal Error', data);
                            handleError(`HLS Fatal: ${data.type}`);
                            break;
                    }
                 }
             });
        } else {
            handleError("HLS not supported in this browser");
        }
    }
    // --- Direct File Logic (MP4/WebM) ---
    else if (type === 'file') {
      video.src = streamUrl;
      if (autoPlay) playVideo();
    }

    // Cleanup on unmount or dependency change
    return () => {
      if (video) {
          video.removeEventListener('loadeddata', handleVideoLoaded);
          video.removeEventListener('error', errorListener);
      }
      cleanup();
    };
  }, [streamUrl, type, autoPlay]); 

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
        playsInline // Required for iOS autoplay
        controls={false} 
        crossOrigin="anonymous"
        style={{ display: hasError ? 'none' : 'block' }}
      />
    );
  }

  return null;
};

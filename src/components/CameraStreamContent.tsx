
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

    // STRICT CLEANUP (From provided example)
    const cleanup = () => {
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }
        video.pause();
        video.removeAttribute('src');
        video.load();
    };

    cleanup();

    const handleVideoLoaded = () => {
      if (onLoaded) onLoaded();
    };

    const handleError = (e: Event | string) => {
      const msg = typeof e === 'string' ? e : (video.error?.message || "Ошибка воспроизведения");
      console.error("Video Error:", e);
      setHasError(true);
      if (onError) onError(msg);
    };

    video.addEventListener('loadeddata', handleVideoLoaded);
    // IMPROVED: Attach standard error listener to video element
    video.addEventListener('error', (e) => handleError(e));

    const playVideo = async () => {
        try {
            await video.play();
        } catch (e) {
            console.debug("Autoplay blocked", e);
        }
    };

    // --- HLS Logic ---
    if (type === 'hls') {
        // Priority: Native HLS (Safari) -> Hls.js -> Error
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
             video.src = streamUrl;
             if (autoPlay) playVideo();
        } else if (Hls.isSupported()) {
             const hls = new Hls({
                // Minimal config as per request to stick to "my code" style defaults where possible,
                // but some timeouts are safer for network resilience.
                manifestLoadingTimeOut: 15000,
             });
             hlsRef.current = hls;
             
             hls.loadSource(streamUrl);
             hls.attachMedia(video);
             
             hls.on(Hls.Events.MANIFEST_PARSED, () => {
                 if (autoPlay) playVideo();
             });
             
             hls.on(Hls.Events.ERROR, (event, data) => {
                 console.error('HLS error', data);
                 if (data.fatal) {
                    // On fatal error, destroy and report
                    hls.destroy();
                    handleError(`HLS Fatal: ${data.type}`);
                 }
             });
        } else {
            handleError("HLS not supported in this browser");
        }
    }
    // --- Direct File Logic (MP4/WebM) ---
    else if (type === 'file') {
      video.src = streamUrl;
      // Specific error listener for source loading issues (CORS, 404)
      const onSrcError = () => {
          handleError("Ошибка загрузки файла. Проверьте URL и CORS.");
          video.removeEventListener('error', onSrcError);
      };
      video.addEventListener('error', onSrcError);
      
      if (autoPlay) playVideo();
    }

    // Cleanup on unmount
    return () => {
      video.removeEventListener('loadeddata', handleVideoLoaded);
      // Note: We don't remove anonymous arrow functions for error, but React unmounts the node anyway.
      cleanup();
    };
  }, [streamUrl, type, autoPlay]); 
  // Removed onLoaded/onError from dependency array to prevent re-runs if parent recreates them

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
        controls={false} // Custom UI usually handles controls
        crossOrigin="anonymous"
        style={{ display: hasError ? 'none' : 'block' }}
      />
    );
  }

  return null;
};

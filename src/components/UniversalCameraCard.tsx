
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Device } from '../types';
import { constructHaUrl } from '../utils/url';
import { CameraStreamContent } from './CameraStreamContent';
import { Icon } from '@iconify/react';
import LoadingSpinner from './LoadingSpinner';

interface UniversalCameraCardProps {
  device: Device;
  haUrl: string;
  signPath: (path: string) => Promise<{ path: string }>;
  getCameraStreamUrl: (entityId: string) => Promise<{ url: string }>;
  onCameraCardClick?: (device: Device) => void;
  autoPlay?: boolean;
  muted?: boolean;
}

export const UniversalCameraCard: React.FC<UniversalCameraCardProps> = ({
  device,
  haUrl,
  signPath,
  getCameraStreamUrl,
  onCameraCardClick,
  autoPlay = true,
  muted = true
}) => {
  const [finalStreamUrl, setFinalStreamUrl] = useState<string | null>(null);
  const [finalSnapshotUrl, setFinalSnapshotUrl] = useState<string | null>(null);
  const [streamType, setStreamType] = useState<'hls' | 'mjpeg' | 'iframe' | 'file' | 'none'>('none');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(!document.hidden);

  // 1. Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // 2. Page Visibility API
  useEffect(() => {
    const handleVisibilityChange = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Strictly control video playback based on visibility and page state
  const shouldPlay = autoPlay && isVisible && pageVisible;

  // Destructure device properties to prevent unnecessary effect re-runs
  const { id: deviceId, haDomain, customStreamUrl, streamType: deviceStreamType } = device;

  // 3. Load Snapshot
  const loadSnapshot = useCallback(async () => {
    try {
      // Regex for detecting image extensions
      if (haDomain === 'internal' && customStreamUrl?.match(/\.(jpg|jpeg|png|webp)($|\?)/i)) {
         setFinalSnapshotUrl(customStreamUrl);
         return;
      }

      if (!deviceId.startsWith('internal::')) {
          const result = await signPath(`/api/camera_proxy/${deviceId}`);
          const fullUrl = constructHaUrl(haUrl, result.path, 'http') + `&t=${Date.now()}`;
          setFinalSnapshotUrl(fullUrl);
      }
    } catch (e) {
      console.warn("Failed to load snapshot", e);
    }
  }, [deviceId, haDomain, customStreamUrl, haUrl, signPath]);

  useEffect(() => {
    if (isVisible) loadSnapshot();
  }, [isVisible, loadSnapshot]);

  // Helper to fetch MJPEG stream
  const fetchMjpegStream = useCallback(async () => {
      try {
          setIsLoading(true);
          setError(null);
          // Fallback: MJPEG Proxy Stream
          const result = await signPath(`/api/camera_proxy_stream/${deviceId}`);
          const mjpegUrl = constructHaUrl(haUrl, result.path, 'http') + `&t=${Date.now()}`;
          setFinalStreamUrl(mjpegUrl);
          setStreamType('mjpeg');
          // MJPEG loads "instantly" in terms of connection, but we wait for onLoad in the image tag
      } catch (e) {
          console.error("MJPEG resolution failed:", e);
          setError("Ошибка подключения (MJPEG)");
          setIsLoading(false);
      }
  }, [deviceId, haUrl, signPath]);

  // 4. Stream Resolution Logic
  useEffect(() => {
    if (!shouldPlay) {
      // Do not clear immediately to avoid black flash if visibility toggles quickly?
      // Actually, for performance, we should clear.
      setFinalStreamUrl(null);
      setStreamType('none');
      setIsLive(false);
      setIsLoading(false);
      return;
    }

    // Only set loading if we don't have a stream yet or if inputs changed substantially
    // But since we fixed dependencies, this runs only when needed.
    setIsLoading(true);
    setError(null);

    let isCancelled = false;

    const resolveStream = async () => {
      try {
        // --- BRANCH 1: Custom Camera ---
        if (haDomain === 'internal' || customStreamUrl) {
           const url = customStreamUrl;
           if (!url) throw new Error("URL не указан");

           let type: any = deviceStreamType || 'auto';
           
           // Robust stream type detection logic
           if (type === 'auto') {
             const cleanUrl = url.split('?')[0].toLowerCase();
             if (cleanUrl.endsWith('.m3u8')) type = 'hls';
             else if (/\.(mp4|webm|mov|mkv)$/.test(cleanUrl)) type = 'file';
             else if (/\.(jpg|jpeg|png|webp)$/.test(cleanUrl)) type = 'mjpeg';
             else type = 'iframe'; // Fallback for WebRTC/Unknown
           }
           
           if (!isCancelled) {
               setFinalStreamUrl(url);
               setStreamType(type);
           }
           return;
        }

        // --- BRANCH 2: Native HA Camera ---
        try {
          const streamData = await getCameraStreamUrl(deviceId);
          if (streamData && streamData.url) {
            const fullUrl = constructHaUrl(haUrl, streamData.url, 'http');
            if (!isCancelled) {
                setFinalStreamUrl(fullUrl);
                setStreamType('hls');
            }
            return;
          }
        } catch (err) {
          console.warn("HLS stream not available, trying MJPEG");
        }

        // If HLS retrieval failed (or returned no URL), try MJPEG immediately
        if (!isCancelled) {
            await fetchMjpegStream();
        }

      } catch (e: any) {
        if (!isCancelled) {
            console.error("Stream resolution failed:", e);
            setError(e.message || "Ошибка подключения");
            setIsLoading(false);
        }
      }
    };

    resolveStream();

    return () => {
        isCancelled = true;
    };

  }, [shouldPlay, deviceId, haDomain, customStreamUrl, deviceStreamType, haUrl, signPath, getCameraStreamUrl, fetchMjpegStream]);

  // Handler for stream errors (e.g. HLS fails to play)
  const handleStreamError = (msg: string) => {
      console.warn(`Stream error (${streamType}): ${msg}`);
      if (streamType === 'hls') {
          console.log("Attempting fallback to MJPEG...");
          // Switch to MJPEG
          fetchMjpegStream();
      } else {
          setError(msg);
          setIsLoading(false);
          setIsLive(false);
      }
  };

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full bg-black overflow-hidden rounded-lg select-none group"
      onClick={() => onCameraCardClick && onCameraCardClick(device)}
    >
      {/* Layer 1: Snapshot */}
      {finalSnapshotUrl && (
        <img 
          src={finalSnapshotUrl} 
          alt={device.name}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 z-[1] ${isLive ? 'opacity-0' : 'opacity-100'}`}
        />
      )}

      {/* Layer 2: Live Stream */}
      {shouldPlay && finalStreamUrl && (
        <div className="absolute inset-0 z-[2]">
          <CameraStreamContent
            streamUrl={finalStreamUrl}
            type={streamType}
            muted={muted}
            autoPlay={true}
            onLoaded={() => {
              setIsLive(true);
              setIsLoading(false);
            }}
            onError={(msg) => {
                // Only handle if mounted
                handleStreamError(msg);
            }}
          />
        </div>
      )}

      {/* Layer 3: Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 z-[3] flex items-center justify-center pointer-events-none">
          <div className="bg-black/30 backdrop-blur-sm p-2 rounded-full">
             <LoadingSpinner />
          </div>
        </div>
      )}

      {/* Layer 4: Error Message */}
      {error && (
        <div className="absolute inset-0 z-[4] flex flex-col items-center justify-center bg-black/70 p-4 text-center animate-in fade-in">
          <Icon icon="mdi:alert-circle-outline" className="w-8 h-8 text-red-500 mb-2" />
          <p className="text-xs text-white font-medium">{error}</p>
          {device.haDomain === 'internal' && !device.customStreamUrl && (
              <p className="text-[10px] text-gray-400 mt-1">Настройте URL потока в редакторе.</p>
          )}
          <button 
            onClick={(e) => { e.stopPropagation(); setIsLoading(true); setError(null); }} 
            className="mt-2 px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-[10px] text-white transition-colors"
          >
            Повторить
          </button>
        </div>
      )}

      {/* Layer 5: Status Badges */}
      <div className="absolute top-2 right-2 z-[5] flex gap-1 pointer-events-none">
        {isLive && (
          <div className="px-1.5 py-0.5 bg-red-600/90 backdrop-blur-sm rounded text-white text-[9px] font-bold uppercase tracking-wider animate-pulse shadow-sm">
            LIVE
          </div>
        )}
        {!isLive && !isLoading && !error && (
           <div className="px-1.5 py-0.5 bg-gray-800/60 backdrop-blur-sm rounded text-white text-[9px] font-medium uppercase tracking-wider">
            SNAPSHOT
          </div>
        )}
      </div>
      
      {/* Fallback */}
      {!shouldPlay && !finalSnapshotUrl && !isLoading && (
         <div className="absolute inset-0 z-[1] flex items-center justify-center text-gray-500 bg-gray-900">
            <Icon icon="mdi:cctv-off" className="w-12 h-12 opacity-50" />
         </div>
      )}
    </div>
  );
};

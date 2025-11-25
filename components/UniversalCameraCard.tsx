
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Hls from 'hls.js';
import { constructHaUrl } from '../utils/url';
import LoadingSpinner from './LoadingSpinner';
import { Icon } from '@iconify/react';
import { Device } from '../types';
import { CameraStreamContent } from './CameraStreamContent';

interface UniversalCameraCardProps {
  device: Device;
  haUrl: string;
  signPath: (path: string) => Promise<{ path: string }>;
  getCameraStreamUrl: (entityId: string) => Promise<{ url: string }>;
  onCameraCardClick?: (device: Device) => void;
  autoPlay?: boolean;
  muted?: boolean;
}

// Helper to detect if we are visible in viewport
const useInView = (ref: React.RefObject<HTMLElement>) => {
    const [isInView, setIsInView] = useState(false);
    useEffect(() => {
        if (!ref.current) return;
        const observer = new IntersectionObserver(
            ([entry]) => setIsInView(entry.isIntersecting),
            { threshold: 0.05 } // 5% visible
        );
        observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);
    return isInView;
};

// Helper to detect page visibility (tab switching)
const usePageVisibility = () => {
    const [isVisible, setIsVisible] = useState(!document.hidden);
    useEffect(() => {
        const handler = () => setIsVisible(!document.hidden);
        document.addEventListener("visibilitychange", handler);
        return () => document.removeEventListener("visibilitychange", handler);
    }, []);
    return isVisible;
};

export const UniversalCameraCard: React.FC<UniversalCameraCardProps> = ({
    device,
    haUrl,
    signPath,
    getCameraStreamUrl,
    onCameraCardClick,
    autoPlay = true,
    muted = true
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const isMountedRef = useRef(true);
    
    const isInView = useInView(containerRef);
    const isPageVisible = usePageVisibility();
    const shouldPlayStream = autoPlay && isInView && isPageVisible;

    const [streamUrl, setStreamUrl] = useState<string | null>(null);
    // 'hls' here acts as a generic 'video player' type (HLS, MP4, WebM)
    const [streamType, setStreamType] = useState<'hls' | 'mjpeg' | 'iframe' | 'none'>('none');
    const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [retryTrigger, setRetryTrigger] = useState(0);
    
    const customStreamUrl = device.customStreamUrl;
    const preferredStreamType = device.streamType || 'auto';
    const isCustomCamera = device.haDomain === 'internal' || device.id.startsWith('internal::');

    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    // --- Safety Timeout for Loading ---
    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout>;
        if (isLoading) {
            timeout = setTimeout(() => {
                if (isMountedRef.current && isLoading) {
                    setIsLoading(false);
                    console.warn("Camera loading timed out");
                }
            }, 15000); // 15s timeout
        }
        return () => clearTimeout(timeout);
    }, [isLoading]);

    // --- Snapshot Logic ---
    const fetchSnapshot = useCallback(async () => {
        if (!isMountedRef.current) return;
        
        // If custom camera has no stream URL, check if the URL itself is an image
        if (isCustomCamera) {
            if (customStreamUrl && (preferredStreamType === 'mjpeg' || customStreamUrl.match(/\.(jpg|jpeg|png|gif|webp)/i))) {
                setSnapshotUrl(customStreamUrl);
            }
            return;
        }

        // Standard HA Camera
        try {
            const result = await signPath(`/api/camera_proxy/${device.id}`);
            if (!isMountedRef.current) return;

            const url = constructHaUrl(haUrl, result.path, 'http');
            const urlWithCacheBuster = `${url}&t=${Date.now()}`;

            // Preload image to avoid flickering
            const img = new Image();
            img.onload = () => {
                if (isMountedRef.current) setSnapshotUrl(urlWithCacheBuster);
            };
            img.src = urlWithCacheBuster;
        } catch (err) {
            // Silent fail for snapshot
        }
    }, [device.id, haUrl, signPath, isCustomCamera, customStreamUrl, preferredStreamType]);

    // Fetch snapshot on mount and visibility change
    useEffect(() => {
        if (isInView) fetchSnapshot();
    }, [fetchSnapshot, isInView]);

    // --- Stream Logic ---
    useEffect(() => {
        if (!shouldPlayStream) {
            setStreamUrl(null);
            setStreamType('none');
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        const resolveUrl = async () => {
            try {
                let finalUrl = '';
                let type = preferredStreamType;

                if (isCustomCamera) {
                    if (!customStreamUrl) {
                        throw new Error("URL не настроен");
                    }
                    finalUrl = customStreamUrl;
                    // Auto-detect type for custom cameras
                    if (type === 'auto') {
                        const lowerUrl = finalUrl.toLowerCase();
                        if (lowerUrl.includes('.m3u8') || lowerUrl.endsWith('.mp4') || lowerUrl.endsWith('.webm') || lowerUrl.endsWith('.kv')) {
                            type = 'hls'; // Use the video player
                        } else if (lowerUrl.match(/\.(jpg|jpeg|png)/i)) {
                            type = 'mjpeg';
                        } else {
                            type = 'iframe'; // WebRTC/Go2RTC typical interface
                        }
                    }
                } else {
                    // HA Native Camera
                    if (type === 'auto' || type === 'hls') {
                        try {
                            const streamData = await getCameraStreamUrl(device.id);
                            if (streamData?.url) {
                                finalUrl = constructHaUrl(haUrl, streamData.url, 'http');
                                type = 'hls';
                            } else {
                                // Fallback to MJPEG if getStreamUrl fails/returns empty
                                type = 'mjpeg';
                            }
                        } catch (e) {
                            type = 'mjpeg';
                        }
                    } 
                    
                    if (type === 'mjpeg') {
                         const result = await signPath(`/api/camera_proxy_stream/${device.id}`);
                         finalUrl = constructHaUrl(haUrl, result.path, 'http');
                    }
                }

                if (!isMountedRef.current) return;
                
                if (type === 'iframe') {
                    setStreamUrl(finalUrl);
                    setStreamType('iframe');
                    setIsLoading(false);
                } else if (type === 'mjpeg') {
                    // Ensure token/auth is preserved or timestamp added
                    const urlToUse = finalUrl.includes('token=') ? finalUrl : `${finalUrl}${finalUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
                    setStreamUrl(urlToUse);
                    setStreamType('mjpeg');
                    setIsLoading(false);
                } else if (type === 'hls') {
                    setStreamUrl(finalUrl); 
                    setStreamType('hls');
                    // HLS loading continues in the child component
                }

            } catch (e: any) {
                console.error("Camera load error:", e);
                if (isMountedRef.current) {
                    setError(e.message || "Ошибка");
                    setIsLoading(false);
                    fetchSnapshot(); // Ensure snapshot is visible if stream fails
                }
            }
        };

        resolveUrl();
    }, [shouldPlayStream, device.id, customStreamUrl, preferredStreamType, haUrl, signPath, getCameraStreamUrl, retryTrigger, isCustomCamera]);


    const handleRetry = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsLoading(true);
        setError(null);
        setRetryTrigger(prev => prev + 1);
    };

    // --- Render Content ---
    const renderStream = () => {
        if (streamType === 'iframe' && streamUrl) {
            return <iframe src={streamUrl} className="w-full h-full border-0 bg-black" title={device.name} />;
        }
        if (streamType === 'mjpeg' && streamUrl) {
            return <img src={streamUrl} className="w-full h-full object-cover" alt={device.name} onError={() => setError("Ошибка MJPEG")} />;
        }
        if (streamType === 'hls' && streamUrl) {
            // This now uses the updated robust VideoPlayer inside CameraStreamContent
            return (
                <CameraStreamContent 
                    entityId={null} // Not used for custom/resolved URLs
                    haUrl={haUrl} // Not used here
                    signPath={signPath} // Not used here
                    getCameraStreamUrl={getCameraStreamUrl} // Not used here
                    streamUrlOverride={streamUrl} // Pass the resolved URL directly
                    snapshotUrlOverride={snapshotUrl}
                    onStreamReady={() => setIsLoading(false)}
                    onError={() => { setError("Ошибка потока"); setIsLoading(false); }}
                    muted={muted}
                />
            );
        }
        return null;
    };

    return (
        <div 
            ref={containerRef}
            className="w-full h-full relative bg-black overflow-hidden flex items-center justify-center group select-none"
            onClick={() => onCameraCardClick && onCameraCardClick(device)}
        >
            {/* 1. Background Layer: Snapshot or Placeholder */}
            <div className="absolute inset-0 z-0 flex items-center justify-center">
                {snapshotUrl ? (
                    <img 
                        src={snapshotUrl} 
                        className="w-full h-full object-cover transition-opacity duration-500"
                        style={{ opacity: (shouldPlayStream && !isLoading && !error) ? 0 : 1 }}
                        alt="snapshot" 
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center text-gray-600">
                        <Icon icon={isCustomCamera ? "mdi:cctv-off" : "mdi:camera-off"} className="w-12 h-12 opacity-50 mb-2" />
                        {isCustomCamera && !customStreamUrl && (
                            <p className="text-[10px] px-2 text-center text-gray-500">Настройте URL</p>
                        )}
                    </div>
                )}
            </div>

            {/* 2. Stream Layer */}
            {shouldPlayStream && !error && (
                <div className={`absolute inset-0 z-10 transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
                    {renderStream()}
                </div>
            )}

            {/* 3. Loading Overlay */}
            {isLoading && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
                    <LoadingSpinner />
                </div>
            )}

            {/* 4. Error Overlay */}
            {error && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 p-4 text-center">
                    <Icon icon="mdi:alert-circle-outline" className="w-8 h-8 text-red-500 mb-2" />
                    <button 
                        onClick={handleRetry}
                        className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-xs text-white transition-colors backdrop-blur-md"
                    >
                        Повторить
                    </button>
                </div>
            )}

            {/* 5. Badges */}
            {shouldPlayStream && !error && !isLoading && (
                <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-red-600/80 backdrop-blur-sm rounded text-white text-[9px] font-bold uppercase tracking-wider pointer-events-none z-40 animate-pulse">
                    LIVE
                </div>
            )}
        </div>
    );
};

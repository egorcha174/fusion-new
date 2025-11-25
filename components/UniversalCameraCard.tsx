
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Hls from 'hls.js';
import { constructHaUrl } from '../utils/url';
import LoadingSpinner from './LoadingSpinner';
import { Icon } from '@iconify/react';
import { Device } from '../types';

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
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    const isMountedRef = useRef(true);
    
    const isInView = useInView(containerRef);
    const isPageVisible = usePageVisibility();
    // Always load stream if autoPlay is true, visible, and page is active
    const shouldPlayStream = autoPlay && isInView && isPageVisible;

    const [streamUrl, setStreamUrl] = useState<string | null>(null);
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

    // --- Snapshot Logic ---
    const fetchSnapshot = useCallback(async () => {
        if (!isMountedRef.current) return;
        
        // For custom cameras without a stream URL, we can't fetch a snapshot from HA proxy
        if (isCustomCamera && !customStreamUrl) {
            return;
        }

        // If it's a real HA camera, use the proxy
        if (!isCustomCamera) {
            try {
                const result = await signPath(`/api/camera_proxy/${device.id}`);
                if (!isMountedRef.current) return;

                const url = constructHaUrl(haUrl, result.path, 'http');
                const urlWithCacheBuster = `${url}&t=${Date.now()}`;

                const img = new Image();
                img.onload = () => {
                    if (isMountedRef.current) setSnapshotUrl(urlWithCacheBuster);
                };
                img.src = urlWithCacheBuster;
            } catch (err) {
                // Silent fail for snapshot background
            }
        } else if (customStreamUrl && (preferredStreamType === 'mjpeg' || customStreamUrl.match(/\.(jpg|jpeg|png)/i))) {
             // If custom camera is essentially an MJPEG or Image URL, use it as snapshot
             setSnapshotUrl(customStreamUrl);
        }
    }, [device.id, haUrl, signPath, isCustomCamera, customStreamUrl, preferredStreamType]);

    // Initial Snapshot
    useEffect(() => {
        if (isInView) fetchSnapshot();
    }, [fetchSnapshot, isInView]);

    // --- Stream Logic ---
    useEffect(() => {
        if (!shouldPlayStream) {
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
            if (videoRef.current) {
                videoRef.current.removeAttribute('src');
                videoRef.current.load();
            }
            setIsLoading(false);
            return;
        }

        // Reset state for new attempt
        setIsLoading(true);
        setError(null);

        const resolveUrl = async () => {
            try {
                let finalUrl = '';
                let type = preferredStreamType;

                if (isCustomCamera) {
                    if (!customStreamUrl) {
                        throw new Error("Не указан URL потока");
                    }
                    finalUrl = customStreamUrl;
                    if (type === 'auto') {
                        if (finalUrl.includes('.m3u8')) type = 'hls';
                        else if (finalUrl.match(/\.(jpg|jpeg|png)/i)) type = 'mjpeg';
                        else type = 'iframe';
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
                                throw new Error("No stream");
                            }
                        } catch (e) {
                            // Fallback to MJPEG
                            const result = await signPath(`/api/camera_proxy_stream/${device.id}`);
                            finalUrl = constructHaUrl(haUrl, result.path, 'http');
                            type = 'mjpeg';
                        }
                    } else if (type === 'mjpeg') {
                         const result = await signPath(`/api/camera_proxy_stream/${device.id}`);
                         finalUrl = constructHaUrl(haUrl, result.path, 'http');
                    }
                }

                if (!isMountedRef.current) return;
                
                // Apply URL
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
                    // HLS loading continues in the effect below...
                }

            } catch (e: any) {
                console.error("Camera load error:", e);
                if (isMountedRef.current) {
                    setError(e.message || "Ошибка подключения");
                    setIsLoading(false);
                    fetchSnapshot(); // Try snapshot as fallback
                }
            }
        };

        resolveUrl();
    }, [shouldPlayStream, device.id, customStreamUrl, preferredStreamType, haUrl, signPath, getCameraStreamUrl, retryTrigger, isCustomCamera]);

    // --- HLS Handler ---
    useEffect(() => {
        if (streamType === 'hls' && streamUrl && shouldPlayStream) {
            if (Hls.isSupported()) {
                if (hlsRef.current) hlsRef.current.destroy();
                const hls = new Hls({
                    capLevelToPlayerSize: true,
                    maxBufferLength: 30,
                    startLevel: -1, // Auto
                });
                hlsRef.current = hls;
                
                if (videoRef.current) {
                    hls.attachMedia(videoRef.current);
                    hls.on(Hls.Events.MEDIA_ATTACHED, () => {
                        hls.loadSource(streamUrl);
                    });
                    hls.on(Hls.Events.MANIFEST_PARSED, () => {
                        videoRef.current?.play().catch(() => { /* Autoplay blocked */ });
                        setIsLoading(false);
                    });
                    hls.on(Hls.Events.ERROR, (event, data) => {
                        if (data.fatal) {
                            hls.destroy();
                            setError("Ошибка потока (HLS)");
                            setIsLoading(false);
                        }
                    });
                }
            } else if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
                // Native HLS
                videoRef.current.src = streamUrl;
                videoRef.current.addEventListener('loadedmetadata', () => {
                    videoRef.current?.play().catch(() => {});
                    setIsLoading(false);
                });
                videoRef.current.addEventListener('error', () => {
                    setError("Ошибка потока (Native)");
                    setIsLoading(false);
                });
            } else {
                setError("HLS не поддерживается");
                setIsLoading(false);
            }
        }
        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
        };
    }, [streamType, streamUrl, shouldPlayStream]);


    const handleRetry = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsLoading(true);
        setError(null);
        setRetryTrigger(prev => prev + 1);
    };

    // --- Render Helpers ---
    const renderContent = () => {
        if (error) {
            return (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 z-30 p-4 text-center">
                    <Icon icon="mdi:alert-circle-outline" className="w-8 h-8 text-red-500 mb-2" />
                    <p className="text-xs text-red-200 mb-3 break-words w-full">{error}</p>
                    <button 
                        onClick={handleRetry}
                        className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-xs text-white transition-colors"
                    >
                        Повторить
                    </button>
                </div>
            );
        }

        if (isLoading) {
            return (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-30">
                    <LoadingSpinner />
                </div>
            );
        }

        if (!shouldPlayStream) {
            // Not playing, showing cover
            return (
                <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/20">
                    <Icon icon="mdi:play-circle-outline" className="w-12 h-12 text-white/70 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
            );
        }

        // Active Stream Render
        if (streamType === 'iframe') {
            return <iframe src={streamUrl!} className="w-full h-full border-0 bg-black" title={device.name} />;
        }
        if (streamType === 'mjpeg') {
            return <img src={streamUrl!} className="w-full h-full object-cover" alt={device.name} onError={() => setError("Ошибка загрузки изображения")} />;
        }
        if (streamType === 'hls') {
            return <video ref={videoRef} className="w-full h-full object-cover" muted={muted} playsInline autoPlay />;
        }

        return null;
    };

    return (
        <div 
            ref={containerRef}
            className="w-full h-full relative bg-black overflow-hidden flex items-center justify-center group"
            onClick={() => onCameraCardClick && onCameraCardClick(device)}
        >
            {/* Background Layer: Snapshot or Placeholder */}
            {snapshotUrl ? (
                <img 
                    src={snapshotUrl} 
                    className="absolute inset-0 w-full h-full object-cover opacity-70" 
                    alt="snapshot" 
                />
            ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600">
                    <Icon icon={isCustomCamera ? "mdi:cctv-off" : "mdi:camera-off"} className="w-12 h-12 opacity-50 mb-2" />
                    {isCustomCamera && !customStreamUrl && (
                        <p className="text-[10px] px-2 text-center">Не задан URL потока</p>
                    )}
                </div>
            )}

            {/* Foreground Layer: Stream / Error / Loading */}
            <div className="absolute inset-0 z-10">
                {renderContent()}
            </div>

            {/* Badges */}
            {shouldPlayStream && !error && !isLoading && (
                <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-red-600/80 backdrop-blur-sm rounded text-white text-[9px] font-bold uppercase tracking-wider pointer-events-none z-40 animate-pulse">
                    LIVE
                </div>
            )}
        </div>
    );
};

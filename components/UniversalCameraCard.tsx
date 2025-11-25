
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
    const shouldPlayStream = autoPlay && isInView && isPageVisible;

    const [streamUrl, setStreamUrl] = useState<string | null>(null);
    const [streamType, setStreamType] = useState<'hls' | 'mjpeg' | 'iframe' | 'none'>('none');
    const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const customStreamUrl = device.customStreamUrl;
    const preferredStreamType = device.streamType || 'auto';

    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    // --- Snapshot Logic (Fallback & Preview) ---
    const fetchSnapshot = useCallback(async () => {
        // If streaming HLS successfully, skip snapshot
        if (streamType === 'hls' && !error && shouldPlayStream) return;
        // If visible, always try to have a snapshot as cover
        if (!isInView) return;

        try {
            const result = await signPath(`/api/camera_proxy/${device.id}`);
            if (!isMountedRef.current) return;

            const url = constructHaUrl(haUrl, result.path, 'http');
            // Add timestamp to prevent caching
            const urlWithCacheBuster = `${url}&t=${Date.now()}`;

            const img = new Image();
            img.onload = () => {
                if (isMountedRef.current) {
                    setSnapshotUrl(urlWithCacheBuster);
                }
            };
            img.src = urlWithCacheBuster;
        } catch (err) {
            // Silent fail for snapshots
        }
    }, [device.id, haUrl, signPath, streamType, error, shouldPlayStream, isInView]);

    // Poll for snapshots if stream is inactive or erroring
    useEffect(() => {
        fetchSnapshot();
        // If not streaming (or error), refresh snapshot more often (10s)
        // If streaming, refresh less often just to have a backup (60s)
        const intervalTime = (!shouldPlayStream || error) ? 10000 : 60000;
        const interval = setInterval(fetchSnapshot, intervalTime);
        return () => clearInterval(interval);
    }, [fetchSnapshot, shouldPlayStream, error]);


    // --- Stream Logic ---
    useEffect(() => {
        if (!shouldPlayStream) {
            // Cleanup when stopping
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

        setIsLoading(true);
        setError(null);

        const resolveUrl = async () => {
            try {
                let finalUrl = '';
                let type = preferredStreamType;

                if (customStreamUrl) {
                    finalUrl = customStreamUrl;
                    if (type === 'auto') {
                        if (finalUrl.includes('.m3u8')) type = 'hls';
                        else if (finalUrl.includes('.jpg') || finalUrl.includes('snapshot')) type = 'mjpeg';
                        else if (finalUrl.startsWith('ws')) type = 'iframe';
                        else type = 'iframe'; // Default for custom links
                    }
                } else {
                    // Home Assistant Camera Entity
                    if (type === 'auto' || type === 'hls') {
                        try {
                            const streamData = await getCameraStreamUrl(device.id);
                            if (streamData?.url) {
                                finalUrl = constructHaUrl(haUrl, streamData.url, 'http');
                                type = 'hls';
                            } else {
                                throw new Error("No stream URL");
                            }
                        } catch (e) {
                            // Fallback to MJPEG if HLS fails
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
                
                if (type === 'iframe') {
                    setStreamUrl(finalUrl);
                    setStreamType('iframe');
                    setIsLoading(false);
                } else if (type === 'mjpeg') {
                    const urlWithAuth = finalUrl.includes('token=') ? finalUrl : `${finalUrl}${finalUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
                    setStreamUrl(urlWithAuth);
                    setStreamType('mjpeg');
                    setIsLoading(false);
                } else if (type === 'hls') {
                    if (Hls.isSupported()) {
                        if (hlsRef.current) hlsRef.current.destroy();
                        const hls = new Hls({
                            capLevelToPlayerSize: true,
                            maxBufferLength: 30,
                            startLevel: -1,
                        });
                        hlsRef.current = hls;
                        hls.loadSource(finalUrl);
                        setStreamUrl(finalUrl); 
                        setStreamType('hls');
                        
                        // We attach media in a separate effect when ref is ready
                    } else if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
                        setStreamUrl(finalUrl);
                        setStreamType('hls');
                        // Native HLS handles loading via src prop
                    } else {
                        // Fallback to MJPEG if HLS not supported
                        const result = await signPath(`/api/camera_proxy_stream/${device.id}`);
                        const mjpegUrl = constructHaUrl(haUrl, result.path, 'http');
                        setStreamUrl(mjpegUrl);
                        setStreamType('mjpeg');
                        setIsLoading(false);
                    }
                }

            } catch (e) {
                console.error("Camera resolve error", e);
                if (isMountedRef.current) {
                    setError("Не удалось подключиться");
                    setIsLoading(false);
                    fetchSnapshot(); // Ensure we at least have a snapshot
                }
            }
        };

        resolveUrl();
    }, [shouldPlayStream, device.id, customStreamUrl, preferredStreamType, haUrl, signPath, getCameraStreamUrl]);

    // --- HLS Attachment Effect ---
    useEffect(() => {
        if (streamType === 'hls' && hlsRef.current && videoRef.current && streamUrl) {
            const hls = hlsRef.current;
            const video = videoRef.current;

            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                video.play().catch(e => {
                    console.warn("Autoplay prevented:", e);
                    // If autoplay prevented, user must interact. But we show snapshot underneath.
                });
                setIsLoading(false);
            });
            hls.on(Hls.Events.ERROR, (e, data) => {
                if (data.fatal) {
                    hls.destroy();
                    // Fallback to snapshot visual if HLS crashes
                    setError("Ошибка потока");
                    setIsLoading(false);
                }
            });

            return () => {
                hls.detachMedia();
            };
        }
    }, [streamType, streamUrl]);


    const renderStreamLayer = () => {
        if (!shouldPlayStream || error) return null;

        if (streamType === 'iframe' || (customStreamUrl && customStreamUrl.startsWith('http') && !customStreamUrl.includes('.m3u8'))) {
             return (
                 <iframe 
                    src={streamUrl || ''} 
                    className="absolute inset-0 w-full h-full border-0 pointer-events-none bg-black z-20" 
                    scrolling="no"
                    title={device.name}
                 />
             );
        }
        
        if (streamType === 'mjpeg' && streamUrl) {
            return <img src={streamUrl} className="absolute inset-0 w-full h-full object-cover z-20" alt={device.name} />;
        }

        if (streamType === 'hls' && streamUrl) {
             return (
                <video
                    ref={videoRef}
                    className="absolute inset-0 w-full h-full object-cover z-20"
                    muted={muted}
                    playsInline
                    autoPlay
                    src={!Hls.isSupported() ? streamUrl : undefined} // For Native HLS (Safari)
                />
            );
        }

        return null;
    };

    return (
        <div 
            ref={containerRef}
            className="w-full h-full relative bg-black overflow-hidden flex items-center justify-center"
            onClick={() => onCameraCardClick && onCameraCardClick(device)}
        >
            {/* Layer 1: Snapshot (Fallback/Preview) - Always visible underneath or when stream is off */}
            {snapshotUrl ? (
                <img 
                    src={snapshotUrl} 
                    className="absolute inset-0 w-full h-full object-cover opacity-60 z-10" 
                    alt={device.name} 
                />
            ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 text-gray-500">
                    <Icon icon="mdi:camera" className="w-12 h-12 opacity-30" />
                </div>
            )}

            {/* Layer 2: Active Stream */}
            {renderStreamLayer()}
            
            {/* Layer 3: Loading Indicator */}
            {isLoading && shouldPlayStream && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] z-30">
                    <LoadingSpinner />
                </div>
            )}

            {/* Layer 4: Error Overlay */}
            {error && (
                <div className="absolute bottom-2 left-2 right-2 bg-red-900/80 text-white text-[10px] p-1 rounded text-center z-40 backdrop-blur-md truncate">
                    {error}
                </div>
            )}
            
            {/* Layer 5: LIVE Badge */}
            {shouldPlayStream && !error && !isLoading && (
                 <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-red-600/80 backdrop-blur-sm rounded text-white text-[9px] font-bold uppercase tracking-wider pointer-events-none z-40 animate-pulse">
                    LIVE
                </div>
            )}
        </div>
    );
};

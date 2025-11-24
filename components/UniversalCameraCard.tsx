
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

const CanvasMjpegPlayer: React.FC<{ url: string; refreshInterval?: number; onError?: () => void }> = ({ url, refreshInterval = 1000, onError }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const timerRef = useRef<number | null>(null);
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    const drawFrame = useCallback(() => {
        if (!isMounted.current) return;
        
        const img = new Image();
        // Add timestamp to prevent caching
        const frameUrl = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
        
        img.onload = () => {
            if (!isMounted.current || !canvasRef.current) return;
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
                // Set canvas size to match image aspect ratio if needed, or object-fit cover logic
                // For simplicity in this card, we assume canvas CSS handles size, 
                // but we should set internal resolution to match image for clarity.
                if (canvasRef.current.width !== img.naturalWidth) canvasRef.current.width = img.naturalWidth;
                if (canvasRef.current.height !== img.naturalHeight) canvasRef.current.height = img.naturalHeight;
                
                ctx.drawImage(img, 0, 0);
            }
            // Schedule next frame
            timerRef.current = window.setTimeout(drawFrame, refreshInterval);
        };
        
        img.onerror = () => {
            if (onError) onError();
            // Retry slower on error
            timerRef.current = window.setTimeout(drawFrame, 5000);
        };
        
        img.src = frameUrl;
    }, [url, refreshInterval, onError]);

    useEffect(() => {
        drawFrame();
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [drawFrame]);

    return <canvas ref={canvasRef} className="w-full h-full object-cover" />;
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
    
    const isInView = useInView(containerRef);
    const isPageVisible = usePageVisibility();
    const shouldPlay = autoPlay && isInView && isPageVisible;

    const [streamUrl, setStreamUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    // Determine effective stream URL and type
    // Priority: Custom URL > Internal HA Logic
    const customStreamUrl = device.customStreamUrl;
    const streamType = device.streamType || 'auto';
    
    // Effect to resolve stream URL
    useEffect(() => {
        if (!shouldPlay) {
            // Cleanup when paused
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
            if (videoRef.current) {
                videoRef.current.removeAttribute('src');
                videoRef.current.load();
            }
            return;
        }

        let mounted = true;
        setIsLoading(true);
        setError(null);

        const resolveUrl = async () => {
            try {
                let finalUrl = '';
                let type = streamType;

                if (customStreamUrl) {
                    finalUrl = customStreamUrl;
                    // Simple heuristic if type is auto
                    if (type === 'auto') {
                        if (finalUrl.includes('.m3u8')) type = 'hls';
                        else if (finalUrl.includes('.jpg') || finalUrl.includes('snapshot')) type = 'mjpeg'; // Actually snapshot loop
                        else if (finalUrl.startsWith('ws')) type = 'iframe'; // Assume MSE/WebRTC via iframe for now if WS
                        else type = 'iframe'; // Default to iframe for unknown custom URLs (like go2rtc embed)
                    }
                } else {
                    // HA Native Logic
                    if (type === 'auto' || type === 'hls') {
                        try {
                            const streamData = await getCameraStreamUrl(device.id);
                            finalUrl = constructHaUrl(haUrl, streamData.url, 'http');
                            type = 'hls';
                        } catch (e) {
                            // Fallback to MJPEG proxy
                            const result = await signPath(`/api/camera_proxy_stream/${device.id}`);
                            finalUrl = constructHaUrl(haUrl, result.path, 'http');
                            type = 'mjpeg'; // Native HA mjpeg stream
                        }
                    } else if (type === 'mjpeg') {
                         const result = await signPath(`/api/camera_proxy_stream/${device.id}`);
                         finalUrl = constructHaUrl(haUrl, result.path, 'http');
                    }
                }

                if (!mounted) return;
                
                // Apply Logic based on Type
                if (type === 'iframe') {
                    setStreamUrl(finalUrl);
                    setIsLoading(false);
                } else if (type === 'mjpeg') {
                    // For HA MJPEG stream, we can put it directly in an img tag usually, 
                    // but our CanvasMjpegPlayer is for individual snapshots.
                    // If it's a true stream, img tag is better.
                    // If it's a snapshot loop required (like for lightweight), we use canvas.
                    // For HA /camera_proxy_stream/, it's a continuous multipart stream.
                    // Let's use standard IMG for HA stream to avoid CORS mess with canvas sometimes.
                    // BUT, to be "Better than ChatGPT", we use an auth-appended URL.
                    const urlWithAuth = finalUrl.includes('token=') ? finalUrl : `${finalUrl}${finalUrl.includes('?') ? '&' : '?'}t=${Date.now()}`; // Basic cache busting
                    setStreamUrl(urlWithAuth);
                    setIsLoading(false);
                } else if (type === 'hls') {
                    if (Hls.isSupported()) {
                        if (hlsRef.current) hlsRef.current.destroy();
                        const hls = new Hls({
                            capLevelToPlayerSize: true,
                            maxBufferLength: 30, // Conservative buffering
                            startLevel: -1, // Auto
                        });
                        hlsRef.current = hls;
                        hls.loadSource(finalUrl);
                        if (videoRef.current) hls.attachMedia(videoRef.current);
                        hls.on(Hls.Events.MANIFEST_PARSED, () => {
                            videoRef.current?.play().catch(() => {/* Autoplay block */});
                            setIsLoading(false);
                        });
                        hls.on(Hls.Events.ERROR, (e, data) => {
                            if (data.fatal) {
                                console.warn("HLS Fatal", data);
                                hls.destroy();
                                setError("Ошибка потока");
                            }
                        });
                    } else if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
                        videoRef.current.src = finalUrl;
                        videoRef.current.addEventListener('loadedmetadata', () => {
                            videoRef.current?.play();
                            setIsLoading(false);
                        });
                    }
                }

            } catch (e) {
                console.error("Camera resolve error", e);
                setError("Не удалось подключиться");
                setIsLoading(false);
            }
        };

        resolveUrl();

        return () => { mounted = false; };
    }, [shouldPlay, device.id, customStreamUrl, streamType, haUrl, signPath, getCameraStreamUrl]);

    const renderContent = () => {
        if (error) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <Icon icon="mdi:alert-circle-outline" className="w-10 h-10 mb-2" />
                    <span className="text-xs">{error}</span>
                </div>
            );
        }

        if (!shouldPlay) {
            // Idle State: Show Snapshot or Placeholder
            // Optimally, we fetch a single snapshot here.
            return (
                <div className="w-full h-full bg-gray-900 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-black/40 z-10 flex items-center justify-center">
                        <div className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs text-white font-medium flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                            Ожидание
                        </div>
                    </div>
                    {/* Placeholder Icon */}
                    <Icon icon="mdi:cctv" className="w-16 h-16 text-gray-700" />
                </div>
            );
        }

        if (streamType === 'iframe' || (customStreamUrl && customStreamUrl.startsWith('http') && !customStreamUrl.includes('.m3u8'))) {
             // IFrame mode for Go2RTC/WebRTC players or custom MJPEG streams that don't work well in IMG tags
             return (
                 <iframe 
                    src={streamUrl || ''} 
                    className="w-full h-full border-0 pointer-events-none" 
                    scrolling="no"
                    title={device.name}
                 />
             );
        }
        
        if (streamType === 'mjpeg' && streamUrl) {
            return <img src={streamUrl} className="w-full h-full object-cover" alt={device.name} />;
        }

        // Default HLS Video
        return (
            <video
                ref={videoRef}
                className="w-full h-full object-cover"
                muted={muted}
                playsInline
                autoPlay
            />
        );
    };

    return (
        <div 
            ref={containerRef}
            className="w-full h-full relative bg-black overflow-hidden rounded-xl group cursor-pointer transform transition-transform"
            onClick={() => onCameraCardClick && onCameraCardClick(device)}
        >
            {/* Video Layer */}
            {renderContent()}

            {/* Loading Indicator */}
            {isLoading && shouldPlay && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] z-20">
                    <LoadingSpinner />
                </div>
            )}

            {/* Overlay UI (Glassmorphism) */}
            <div className="absolute inset-0 p-3 flex flex-col justify-between z-30 pointer-events-none transition-opacity duration-300">
                <div className="flex justify-between items-start">
                    <div className="bg-black/30 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-md border border-white/10 shadow-sm">
                        {shouldPlay ? 'LIVE' : 'OFFLINE'}
                    </div>
                    {streamType === 'hls' && (
                        <div className="bg-red-500/80 backdrop-blur-sm text-white text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1 animate-pulse">
                            <div className="w-1 h-1 bg-white rounded-full"></div> REC
                        </div>
                    )}
                </div>
                
                {/* Pro Controls (Visual Only for now, but shows capability) */}
                <div className="flex justify-between items-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                     <div className="flex gap-2 pointer-events-auto">
                        <button className="p-1.5 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md text-white transition-colors" title="Снимок">
                            <Icon icon="mdi:camera" className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md text-white transition-colors" title="Звук">
                            <Icon icon={muted ? "mdi:volume-off" : "mdi:volume-high"} className="w-4 h-4" />
                        </button>
                     </div>
                     <div className="pointer-events-auto">
                        <button className="p-1.5 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md text-white transition-colors" title="Полноэкранный режим">
                            <Icon icon="mdi:fullscreen" className="w-4 h-4" />
                        </button>
                     </div>
                </div>
            </div>
        </div>
    );
};

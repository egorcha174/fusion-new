
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
    
    const isInView = useInView(containerRef);
    const isPageVisible = usePageVisibility();
    const shouldPlay = autoPlay && isInView && isPageVisible;

    const [streamUrl, setStreamUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const customStreamUrl = device.customStreamUrl;
    const streamType = device.streamType || 'auto';
    
    useEffect(() => {
        if (!shouldPlay) {
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
                    if (type === 'auto') {
                        if (finalUrl.includes('.m3u8')) type = 'hls';
                        else if (finalUrl.includes('.jpg') || finalUrl.includes('snapshot')) type = 'mjpeg';
                        else if (finalUrl.startsWith('ws')) type = 'iframe';
                        else type = 'iframe';
                    }
                } else {
                    if (type === 'auto' || type === 'hls') {
                        try {
                            const streamData = await getCameraStreamUrl(device.id);
                            finalUrl = constructHaUrl(haUrl, streamData.url, 'http');
                            type = 'hls';
                        } catch (e) {
                            const result = await signPath(`/api/camera_proxy_stream/${device.id}`);
                            finalUrl = constructHaUrl(haUrl, result.path, 'http');
                            type = 'mjpeg';
                        }
                    } else if (type === 'mjpeg') {
                         const result = await signPath(`/api/camera_proxy_stream/${device.id}`);
                         finalUrl = constructHaUrl(haUrl, result.path, 'http');
                    }
                }

                if (!mounted) return;
                
                if (type === 'iframe') {
                    setStreamUrl(finalUrl);
                    setIsLoading(false);
                } else if (type === 'mjpeg') {
                    const urlWithAuth = finalUrl.includes('token=') ? finalUrl : `${finalUrl}${finalUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
                    setStreamUrl(urlWithAuth);
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
                        if (videoRef.current) hls.attachMedia(videoRef.current);
                        hls.on(Hls.Events.MANIFEST_PARSED, () => {
                            videoRef.current?.play().catch(() => {});
                            setIsLoading(false);
                        });
                        hls.on(Hls.Events.ERROR, (e, data) => {
                            if (data.fatal) {
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
                <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-gray-900">
                    <Icon icon="mdi:alert-circle-outline" className="w-10 h-10 mb-2" />
                    <span className="text-xs">{error}</span>
                </div>
            );
        }

        if (!shouldPlay) {
            return (
                <div className="w-full h-full bg-gray-900 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-black/40 z-10 flex items-center justify-center">
                        <div className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs text-white font-medium flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                            Ожидание
                        </div>
                    </div>
                    <Icon icon="mdi:cctv" className="w-16 h-16 text-gray-700" />
                </div>
            );
        }

        if (streamType === 'iframe' || (customStreamUrl && customStreamUrl.startsWith('http') && !customStreamUrl.includes('.m3u8'))) {
             return (
                 <iframe 
                    src={streamUrl || ''} 
                    className="w-full h-full border-0 pointer-events-none bg-black" 
                    scrolling="no"
                    title={device.name}
                 />
             );
        }
        
        if (streamType === 'mjpeg' && streamUrl) {
            return <img src={streamUrl} className="w-full h-full object-cover" alt={device.name} />;
        }

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
            className="w-full h-full relative bg-black overflow-hidden"
        >
            {renderContent()}
            
            {isLoading && shouldPlay && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] z-20">
                    <LoadingSpinner />
                </div>
            )}
        </div>
    );
};

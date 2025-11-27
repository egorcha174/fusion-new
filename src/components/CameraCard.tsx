
import React, { useEffect, useRef } from "react";
import { useCameraStream } from "../hooks/useCameraStream";
import { Device, ThemeColors } from "../types";
import { Icon } from "@iconify/react";

interface CameraCardProps {
  device: Device;
  colorScheme: ThemeColors;
}

const CameraCard: React.FC<CameraCardProps> = ({ device, colorScheme }) => {
  const { stream, error } = useCameraStream(device.id);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [snapshotUrl, setSnapshotUrl] = React.useState<string | null>(null);

  useEffect(() => {
    // If HLS, setup video
    // Note: Real HLS requires setup with Hls.js if browser doesn't support it native
    // For the provided environment (Vite), we assume standard video tag behavior or hls.js usage if strictly needed.
    // But the prompt example used a video tag for HLS.
    // The provided context mentions hls.js in dependencies.
    
    if (stream?.type === 'snapshot') {
        setSnapshotUrl(stream.url);
        const interval = setInterval(() => {
            setSnapshotUrl(`${stream.url.split('&_t=')[0]}&_t=${Date.now()}`);
        }, 10000);
        return () => clearInterval(interval);
    }
  }, [stream]);

  const containerStyle: React.CSSProperties = {
    backgroundColor: colorScheme.cardBackground,
    borderRadius: `${colorScheme.cardBorderRadius}px`,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  };

  const overlayStyle: React.CSSProperties = {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '8px 12px',
      background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
      color: 'white',
      pointerEvents: 'none',
  };

  if (!stream && !error) {
      return (
          <div style={containerStyle} className="items-center justify-center">
              <Icon icon="mdi:loading" className="animate-spin w-8 h-8 text-gray-400" />
          </div>
      )
  }

  if (error) {
      return (
          <div style={containerStyle} className="items-center justify-center p-4 text-center">
              <Icon icon="mdi:alert-circle" className="w-8 h-8 text-red-500 mb-2" />
              <p className="text-xs text-gray-500">{error}</p>
          </div>
      )
  }

  return (
    <div style={containerStyle} className="group">
      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
          {stream?.type === 'mjpeg' || stream?.type === 'snapshot' ? (
              <img 
                src={stream.type === 'mjpeg' ? stream.url : snapshotUrl || ''} 
                alt={device.name} 
                className="w-full h-full object-cover"
              />
          ) : (
              // Basic video fallback if HLS url provided
              <video 
                ref={videoRef}
                src={stream?.url} 
                muted 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
          )}
          
          <div style={overlayStyle}>
              <p className="font-medium text-sm truncate">{device.name}</p>
              <p className="text-[10px] opacity-80">{stream?.type === 'snapshot' ? 'Снапшот' : 'Live'}</p>
          </div>
      </div>
    </div>
  );
};

export default React.memo(CameraCard);

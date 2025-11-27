
import { useState, useEffect } from "react";
import { useAppStore } from "../store/appStore";
import { useHAStore } from "../store/haStore";

interface StreamInfo {
  type: "hls" | "mjpeg" | "snapshot";
  url: string;
}

export function useCameraStream(entityId: string) {
  const [stream, setStream] = useState<StreamInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { servers, activeServerId } = useAppStore();
  // Assuming signPath is handled internally via fetch calls usually, but for streams we might need explicit tokens
  // In standard HA, HLS streams require a token generation via WebSocket.
  
  const { connectionStatus, entities } = useHAStore();
  const activeServer = servers.find(s => s.id === activeServerId);

  useEffect(() => {
    if (connectionStatus !== 'connected' || !activeServer) return;

    let isMounted = true;
    const entity = entities[entityId];
    
    // If entity has an access token in attributes, use it for MJPEG/Snapshot
    const accessToken = entity?.attributes?.access_token;
    const baseUrl = activeServer.url.replace(/\/$/, '');

    async function fetchStreamUrl() {
      try {
        // Try to get HLS stream via REST API (or WebSocket if available via store)
        // Using REST for simplicity here: /api/camera_proxy_stream/{entity_id}?token={token}
        // Actually, proper HLS usually requires the 'camera/stream' service which returns a path.
        
        // 1. Priority: HLS via standard HA API
        const res = await fetch(`${baseUrl}/api/camera_proxy_stream/${entityId}`, {
            method: 'HEAD',
            headers: {
                'Authorization': `Bearer ${activeServer?.token}`
            }
        });

        if (res.ok && isMounted) {
             // Check if we can get a proper stream URL via service call (more robust for HLS)
             // But for now, we fallback to the proxy stream or construct the URL manually if we had access to the HLS path service.
             // Since we are in a hook, we can't easily await the websocket service call without exposing it here.
             // Simplified approach: Use the camera_proxy_stream which often serves MJPEG, 
             // OR check attributes.
             
             // Modern HA uses HLS via /api/hls/... but we need the stream source.
             // Let's default to the universal proxy stream which handles adaptation, 
             // usually MJPEG for real-time or HLS if supported by the integration.
             
             // Better approach for "smart" cards:
             // Use the standard snapshot as fallback, try to deduce stream.
             
             setStream({
                 type: 'mjpeg', // The proxy stream is typically MJPEG
                 url: `${baseUrl}/api/camera_proxy_stream/${entityId}?token=${accessToken}`
             });
        } else {
             throw new Error("Stream not available");
        }
      } catch (e) {
        if (isMounted) {
            // Fallback to snapshot
            setStream({
                type: 'snapshot',
                url: `${baseUrl}/api/camera_proxy/${entityId}?token=${accessToken}`
            });
        }
      }
    }

    // Initial setup
    if (entity) {
        // We construct URLs. 
        // Note: To get a true HLS stream path, we'd typically call `camera/stream` service.
        // For this implementation, we will prioritize the MJPEG stream proxy which is universally supported by HA UI.
        // If the user explicitly wants HLS, we would need to call the `stream` service.
        
        // Let's try to be smart:
        // If we can assume HLS is preferred, we should try to fetch the stream URL.
        // For now, sticking to the robust proxy stream.
        
        const snapshotUrl = `${baseUrl}/api/camera_proxy/${entityId}?token=${accessToken}&${Date.now()}`;
        const streamUrl = `${baseUrl}/api/camera_proxy_stream/${entityId}?token=${accessToken}`;
        
        setStream({
            type: 'mjpeg',
            url: streamUrl
        });
    }

    return () => {
      isMounted = false;
    };
  }, [entityId, connectionStatus, activeServer, entities]);

  return { stream, error };
}

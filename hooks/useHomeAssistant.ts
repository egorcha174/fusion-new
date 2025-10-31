
import { useState, useRef, useCallback, useEffect } from 'react';
import { HassEntity, HassArea, HassDevice } from '../types';

interface HassEntities {
  [key: string]: HassEntity;
}

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'failed';

const useHomeAssistant = () => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [entities, setEntities] = useState<HassEntities>({});
  const [areas, setAreas] = useState<HassArea[]>([]);
  const [devices, setDevices] = useState<HassDevice[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const messageIdRef = useRef(1);

  const sendMessage = useCallback((message: object) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    }
  }, []);

  const callService = useCallback((domain: string, service: string, service_data: object) => {
    sendMessage({
      id: messageIdRef.current++,
      type: 'call_service',
      domain,
      service,
      service_data,
    });
  }, [sendMessage]);

  const connect = useCallback((url: string, token: string) => {
    if (socketRef.current) {
      socketRef.current.close();
    }
    
    setConnectionStatus('connecting');
    setError(null);
    messageIdRef.current = 1;

    // Robust URL cleaning and protocol selection
    const cleanUrl = url.replace(/^(https?|wss?):\/\//, '');
    const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    const wsUrl = `${protocol}${cleanUrl}/api/websocket`;

    try {
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('WebSocket connected');
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'auth_required':
            sendMessage({ type: 'auth', access_token: token });
            break;
          case 'auth_ok':
            console.log('Authenticated successfully');
            setConnectionStatus('connected');
            const statesId = messageIdRef.current++;
            const areasId = messageIdRef.current++;
            const devicesId = messageIdRef.current++;
            
            sendMessage({ id: statesId, type: 'get_states' });
            sendMessage({ id: areasId, type: 'config/area_registry/list' });
            sendMessage({ id: devicesId, type: 'config/device_registry/list' });
            sendMessage({ id: messageIdRef.current++, type: 'subscribe_events', event_type: 'state_changed' });
            
            socket.onmessage = (event) => handleMessage(event, { statesId, areasId, devicesId });
            break;
          case 'auth_invalid':
            console.error('Authentication failed:', data.message);
            setError(`Authentication failed: ${data.message}`);
            setConnectionStatus('failed');
            socket.close();
            break;
        }
      };

      const handleMessage = (event: MessageEvent, ids: { statesId: number, areasId: number, devicesId: number }) => {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case 'result':
            if (data.success) {
              if (data.id === ids.statesId) {
                const newEntities = data.result.reduce((acc: HassEntities, entity: HassEntity) => {
                  acc[entity.entity_id] = entity;
                  return acc;
                }, {});
                setEntities(newEntities);
              } else if (data.id === ids.areasId) {
                setAreas(data.result);
              } else if (data.id === ids.devicesId) {
                setDevices(data.result);
              }
            } else {
              console.error('API Error:', data.error);
              setError(`API Error: ${data.error.message}`);
              setConnectionStatus('failed');
            }
            break;
          case 'event':
            if (data.event.event_type === 'state_changed') {
              const { entity_id, new_state } = data.event.data;
              if (new_state) {
                setEntities(prev => ({ ...prev, [entity_id]: new_state }));
              } else {
                setEntities(prev => {
                  const updated = { ...prev };
                  delete updated[entity_id];
                  return updated;
                });
              }
            }
            break;
        }
      };

      socket.onclose = () => {
        console.log('WebSocket disconnected');
        if (connectionStatus !== 'connected') {
            setConnectionStatus('failed');
            setError('Connection closed unexpectedly.');
        } else {
            setConnectionStatus('idle');
        }
      };

      socket.onerror = (event) => {
        console.error('WebSocket error:', event);
        // This generic event doesn't give specific details, so we check the error from the `catch` block.
        // If an error hasn't been set by the `catch` block, provide a generic one.
        if (!error) {
            setError('Failed to connect. Check URL and network.');
        }
        setConnectionStatus('failed');
      };
    } catch (e) {
      console.error('WebSocket creation error:', e);
      if (e instanceof DOMException && e.name === 'SecurityError') {
         setError('Security Error: Cannot connect to an insecure WebSocket (ws://) from a secure page (https://). This is a browser security feature. Try accessing this app via HTTP or enabling HTTPS on Home Assistant.');
      } else {
        setError('Invalid URL format or connection refused.');
      }
      setConnectionStatus('failed');
    }
  }, [sendMessage, connectionStatus, error]);
  
  useEffect(() => {
    return () => {
      socketRef.current?.close();
    }
  }, []);

  return { connectionStatus, error, entities, areas, devices, connect, callService };
};

export default useHomeAssistant;

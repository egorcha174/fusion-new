
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { HassEntity, HassArea, HassDevice, HassEntityRegistryEntry } from '../types';

interface HassEntities {
  [key: string]: HassEntity;
}

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'failed';

const useHomeAssistant = () => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entities, setEntities] = useState<HassEntities>({});
  const [areas, setAreas] = useState<HassArea[]>([]);
  const [devices, setDevices] = useState<HassDevice[]>([]);
  const [entityRegistry, setEntityRegistry] = useState<HassEntityRegistryEntry[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const messageIdRef = useRef(1);
  const initialFetchIds = useRef<Set<number>>(new Set());

  const sendMessage = useCallback((message: object) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    }
  }, []);
  
  const disconnect = useCallback(() => {
    if (socketRef.current) {
        socketRef.current.close();
    }
    setConnectionStatus('idle');
    setEntities({});
    setAreas([]);
    setDevices([]);
    setEntityRegistry([]);
    setError(null);
    setIsLoading(false);
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
    setIsLoading(true);
    messageIdRef.current = 1;

    const cleanUrl = url.replace(/^(https?|wss?):\/\//, '');
    const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    const wsUrl = `${protocol}${cleanUrl}/api/websocket`;

    try {
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('WebSocket connected');
      };
      
      const handleInitialFetches = (data: any) => {
         if (initialFetchIds.current.has(data.id)) {
            initialFetchIds.current.delete(data.id);
            if (initialFetchIds.current.size === 0) {
              setIsLoading(false);
              console.log('Initial data fetch complete.');
            }
          }
      }

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
            const entityRegistryId = messageIdRef.current++;
            initialFetchIds.current = new Set([statesId, areasId, devicesId, entityRegistryId]);
            
            sendMessage({ id: statesId, type: 'get_states' });
            sendMessage({ id: areasId, type: 'config/area_registry/list' });
            sendMessage({ id: devicesId, type: 'config/device_registry/list' });
            sendMessage({ id: entityRegistryId, type: 'config/entity_registry/list'});
            sendMessage({ id: messageIdRef.current++, type: 'subscribe_events', event_type: 'state_changed' });
            
            socket.onmessage = (event) => handleMessage(event, { statesId, areasId, devicesId, entityRegistryId });
            break;
          case 'auth_invalid':
            console.error('Authentication failed:', data.message);
            setError(`Ошибка аутентификации: ${data.message}`);
            setConnectionStatus('failed');
            setIsLoading(false);
            socket.close();
            break;
        }
      };

      const handleMessage = (event: MessageEvent, ids: { statesId: number, areasId: number, devicesId: number, entityRegistryId: number }) => {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case 'result':
            handleInitialFetches(data);
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
              } else if (data.id === ids.entityRegistryId) {
                  setEntityRegistry(data.result);
              }
            } else {
              console.error('API Error:', data.error);
              setError(`Ошибка API: ${data.error.message}`);
              setConnectionStatus('failed');
              setIsLoading(false);
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

      socket.onclose = (e) => {
        console.log('WebSocket disconnected', e.reason);
        if (connectionStatus === 'connected') {
            setConnectionStatus('idle');
        }
         setIsLoading(false);
      };

      socket.onerror = (event) => {
        console.error('WebSocket error:', event);
        if (!error) {
           if (event instanceof Event && socket.readyState === WebSocket.CLOSING) {
             setError('Не удалось подключиться. Проверьте URL и убедитесь, что Home Assistant доступен.');
           } else {
             setError('Ошибка WebSocket. Проверьте консоль для деталей.');
           }
        }
        setConnectionStatus('failed');
        setIsLoading(false);
      };
    } catch (e) {
      console.error('WebSocket creation error:', e);
       if (e instanceof DOMException && e.name === 'SecurityError') {
         setError('Ошибка безопасности: Нельзя подключиться к небезопасному WebSocket (ws://) с защищенной страницы (https://). Это функция безопасности браузера. Попробуйте зайти на это приложение по HTTP или включите HTTPS в Home Assistant.');
      } else {
        setError('Неверный формат URL или отказано в соединении.');
      }
      setConnectionStatus('failed');
      setIsLoading(false);
    }
  }, [sendMessage, connectionStatus, error]);
  
  useEffect(() => {
    return () => {
      socketRef.current?.close();
    }
  }, []);

  return { connectionStatus, isLoading, error, entities, areas, devices, entityRegistry, connect, disconnect, callService };
};

export default useHomeAssistant;
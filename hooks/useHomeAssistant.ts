
import { useEffect, useRef } from 'react';
import { useHAStore } from '../store/haStore';
import { useAppStore } from '../store/appStore';

export const useHomeAssistant = () => {
    const { connect, connectionStatus } = useHAStore();
    const { servers, activeServerId } = useAppStore();
    const mounted = useRef(false);

    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    // Auto-connect if we have an active server and are currently idle
    useEffect(() => {
        if (connectionStatus === 'idle' && activeServerId) {
            const server = servers.find(s => s.id === activeServerId);
            if (server) {
                console.log('[useHomeAssistant] Auto-connecting to server:', server.name);
                connect(server.url, server.token);
            }
        }
    }, [activeServerId, servers, connectionStatus, connect]);
};

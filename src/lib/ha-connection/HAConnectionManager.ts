
import { constructHaUrl } from '$utils/url';
import { CallbackRegistry } from './CallbackRegistry';
import type { ConnectionOptions } from './types';

export class HAConnectionManager {
    private socket: WebSocket | null = null;
    private options: ConnectionOptions;
    
    // Reconnection logic
    private shouldReconnect = true;
    private reconnectAttempt = 0;
    private reconnectTimeout: any = null;
    private readonly maxReconnectDelay = 30000;

    // Helpers
    public callbacks = new CallbackRegistry();
    private globalMessageId = 1;

    constructor(options: ConnectionOptions) {
        this.options = options;
    }

    public connect() {
        this.shouldReconnect = true;
        this.cleanup();
        this.initiateConnection();
    }

    private initiateConnection() {
        try {
            this.options.onStateChange('connecting');
            
            // Build URL
            const wsUrl = constructHaUrl(this.options.url, '/api/websocket', 'ws');
            this.socket = new WebSocket(wsUrl);

            this.socket.onopen = this.handleOpen.bind(this);
            this.socket.onmessage = this.handleMessage.bind(this);
            this.socket.onclose = this.handleClose.bind(this);
            this.socket.onerror = this.handleError.bind(this);

        } catch (e: any) {
            console.error('[HA] Socket creation failed:', e);
            this.scheduleReconnect();
        }
    }

    private handleOpen() {
        console.log('[HA] Socket opened, waiting for auth...');
        // We don't set 'connected' yet, we wait for 'auth_ok'
    }

    private handleMessage(event: MessageEvent) {
        try {
            const data = JSON.parse(event.data);

            // 1. Auth Flow
            if (data.type === 'auth_required') {
                this.sendRaw({ type: 'auth', access_token: this.options.token });
                return;
            }
            if (data.type === 'auth_ok') {
                this.reconnectAttempt = 0; // Reset backoff on successful auth
                this.options.onStateChange('connected');
                return;
            }
            if (data.type === 'auth_invalid') {
                this.shouldReconnect = false; // Don't retry invalid auth
                this.options.onStateChange('auth_invalid', data.message);
                this.disconnect();
                return;
            }

            // 2. Command Results
            if (data.type === 'result') {
                this.callbacks.handleResult(data);
                return;
            }

            // 3. Pass everything else to consumer (Events, pong, etc)
            this.options.onMessage(data);

        } catch (e) {
            console.error('[HA] Message parse error:', e);
        }
    }

    private handleClose(e: CloseEvent) {
        console.log(`[HA] Socket closed (Code: ${e.code}). Clean: ${e.wasClean}`);
        this.callbacks.clear(); // Reject pending promises
        
        if (this.shouldReconnect) {
            this.scheduleReconnect();
        } else {
            this.options.onStateChange('failed', 'Disconnected');
        }
    }

    private handleError(e: Event) {
        console.error('[HA] Socket error:', e);
        // Error usually precedes close, so we let handleClose do the heavy lifting
    }

    private scheduleReconnect() {
        this.options.onStateChange('connecting');
        
        const delay = Math.min(
            1000 * Math.pow(1.5, this.reconnectAttempt), 
            this.maxReconnectDelay
        );
        
        console.log(`[HA] Reconnecting in ${delay}ms (Attempt ${this.reconnectAttempt + 1})...`);
        
        this.reconnectTimeout = setTimeout(() => {
            this.reconnectAttempt++;
            this.initiateConnection();
        }, delay);
    }

    public send(data: any): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
                return reject(new Error('WebSocket not connected'));
            }

            const id = this.globalMessageId++;
            const payload = { ...data, id };
            
            this.callbacks.register(id, resolve, reject);
            this.socket.send(JSON.stringify(payload));
        });
    }

    private sendRaw(data: any) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(data));
        }
    }

    public disconnect() {
        this.shouldReconnect = false;
        this.cleanup();
        this.options.onStateChange('idle');
    }

    private cleanup() {
        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
        if (this.socket) {
            // Prevent firing reconnect logic during manual cleanup
            this.socket.onclose = null; 
            this.socket.onerror = null;
            this.socket.onmessage = null;
            this.socket.close();
            this.socket = null;
        }
        this.callbacks.clear();
    }
}


import type { ConnectionStatus, HAResult } from './types';

type MessageHandler = (data: any) => void;
type StatusHandler = (status: ConnectionStatus, error?: string) => void;

export class HADriver {
    private socket: WebSocket | null = null;
    private url: string;
    private token: string;
    private msgId = 1;
    private pendingCommands = new Map<number, { resolve: (v: any) => void; reject: (e: any) => void }>();
    
    private onMessage: MessageHandler;
    private onStatus: StatusHandler;
    
    private reconnectTimer: any = null;
    private isIntentionalClose = false;

    constructor(url: string, token: string, onStatus: StatusHandler, onMessage: MessageHandler) {
        // Нормализация URL: ws:// или wss://
        const protocol = url.startsWith('https') ? 'wss://' : 'ws://';
        const cleanUrl = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
        this.url = `${protocol}${cleanUrl}/api/websocket`;
        this.token = token;
        this.onStatus = onStatus;
        this.onMessage = onMessage;
    }

    public connect() {
        this.isIntentionalClose = false;
        if (this.socket) return;

        this.onStatus('connecting');
        
        try {
            this.socket = new WebSocket(this.url);
            this.socket.onopen = this.handleOpen.bind(this);
            this.socket.onmessage = this.handleSocketMessage.bind(this);
            this.socket.onclose = this.handleClose.bind(this);
            this.socket.onerror = this.handleError.bind(this);
        } catch (e) {
            this.handleError(e);
        }
    }

    public disconnect() {
        this.isIntentionalClose = true;
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        this.onStatus('disconnected');
    }

    public async sendCommand(type: string, payload: any = {}): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
                return reject(new Error('Socket not connected'));
            }

            const id = this.msgId++;
            const message = { id, type, ...payload };
            
            this.pendingCommands.set(id, { resolve, reject });
            this.socket.send(JSON.stringify(message));
        });
    }

    private handleOpen() {
        // Ждем 'auth_required', не ставим connected сразу
    }

    private handleSocketMessage(event: MessageEvent) {
        try {
            const data = JSON.parse(event.data);

            // 1. Auth Flow
            if (data.type === 'auth_required') {
                this.socket?.send(JSON.stringify({ type: 'auth', access_token: this.token }));
                return;
            }
            if (data.type === 'auth_ok') {
                this.onStatus('connected');
                // Подписываемся на события сразу после успешного входа
                this.sendCommand('subscribe_events', { event_type: 'state_changed' }).catch(console.error);
                return;
            }
            if (data.type === 'auth_invalid') {
                this.onStatus('auth_invalid', data.message);
                this.disconnect(); // Не пытаемся переподключиться при плохом токене
                return;
            }

            // 2. Command Responses
            if (data.type === 'result') {
                const result = data as HAResult;
                const promise = this.pendingCommands.get(result.id);
                if (promise) {
                    if (result.success) promise.resolve(result.result);
                    else promise.reject(result.error);
                    this.pendingCommands.delete(result.id);
                }
                return;
            }

            // 3. Events
            this.onMessage(data);

        } catch (e) {
            console.error('HA Driver Parse Error:', e);
        }
    }

    private handleClose(event: CloseEvent) {
        this.socket = null;
        this.pendingCommands.forEach(p => p.reject(new Error('Connection closed')));
        this.pendingCommands.clear();

        if (!this.isIntentionalClose) {
            this.onStatus('disconnected', 'Connection lost');
            this.scheduleReconnect();
        }
    }

    private handleError(event: Event | unknown) {
        console.error('HA Socket Error:', event);
        // Обычно за ошибкой следует close, там и обработаем логику
    }

    private scheduleReconnect() {
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
            console.log('Reconnecting...');
            this.connect();
        }, 5000);
    }
}

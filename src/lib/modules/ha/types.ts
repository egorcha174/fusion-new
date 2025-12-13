
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'auth_invalid' | 'error';

export interface ServerConfig {
    id: string;
    name: string;
    url: string;
    token: string; // В памяти хранится расшифрованным, в storage - зашифрованным
    lastActive?: number;
}

export interface AuthMessage {
    type: 'auth';
    access_token: string;
}

export interface CommandMessage {
    id: number;
    type: string;
    [key: string]: any;
}

export interface HAResult {
    id: number;
    type: 'result';
    success: boolean;
    result?: any;
    error?: {
        code: string;
        message: string;
    };
}

export interface HAEvent {
    id: number;
    type: 'event';
    event: {
        event_type: string;
        data: any;
        origin: string;
        time_fired: string;
    };
}

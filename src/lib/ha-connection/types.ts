
export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'auth_invalid' | 'failed';

export interface AuthMessage {
    type: 'auth';
    access_token: string;
}

export interface BaseMessage {
    type: string;
    id?: number;
    [key: string]: any;
}

export interface HAResultMessage extends BaseMessage {
    type: 'result';
    success: boolean;
    result?: any;
    error?: {
        code: string;
        message: string;
    };
}

export interface ConnectionOptions {
    url: string;
    token: string;
    onStateChange: (status: ConnectionStatus, error?: string) => void;
    onMessage: (data: any) => void;
}

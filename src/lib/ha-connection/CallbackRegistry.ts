
import type { HAResultMessage } from './types';

interface PendingCommand {
    resolve: (value: any) => void;
    reject: (error: any) => void;
    timeout: any; 
}

export class CallbackRegistry {
    private callbacks = new Map<number, PendingCommand>();

    // Register a pending command with a timeout
    public register(id: number, resolve: (val: any) => void, reject: (err: any) => void, timeoutMs = 30000) {
        const timeout = setTimeout(() => {
            this.reject(id, new Error('Command timed out (client-side)'));
        }, timeoutMs);

        this.callbacks.set(id, { resolve, reject, timeout });
    }

    // Handle incoming result message from HA
    public handleResult(message: HAResultMessage) {
        if (!message.id || !this.callbacks.has(message.id)) return;

        const cb = this.callbacks.get(message.id)!;
        clearTimeout(cb.timeout);

        if (message.success) {
            cb.resolve(message.result);
        } else {
            cb.reject(message.error || new Error('Unknown HA Error'));
        }
        
        this.callbacks.delete(message.id);
    }

    // Reject a specific command (e.g. on timeout)
    public reject(id: number, error: Error) {
        const cb = this.callbacks.get(id);
        if (cb) {
            clearTimeout(cb.timeout);
            cb.reject(error);
            this.callbacks.delete(id);
        }
    }

    // Clear all pending commands (e.g. on disconnect)
    public clear() {
        this.callbacks.forEach(cb => {
            clearTimeout(cb.timeout);
            cb.reject(new Error('Connection terminated'));
        });
        this.callbacks.clear();
    }
}

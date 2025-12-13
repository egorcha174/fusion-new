
export class EntityBatcher {
    private queue = new Map<string, any>();
    private timeout: any = null;
    private readonly batchMs: number;
    private onFlush: (updates: Record<string, any>) => void;

    constructor(onFlush: (updates: Record<string, any>) => void, batchMs = 50) {
        this.onFlush = onFlush;
        this.batchMs = batchMs;
    }

    public enqueue(entityId: string, newState: any) {
        // Map usage ensures we only process the LATEST state for an entity in this batch
        this.queue.set(entityId, newState);

        if (!this.timeout) {
            this.timeout = setTimeout(() => this.flush(), this.batchMs);
        }
    }

    private flush() {
        this.timeout = null;
        if (this.queue.size === 0) return;

        const batch: Record<string, any> = {};
        for (const [id, state] of this.queue.entries()) {
            batch[id] = state;
        }
        
        this.queue.clear();
        this.onFlush(batch);
    }

    public clear() {
        if (this.timeout) clearTimeout(this.timeout);
        this.timeout = null;
        this.queue.clear();
    }
}

/**
 * Circuit Breaker Pattern implementation for WebSocket resilience
 * 
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Too many failures, requests fail immediately 
 * - HALF_OPEN: Testing if service recovered
 * 
 * Benefits:
 * - Prevents cascading failures
 * - Fast fail instead of hanging
 * - Automatic recovery testing
 * - Performance metrics tracking
 */

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening
  successThreshold: number; // Successes needed to close from half-open
  timeout: number; // Time in ms before attempting half-open
  monitoringPeriod: number; // Rolling window for failure tracking
}

export interface CircuitBreakerMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rejectedRequests: number;
  currentState: CircuitState;
  lastStateChange: number;
}

interface RequestRecord {
  timestamp: number;
  success: boolean;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private nextAttemptTime = 0;
  
  private requestHistory: RequestRecord[] = [];
  private metrics: CircuitBreakerMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    rejectedRequests: 0,
    currentState: CircuitState.CLOSED,
    lastStateChange: Date.now()
  };

  private stateChangeListeners: Array<(state: CircuitState) => void> = [];

  constructor(private config: CircuitBreakerConfig) {}

  /**
   * Execute operation through circuit breaker
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.canAttempt()) {
      this.metrics.rejectedRequests++;
      throw new Error(`Circuit breaker is ${this.state} - rejecting request`);
    }

    this.metrics.totalRequests++;

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Check if request can be attempted
   */
  private canAttempt(): boolean {
    const now = Date.now();

    switch (this.state) {
      case CircuitState.CLOSED:
        return true;

      case CircuitState.OPEN:
        if (now >= this.nextAttemptTime) {
          this.transitionTo(CircuitState.HALF_OPEN);
          return true;
        }
        return false;

      case CircuitState.HALF_OPEN:
        return true;

      default:
        return false;
    }
  }

  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    this.metrics.successfulRequests++;
    this.recordRequest(true);
    this.cleanupOldRecords();

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      
      if (this.successCount >= this.config.successThreshold) {
        this.transitionTo(CircuitState.CLOSED);
        this.reset();
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on success in closed state
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }

  /**
   * Handle failed operation
   */
  private onFailure(): void {
    this.metrics.failedRequests++;
    this.lastFailureTime = Date.now();
    this.recordRequest(false);
    this.cleanupOldRecords();

    if (this.state === CircuitState.HALF_OPEN) {
      // Any failure in half-open immediately opens circuit
      this.transitionTo(CircuitState.OPEN);
      this.scheduleAttempt();
    } else if (this.state === CircuitState.CLOSED) {
      this.failureCount++;

      const recentFailures = this.getRecentFailureCount();
      if (recentFailures >= this.config.failureThreshold) {
        this.transitionTo(CircuitState.OPEN);
        this.scheduleAttempt();
      }
    }
  }

  /**
   * Get failure count within monitoring period
   */
  private getRecentFailureCount(): number {
    const cutoffTime = Date.now() - this.config.monitoringPeriod;
    return this.requestHistory.filter(
      r => r.timestamp >= cutoffTime && !r.success
    ).length;
  }

  /**
   * Clean up old request records
   */
  private cleanupOldRecords(): void {
    const cutoffTime = Date.now() - this.config.monitoringPeriod;
    this.requestHistory = this.requestHistory.filter(
      r => r.timestamp >= cutoffTime
    );
  }

  /**
   * Record request for metrics
   */
  private recordRequest(success: boolean): void {
    this.requestHistory.push({
      timestamp: Date.now(),
      success
    });
  }

  /**
   * Schedule next attempt after opening
   */
  private scheduleAttempt(): void {
    this.nextAttemptTime = Date.now() + this.config.timeout;
  }

  /**
   * Transition to new state
   */
  private transitionTo(newState: CircuitState): void {
    if (this.state !== newState) {
      console.log(`Circuit breaker: ${this.state} -> ${newState}`);
      this.state = newState;
      this.metrics.currentState = newState;
      this.metrics.lastStateChange = Date.now();
      this.notifyStateChange(newState);
    }
  }

  /**
   * Reset counters
   */
  private reset(): void {
    this.failureCount = 0;
    this.successCount = 0;
  }

  /**
   * Register state change listener
   */
  onStateChange(listener: (state: CircuitState) => void): () => void {
    this.stateChangeListeners.push(listener);
    return () => {
      const index = this.stateChangeListeners.indexOf(listener);
      if (index > -1) {
        this.stateChangeListeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of state change
   */
  private notifyStateChange(state: CircuitState): void {
    this.stateChangeListeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('Error in circuit breaker state change listener:', error);
      }
    });
  }

  /**
   * Get current metrics
   */
  getMetrics(): Readonly<CircuitBreakerMetrics> {
    return { ...this.metrics };
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Force circuit to specific state (for testing/manual intervention)
   */
  forceState(state: CircuitState): void {
    this.transitionTo(state);
    if (state === CircuitState.CLOSED) {
      this.reset();
    } else if (state === CircuitState.OPEN) {
      this.scheduleAttempt();
    }
  }

  /**
   * Get success rate percentage
   */
  getSuccessRate(): number {
    const { successfulRequests, failedRequests } = this.metrics;
    const total = successfulRequests + failedRequests;
    return total > 0 ? (successfulRequests / total) * 100 : 100;
  }

  /**
   * Check if circuit is healthy
   */
  isHealthy(): boolean {
    return this.state === CircuitState.CLOSED && this.getSuccessRate() > 95;
  }
}

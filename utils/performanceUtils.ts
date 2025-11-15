import * as React from 'react';

/**
 * Performance optimization utilities for debouncing, throttling, and memoization
 * Designed to improve UI responsiveness and reduce unnecessary computations
 */

/**
 * Debounce - задерживает выполнение функции до окончания периода ввода
 * Используется для: поиска, валидации, resize events
 * @param func - функция для задержки
 * @param delay - задержка в миллисекундах (по умолчанию 300ms)
 * @returns дебунсированная функция
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function debounced(...args: Parameters<T>): void {
    // Очищаем предыдущий таймер
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Устанавливаем новый таймер
    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Throttle - ограничивает частоту выполнения функции
 * Используется для: scroll, mousemove, resize
 * @param func - функция для ограничения
 * @param interval - интервал в миллисекундах между вызовами
 * @returns задруженная функция
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  interval: number = 300
): (...args: Parameters<T>) => void {
  let lastCallTime = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function throttled(...args: Parameters<T>): void {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;

    if (timeSinceLastCall >= interval) {
      lastCallTime = now;
      func(...args);
    } else if (!timeoutId) {
      const remainingTime = interval - timeSinceLastCall;
      timeoutId = setTimeout(() => {
        lastCallTime = Date.now();
        func(...args);
        timeoutId = null;
      }, remainingTime);
    }
  };
}

/**
 * Debounce hook для React компонентов
 * Автоматически очищает таймер при размонтировании
 */
export function useDebounce<T>(
  value: T,
  delay: number = 300
): [T, T] {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);
  const [isWaiting, setIsWaiting] = React.useState(false);

  React.useEffect(() => {
    setIsWaiting(true);
    const handler = setTimeout(() => {
      setDebouncedValue(value);
      setIsWaiting(false);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return [debouncedValue, value];
}

/**
 * Debounce callback hook для React компонентов
 * Используется для функций, требующих дебунсирования
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): T {
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const debouncedCallback = React.useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );

  return debouncedCallback as T;
}

/**
 * Batch updates - группирует несколько операций в одну,
 * полезно для localStorage writes и state updates
 */
export class BatchQueue<T> {
  private queue: T[] = [];
  private processing = false;
  private flushDelay: number;
  private maxBatchSize: number;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private processor: (items: T[]) => void | Promise<void>,
    flushDelay: number = 500,
    maxBatchSize: number = 50
  ) {
    this.flushDelay = flushDelay;
    this.maxBatchSize = maxBatchSize;
  }

  add(item: T): void {
    this.queue.push(item);

    // Если достигли максимального размера, сразу обрабатываем
    if (this.queue.length >= this.maxBatchSize) {
      this.flush();
    } else if (!this.timeoutId) {
      // Установляем таймер для отложенной обработки
      this.timeoutId = setTimeout(() => this.flush(), this.flushDelay);
    }
  }

  async flush(): Promise<void> {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    if (this.queue.length === 0 || this.processing) {
      return;
    }

    this.processing = true;
    const itemsToProcess = [...this.queue];
    this.queue = [];

    try {
      await this.processor(itemsToProcess);
    } catch (error) {
      console.error('BatchQueue error:', error);
      // Возвращаем невыполненные элементы обратно в очередь
      this.queue.unshift(...itemsToProcess);
    } finally {
      this.processing = false;
    }
  }

  destroy(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }
}

/**
 * Performance monitoring - для отслеживания времени выполнения критических операций
 */
export class PerformanceMonitor {
  private marks: Map<string, number> = new Map();
  private threshold: number; // в миллисекундах

  constructor(threshold: number = 100) {
    this.threshold = threshold;
  }

  start(label: string): void {
    this.marks.set(label, performance.now());
  }

  end(label: string): number | null {
    const startTime = this.marks.get(label);
    if (!startTime) {
      console.warn(`Performance marker "${label}" not found`);
      return null;
    }

    const duration = performance.now() - startTime;
    this.marks.delete(label);

    if (duration > this.threshold) {
      console.warn(
        `[PERF] Operation "${label}" took ${duration.toFixed(2)}ms (threshold: ${this.threshold}ms)`
      );
    }

    return duration;
  }

  clear(): void {
    this.marks.clear();
  }
}

/**
 * Request idle callback polyfill для браузеров без поддержки
 */
export const requestIdleCallback =
  typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? window.requestIdleCallback
    : (callback: IdleRequestCallback): number => {
        const start = Date.now();
        return setTimeout(() => {
          callback({
            didTimeout: false,
            timeRemaining: () => Math.max(0, 50.0 - (Date.now() - start)),
          });
        }, 1);
      };

export const cancelIdleCallback =
  typeof window !== 'undefined' && 'cancelIdleCallback' in window
    ? window.cancelIdleCallback
    : (id: number): void => clearTimeout(id);

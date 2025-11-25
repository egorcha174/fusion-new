import { Device } from '../types';
import {
  StreamType,
  StreamConfig,
  CameraError,
  getCameraSnapshotUrl,
  getCameraStreamUrl,
  formatCameraError,
} from '../utils/cameraUtils';

export interface CameraServiceConfig {
  haUrl: string;
  signPath: (path: string) => Promise<{ path: string }>;
  getCameraStreamUrl: (entityId: string) => Promise<{ url: string }>;
}

export interface CameraState {
  isLoading: boolean;
  error: CameraError | null;
  isLive: boolean;
  streamConfig: StreamConfig | null;
  snapshotUrl: string | null;
}

export class CameraService {
  private config: CameraServiceConfig;
  private abortController: AbortController | null = null;
  private snapshotCache = new Map<string, { url: string; timestamp: number }>();
  private readonly CACHE_TTL = 5000; // 5 секунд

  constructor(config: CameraServiceConfig) {
    this.config = config;
  }

  /**
   * Загрузить снапшот камеры с кэшированием
   */
  async loadSnapshot(device: Device): Promise<string | null> {
    const cacheKey = device.id;
    const cached = this.snapshotCache.get(cacheKey);

    // Вернуть кэшированный снапшот, если он свежий
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.url;
    }

    try {
      this.abortController?.abort();
      this.abortController = new AbortController();

      const url = await getCameraSnapshotUrl(
        device,
        this.config.haUrl,
        this.config.signPath
      );

      if (url) {
        this.snapshotCache.set(cacheKey, {
          url,
          timestamp: Date.now(),
        });
      }

      return url;
    } catch (error) {
      console.warn('Failed to load camera snapshot:', error);
      return null;
    }
  }

  /**
   * Загрузить поток камеры
   */
  async loadStream(device: Device): Promise<StreamConfig> {
    try {
      this.abortController?.abort();
      this.abortController = new AbortController();

      const streamConfig = await getCameraStreamUrl(
        device,
        this.config.haUrl,
        this.config.signPath,
        this.config.getCameraStreamUrl
      );

      return streamConfig;
    } catch (error) {
      throw formatCameraError(error);
    }
  }

  /**
   * Отменить все активные запросы
   */
  abort(): void {
    this.abortController?.abort();
    this.abortController = null;
  }

  /**
   * Очистить кэш снапшотов
   */
  clearCache(): void {
    this.snapshotCache.clear();
  }

  /**
   * Получить начальное состояние камеры
   */
  getInitialState(): CameraState {
    return {
      isLoading: false,
      error: null,
      isLive: false,
      streamConfig: null,
      snapshotUrl: null,
    };
  }

  /**
   * Проверить, поддерживает ли устройство поток
   */
  canStream(device: Device): boolean {
    return Boolean(
      (device.haDomain === 'internal' && device.customStreamUrl) ||
      device.id.startsWith('camera.')
    );
  }

  /**
   * Очистить ресурсы
   */
  destroy(): void {
    this.abort();
    this.clearCache();
  }
}
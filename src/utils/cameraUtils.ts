import { Device } from '../types';

export enum StreamType {
  HLS = 'hls',
  MJPEG = 'mjpeg',
  IFRAME = 'iframe',
  FILE = 'file',
  NONE = 'none',
}

export interface StreamConfig {
  url: string;
  type: StreamType;
  posterUrl?: string | null;
}

export interface CameraError {
  type: 'network' | 'media' | 'auth' | 'unknown';
  message: string;
  originalError?: any;
}

export const isCameraDevice = (device: Device): boolean => {
  return device.type === 5 || device.haDomain === 'camera' || Boolean(device.customStreamUrl);
};

export const detectStreamType = (url: string, configuredType?: string): StreamType => {
  if (configuredType && configuredType !== 'auto') {
    return configuredType as StreamType;
  }

  const cleanUrl = url.split('?')[0].toLowerCase();
  
  if (cleanUrl.endsWith('.m3u8')) return StreamType.HLS;
  if (cleanUrl.match(/\.(mp4|webm|mov|mkv)$/)) return StreamType.FILE;
  if (cleanUrl.match(/\.(jpg|jpeg|png|webp)$/)) return StreamType.MJPEG;
  
  return StreamType.IFRAME;
};

export const supportsNativeHls = (): boolean => {
  if (typeof document === 'undefined') return false;
  const video = document.createElement('video');
  return video.canPlayType('application/vnd.apple.mpegurl') !== '';
};

export const constructCameraUrl = (
  baseUrl: string,
  path: string,
  protocol: 'http' | 'ws' = 'http',
  timestamp?: number
): string => {
  const url = new URL(path, baseUrl);
  url.protocol = protocol === 'ws' ? 'ws:' : 'http:';
  
  if (timestamp) {
    url.searchParams.set('t', timestamp.toString());
  }
  
  return url.toString();
};

export const createAbortController = (timeoutMs: number = 30000): { controller: AbortController; timeoutId: NodeJS.Timeout } => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timeoutId };
};

export const clearAbortTimeout = (timeoutId?: NodeJS.Timeout): void => {
  if (timeoutId) {
    clearTimeout(timeoutId);
  }
};

export const getCameraSnapshotUrl = async (
  device: Device,
  haUrl: string,
  signPath: (path: string) => Promise<{ path: string }>
): Promise<string | null> => {
  try {
    // Для внутренних устройств с кастомным URL на изображение
    if (device.haDomain === 'internal' && device.customStreamUrl?.match(/\.(jpg|jpeg|png|webp)$/i)) {
      return device.customStreamUrl;
    }

    // Для камер Home Assistant
    if (!device.id.startsWith('internal::')) {
      const result = await signPath(`/api/camera_proxy/${device.id}`);
      return constructCameraUrl(haUrl, result.path, 'http', Date.now());
    }

    return null;
  } catch (error) {
    console.warn('Failed to get camera snapshot URL:', error);
    return null;
  }
};

export const getCameraStreamUrl = async (
  device: Device,
  haUrl: string,
  signPath: (path: string) => Promise<{ path: string }>,
  getStreamUrl: (entityId: string) => Promise<{ url: string }>
): Promise<StreamConfig> => {
  // Для внутренних устройств с кастомным URL
  if (device.haDomain === 'internal' && device.customStreamUrl) {
    const type = detectStreamType(device.customStreamUrl, device.streamType);
    return {
      url: device.customStreamUrl,
      type,
    };
  }

  // Для камер Home Assistant
  if (!device.id.startsWith('internal::')) {
    try {
      // Попытка получить HLS поток через API
      const streamData = await getStreamUrl(device.id);
      if (streamData?.url) {
        return {
          url: constructCameraUrl(haUrl, streamData.url, 'http'),
          type: StreamType.HLS,
        };
      }
    } catch (error) {
      console.warn('HLS stream not available, falling back to MJPEG:', error);
    }

    // Fallback на MJPEG прокси
    try {
      const result = await signPath(`/api/camera_proxy_stream/${device.id}`);
      return {
        url: constructCameraUrl(haUrl, result.path, 'http', Date.now()),
        type: StreamType.MJPEG,
      };
    } catch (error) {
      console.error('Failed to get MJPEG stream:', error);
      throw error;
    }
  }

  throw new Error('Unsupported camera device type');
};

export const formatCameraError = (error: any): CameraError => {
  if (error?.name === 'AbortError') {
    return {
      type: 'network',
      message: 'Запрос отменен из-за таймаута',
      originalError: error,
    };
  }

  if (error?.response?.status === 401 || error?.status === 401) {
    return {
      type: 'auth',
      message: 'Ошибка авторизации. Проверьте токен Home Assistant',
      originalError: error,
    };
  }

  if (error?.type === 'network') {
    return {
      type: 'network',
      message: 'Сетевая ошибка. Проверьте подключение',
      originalError: error,
    };
  }

  if (error?.type === 'media') {
    return {
      type: 'media',
      message: 'Ошибка воспроизведения медиа',
      originalError: error,
    };
  }

  return {
    type: 'unknown',
    message: 'Неизвестная ошибка',
    originalError: error,
  };
};
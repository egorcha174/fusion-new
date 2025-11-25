import { useState, useEffect, useCallback, useRef } from 'react';
import { Device } from '../types';
import { CameraService, CameraState } from '../services/cameraService';
import { CameraError, StreamType } from '../utils/cameraUtils';

export interface UseCameraOptions {
  autoPlay?: boolean;
  muted?: boolean;
  visible?: boolean;
  pageVisible?: boolean;
}

export interface UseCameraReturn {
  state: CameraState;
  loadSnapshot: () => Promise<void>;
  loadStream: () => Promise<void>;
  clearError: () => void;
  retry: () => Promise<void>;
}

/**
 * Хук для управления состоянием камеры
 */
export const useCamera = (
  device: Device | null,
  cameraService: CameraService,
  options: UseCameraOptions = {}
): UseCameraReturn => {
  const {
    autoPlay = true,
    visible = true,
    pageVisible = true,
  } = options;

  const [state, setState] = useState<CameraState>(cameraService.getInitialState());
  const isMounted = useRef(true);

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      isMounted.current = false;
      cameraService.abort();
    };
  }, [cameraService]);

  const updateState = useCallback((updates: Partial<CameraState>) => {
    if (!isMounted.current) return;
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  const loadSnapshot = useCallback(async () => {
    if (!device) return;

    try {
      const url = await cameraService.loadSnapshot(device);
      if (url) {
        updateState({ snapshotUrl: url });
      }
    } catch (error) {
      console.warn('Failed to load snapshot:', error);
    }
  }, [device, cameraService, updateState]);

  const loadStream = useCallback(async () => {
    if (!device || !autoPlay || !visible || !pageVisible) {
      updateState({
        isLoading: false,
        isLive: false,
        streamConfig: null,
      });
      return;
    }

    if (!cameraService.canStream(device)) {
      updateState({
        isLoading: false,
        error: {
          type: 'unknown',
          message: 'Устройство не поддерживает поток',
        },
      });
      return;
    }

    updateState({
      isLoading: true,
      error: null,
    });

    try {
      const streamConfig = await cameraService.loadStream(device);
      
      if (isMounted.current) {
        updateState({
          streamConfig,
          isLoading: false,
          isLive: true,
        });
      }
    } catch (error) {
      if (isMounted.current) {
        updateState({
          error: error as CameraError,
          isLoading: false,
          isLive: false,
        });
      }
    }
  }, [device, autoPlay, visible, pageVisible, cameraService, updateState]);

  const retry = useCallback(async () => {
    clearError();
    await Promise.all([loadSnapshot(), loadStream()]);
  }, [clearError, loadSnapshot, loadStream]);

  // Загрузка снапшота при изменении видимости
  useEffect(() => {
    if (visible) {
      loadSnapshot();
    }
  }, [visible, loadSnapshot]);

  // Загрузка потока при изменении условий воспроизведения
  useEffect(() => {
    loadStream();
  }, [loadStream]);

  return {
    state,
    loadSnapshot,
    loadStream,
    clearError,
    retry,
  };
};